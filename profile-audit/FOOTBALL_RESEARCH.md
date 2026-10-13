# Football research guide (managers, teams, football ideologies)

Used by `/new-manager`, `/new-team` and `/new-football-ideology`. It turns the manual test in `docs/03-manual-research-method.md` into a fixed procedure. The spec is `tasks/2. CREATE_FOOTBALL_AGENT.md`.

Every football profile gets a research file **before** any audit. The research file is the evidence the audit answers from, so the audit isn't working from memory alone.

```
1. Verify the case and pin the period ── ambiguous? ask the user and STOP
2. Plan searches by dimension
3. Search (to find pages) → read pages (to get facts)
4. Rank sources, check every fact against the period
5. Stated view vs behaviour, quotes with provenance
6. Gaps (dimensions + axes), confidence, open questions
7. Save profile-audit/research/<catalog>/<id>.json → validate.py research
8. Audit (blocked until the football question pool exists)
```

---

## The 12 axes and the dimensions that feed them

Every profile scores 0–100 on each axis. 0 = left pole, 100 = right pole.

| Key | Axis | Left pole (0) | Right pole (100) | Fed by dimensions |
|---|---|---|---|---|
| `pos` | Possession | Ball | Counter | `possession`, `transitions` |
| `pro` | Progression | Patient build-up | Direct play | `build-up`, `transitions` |
| `est` | Structure | Positional | Relational | `shape`, `build-up` |
| `lar` | Width | Through the middle | Down the wings | `width` |
| `blo` | Block | Press high | Sit deep | `pressing`, `defensive-block`, `transitions` |
| `mar` | Marking | Zone | Man | `pressing`, `defensive-block` |
| `pla` | Game plan | Own identity | Adapt to the opponent | `game-management` |
| `res` | Purpose | Spectacle | Result | `stated-view`, `game-management` |
| `sis` | Who decides | System | Talent | `stated-view`, `game-management` |
| `jog` | Player type | Technique | Physicality | `player-profile` |
| `bas` | Squad | Youth | Experience | `squad-building` |
| `lid` | Leadership | Authority | Harmony | `people-management` |

The 13 research dimensions (use these exact keys in `sources[].dimension`):

| Key | Question it answers |
|---|---|
| `shape` | Base formation, and how it changes with and without the ball |
| `build-up` | How the team plays out from the back: goalkeeper role, short vs long, how many players |
| `possession` | How much the team wants the ball, and what it does with it |
| `pressing` | How high and how aggressively it presses, what triggers it, zonal or man-oriented |
| `defensive-block` | How deep it defends, how high its last line is, zonal or man marking |
| `transitions` | What happens right after winning or losing the ball (counter-attack, counter-press) |
| `width` | Wingers, full-backs, crosses vs central combinations |
| `set-pieces` | Importance and routines |
| `game-management` | Same plan every game, or changes by opponent or score; in-game changes |
| `stated-view` | What the manager says about their own football, with the date |
| `player-profile` | Technical or physical players; what the manager picks and signs for |
| `squad-building` | Who gets minutes: young players and debuts vs established veterans |
| `people-management` | Discipline, dressing room, relationship with stars, staff |

**Marking (`mar`) needs a dedicated search**: general tactical pieces rarely say whether the press and the block are zonal or man-oriented.

---

## Step 1 — Verify the case and pin the period (FR-1, FR-2, FR-3)

Before any research on style, confirm the case is real and fix its dates. One or two searches on dates and appointments are enough (Wikipedia season pages and club news are fine here).

Output:
- `profilePeriod: { start, end }`, with exact dates `YYYY-MM-DD`. Use partial dates (`YYYY-MM`, `YYYY`) only when the day can't be found, and say so in `scopeNote`. Use `"ongoing"` as `end` for a current spell.
- **Managers:** `spellsCounted[]` and `spellsExcluded[]`, each `{ club, start, end, reason }`. Apply the "known for" test: **a spell counts if it brought major titles, a recognisable style with tactical coverage, or a move to a bigger job.** Counted spells weigh the same. Excluded: spells where tactics didn't define them (e.g. Klopp's early player-manager years at Mainz). The manager's `profilePeriod` runs from the first counted spell's start to the last one's end. A spell runs from the appointment to the day the manager left the job (resignation, sacking or announced retirement), not to a later farewell appearance: Shankly retired on 1974-07-12, and the 1974-08-10 Charity Shield he led the team out at was Paisley's first match.
- **Teams:** the era is the profile (e.g. "Liverpool 2021/22", "Netherlands, 1974 World Cup"). Record `managers[]` as `{ managerId, start, end }`, using the manager catalog id (kebab-case, e.g. `jurgen-klopp`), never the team name. The id is the name the manager is known by in football, without accents (`renato-gaucho`, not `renato-portaluppi`; `pep-guardiola`). Before inventing one, check `profile-audit/research/manager/`, other team files' `managers[]` and the anchor ids in `validate.py` (`FOOTBALL_AXIS_POLES`), and reuse an id that is already there. When a team-era name covers several managers and the case is one manager's part, the team id ends with that manager's id (`vasco-2026-pedro-emanuel`). A team-era with a mid-period manager change lists every manager with their dates. When the profile is one manager's part of an era, the period follows the spell rule above: it starts on the appointment date (Pedro Emanuel at Vasco: 2026-07-11, debut 2026-07-16), not the first match.
- **Football ideologies:** the period is the era in which the idea was defined and practised (partial dates are fine). Record the managers and teams that exemplify it in `exemplars[]` (ids plus a one-line reason).

**Ambiguity: ask, never pick (FR-2).** If the period or the subject could mean more than one thing, add it to `ambiguities[]`, ask the user, and **stop until they answer**. Before stopping, save a stub research file (see "Stub files" in step 7) so the stop is on record. Examples:
- "Sundowns 2025": calendar year 2025 or the 2024/25 season?
- "Shankly – Liverpool": Shankly as a manager (1959–74) or "1970s Liverpool" as a team (mostly Paisley, 1974–83)?
- "Vasco 2026": that name also covers the Diniz and Renato spells earlier in the year; say which manager the case is about.

**Minimum evidence.** A team-era or a manager whose counted work is shorter than about **half a season (~15 competitive matches)** is too thin: tell the user, save a stub with the problem in `ambiguities[]`, and stop unless they say to go on. Above that, a low-confidence profile is allowed but is saved with the warning (see step 6).

## Step 2 — Plan searches by dimension (FR-4)

Fix the 13 dimensions before searching, so the research doesn't just collect whatever is easy to find and the gaps show up. Plan:
- one or two broad searches: `<team> <season> tactical analysis` / `<manager> tactics style of play`;
- one dedicated search for marking (`zonal` / `man-oriented` / `man-to-man` + the subject);
- one search for the manager's stated view (interviews, quotes);
- one search for squad building and people management when the broad results don't cover them;
- **in the local language** for non-English football cultures (FR-7): Portuguese for Brazil and Portugal, Spanish for Spain and Argentina, Italian, German, French, Dutch, etc. Portuguese sources were much better than English for Grêmio and Vasco.

When a famous topic's results are flooded with junk (SEO pages, Football Manager tactics, Wikipedia mirrors), repeat the search restricted to quality domains (UEFA, FIFA, Coaches' Voice, StatsBomb, These Football Times, club history sites, the main national press).

Budget: about 3 searches and 3 page reads per case. A famous case can stop earlier; a small or recent one needs more.

## Step 3 — Search to find, read to verify (FR-5, FR-8)

**The search summary is never evidence.** Search tools return links plus an AI-written summary; in the manual test that summary got years wrong (Renato's quote "2017", actually 8 Dec 2016), mixed up seasons (2018 pieces as 2017, 2022/23 as 2021/22) and invented claims (Liverpool 2021/22 "mid-block": the source says a higher press and a high line).

Rules:
1. Use search results **only to find pages**. Open the page and read it.
2. A fact is `verified: true` **only if it was read on the source page**. Ask the page reader for **verbatim quotes** and put them in `evidence`. A paraphrase is weaker than a quote.
3. A fact seen only in a search summary may be saved, but as `verified: false`. It never counts toward closing a gap.
4. Long pages get truncated (~100k characters): read them in parts and say in `evidence` which part, or record `truncated` in `unreadable[]` if the relevant part couldn't be reached.
5. **Blocked, empty or dead pages (FR-8):** try, in order:
   - a mirror: `legacy.` subdomains (`legacy.liverpoolfc.com`), `inside.fifa.com` for FIFA.com pages that come back empty;
   - an archive copy (`web.archive.org/web/<url>`);
   - the same author or data quoted elsewhere (FBref numbers quoted in an article; Jonathan Wilson's columns republished outside The Guardian).
   If all fail, add `{ url, reason }` to `unreadable[]` with `reason` one of `403`, `404`, `empty`, `truncated`, `not-accessible`. **Never skip a source silently.** Known: FBref, IOL and foot-africa.com return 403; The Guardian and BBC aren't accessible to the search tool; FIFA.com articles need JavaScript.

## Step 4 — Rank sources and check the period (FR-6)

Every source entry records `title`, `url`, `tier`, `language`, `articleDate`, `eventDate`, `accessedOn`, `dimension`, `evidence`, `verified`.

| Tier | Source type | Examples | Good for | Watch out for |
|---|---|---|---|---|
| A | Coach-written / technical study; data companies | FIFA Training Centre (Technical Study Group), Coaches' Voice, StatsBomb, Premier League "Talking Tactics" (Opta) | Precise build-up and structure; numbers | Often one match or a whole era: check which |
| B | Specialist tactical analysts; local tactical accounts | TheMastermindSite, Total Football Analysis, Between the Posts, local fan analysts ("Tática Vascaína") | Season-specific shapes, triggers, set pieces | Opinion mixed in; mid-season snapshots; fan-run |
| C | Mainstream press, columns, reference | Goal, Gazeta Esportiva, ESPN, Sunday World, Wikipedia season pages | Formations, dated quotes, narrative; dates and results | Columns present opinion as fact; Wikipedia has no tactics |
| D | Aggregators, SEO pages, PDFs of unknown origin | — | Nothing | Copied, undated or wrong. Don't use as evidence |

**Check every fact against the period.** Season-mixing was the most common error. `eventDate` is the date of what the fact describes (the match, the season, the interview), not the article date. A fact whose event falls outside `profilePeriod` (or, for managers, outside every counted spell) is not evidence for this profile: drop it, or keep it as context with `verified: false` and say why in `evidence`.

**Historical profiles (FR-11):** there is no data and no contemporary analysis. Prefer sources that **quote people from the time, with dates** (players, assistants, journalists of the era). Set `retrospectiveOnly: true` on facts found only in later retrospectives with no period quote.

## Step 5 — Stated view vs behaviour, quotes (FR-9, FR-10)

Keep what the manager **says** in `statedView[]`, separate from what the team **does** in `sources[]`. Unlike `sources[]`, `statedView[]` is **not limited to the profile period**: what a manager says about their football at any date is their stated view (Guardiola's 2014 rejection of tiki-taka applies to City 2017/18). Record the date, so the audit can weigh a later or earlier statement. Search for it explicitly: interviews, press conferences, books, and what the manager says about the popular label for their style. The gap between the two, or between the manager and the press label, is information, not noise: keep the contradiction.
- Guardiola rejects "tiki-taka" ("passing with no clear intention"): record it, and use "positional play" for the behaviour.
- Klopp coined "heavy metal football" himself.
- Renato's "quem sabe, sabe… quem não sabe, vai estudar" (Gazeta Esportiva, 2016-12-08) is about his management, not his team's tactics.

Each `statedView` entry: `quote` (original language), `date`, `source` (URL), `provenance`:
- `primary`: the interview, press conference or the earliest verifiable source carrying it, with its date;
- `attributed`: no primary source found. Record the earliest dated appearance in `date` and `source`. Example: Shankly's "The socialism I believe in…" has no original interview; the earliest dated appearance is 1995 (Tribune diary, 10 Mar 1995). Wording varies between versions: quote the earliest.

**Find the earliest before saving a quote.** A quote found in a later article is usually a repeat. Search the quote's key words (in the original language) to find its first appearance, and save that page and date. Renato's "quem sabe, sabe… quem não sabe, vai estudar" turns up in 2017 articles, but was first said in Gazeta Esportiva on 2016-12-08.

## Step 6 — Gaps, confidence, open questions (FR-4, FR-15, FR-12)

- `gaps.dimensions[]`: every dimension with **no verified fact**.
- `gaps.axes[]`: every axis with **no verified fact in any of the dimensions that feed it** (table above). A primary `statedView` entry counts as a verified `stated-view` fact. The audit is told these axes rest on memory alone. `validate.py research` recomputes both lists and fails if they're incomplete.
- `confidence`: `{ level: "high" | "medium" | "low", reason }`. As a guide: **high** = several tier A–B sources for the exact period that agree; **medium** = good evidence on some dimensions but mostly tier C, or one match only, or retrospective-only; **low** = short period, mostly one source, or tier B–C fan or press narrative. Low confidence is allowed; it's shown to the user and kept in the file as a warning.
- **Name the style** in `scopeNote` with the term the evidence supports, quoting the source that uses it ("positional play" for City 2017/18, from Spielverlagerung). If a popular label is wrong for what the evidence shows ("tiki-taka"), say so there too.
- `openQuestions[]`: what the user should decide or check (the ambiguities you asked about, disagreements between sources, labels to confirm).
- `influences[]` (optional): `{ id, kind: "manager" | "team" | "football-ideology", note }`, e.g. Coutinho → Michels (Total Football).

## Step 7 — Save and validate (FR-13)

Save to `profile-audit/research/<catalog>/<id>.json`, where `<catalog>` is `manager`, `team` or `football-ideology`, then run:

```
python3 profile-audit/validate.py research <catalog> <id>
```

Fix every error and read the warnings before reporting. The file format:

```json
{
  "id": "liverpool-2021-22",
  "catalog": "team",
  "name": "Liverpool 2021/22",
  "researchedOn": "2026-10-12",
  "profilePeriod": { "start": "2021-08-14", "end": "2022-05-28" },
  "scopeNote": "Premier League, cups and Champions League 2021/22.",
  "managers": [{ "managerId": "jurgen-klopp", "start": "2021-08-14", "end": "2022-05-28" }],
  "ambiguities": [],
  "openQuestions": [],
  "sources": [
    {
      "title": "Liverpool 2021/22 defensive structure – tactical analysis",
      "url": "https://totalfootballanalysis.com/head-coach-analysis/liverpool-2021-22-defensive-structure-tactical-analysis",
      "tier": "B",
      "language": "en",
      "articleDate": "2022-05-04",
      "eventDate": "2021/22",
      "accessedOn": "2026-10-12",
      "dimension": "defensive-block",
      "evidence": "\"We want to keep a high line because we know we can win the ball up high, and it's the risk you have to take\" (Van Dijk). 140 offsides provoked.",
      "verified": true
    }
  ],
  "statedView": [
    { "quote": "...", "date": "2016-12-08", "source": "https://...", "provenance": "primary" }
  ],
  "unreadable": [{ "url": "https://fbref.com/...", "reason": "403" }],
  "gaps": { "dimensions": ["set-pieces"], "axes": [] },
  "influences": [],
  "confidence": { "level": "high", "reason": "Two season-specific tier B analyses plus quotes." }
}
```

`status` is `"complete"` for a finished research run (the default when it's missing).

**Stub files.** When the agent stops to ask the user (step 1), it saves a stub with `"status": "awaiting-user"` and only `id`, `catalog`, `name`, `researchedOn`, `scopeNote`, a non-empty `ambiguities[]` and `openQuestions[]` (the questions asked), plus `profilePeriod` if it's already known. `validate.py research` accepts a stub without sources, gaps or confidence. When the user answers, the agent replaces the stub with the full research file.

Catalog-specific fields:
- **manager:** `spellsCounted[]`, `spellsExcluded[]` (`{ club, start, end, reason }`); optional `teamProfiles[]` (team profile ids).
- **team:** `managers[]` (`{ managerId, start, end }`).
- **football-ideology:** `exemplars[]` (`{ id, kind, reason }`).

`eventDate` accepts `YYYY-MM-DD`, `YYYY-MM`, `YYYY` or a season `YYYY/YY`.

## Step 8 — Audit (blocked in v1)

The football question pool (20 statements per axis) is a separate spec. **Until it exists, stop after step 7** and report the research to the user.

Once it exists, the audit reuses `profile-audit/README.md` (one strong model, every question answered independently "as" the profile, never working back from a target value, `validate.py` with the football anchor profiles), with two changes:
- the prompt includes the **whole research file**, not just a short description;
- the prompt lists `gaps.axes` and tells the auditor those axes have no verified evidence, so answers there come from general knowledge and must stay consistent with what *is* verified.

Dropped from the political pipeline: the religion field, the book step (5b), and the "answer as the regime" rule.

## Report to the user

End every run with: the profile id and period (and spells, for managers), confidence and why, the gaps (dimensions and axes), unreadable sources, open questions, the number of searches and page reads, and the `validate.py research` result.

## Testing

- **The research check:** `python3 -m unittest discover -s profile-audit/tests` runs the unit tests for `validate.py research` and for the grader (fixtures in `profile-audit/tests/fixtures/`).
- **The agent (acceptance):** `profile-audit/tests/acceptance/cases.json` holds the expected results of the 8 manual cases in `docs/04-research-test-profiles.md`. Run a case's `input` command in Claude Code, then grade the file it saved: `python3 profile-audit/grade_research.py <case>` (`--list` shows the cases). A FAIL on a "must" check fails the case; a WARN is a "should". The grader can't confirm that a fact is really on its page: spot-check a few by hand. Re-run the cases after any change to this guide.
