"""Blind audit sample of the frame cleaning: 240 frames, shuffled, numbered on contact sheets (no labels shown).
Usage: python -I make_sheets.py <frames.zip> <cleaning_log.csv> <out dir>"""
import csv, io, os, random, sys, zipfile
from PIL import Image, ImageDraw, ImageFont
zip_path, log_path, out = sys.argv[1:4]
os.makedirs(os.path.join(out, "sheets"), exist_ok=True)
rows = list(csv.DictReader(open(log_path, encoding="utf-8")))
rng = random.Random(7)
def pick(cond, n, per_ad=None):
    pool = [r for r in rows if cond(r)]
    rng.shuffle(pool)
    if per_ad is None:
        return pool[:n]
    out_, count = [], {}
    for r in pool:
        k = (r["class"], r["ad_folder"])
        if count.get(k, 0) < per_ad:
            out_.append(r); count[k] = count.get(k, 0) + 1
        if len(out_) == n:
            break
    return out_
sample = (pick(lambda r: r["class"] == "OBJ" and r["decision"] == "kept", 120, per_ad=3)
          + pick(lambda r: r["class"] == "NON_OBJ" and r["decision"] == "kept", 48, per_ad=2)
          + pick(lambda r: r["decision"] == "blank", 24)
          + pick(lambda r: r["class"] == "OBJ" and r["decision"] == "no_person", 36)
          + pick(lambda r: r["class"] == "NON_OBJ" and r["decision"] == "no_person", 12))
rng.shuffle(sample)
z = zipfile.ZipFile(zip_path)
try:
    font = ImageFont.truetype("arialbd.ttf", 30)
except OSError:
    font = ImageFont.load_default()
TW, TH, COLS, ROWS = 400, 225, 3, 4
with open(os.path.join(out, "key.csv"), "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh); w.writerow(["sheet", "idx", "class", "ad_folder", "frame", "decision", "person_score", "person_area"])
    for s in range(0, len(sample), COLS * ROWS):
        sheet_no = s // (COLS * ROWS) + 1
        sheet = Image.new("RGB", (COLS * TW + (COLS + 1) * 10, ROWS * TH + (ROWS + 1) * 10), (255, 255, 255))
        for k, r in enumerate(sample[s:s + COLS * ROWS]):
            im = Image.open(io.BytesIO(z.read(f"frames/{r['class']}/{r['ad_folder']}/{r['frame']}"))).convert("RGB")
            im.thumbnail((TW, TH))
            x, y = 10 + (k % COLS) * (TW + 10), 10 + (k // COLS) * (TH + 10)
            sheet.paste(im, (x + (TW - im.width) // 2, y + (TH - im.height) // 2))
            d = ImageDraw.Draw(sheet)
            d.rectangle([x, y, x + 46, y + 40], fill=(255, 220, 0)); d.text((x + 8, y + 3), str(k + 1), fill=(0, 0, 0), font=font)
            w.writerow([sheet_no, k + 1, r["class"], r["ad_folder"], r["frame"], r["decision"], r["person_score"], r["person_area"]])
        sheet.save(os.path.join(out, "sheets", f"sheet_{sheet_no:02d}.png"))
print("frames", len(sample), "sheets", (len(sample) + 11) // 12)
