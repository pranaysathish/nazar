"""
predictor.py
Video analysis pipeline. It follows the method in the paper (Section III, eq. 1-13):

  1. Frame extraction  up to N_max = 30 evenly spaced frames, I = max(floor(T / N_max), 1)  (eq. 1)
  2. Pre-processing    RGB, resized to 224 x 224, pixels divided by 255                      (eq. 2)
  3. Frame score       S_obj(F) = sigmoid(...) from the fine-tuned MobileNetV2               (eq. 5)
  4. Video score       S_avg = mean of all frame scores                                      (eq. 6)
  5. Blur check        Q(F) = Var(Laplacian(F)) > 100; the sharp frames form F_filtered      (eq. 9)
  6. Confidence        S_avg * |F_filtered| / N_max                                          (eq. 7)
  7. Selected frames   S_obj(F) > 0.5 and F is sharp                                         (eq. 8)
  8. Decision          OBJECTIFYING if S_avg >= 0.5 and |F_filtered| > 0, otherwise SAFE     (eq. 13)
  9. Explanation       for the 5 highest-scoring frames: a BLIP caption, the keyword score
                       M(C) = |{k in K : k in C.lower()}| / |K| (eq. 12), and a Grad-CAM heat map
                       showing which regions pushed the frame's score towards "objectifying".
"""
import base64
import os
import time

# transformers would otherwise start a background download (~1 GB) on every start to convert
# the BLIP weights to another file format. Not needed: the weights on disk load fine.
os.environ.setdefault("DISABLE_SAFETENSORS_CONVERSION", "1")

import cv2
import numpy as np

# The model file sits in the project root, one level above backend/.
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "objectification_model.h5")
BLIP_NAME = "Salesforce/blip-image-captioning-base"

N_MAX = 30               # maximum number of frames per video (eq. 1)
TAU = 0.5                # decision threshold (eq. 8, 13)
BLUR_THRESHOLD = 100.0   # minimum Laplacian variance for a sharp frame (eq. 9)
GRADCAM_LAYER = "Conv_1" # last convolution layer of MobileNetV2 (same layer as the metrics notebook)
DISPLAY_WIDTH = 640      # frames sent to the dashboard are resized to this width

# Keyword set K for M(C) (eq. 12): the 17 keywords from Objectification_DL.ipynb, cell 8.
OBJECTIFICATION_KEYWORDS = [
    "scantily", "seductive", "sexual", "posing", "lips", "revealing",
    "bikini", "underwear", "shorts", "cleavage", "legs",
    "dressed", "body", "lingerie", "skin", "modeling", "exposing",
]


def caption_keywords(caption: str) -> list:
    """Keywords k in K with k in C.lower(), exactly as eq. 12 and the notebook (cell 9) test it.

    A substring test, so plurals and forms such as "bikinis" or "seductively" also count.
    """
    text = caption.lower()
    return [k for k in OBJECTIFICATION_KEYWORDS if k in text]

# ── Lazy-loaded models ───────────────────────────────────────────────────────
_mobilenet_model = None
_gradcam_model = None
_final_w = None
_final_b = None
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
    if _blip_model is None:
        from transformers import BlipForConditionalGeneration, BlipProcessor
        print("[predictor] Loading BLIP captioning model...")
        try:
            # Use the copy already on disk, so this works without internet after the first run.
            processor = BlipProcessor.from_pretrained(BLIP_NAME, local_files_only=True)
            blip = BlipForConditionalGeneration.from_pretrained(BLIP_NAME, local_files_only=True)
        except Exception:
            print("[predictor] BLIP is not on disk yet: downloading it (about 1 GB, first run only)...")
            processor = BlipProcessor.from_pretrained(BLIP_NAME)
            blip = BlipForConditionalGeneration.from_pretrained(BLIP_NAME)
        blip.eval()
        _blip_processor, _blip_model = processor, blip
        print("[predictor] BLIP loaded.")
    return _blip_processor, _blip_model


def _load_gradcam():
    """A model that returns the Conv_1 feature maps and the input of the final sigmoid layer."""
    global _gradcam_model, _final_w, _final_b
    if _gradcam_model is None:
        import tensorflow as tf
        model = load_mobilenet()
        final = model.layers[-1]  # Dense(1, sigmoid)
        _gradcam_model = tf.keras.Model(model.inputs, [model.get_layer(GRADCAM_LAYER).output, final.input])
        w, b = final.get_weights()
        _final_w = tf.constant(w, dtype=tf.float32)
        _final_b = tf.constant(b, dtype=tf.float32)
    return _gradcam_model


def warm_up():
    """Load every model and run it once, so the first real analysis is fast."""
    t0 = time.time()
    model = load_mobilenet()
    dummy = np.zeros((224, 224, 3), dtype=np.float32)
    model.predict(dummy[None], verbose=0)
    gradcam(dummy)
    load_blip()
    print(f"[predictor] All models ready ({time.time() - t0:.0f}s).")


# ── Frames ───────────────────────────────────────────────────────────────────
def extract_frames(video_path: str, target_size=(224, 224), max_frames: int = N_MAX):
    """Up to max_frames evenly spaced frames (eq. 1).

    Returns a list of (model_input 224x224 in [0,1], original RGB frame, time in seconds).
    """
    cap = cv2.VideoCapture(video_path)
    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        if total <= 0:  # some files do not report a frame count: count the frames once
            while cap.grab():
                total += 1
            cap.release()
            cap = cv2.VideoCapture(video_path)
        interval = max(total // max_frames, 1)

        frames, count = [], 0
        while cap.isOpened() and len(frames) < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if count % interval == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                model_input = cv2.resize(rgb, target_size).astype(np.float32) / 255.0  # eq. 2
                frames.append((model_input, rgb, count / fps if fps > 0 else 0.0))
            count += 1
        return frames
    finally:
        cap.release()


def is_sharp(frame_rgb: np.ndarray) -> bool:
    """Blur check Q(F) = Var(Laplacian(F)) > 100 (eq. 9); the same test as is_blurry() in the notebook."""
    gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var()) > BLUR_THRESHOLD


def _display_size(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    if w <= DISPLAY_WIDTH:
        return rgb
    return cv2.resize(rgb, (DISPLAY_WIDTH, round(h * DISPLAY_WIDTH / w)), interpolation=cv2.INTER_AREA)


def to_jpeg_b64(rgb: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not ok:
        raise ValueError("Could not encode a frame as JPEG.")
    return base64.b64encode(buf.tobytes()).decode("ascii")


# ── Explainability ───────────────────────────────────────────────────────────
def gradcam(frame_input: np.ndarray) -> np.ndarray:
    """Grad-CAM heat map (7 x 7, values 0-1) for one pre-processed 224 x 224 frame.

    Red regions are the ones that push the frame's score towards "objectifying" (the model's
    positive class), for every frame, so all heat maps mean the same thing. The gradient is taken
    of the score before the sigmoid (the logit), so it does not vanish when the model is very
    sure (scores near 0% or 100%).
    """
    import tensorflow as tf
    grad_model = _load_gradcam()
    x = tf.convert_to_tensor(frame_input[None, ...], dtype=tf.float32)
    with tf.GradientTape() as tape:
        conv_out, head_in = grad_model(x, training=False)
        logit = tf.matmul(head_in, _final_w) + _final_b
        target = logit[:, 0]
    grads = tape.gradient(target, conv_out)
    weights = tf.reduce_mean(grads, axis=(1, 2))  # one weight per feature map
    cam = tf.reduce_sum(conv_out * weights[:, None, None, :], axis=-1)[0]
    cam = tf.nn.relu(cam).numpy()
    peak = float(cam.max())
    return cam / peak if peak > 0 else cam


def heatmap_overlay(frame_rgb: np.ndarray, cam: np.ndarray) -> np.ndarray:
    h, w = frame_rgb.shape[:2]
    cam_big = np.clip(cv2.resize(cam.astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC), 0, 1)
    heat = cv2.cvtColor(cv2.applyColorMap(np.uint8(255 * cam_big), cv2.COLORMAP_JET), cv2.COLOR_BGR2RGB)
    return np.uint8(0.55 * frame_rgb + 0.45 * heat)


def get_blip_caption(frame_rgb: np.ndarray) -> str:
    """Natural-language caption for one RGB frame."""
    import torch
    from PIL import Image
    processor, blip = load_blip()
    inputs = processor(images=Image.fromarray(frame_rgb), return_tensors="pt")
    with torch.no_grad():
        out = blip.generate(**inputs, max_new_tokens=50)
    return processor.decode(out[0], skip_special_tokens=True).strip()


def build_explanation(verdict: str, s_avg: float, n: int, n_sharp: int, n_above: int, top_frames: list) -> str:
    pct = s_avg * 100
    if verdict == "OBJECTIFYING":
        parts = [f"The average objectification score across {n} sampled frames is {pct:.1f}%, "
                 f"at or above the 50% threshold, so the ad is classified as objectifying."]
    elif s_avg >= TAU and n_sharp == 0:
        parts = [f"The average score is {pct:.1f}%, but none of the {n} frames passed the blur check, "
                 f"so there is no reliable frame to base a decision on and the ad is not flagged."]
    else:
        parts = [f"The average objectification score across {n} sampled frames is {pct:.1f}%, "
                 f"below the 50% threshold, so the ad is classified as not objectifying."]
    parts.append(f"{n_above} of {n} frames scored above 50% on their own, and {n_sharp} of {n} passed the blur check.")

    flagged = [f for f in top_frames if f["flagged"]]
    if flagged:
        words = sorted({k for f in flagged for k in f["keywords"]})
        examples = "; ".join(f'"{f["caption"]}"' for f in flagged[:2])
        parts.append(f"BLIP captions of the top frames contain the keywords: {', '.join(words)} (for example {examples}).")
    elif verdict == "OBJECTIFYING":
        parts.append("The BLIP captions of the top frames contain none of the keywords, so the score comes "
                     "from visual patterns the model learned rather than from the caption text.")
    else:
        parts.append("The BLIP captions of the top frames contain none of the objectification keywords.")
    parts.append("The Grad-CAM heat maps show which parts of each frame pushed its score towards objectifying.")
    return " ".join(parts)


# ── Full pipeline ────────────────────────────────────────────────────────────
def predict_video(video_path: str, top_n: int = 5) -> dict:
    t_start = time.time()
    model = load_mobilenet()

    frames = extract_frames(video_path)
    if not frames:
        raise ValueError("Could not read any frames from this video. Is it a valid video file?")
    n = len(frames)

    # Frame scores S_obj (eq. 5) and video score S_avg (eq. 6)
    preds = model.predict(np.stack([f[0] for f in frames]), verbose=0).flatten()
    s_avg = float(np.mean(preds))

    # Blur check (eq. 9), confidence (eq. 7), selected frames (eq. 8), decision (eq. 13)
    sharp = [is_sharp(f[1]) for f in frames]
    n_sharp = int(sum(sharp))
    confidence = s_avg * n_sharp / N_MAX
    n_above = int(np.sum(preds > TAU))
    n_selected = sum(1 for p, s in zip(preds, sharp) if p > TAU and s)
    verdict = "OBJECTIFYING" if (s_avg >= TAU and n_sharp > 0) else "SAFE"

    # The top-N frames: BLIP caption, keyword score M(C) (eq. 12) and Grad-CAM heat map
    top_frames = []
    for idx in np.argsort(preds)[::-1][:top_n]:
        idx = int(idx)
        score = float(preds[idx])
        model_input, rgb, t_sec = frames[idx]
        caption = get_blip_caption(rgb)
        matched = caption_keywords(caption)
        small = _display_size(rgb)
        cam = gradcam(model_input)
        top_frames.append({
            "frame_index": idx,
            "time_sec": round(t_sec, 1),
            "image_b64": to_jpeg_b64(small),
            "heatmap_b64": to_jpeg_b64(heatmap_overlay(small, cam)),
            "caption": caption,
            "score": round(score * 100, 1),
            "keywords": matched,
            "keyword_score": round(len(matched) / len(OBJECTIFICATION_KEYWORDS), 3),
            "flagged": bool(matched),
            "sharp": bool(sharp[idx]),
            "selected": bool(score > TAU and sharp[idx]),
        })

    return {
        "score": round(s_avg * 100, 1),
        "verdict": verdict,
        "confidence": round(confidence * 100, 1),
        "frames_analyzed": n,
        "frames_sharp": n_sharp,
        "frames_above_threshold": n_above,
        "frames_selected": n_selected,
        "frame_scores": [round(float(p) * 100, 1) for p in preds],
        "frame_sharp": [bool(s) for s in sharp],
        "top_frames": top_frames,
        "explanation": build_explanation(verdict, s_avg, n, n_sharp, n_above, top_frames),
        "processing_time": round(time.time() - t_start, 2),
    }
