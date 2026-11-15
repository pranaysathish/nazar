# Cleaning audit (blind check of 240 frames)

**Question.** Did the rule-based cleaning (`data/cleaned/clean_frames.py`, 8,129 → 5,426 frames) work, and how
clean are the labels of the frames it kept?

**Method.** 240 frames were drawn at random (seed 7) from `data/frames.zip`: 120 kept frames of objectifying (OBJ)
ads (at most 3 per ad), 48 kept frames of non-objectifying ads, 24 frames removed as blank, and 48 removed as
"no person". They were shuffled and shown on 20 numbered contact sheets with no labels (`make_sheets.py`), so the
checkers did not know a frame's class or cleaning decision. Two AI vision checkers judged every frame on its
own: is a person visible, and does THIS frame show a woman portrayed in an objectifying way (the project's OBJ
criteria). The answers are matched to the hidden key in `audit_merged.json` (`key.csv` is the key).

| Group (sample) | Frame looks objectifying on its own | Notes |
|---|---|---|
| Kept, from OBJ ads (120) | **27 (22%)** | 90 look normal: people talking or acting (65), clothed women, products |
| Kept, from non-OBJ ads (48) | 0 (0%) | the negative class is clean |
| Removed as "no person" (48) | 1 (2%) | 33 truly show no person (logos, products, scenery); 15 show a person or body part the detector missed, mostly harmless (feet, silhouettes, distant people), but one was a key objectifying shot |
| Removed as "blank" (24) | 0 (0%) | mostly dark text or logo end cards (14) and transitions (6) |

**Findings.**
1. The removal rules work: what they removed is almost never objectifying (1 of 72 sampled removed frames).
2. The real problem is the label of the kept frames: only about **1 in 5 frames from an objectifying ad shows
   objectification by itself**. Every frame inherits its ad's label, so the frame classifier is trained on many
   normal frames labelled "objectifying". No frame-cleaning rule can fix this.
3. Objectification is concentrated in a few moments of an ad. This supports models that judge the **whole ad**
   and learn which frames matter (see `../clip_probe/whole_ad.py`), or labelling the key frames by hand.

Caveat: AI judgement of "objectifying" is subjective; a person should confirm a sample before relying on the
exact percentages.
