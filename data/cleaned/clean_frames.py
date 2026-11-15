"""Reproducible, rule-based cleaning of the extracted ad frames (frames.zip -> frames_cleaned_auto.zip).

  python -I clean_frames.py analyze <frames.zip> <metrics.csv> <dir with torchvision>
  python -I clean_frames.py build   <frames.zip> <metrics.csv> <out_dir>

The defaults below are exactly the settings that produced dataset/frames_cleaned_auto.zip
(5,426 frames from 110 ads; see cleaning_summary.json). Rules, applied in this order per frame:
  1. blank     grayscale standard deviation < 10, or mean < 12 (black) or > 243 (white)
  2. blurry    OFF (blur = 0). A variance-of-Laplacian rule was tested and rejected: on these 640x360 ad frames
               a low variance mostly marked dark, soft-focus close-ups rather than blurred frames.
  3. no_person no COCO "person" box with score >= 0.3 covering >= 1.5% of the frame
               (SSDlite320-MobileNetV3, torchvision) -> product shots, logos, text slides, scenery
  4. duplicate within an ad, frames in time order: dHash Hamming distance <= 5 to the previous kept frame
"""
import csv
import io
import json
import os
import re
import sys
import zipfile

import cv2
import numpy as np

FRAME_RE = re.compile(r"^(?:.*/)?frames/(OBJ|NON_OBJ)/(video\d+)/(frame_(\d+)\.jpg)$", re.I)


def list_frames(z):
    out = []
    for n in z.namelist():
        m = FRAME_RE.match(n)
        if m:
            out.append((m.group(1).upper(), m.group(2), m.group(3), int(m.group(4)), n))
    out.sort(key=lambda t: (t[0], int(t[1][5:]), t[3]))
    return out


def dhash(gray):
    small = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    bits = (small[:, 1:] > small[:, :-1]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def analyze(zip_path, csv_path, pylib):
    sys.path.insert(0, pylib)
    import torch
    from torchvision.models.detection import ssdlite320_mobilenet_v3_large, SSDLite320_MobileNet_V3_Large_Weights
    torch.set_num_threads(os.cpu_count() or 4)
    model = ssdlite320_mobilenet_v3_large(weights=SSDLite320_MobileNet_V3_Large_Weights.DEFAULT,
                                          score_thresh=0.2).eval()
    z = zipfile.ZipFile(zip_path)
    frames = list_frames(z)
    rows, batch, meta = [], [], []

    def flush():
        if not batch:
            return
        with torch.no_grad():
            preds = model(batch)
        for (row, area_px), p in zip(meta, preds):
            best_score, best_area = 0.0, 0.0
            for lab, sc, box in zip(p["labels"].tolist(), p["scores"].tolist(), p["boxes"].tolist()):
                if lab == 1:  # person
                    a = max(0.0, (box[2] - box[0])) * max(0.0, (box[3] - box[1])) / area_px
                    if sc > best_score:
                        best_score, best_area = sc, a
            row["person_score"] = round(best_score, 4)
            row["person_area"] = round(best_area, 4)
            rows.append(row)
        batch.clear()
        meta.clear()

    for i, (cls, video, fname, idx, name) in enumerate(frames):
        data = np.frombuffer(z.read(name), np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if img is None:
            rows.append({"cls": cls, "video": video, "frame": fname, "idx": idx, "zip_name": name, "ok": 0})
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        row = {"cls": cls, "video": video, "frame": fname, "idx": idx, "zip_name": name, "ok": 1,
               "w": w, "h": h, "mean": round(float(gray.mean()), 2), "std": round(float(gray.std()), 2),
               "lapvar": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 2), "dhash": dhash(gray)}
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        batch.append(torch.from_numpy(rgb).permute(2, 0, 1).float() / 255.0)
        meta.append((row, float(w * h)))
        if len(batch) == 32:
            flush()
        if (i + 1) % 1000 == 0:
            print(f"  analysed {i + 1}/{len(frames)}", flush=True)
    flush()
    keys = ["cls", "video", "frame", "idx", "zip_name", "ok", "w", "h", "mean", "std", "lapvar", "dhash",
            "person_score", "person_area"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=keys)
        wr.writeheader()
        for r in rows:
            wr.writerow({k: r.get(k, "") for k in keys})
    print("wrote", csv_path, len(rows), "rows")


def build(zip_path, csv_path, out_dir, blank_std=10.0, blur=0.0, person=0.3, min_area=0.015, dup=5):
    os.makedirs(out_dir, exist_ok=True)
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8")))
    for r in rows:
        r["idx"] = int(r["idx"])
    rows.sort(key=lambda r: (r["cls"], int(r["video"][5:]), r["idx"]))
    last_kept = {}
    for r in rows:
        if r["ok"] != "1":
            r["reason"] = "unreadable"; continue
        mean, std, lap = float(r["mean"]), float(r["std"]), float(r["lapvar"])
        ps, pa = float(r["person_score"] or 0), float(r["person_area"] or 0)
        if std < blank_std or mean < 12 or mean > 243:
            r["reason"] = "blank"
        elif lap < blur:
            r["reason"] = "blurry"
        elif not (ps >= person and pa >= min_area):
            r["reason"] = "no_person"
        else:
            key = (r["cls"], r["video"])
            h = int(r["dhash"])
            if key in last_kept and bin(h ^ last_kept[key]).count("1") <= dup:
                r["reason"] = "duplicate"
            else:
                r["reason"] = "kept"
                last_kept[key] = h

    # summary
    summary = {"rules": {"blank_std": blank_std, "black_mean": 12, "white_mean": 243, "blur_lapvar": blur,
                         "person_score": person, "person_min_area": min_area, "dup_hamming": dup},
               "by_class": {}}
    for cls in ("OBJ", "NON_OBJ"):
        rs = [r for r in rows if r["cls"] == cls]
        counts = {}
        for r in rs:
            counts[r["reason"]] = counts.get(r["reason"], 0) + 1
        vids_all = sorted({r["video"] for r in rs}, key=lambda v: int(v[5:]))
        vids_kept = sorted({r["video"] for r in rs if r["reason"] == "kept"}, key=lambda v: int(v[5:]))
        summary["by_class"][cls] = {"frames_in": len(rs), "removed": counts, "frames_kept": counts.get("kept", 0),
                                    "ads_in": len(vids_all), "ads_kept": len(vids_kept),
                                    "ads_dropped": [v for v in vids_all if v not in vids_kept]}
    summary["frames_in"] = len(rows)
    summary["frames_kept"] = sum(1 for r in rows if r["reason"] == "kept")
    json.dump(summary, open(os.path.join(out_dir, "cleaning_summary.json"), "w"), indent=2)

    with open(os.path.join(out_dir, "cleaning_log.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["class", "ad_folder", "frame", "decision", "gray_mean", "gray_std", "laplacian_var",
                     "person_score", "person_area"])
        for r in rows:
            wr.writerow([r["cls"], r["video"], r["frame"], r["reason"], r["mean"], r["std"], r["lapvar"],
                         r["person_score"], r["person_area"]])

    # cleaned zip, same layout as the original frames_cleaned.zip (frames/OBJ/videoN/frame_k.jpg)
    z = zipfile.ZipFile(zip_path)
    out_zip = os.path.join(out_dir, "frames_cleaned_auto.zip")
    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_STORED) as zo:
        for r in rows:
            if r["reason"] == "kept":
                zo.writestr(f"frames/{r['cls']}/{r['video']}/{r['frame']}", z.read(r["zip_name"]))
    print(json.dumps(summary, indent=2))
    print("wrote", out_zip, f"{os.path.getsize(out_zip) / 1e6:.1f} MB")

    # contact sheets of removed frames (for checking the rules)
    rng = np.random.default_rng(42)
    for reason in ("blank", "blurry", "no_person", "duplicate", "kept"):
        for cls in ("OBJ", "NON_OBJ"):
            pool = [r for r in rows if r["reason"] == reason and r["cls"] == cls]
            if not pool:
                continue
            pick = [pool[i] for i in rng.choice(len(pool), size=min(24, len(pool)), replace=False)]
            tiles = []
            for r in pick:
                img = cv2.imdecode(np.frombuffer(z.read(r["zip_name"]), np.uint8), cv2.IMREAD_COLOR)
                img = cv2.resize(img, (240, 135))
                label = f"{r['video']}/{r['frame']} p={float(r['person_score'] or 0):.2f} L={float(r['lapvar']):.0f}"
                cv2.rectangle(img, (0, 0), (240, 14), (0, 0, 0), -1)
                cv2.putText(img, label, (2, 11), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (255, 255, 255), 1, cv2.LINE_AA)
                tiles.append(img)
            while len(tiles) % 6:
                tiles.append(np.zeros_like(tiles[0]))
            grid = np.vstack([np.hstack(tiles[i:i + 6]) for i in range(0, len(tiles), 6)])
            cv2.imwrite(os.path.join(out_dir, f"sheet_{reason}_{cls}.jpg"), grid, [cv2.IMWRITE_JPEG_QUALITY, 85])


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "analyze":
        analyze(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        kw = {}
        rest = sys.argv[5:]
        for k, v in zip(rest[::2], rest[1::2]):
            kw[k.lstrip("-").replace("-", "_")] = float(v)
        build(sys.argv[2], sys.argv[3], sys.argv[4], **kw)
