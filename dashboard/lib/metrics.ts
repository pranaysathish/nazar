// The model's results — the single source for every page.
//
// ORIGINAL = the run whose model the application uses (notebooks/Model_train.ipynb): MobileNetV2 trained on the
//   hand-cleaned frames, then tested in the same session on 922 frames it had never seen.
// METRICS / DATASET = the reproducible re-run with the same design (notebooks/Objectification_Final_Train_Evaluate.ipynb,
//   results/metrics.json) on the automatically cleaned frames; it provides the detailed evaluation
//   (per-class metrics, confusion matrix, ROC and precision-recall curves in public/metrics/).
export const ORIGINAL = {
  notebook: "Model_train.ipynb",
  accuracy: 85.68, // final test accuracy after fine-tuning
  accuracyBeforeFineTuning: 83.95,
  ads: 109,
  objAds: 54,
  nonObjAds: 55,
  frames: 4606,
  train: 2948,
  val: 736,
  test: 922,
};

export const SOURCE_NOTEBOOK = "Objectification_Final_Train_Evaluate.ipynb";

export const METRICS = {
  accuracy: 80.85, // 878 of 1086 test frames correct
  accuracyBeforeFineTuning: 78.27,
  baseline: 54.24, // always predicting the larger class
  adLevelAccuracy: 90.91, // 100 of 110 ads: mean score of each ad's held-out frames >= 0.5
  auc: 0.89,
  averagePrecision: 0.88,
  obj: { precision: 0.84, recall: 0.71, f1: 0.77, support: 497 },
  nonObj: { precision: 0.79, recall: 0.89, f1: 0.83, support: 589 },
  macroF1: 0.8,
  cm: { tn: 524, fp: 65, fn: 143, tp: 354 },
};

// Re-run dataset: all 110 ads, frames cleaned automatically (data/cleaned/clean_frames.py).
export const DATASET = {
  ads: 110,
  objAds: 55,
  nonObjAds: 55,
  framesExtracted: 8129,
  frames: 5426,
  framesObj: 2483,
  framesNonObj: 2943,
  train: 3472,
  val: 868,
  test: 1086,
};

// Keyword set K used for the caption keyword score M(C) (backend/predictor.py, same list as
// Objectification_DL.ipynb cell 8).
export const KEYWORD_COUNT = 17;
