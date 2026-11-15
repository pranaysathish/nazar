"""Accuracy experiment: CLIP image features + logistic regression, on the re-run's saved split.

Same 3,472 / 868 / 1,086 frames as Objectification_Final_Train_Evaluate.ipynb, so the test numbers compare fairly
with the re-run (80.85% frames, 90.91% per ad, ROC-AUC 0.89). Also: an ad-level (grouped) 5-fold check, where the
test ads are never seen in training, and the zero-shot CLIP prompt score (no training).

Usage: python -I clip_probe.py <frames.zip> <results dir with split_*.csv> <clip_scores.csv> <out dir> [model name]
"""
import csv
import io
import json
import os
import re
import sys
import time
import zipfile

os.environ.setdefault("DISABLE_SAFETENSORS_CONVERSION", "1")
import numpy as np
import torch
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler
from transformers import CLIPModel, CLIPProcessor

zip_path, res_dir, clip_csv, out_dir = sys.argv[1:5]
name = sys.argv[5] if len(sys.argv) > 5 else "openai/clip-vit-base-patch32"
os.makedirs(out_dir, exist_ok=True)
tag = name.split("/")[-1]


def member(p):  # /content/frames_cleaned/frames/OBJ/video35/frame_223.jpg -> frames/OBJ/video35/frame_223.jpg
    return p[p.index("frames/OBJ/") if "frames/OBJ/" in p else p.index("frames/NON_OBJ/"):]


splits = {}
for s in ("train", "val", "test"):
    with open(os.path.join(res_dir, f"split_{s}.csv"), encoding="utf-8") as f:
        splits[s] = [(member(r["frame_path"]), int(r["label"]), r["video"]) for r in csv.DictReader(f)]
allrows = splits["train"] + splits["val"] + splits["test"]
print({k: len(v) for k, v in splits.items()}, flush=True)

# ── CLIP image embeddings (cached) ─────────────────────────────────────────────
emb_path = os.path.join(out_dir, f"emb_{tag}.npz")
if os.path.exists(emb_path):
    E = dict(np.load(emb_path, allow_pickle=True))
    emb = {k: v for k, v in zip(E["names"], E["vecs"])}
else:
    torch.set_num_threads(os.cpu_count() or 4)
    model = CLIPModel.from_pretrained(name).eval()
    proc = CLIPProcessor.from_pretrained(name)
    z = zipfile.ZipFile(zip_path)
    names = [r[0] for r in allrows]
    vecs, t0 = [], time.time()
    for i in range(0, len(names), 32):
        imgs = [Image.open(io.BytesIO(z.read(n))).convert("RGB") for n in names[i:i + 32]]
        with torch.no_grad():
            out = model.get_image_features(**proc(images=imgs, return_tensors="pt"))
            f = out if isinstance(out, torch.Tensor) else out.pooler_output
            f = f / f.norm(dim=-1, keepdim=True)
        vecs.append(f.numpy())
        if (i // 32) % 40 == 0:
            print(f"  embedded {i + len(imgs)}/{len(names)} in {time.time() - t0:.0f}s", flush=True)
    vecs = np.concatenate(vecs)
    np.savez(emb_path, names=np.array(names), vecs=vecs)
    emb = dict(zip(names, vecs))


def xy(rows):
    return np.stack([emb[r[0]] for r in rows]), np.array([r[1] for r in rows]), [r[2] for r in rows]


def report(y, p, ads, label):
    pred = (p >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    pr, rc, f1, _ = precision_recall_fscore_support(y, pred, labels=[0, 1], zero_division=0)
    per_ad = {}
    for a, yy, pp in zip(ads, y, p):
        per_ad.setdefault(a, [yy, []])[1].append(pp)
    ad_ok = sum(int((np.mean(v[1]) >= 0.5) == v[0]) for v in per_ad.values())
    r = {"label": label, "frames": int(len(y)), "accuracy": round(accuracy_score(y, pred) * 100, 2),
         "roc_auc": round(roc_auc_score(y, p), 4), "obj_precision": round(pr[1], 3), "obj_recall": round(rc[1], 3),
         "obj_f1": round(f1[1], 3), "non_precision": round(pr[0], 3), "non_recall": round(rc[0], 3),
         "cm": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
         "ads": len(per_ad), "ads_correct": ad_ok, "ad_accuracy": round(ad_ok / len(per_ad) * 100, 2)}
    print(json.dumps(r), flush=True)
    return r


results = {"model": name}
Xtr, ytr, _ = xy(splits["train"])
Xva, yva, _ = xy(splits["val"])
Xte, yte, ate = xy(splits["test"])

# ── 1. Same split as the re-run: pick C on validation, refit on train+val, test once ──────────────
best = None
for C in (0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30):
    sc = StandardScaler().fit(Xtr)
    m = LogisticRegression(C=C, max_iter=5000, class_weight="balanced").fit(sc.transform(Xtr), ytr)
    acc = accuracy_score(yva, m.predict(sc.transform(Xva)))
    print(f"  C={C}: val acc {acc * 100:.2f}", flush=True)
    if best is None or acc > best[1]:
        best = (C, acc)
C = best[0]
Xtv, ytv = np.concatenate([Xtr, Xva]), np.concatenate([ytr, yva])
sc = StandardScaler().fit(Xtv)
m = LogisticRegression(C=C, max_iter=5000, class_weight="balanced").fit(sc.transform(Xtv), ytv)
results["same_split"] = report(yte, m.predict_proba(sc.transform(Xte))[:, 1], ate, f"CLIP+LR, re-run split, C={C}")
results["same_split"]["train_accuracy"] = round(accuracy_score(ytv, m.predict(sc.transform(Xtv))) * 100, 2)

# ── 2. New ads only: 5-fold split by advertisement (no ad in both training and test) ──────────────
X, y, ads = xy(allrows)
groups = np.array(ads)
p_all = np.zeros(len(y))
for k, (tr, te) in enumerate(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42).split(X, y, groups)):
    sc2 = StandardScaler().fit(X[tr])
    m2 = LogisticRegression(C=C, max_iter=5000, class_weight="balanced").fit(sc2.transform(X[tr]), y[tr])
    p_all[te] = m2.predict_proba(sc2.transform(X[te]))[:, 1]
results["unseen_ads_5fold"] = report(y, p_all, ads, "CLIP+LR, 5-fold by ad (unseen ads)")

# ── 3. Zero-shot CLIP prompts (no training at all), on the same test frames ───────────────────────
zs = {}
with open(clip_csv, encoding="utf-8") as f:
    for r in csv.DictReader(f):
        zs[f"frames/{r['class']}/{r['ad_folder']}/{r['frame']}"] = float(r["p_objectifying_cue"])
p0 = np.array([zs[r[0]] for r in splits["test"]])
results["zero_shot_test"] = report(yte, p0, ate, "CLIP zero-shot prompts, re-run test frames")

json.dump(results, open(os.path.join(out_dir, f"probe_{tag}.json"), "w"), indent=1)
print("saved", os.path.join(out_dir, f"probe_{tag}.json"))
