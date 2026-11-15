# Experiment: CLIP image features + logistic regression

A quick test of whether a stronger image representation improves accuracy. Run on 15 Nov 2026 on a laptop CPU
(no GPU, about 5 minutes for the features, seconds for the classifier).

**Method.** Every frame of the re-run dataset (5,426 rule-cleaned frames, 110 ads) is turned into a 512-number
CLIP ViT-B/32 image embedding (`openai/clip-vit-base-patch32`, frozen). A logistic-regression classifier
(class-balanced, regularisation C chosen on the validation frames) is trained on the embeddings. It uses
**exactly the same split** as the re-run notebook (`results/split_*.csv`: 3,472 / 868 / 1,086), so the test
numbers compare fairly with the re-run's MobileNetV2 results.

| Test | MobileNetV2 re-run | CLIP ViT-B/32 + LR | CLIP ViT-B/16 + LR |
|---|---|---|---|
| Frame accuracy, 1,086 test frames | 80.85% | 88.86% | **90.98%** |
| ROC-AUC | 0.89 | 0.96 | **0.97** |
| Objectifying: precision / recall / F1 | 0.84 / 0.71 / 0.77 | 0.89 / 0.86 / 0.88 | 0.90 / 0.90 / 0.90 |
| Per-ad accuracy (mean of each ad's test frames ≥ 0.5) | 90.91% (100/110) | 92.73% (102/110) | **97.27% (107/110)** |
| Confusion matrix TN / FP / FN / TP | 524 / 65 / 143 / 354 | 537 / 52 / 69 / 428 | 541 / 48 / 50 / 447 |

ViT-B/16 (`openai/clip-vit-base-patch16`) takes about 4 times longer to compute features (about 20 minutes for
5,426 frames on the laptop CPU).

**Unseen ads.** With a 5-fold split *by advertisement* (no ad in both training and test), CLIP + logistic
regression classifies 77.35% of frames and 88.18% of ads (97/110) correctly with ViT-B/32, and 77.98% of frames
and **93.64% of ads (103/110)** with ViT-B/16 (ROC-AUC 0.86). This is the honest estimate for completely new
advertisements; the frame-level splits above let frames of the same ad appear in training and test.

**Zero-shot CLIP prompts** (no training: "a photo of a woman in revealing clothing" against neutral prompts)
score only 52.03% on the test frames, close to chance, so the prompt score is not a usable label-cleaning signal.

**Caveats.** Training accuracy 93.78%. The deployed app still uses the MobileNetV2 model (85.68%), whose test
set is different, so 88.86% and 85.68% are not directly comparable. Grad-CAM in the app needs a CNN; a CLIP-based
app would need a different heat-map method.

Run: `python -I clip_probe.py <data/frames.zip> <results dir> <clip_scores.csv> <out dir> [model name]`
(`clip_scores.csv` holds the zero-shot prompt scores; the script caches the embeddings in the out dir).
Results: `probe_clip-vit-base-patch32.json`, `probe_clip-vit-base-patch16.json`.
A whole-advertisement model (attention over frames, a temporal GRU) compared with frame averaging on unseen ads is
work in progress.
