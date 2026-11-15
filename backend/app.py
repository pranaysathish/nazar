"""
app.py  —  Flask API server (video upload + YouTube analysis)
Run:  python app.py
"""
import os
import re
import tempfile

from flask import Flask, jsonify, request
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
        return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}), 400

    suffix = "." + file.filename.rsplit(".", 1)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        return jsonify(predict_video(tmp_path, top_n=5))
    except ValueError as e:  # unreadable or empty video
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ── YouTube URL ───────────────────────────────────────────────────────────────
def youtube_error(message: str):
    """Turn a yt-dlp error into a short message the user can act on."""
    message = re.sub(r"\x1b\[[0-9;]*m", "", message)  # drop terminal colour codes
    low = message.lower()
    if "not a bot" in low:
        return jsonify({"error": "YouTube asked for a sign-in check on this network. "
                                 "Use Upload File with a saved copy of the ad instead."}), 400
    if "private video" in low or ("age" in low and "restrict" in low) or "sign in" in low:
        return jsonify({"error": "This video is private or age-restricted, so it cannot be downloaded."}), 400
    if "latest version" in low:  # yt-dlp's own "this may be a bug" text: usually YouTube changed
        return jsonify({"error": "The YouTube downloader could not read this page; it may need an update "
                                 "(pip install -U \"yt-dlp[default]\"). Use Upload File for now."}), 500
    if "requested format is not available" in low:
        return jsonify({"error": "YouTube did not offer a downloadable video stream for this link. "
                                 "Try another link, or use Upload File with a saved copy."}), 400
    if any(s in low for s in ("getaddrinfo", "failed to resolve", "unable to download webpage",
                              "timed out", "connection", "network is unreachable")):
        return jsonify({"error": "Could not reach YouTube. Check the internet connection, "
                                 "or use Upload File with a saved copy of the ad."}), 503
    if "unavailable" in low or "not available" in low or "unsupported url" in low:
        return jsonify({"error": "Video not available. Check the URL and try again."}), 400
    return jsonify({"error": f"YouTube download failed: {message}"}), 500


@app.route("/predict-youtube", methods=["POST"])
def predict_youtube():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No YouTube URL provided."}), 400

    import yt_dlp

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        ydl_opts = {
            # YouTube no longer offers the old ready-made MP4s (formats 22/18) for most videos.
            # The model only needs the pictures, so download a video-only H.264 stream (<= 480p):
            # one file, no audio, so no merging and no ffmpeg. OpenCV reads it directly.
            "format": "bv*[vcodec^=avc1][height<=480]/b[ext=mp4][height<=720]/bv*[height<=480]/b",
            "outtmpl": os.path.join(tmpdir, "video.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "noplaylist": True,
            # YouTube pages need a JavaScript runtime: use Deno or Node, whichever is installed.
            "js_runtimes": {"deno": {}, "node": {}},
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            return youtube_error(str(e))

        files = [f for f in os.listdir(tmpdir) if f.startswith("video.") and not f.endswith(".part")]
        if not files:
            return jsonify({"error": "The YouTube download did not produce a video file."}), 500
        try:
            return jsonify(predict_video(os.path.join(tmpdir, files[0]), top_n=5))
        except ValueError as e:  # unreadable or empty video
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("=" * 55)
    print("  AdEthics AI - Backend Server")
    print("  http://127.0.0.1:5000")
    print("=" * 55)
    from predictor import warm_up
    warm_up()  # load MobileNetV2, Grad-CAM and BLIP now, so the first analysis is fast
    app.run(debug=False, host="127.0.0.1", port=5000)
