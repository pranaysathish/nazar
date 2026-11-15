# Dataset

| File | What it is |
|---|---|
| `../frames.zip` | All frames extracted from the 110 YouTube advertisements (55 objectifying `OBJ`, 55 non-objectifying `NON_OBJ`): 8,129 frames, one folder per ad (`frames/OBJ/videoN`, `frames/NON_OBJ/videoN`). |
| `frames_cleaned_auto.zip` | The cleaned dataset used for the final model: **5,426 frames** (OBJ 2,483 / NON_OBJ 2,943), all 110 ads. Same folder layout. |
| `cleaning_log.csv` | One line per original frame: the decision (kept / blank / no_person / duplicate) and the measurements behind it. |
| `cleaning_summary.json` | The rules and the counts per class. |
| `clean_frames.py` | The script that produced the cleaned set (needs `torch` and `torchvision`). |

## Cleaning rules (applied in this order)

1. **blank** — grayscale standard deviation < 10, or mean brightness < 12 (black) or > 243 (white).
2. **no_person** — no COCO "person" detection with score ≥ 0.3 covering ≥ 1.5% of the frame
   (SSDlite320-MobileNetV3, torchvision). Removes product shots, logos, text slides and scenery.
3. **duplicate** — within one ad, in time order: dHash Hamming distance ≤ 5 to the previous kept frame.

Removed: 491 blank, 1,226 no person, 986 duplicates. Every ad keeps at least one frame.
Labels are per advertisement: every frame inherits its ad's label (OBJ = 1, NON_OBJ = 0).

## Reproduce the cleaned set

```bat
pip install torch torchvision opencv-python-headless numpy
python -I clean_frames.py analyze ..\frames.zip frame_metrics.csv <folder where torchvision is installed>
python -I clean_frames.py build   ..\frames.zip frame_metrics.csv out
```

The script's default settings are the ones used here (blank std 10, blur rule off, person score 0.3,
person area 1.5%, duplicate distance 5), so `out/frames_cleaned_auto.zip` will contain the same 5,426 frames.
