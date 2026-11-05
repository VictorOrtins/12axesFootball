# Football audit (managers, teams, football ideologies)

Step 8 of `FOOTBALL_RESEARCH.md`. It turns a finished research file into a 12-axis vector by having a strong model answer the quiz **as the profile**, question by question. Adapted from the political pipeline (git `302a66c`: `profile-audit/README.md`, `profile_vector.py`, `validate.py`).

```
1. Build the prompt      audit_prompt.py <catalog> <id>        → prompts/<catalog>/<id>.txt
2. Run the subagents     one per profile, in parallel           → subagent-out/<catalog>/<id>.json
3. Validate              validate.py audit <catalog> <id>       → form, neutrals, vector
4. Check and merge       anchors, neighbours, backend catalogs  (not built yet)
```

## The vector

The quiz pool is `backend/src/main/resources/data/questions-pool.json`: 60 statements, 5 per axis. The profile answers all 60, like a user. `profile_vector.py` does the same maths as `ScoringService.java`:

- `DT=0, D=0.25, N=0.5, C=0.75, CT=1`, flipped when `agreePole` is `RIGHT`, times the question's `weight`;
- a question with `secondary` also counts on that second axis, with its own pole and weight (0.5);
- archetype questions count too, if `archetype-questions.json` has any (it's empty for football now);
- each axis is the weighted mean × 100, rounded to 1 decimal.

The vector is **leftPercent**: 100 = the left pole in `axes.json` (Ball, Patient build-up, Positional...), 0 = the right pole. That is what `ProfileMatchScorer` compares with the user's result.

## 1. Build the prompt

```
python3 profile-audit/audit_prompt.py <catalog> <id>
```

Only for research files with `status` `complete` (a stub is refused). The prompt has:
- the method: personaBrief per axis, then every question on its own, never working back from a target value; at most one `N` per axis and 10 in total; a profile can reject both poles;
- **the whole research file**, with how to read it (verified vs unverified facts, the period, stated view vs behaviour);
- `gaps.axes`: the axes with no verified evidence, where the answers come from general knowledge and must stay consistent with what is verified;
- the questions per axis, shuffled (stable per profile id), in Portuguese with the English text and the "agree means / disagree means" help.

Who answers: a **manager** answers across their counted spells; a **team** answers as its manager(s) of that era would for that team; a **football ideology** answers as a coach committed to it, as its exemplars practised it.

## 2. Run the subagents

- One subagent per profile, all of a batch launched **in the same message**. Batches of up to 15, one catalog per batch.
- A strong model (Opus or Sonnet), never a fast/cheap one: answer quality drops visibly.
- The subagent gets the prompt file's content and writes `subagent-out/<catalog>/<id>.json`.
- Never tell a subagent another profile's answers or a target value.

## 3. Validate

```
python3 profile-audit/validate.py audit <catalog> <id>
```

- `[FORMA]`: all 12 axes, exactly the pool's questions under each axis, codes `DT/D/N/C/CT`, personaBrief filled.
- `[NEUTROS]`: more than 30% `N` on an axis (2 of 5) or 18% in total (11 of 60) fails.
- `[VETOR]`: prints the vector.

If it fails, rerun only that subagent, saying which check failed and on which axes. Passing the form check isn't enough: read the vector against the research file (see "Failure modes").

## 4. Check and merge (not built yet)

Still to build: the content check against the anchors in `validate.py` (`FOOTBALL_AXIS_POLES`) and against near-duplicate profiles; writing the entries and vectors into `managers.json` / `manager-profiles.json`, `teams.json` / `team-profiles.json`, `football-ideologies.json` / `football-ideology-profiles.json` (and the `i18n/en` files); then archiving each output in `answers/<catalog>/<id>.json` (permanent, never deleted) and clearing `prompts/` and `subagent-out/`.

## Failure modes (from the political audit)

1. **Too many neutrals.** Each `N` is exactly 50: an axis full of them doesn't measure the profile. The validator blocks it.
2. **Duplicate profile.** A new profile ~97% identical to another adds nothing. Before auditing, name the closest profiles and what sets this one apart.
3. **False opposite.** When a profile rejects one pole, the model assumes it embraces the other. Many reject both. Symptom: the personaBrief admits the tension while the answers collapse to one side.
4. **Normalising the unusual.** The model pulls atypical profiles into the most familiar box. Name the unusual traits in the prompt.
5. **Invalid codes.** A subagent once wrote `A`/`B`/`E`. The validator catches it.

## Rules that can't be broken

- Never run a batch's subagents one at a time, never use a weak model.
- Never bring a profile's answers closer to a similar profile's: each profile is answered alone.
- Never merge an output without running `validate.py audit` and reading the vector.
- Never delete files in `answers/`.
