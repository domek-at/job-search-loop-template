---
# ---------------------------------------------------------------------------
# AGENTS.example.md — criteria-as-code for your job search.
#
# Copy this file to AGENTS.md and replace every <your ...> placeholder with real
# values. This frontmatter holds machine-readable STANDARDS an automated loop can
# consume; the Markdown body below holds the human-readable criteria. If you run
# by hand, you only really need the body — but keeping the frontmatter accurate
# lets a loop (see docs/loop.md) enforce your guardrails automatically.
# ---------------------------------------------------------------------------
name: <your-repo-name>            # e.g. my-job-search
version: 0.1.0

# Optional: standards for an automated loop (safe to leave as-is if you run by hand)
loop:
  branch_pattern: "applications/{company-slug}-{role-slug}"  # one branch per application
  default_branch: main
  pr_base: main
  commit_format: conventional
  # Guardrails the loop must never violate (see "CV-tailoring guardrails" below):
  hard_gates:
    - cv_tailoring_no_invention     # only re-weight existing content; never invent
    - cv_preserve_job_titles        # never rewrite your REAL job titles
    - cv_tailor_scope_top_only      # tailor profile/highlights/skills only; freeze career history
    - region_attendance_mode_check  # match the posting's on-site mode to your region rules
    - source_whitelist_only         # only pull postings from whitelisted sources
---

# AGENTS.md — <your name>'s job-search criteria

Single source of truth for: what I'm looking for, what I avoid, and how the loop
(or I) should work. Fill in every section; delete the examples that don't apply.

## Target roles — WANTED

List the role directions you're actually chasing. Be concrete — these are what a
match is scored against.

- **<your primary target role>** — e.g. "Process architect (end-to-end design of
  business processes, interfaces, standardization)"
- **<your second target role>** — e.g. "AI operations (designing + rolling out
  AI-assisted workflows inside companies)"
- **<your third target role>** — e.g. "Operations lead (steering internal
  processes, COO-adjacent — business-side, NOT IT systems operation)"
- **<secondary track, optional>** — a direction you'd take but that's weaker on
  your CV; prioritize it lower.

## Target roles — NOT wanted

Just as important. These keep the loop from wasting your time.

- **<a role type that looks similar but isn't a fit>** — e.g. "pure IT
  infrastructure / systems administration — 'operations' in the title does NOT
  automatically mean a fit; if the scope is IT systems operation, skip it."
- **<a role type that's a hard pain-point for you>** — e.g. "pure sales /
  cold-acquisition roles."
- **<anything you've deliberately ruled out>**

> **Exclusion list:** keep a running list of specific companies/roles you've seen
> and rejected (and generalized patterns) in `research/exclusion-list.md`. A loop
> must read it before every run and not re-propose listed items.

## Industries — WANTED

- **<industry-open, or list specific industries>** — e.g. "industry-agnostic:
  match is scored on role profile + company character, not industry."

## Industries — NOT wanted (hard no)

Categorical exclusions — enforced as a hard gate.

- **<industry 1>** — generic examples: weapons / defense manufacturing
- **<industry 2>** — gambling (casino, betting, online gambling)
- **<industry 3>** — tobacco
- **<industry 4>** — adult content
- **<industry 5>** — fossil-fuel extraction as core business
- _add your own_

## Working language

State which languages are fine for the posting and interview. Example:
"<language A> and <language B> are both OK; a <language B>-only posting is not an
extra hurdle." Language requirement is not a filter criterion.

## Regions & attendance modes

Define graded modes and the rule for each. A loop matches the posting's attendance
mode and checks the matching rule.

- **On-site (daily):** office within **<your max commute, e.g. 30 minutes>** of
  `<your base location>`.
- **Hybrid (regularly present, not daily):** office within **<your max, e.g.
  100 km>** of `<your base location>`.
- **Fully remote (<your country>):** location within the country doesn't matter.
  Flag foreign-remote postings for manual review.

If the attendance mode isn't clear from the posting, treat it conservatively as
"hybrid" + flag `attendance_mode_unclear=true`.

## Employment model

- **Full-time / part-time:** <your preference>
- **Salary (gross, per <month|year>):**
  - Target range (orientation, decide edge cases yourself): **<your min> – <your max>**.
  - Note whether you filter hard on salary or evaluate it manually. Many postings
    only state a legal minimum, so a hard filter can wrongly drop good matches.
- **Earliest start date:** `<your date, or "by arrangement">`. If your real start
  date is sensitive/internal, do NOT put a fixed date in outbound documents.

## Company size

- **Acceptable from:** `<e.g. 15>` employees.
- **Ideal from:** `<e.g. 30>` employees.
- **Exception:** if a role is unusually interesting, allow smaller companies but
  flag `small_firm_exception=true` so you spot it during review.

## Other hard no-gos

- **<e.g. multi-level marketing / structural sales>** — categorically out.
- **Required travel over <your threshold, e.g. 10%>** — knockout criterion.
  Acceptable: `<e.g. ~a few days once a quarter>`. Not acceptable:
  `<e.g. "30% travel", "regular field work">`. If the posting only states it
  qualitatively, flag `travel_qualitative_only=true` for manual review.
- _add your own_

## Source whitelist / blacklist

The loop may use **only** the sources listed here (anti-hallucination guard).

**Whitelisted job sources:**

- [x] `<your primary job board>`   — e.g. a national job board (mandatory source)
- [x] `<your secondary job board>`
- [ ] `<a source you have NOT yet cleared>` — leave unchecked until you approve it

**Blacklisted / not-yet-cleared sources:**

- `<source you don't want scraped>` — e.g. "LinkedIn Jobs: not yet — profile needs
  cleanup first."

---

## CV-tailoring guardrails

These are the non-negotiable rules for producing per-job CV/cover variants. They
exist so tailoring stays **honest**.

### `cv_tailoring_no_invention`
A per-job CV may **only** re-weight or re-prioritize experience/skills that already
exist in `cv/master.md`. Never add experience or skills that aren't in the master.
If there's a gap, name it as a gap — don't paper over it.

### `cv_preserve_job_titles`
Your **real job titles** are **never** changed or replaced with a title that
matches the target role — not in the CV, cover letter, tagline, or any outreach.
Re-weighting runs purely through emphasis, ordering, descriptive prose, and an
optional tagline addendum *after* the real title — never through the title itself.
Rewriting a title misrepresents your position/seniority and is dishonest.

### `cv_freeze_career_history` / `cv_tailor_scope_top_only`
Per-job tailoring is limited to **Profile**, **Key achievements** and **Core
skills** (re-weighting / ordering / emphasis allowed there). The **career history**
(dates, roles, numbers, wording) stays **verbatim to `cv/master.md`** and is not
rewritten per application. A constant, factual history is consistent across all
applications, has fewer error sources, and is less to maintain. Order the master
history once toward your target cluster; don't re-tune it per posting.

### `cv_no_personal_details`
Personal circumstances (marital status, children, hobbies) don't belong in a CV or
cover letter. The profile must sell on skills + experience alone.

### `cv_no_inline_versioning`
Any document meant for external recipients (recruiters, companies) contains **no**
in-document versioning: no "as of:" lines, no change history, no "created on"
notes. Versioning lives in git, not in the document.

### `style_calibration` (cover letters)
Calibrate cover letters against anonymized samples of your own writing (see
`style/README.md`) — tone, sentence length, salutation, sign-off. Avoid generic
corporate boilerplate. Match the **register** to the recipient: a known,
semi-formal contact gets your informal register; a cold outreach to an unknown
recruiter/company gets a formal register. When unsure, go more formal.
