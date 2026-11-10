# Stage 2B Final Comparison

**Experiment:** `phase-05.1-stage-2b`  
**Videos:** same 192 frames, 24 fps, 1280×720, 8.000 seconds, same background/camera/prop/renderer  
**Paid calls:** 9 (4 OpenAI, 5 Gemini)  
**Combined completed-usage cost:** $0.676329

| Criterion             | OpenAI                       | Gemini                                 |
| --------------------- | ---------------------------- | -------------------------------------- |
| Master quality        | Strong, detailed, expressive | Clean but simpler                      |
| Identity preservation | Strong                       | Moderate; face/turban needed repair    |
| Part consistency      | Good                         | Moderate; original arms sheet rejected |
| Shoulder              | Acceptable, visible seam     | Weak, tubular upper arm                |
| Elbow                 | Acceptable, cuff seam        | Moderate, tubular forearm              |
| Wrist/hand            | Good                         | Good                                   |
| Hip/knee              | Good, cloth thigh compromise | Moderate after local repair            |
| Walking               | More believable              | Stiffer, arms often hidden             |
| Reach/grip            | Clear                        | Clear but tubular                      |
| Alpha/edges           | Native alpha, clean          | Chroma key/despill, some fringe        |
| Manual repair         | Moderate                     | High                                   |
| Generation usage      | 4 requests / 4 images        | 5 requests / 5 images                  |
| Spend                 | $0.403720                    | $0.272609                              |

## Verdict

**OpenAI: conditional pass.** It is the stronger, more coherent character. It is suitable for a
next small-gate test, not a full-film approval.

**Gemini: conditional / needs repair.** It is technically complete and cheaper, and its elbow
seam is still clean, but the arm, face and clothing repairs leave it below OpenAI on identity and
seam quality. Preserve it as a valid comparison; do not promote it to production without another
targeted pass.

Neither provider is approved for a full library or film. The next decision should be a separate
small gate, not an automatic full-film budget.
