# Data model — one folder per application + append-only event log

This is the reasoning behind how applications are tracked. The short version: keep
**one folder per application**, store the history as an **append-only event log**,
and **generate** the board/funnel from it. Nothing is stored twice.

## The problem with a single status field

A naive tracker stores the status in one place (a frontmatter field, or a cell in a
board table). That gives you the *current* state but loses the history, offers no
next-action, and — if the status lives in two places — drifts out of sync. Every
transition then means editing the status in two places.

## The pattern professional systems converge on

Recruiting systems (Greenhouse, Lever, Workable, Ashby) and serious personal job
trackers (Teal, Huntr, Simplify) share four principles:

1. **Person ↔ application are separate.** The candidate (stable) vs. the
   application (carries the workflow state, moves independently). In a single-user
   repo that's already the split: the candidate is you (`cv/`), each application is
   a folder.
2. **A configurable stage pipeline** with a canonical default
   `applied → screen → assessment → interview → offer → hired` plus terminal states
   `rejected / withdrawn`.
3. **Structured rejection reasons** (an enum, not free text), distinguishing
   company-side vs. your own withdrawal — the precondition for aggregatable
   reporting.
4. **A timestamped event log as the foundation.** All funnel metrics (time-in-
   stage, conversion, stage counts) are **derived from the event log**, not stored
   as their own fields. This is the ATS event-log model — one clean log carries
   everything.

To that, personal trackers add: **always pair `status` with a dated next-action** —
the surface should answer "what do I do next and when", not just "where does this
stand".

## What this template uses

**Per application, `applications/<slug>/job.md` frontmatter** — the static job data
(company, role, location, source, deadline) plus your tracking fields (match,
recruiter, channel) and a **hand-editable** `status`. Field names borrow from the
[schema.org/JobPosting](https://schema.org/JobPosting) vocabulary; the CV side
borrows from [JSON Resume](https://jsonresume.org/schema/).

**Per application, `applications/<slug>/events.jsonl`** — append-only history, one
JSON line per event:

```jsonl
{"ts":"2026-07-10","type":"created","note":"drafted from posting"}
{"ts":"2026-07-15","type":"applied","note":"submitted direct application"}
{"ts":"2026-08-02","type":"interview","round":1,"note":"first round, HR + hiring manager"}
{"ts":"2026-08-10","type":"rejected","reason":"other_offer","side":"company","note":"filled internally"}
```

Append-only is **maximally diff/merge-friendly** — you only ever add lines to the
end, never touch old ones, which goes "with the grain" of git. The current status
is an **idempotent fold** over the log (last state-changing event wins), so the
board is deterministically *derivable* rather than separately maintained.

### Why not one central `applications.yaml`?

A single file is the worst option for git: constant merge conflicts, one giant
diff, and the per-application folder loses its meaning (stable links, per-app
history). One folder per application keeps links and history stable.

## Generation

[`scripts/build_board.js`](../scripts/build_board.js) reads all `job.md` frontmatter
+ `events.jsonl` files + the headhunter CRM, folds the events into a status, and
rewrites the `## Board`, `## Funnel` and `## Headhunters` sections between the
`<!-- board:start -->` / `<!-- board:end -->` markers in
`applications/README.md`. It's zero-dependency Node, idempotent (a second run
yields no diff), and warns on unknown statuses or event/frontmatter inconsistency.
Content outside the markers is preserved verbatim, so you can keep hand-written
prose (a candidate pipeline, notes) around the generated block.
