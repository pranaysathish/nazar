"""
predictor.py
Core prediction logic: OpenCV frame extraction → MobileNetV2 → BLIP captioning
"""
import os
import cv2
import numpy as np
import base64
import time
from io import BytesIO
from PIL import Image

# ── Model paths ──────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "objectification_model.h5")

OBJECTIFICATION_KEYWORDS = [
    "scantily", "seductive", "sexual", "posing", "lips", "revealing",
    "bikini", "underwear", "shorts", "cleavage", "legs",
    "dressed", "body", "lingerie", "skin", "modeling", "exposing",
    "tight", "dancing", "woman", "girl", "attractive", "sensual"
]

# ── Lazy-loaded globals ───────────────────────────────────────────────────────
_mobilenet_model = None
_blip_processor = None
_blip_model = None


def load_mobilenet():
    global _mobilenet_model
    if _mobilenet_model is None:
        from tensorflow.keras.models import load_model
        print("[predictor] Loading MobileNetV2 model...")
        _mobilenet_model = load_model(MODEL_PATH)
        print("[predictor] MobileNetV2 model loaded.")
    return _mobilenet_model


def load_blip():
    global _blip_processor, _blip_model
    if _blip_processor is None:
        from transformers import BlipProcessor, BlipForConditionalGeneration
        import torch
        print("[predictor] Loading BLIP captioning model (first time may take a while)...")
        _blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        _blip_model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )
        print("[predictor] BLIP loaded.")
    return _blip_processor, _blip_model


def frame_to_base64(frame_rgb: np.ndarray) -> str:
    """Convert RGB numpy array to base64 PNG string for frontend."""
    pil_img = Image.fromarray(frame_rgb)
    buf = BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def extract_frames(video_path: str, target_size=(224, 224), max_frames=30):
    """Extract up to max_frames evenly-spaced frames from a video file."""
    frames = []
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    interval = max(total // max_frames, 1)
    count = 0

    while cap.isOpened() and len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        if count % interval == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            resized = cv2.resize(rgb, target_size)
            normalized = resized / 255.0
            frames.append((normalized, rgb))
        count += 1

    cap.release()
    return frames


def get_blip_caption(image_np: np.ndarray) -> str:
    """Generate a natural-language caption for a single RGB frame."""
    processor, blip = load_blip()
    pil_img = Image.fromarray(image_np)
    inputs = processor(images=pil_img, return_tensors="pt")
    out = blip.generate(**inputs, max_new_tokens=50)
    return processor.decode(out[0], skip_special_tokens=True)


def predict_video(video_path: str, top_n: int = 5) -> dict:
    """
    Full prediction pipeline for one video.

    Returns:
        {
          "score": float (0-100),
          "verdict": "OBJECTIFYING" | "SAFE",
          "frames_analyzed": int,
          "top_frames": [{"image_b64": str, "caption": str, "score": float}],
          "explanation": str,
          "processing_time": float
        }
    """
    t_start = time.time()
    model = load_mobilenet()

    # ── 1. Extract frames ────────────────────────────────────────────────────
    frames = extract_frames(video_path)
    if not frames:
        raise ValueError("Could not extract frames from video. Is it a valid video file?")

    # ── 2. Run MobileNetV2 ───────────────────────────────────────────────────
    model_inputs = np.array([f[0] for f in frames])
    preds = model.predict(model_inputs, verbose=0).flatten()
    avg_score = float(np.mean(preds)) * 100  # 0–100

    verdict = "OBJECTIFYING" if avg_score >= 50 else "SAFE"

    # ── 3. BLIP captions for top-N frames ────────────────────────────────────
    top_indices = preds.argsort()[::-1]
    top_frames_data = []

    for idx in top_indices:
        if len(top_frames_data) >= top_n:
            break
        frame_rgb = frames[idx][1]
        caption = get_blip_caption(frame_rgb)
        has_keyword = any(kw in caption.lower() for kw in OBJECTIFICATION_KEYWORDS)
        # Always include top frames even if no keyword (for transparency)
        top_frames_data.append({
            "image_b64": frame_to_base64(frame_rgb),
            "caption": caption,
            "score": round(float(preds[idx]) * 100, 1),
            "flagged": has_keyword
        })

    # ── 4. Build explanation ─────────────────────────────────────────────────
    flagged_captions = [f["caption"] for f in top_frames_data if f["flagged"]]
    if verdict == "OBJECTIFYING":
        if flagged_captions:
            explanation = (
                f"The model identified {len(flagged_captions)} frame(s) with visual content "
                f"associated with objectification. Key observations from the AI: "
                f"{'; '.join(flagged_captions[:3])}. "
                f"These elements contributed to an overall objectification score of {avg_score:.1f}%."
            )
        else:
            explanation = (
                f"The model flagged this video with a {avg_score:.1f}% objectification score "
                f"based on visual patterns learned during training, even though captions "
                f"did not contain explicit keywords. This may indicate subtle visual cues."
            )
    else:
        explanation = (
            f"The model analyzed {len(frames)} frames and found no significant objectifying content. "
            f"The average objectification score was {avg_score:.1f}%, well below the 50% threshold. "
            f"This advertisement appears to present its subject in a respectful manner."
        )

    processing_time = round(time.time() - t_start, 2)

    return {
        "score": round(avg_score, 1),
        "verdict": verdict,
        "frames_analyzed": len(frames),
        "top_frames": top_frames_data,
        "explanation": explanation,
        "processing_time": processing_time
    }
