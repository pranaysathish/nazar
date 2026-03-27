# Objectification Detector — Explainable AI

An automated deep learning pipeline that detects objectification of women in video advertisements, powered by **MobileNetV2** + **BLIP**. Achieves **83.95% accuracy** on a curated dataset of 110 ads.

---

## What it does

1. Takes a video file **or** a YouTube URL as input
2. Extracts 30 evenly-spaced frames using OpenCV
3. Classifies each frame with a fine-tuned MobileNetV2 model
4. Generates natural language captions using BLIP
5. Outputs an objectification **score (0–100%)**, a **verdict**, and an **explanation**

---

## Project Structure

```
DL Project/
├── backend/
│   ├── app.py              # Flask API server
│   ├── predictor.py        # MobileNetV2 + BLIP pipeline
│   ├── requirements.txt    # Python dependencies
│   └── objectification_model.h5   # ← your trained model (not in repo, see below)
└── dashboard/
    ├── app/                # Next.js pages
    ├── components/         # React components
    └── package.json
```

---

## Requirements

- Python 3.9+
- Node.js 18+
- ~4 GB RAM (BLIP model downloads ~900 MB on first run)
- Internet connection (for BLIP model download on first run)

> ⚠️ **Model file**: `objectification_model.h5` is not included in the repo (too large for GitHub). Get it from the shared drive / ask the author.

---

## Setup & Run

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd "DL Project"
```

### 2. Place the model file

Copy `objectification_model.h5` into the `backend/` folder:

```
backend/objectification_model.h5
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API will start at `http://127.0.0.1:5000` ✅

> First run downloads the BLIP model (~900 MB). This is one-time only.

### 4. Start the dashboard (new terminal)

```bash
cd dashboard
npm install
npm run dev
```

Open **http://localhost:3000** in Chrome.

---

## Usage

| Feature | How |
|---|---|
| Upload a video | Drag & drop (MP4, MOV, AVI, MKV, WEBM) |
| Analyze YouTube ad | Click "YouTube Link" tab → paste URL |
| View model metrics | Click "Model Info" in the header |

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Model | MobileNetV2 (TensorFlow/Keras) |
| Explainability | BLIP (Salesforce, via HuggingFace) |
| Frame Extraction | OpenCV |
| YouTube Download | yt-dlp |
| Backend API | Flask + Flask-CORS |
| Frontend | Next.js 15 + Tailwind CSS |

---

## Model Performance

| Metric | Value |
|---|---|
| Accuracy | **83.95%** |
| Precision | 86% |
| Recall | 82% |
| F1 Score | 84% |
| ROC-AUC | **0.91** |

Dataset: 110 video ads (55 objectifying, 55 non-objectifying) · ~3,200 frames extracted

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'flask'`**
```bash
pip install -r requirements.txt
```

**YouTube error (ffmpeg)**
Already handled — yt-dlp uses pre-merged MP4 format (no ffmpeg needed).

**BLIP download slow**
Normal on first run only. Subsequent runs are instant (cached locally).

**Dashboard can't connect to backend**
Make sure `python app.py` is running in a separate terminal before opening the dashboard.
