# job-search-loop-template

A **git-native job-search system**: your CV and criteria live as version-controlled
files, an LLM (optionally an automated loop) finds matching jobs, and your
application pipeline is tracked as plain files with a **generated** board.

> _[Deutsche Version](README.de.md)_

This is a **sanitized public template**. Everything in it is placeholder/fictional —
fork it, drop in your real data, and make it private.

---

## The idea

- **Master CV + master cover letter are the source of truth.** Your CV lives at
  [`cv/master.example.md`](cv/master.example.md) (rename to `cv/master.md` once
  you fill in your own). Every per-job variant is derived from it, so a diff shows
  exactly what was re-weighted.

- **Search criteria are code.** What roles / regions / industries you want (and
  don't), how far you'll commute, your salary range, which job sources to trust —
  all of it lives in [`AGENTS.example.md`](AGENTS.example.md) as a single source
  of truth. A human or an LLM reads it to decide what counts as a match.

- **An LLM finds matching jobs.** Point a capable LLM at your criteria and a
  whitelist of job sources; it proposes matches with a match-score and a rationale.
  You can do this by hand ("here are my criteria, here are 10 postings, which fit?")
  or automate it with a loop (see below).

- **Per-job CV re-weighting — emphasis only, never invention.** For a given posting
  you re-order and re-emphasize existing achievements. You **never** invent
  experience or skills you don't have, and you **never** rewrite your real job
  titles to match the target role. See the CV-tailoring guardrails in
  `AGENTS.example.md`.

- **Application status is tracked as files.** One folder per application under
  `applications/<company-role>/`, each holding a `job.md` (metadata + hand-editable
  `status`) and an append-only `events.jsonl` (the history). The board, funnel and
  headhunter table in [`applications/README.md`](applications/README.md) are
  **generated** from those files by [`scripts/build_board.js`](scripts/build_board.js)
  — zero dependencies, plain Node.

Why files instead of a spreadsheet or SaaS tracker? Because git gives you a free
audit trail, diffs, and merge-friendly history — and an append-only event log is
the one primitive that lets you derive both the current status and a funnel
(counts, time-to-close) deterministically. See [`docs/data-model.md`](docs/data-model.md).

---

## Repository structure

```
.
├── README.md                    # this file
├── README.de.md                 # German version
├── AGENTS.example.md            # criteria-as-code (roles, regions, salary, sources, guardrails)
├── LICENSE                      # MIT
├── cv/
│   ├── master.example.md        # placeholder master CV — replace with your own
│   └── README.md                # where the real CV goes + build note
├── style/
│   └── README.md                # how to add anonymized writing-style samples
├── applications/
│   ├── README.md                # GENERATED board / funnel / headhunters (between markers)
│   └── example-company-role/    # a demo application
│       ├── job.md               # frontmatter (status hand-editable) + notes
│       └── events.jsonl         # append-only event history
├── outreach/
│   └── headhunters.example.json # headhunter / recruiter relationship CRM
├── scripts/
│   └── build_board.js           # board generator (Node 20+, zero deps, idempotent)
└── docs/
    ├── data-model.md            # the one-folder-per-application + event-log model
    └── loop.md                  # optional automated-loop workflow
```

---

## Quick start

```bash
# 1. generate the board from the example application
node scripts/build_board.js

# 2. it rewrites the region between <!-- board:start --> / <!-- board:end -->
#    in applications/README.md. A second run is a no-op (idempotent).
node scripts/build_board.js
```

Then read [`AGENTS.example.md`](AGENTS.example.md) and fill in your own criteria.

---

## How to make this your own private repo

This template is public. Your real CV, salary expectations and application history
are **not** something you want public. Two clean ways to fork it into a private repo:

**Option A — "Use this template" (recommended):** On the template's GitHub page,
click **Use this template → Create a new repository**, and set the visibility to
**Private**. You get a fresh history with none of the template's commits.

**Option B — clone + push to a new private repo:**

```bash
git clone https://github.com/domek-at/job-search-loop-template.git job-search
cd job-search
rm -rf .git && git init
# create an EMPTY private repo on GitHub first, then:
git remote add origin git@github.com:<you>/<your-private-repo>.git
git add -A && git commit -m "chore: initial import from template"
git push -u origin main
```

Then:

1. Rename `cv/master.example.md` → `cv/master.md` and fill in your real CV.
2. Rename `AGENTS.example.md` → `AGENTS.md` and fill in your real criteria.
3. Rename `outreach/headhunters.example.json` → `outreach/headhunters.json`
   (the board script reads the real file if present, else falls back to the example).
4. Delete `applications/example-company-role/` once you add real applications.

The [`.gitignore`](.gitignore) already excludes rendered CV artifacts
(`*.pdf`, `*.docx`) so you don't accidentally commit a real CV export.

---

## Optional: automate with a loop

You can run everything by hand: keep your master CV + criteria current, paste job
postings into a capable LLM, and let it score them against `AGENTS.md`. **The loop
below is entirely optional.**

If you'd like to automate the create-issue → work-issue flow (LLM proposes matches,
opens tickets, produces per-job CV/cover drafts), the loop-engineering primitives
live in **[stagecrew](https://github.com/domek-at/stagecrew)**. It's a recommended
starting point, not a requirement — see [`docs/loop.md`](docs/loop.md) for how the
two fit together.

---

## License

MIT — see [LICENSE](LICENSE).
