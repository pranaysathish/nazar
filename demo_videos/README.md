# Demo videos

Short 480p copies of YouTube advertisements, for uploading in the demo (no internet needed).
Scores from the deployed model (`objectification_model.h5`, the 85.68% run), backend, 30 sampled frames:

| File | In the training dataset? | Score | Verdict | Sharp frames |
|---|---|---|---|---|
| Engage_Deo_dataset.mp4 | yes (objectifying) | 93.0% | OBJECTIFYING | 22 of 30 |
| Axe_Elevator_dataset.mp4 | yes (objectifying) | 70.2% | OBJECTIFYING | 24 of 30 |
| Wild_Stone_No_Gas_dataset.mp4 | yes (objectifying) | 74.3% | OBJECTIFYING | 3 of 30 |
| Google_Search_Reunion.mp4 | no | 27.5% | NOT OBJECTIFYING | 5 of 30 |
| Tata_Tea_Jaago_Re_2017.mp4 | no | 27.4% | NOT OBJECTIFYING | 24 of 30 |
| extra_borderline/Surf_Excel_Puddlewar.mp4 | no | 50.4% | OBJECTIFYING (false positive) | 28 of 30 |
| extra_borderline/Fevicol_Bus.mp4 | no | 50.1% | OBJECTIFYING (false positive) | 29 of 30 |

Suggested order in the review: Engage (clearly objectifying), then Tata Tea (clearly not), then Axe.

The two borderline false positives (just above 50%) are scenes full of people and moving bodies: the model
reacts to people and bodies rather than to context. Keep them for the question "does it ever get it wrong?".
Wild Stone is dark, so few frames pass the blur check and the confidence is low (7.4%) even though the
verdict is right.
