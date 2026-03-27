"""
app.py  —  Flask API server (Video upload + YouTube analysis)
Run:  python app.py
"""
import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from predictor import predict_video

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "flv"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "AdEthics AI backend is running."})


# ── Video file upload ─────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided."}), 400
    file = request.files["video"]
    if not allowed_file(file.filename):
        return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    suffix = "." + file.filename.rsplit(".", 1)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        return jsonify(predict_video(tmp_path, top_n=5))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try: os.unlink(tmp_path)
        except Exception: pass


# ── YouTube URL ───────────────────────────────────────────────────────────────
@app.route("/predict-youtube", methods=["POST"])
def predict_youtube():
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No YouTube URL provided."}), 400

    tmp_path = None
    try:
        import yt_dlp
        with tempfile.TemporaryDirectory() as tmpdir:
            ydl_opts = {
                # 22=720p MP4 pre-merged, 18=360p MP4 pre-merged.
                # Both are progressive (audio+video in one file) - zero ffmpeg needed.
                # NO fallback to adaptive/DASH formats that require merging.
                "format": "22/18",
                "outtmpl": os.path.join(tmpdir, "video.%(ext)s"),
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                ext = info.get("ext", "mp4")
                downloaded = os.path.join(tmpdir, f"video.{ext}")

            # Copy to persistent temp so we can pass it after tmpdir closes
            import shutil
            _, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
            shutil.copy2(downloaded, tmp_path)

        return jsonify(predict_video(tmp_path, top_n=5))

    except Exception as e:
        msg = str(e)
        if "Private video" in msg or "Sign in" in msg:
            return jsonify({"error": "This video is private or age-restricted."}), 400
        if "not available" in msg.lower():
            return jsonify({"error": "Video not available. Check the URL and try again."}), 400
        return jsonify({"error": msg}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try: os.unlink(tmp_path)
            except Exception: pass


if __name__ == "__main__":
    print("=" * 55)
    print("  AdEthics AI — Backend Server")
    print("  http://127.0.0.1:5000")
    print("=" * 55)
    from predictor import load_mobilenet
    load_mobilenet()
    app.run(debug=False, host="127.0.0.1", port=5000)
