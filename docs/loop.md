# Optional: automating the job search with a loop

**This is an optional recommendation, not a requirement.** You can run the whole
system by hand — keep your master CV and `AGENTS.md` criteria current, paste job
postings into a capable LLM, and ask it to score them against your criteria. That
alone gets you most of the value.

If you want to automate the repetitive parts, the loop-engineering primitives live
in **[stagecrew](https://github.com/domek-at/stagecrew)**. This page describes how
the two fit together; nothing here is mandatory.

## The manual workflow (baseline)

1. Keep `cv/master.md` and `AGENTS.md` current.
2. Gather postings from your whitelisted sources.
3. Ask an LLM: "here are my criteria (paste `AGENTS.md`), here are N postings —
   which fit, with a 0–10 match score and a one-line rationale, and which do I
   already have in my exclusion list?"
4. For each good match, create `applications/<company>-<role>/` with a `job.md`
   (metadata + `status: draft`) and start an `events.jsonl`.
5. Re-weight your master CV for that posting (emphasis only — never invent, never
   rewrite real job titles).
6. Run `node scripts/build_board.js` to refresh the board.

## The automated loop (optional, via stagecrew)

The loop turns the manual steps into a **create-issue → work-issue** pipeline:

- **create-issue** — an idea or a research run ("find matches for my criteria")
  becomes a fully-specified ticket, with the acceptance criteria drawn from your
  `AGENTS.md` guardrails.
- **work-issue** — the ticket is driven through a spec→build loop that produces the
  per-job artifacts (`job.md`, `cv.md`, `cover.md`) on a branch, checks them
  against your hard gates (no invention, real titles preserved, source whitelist),
  and merges when they pass.

Your `AGENTS.md` frontmatter (`hard_gates`, `branch_pattern`, `commit_format`, …)
is exactly what such a loop consumes to enforce your rules automatically. That's why
keeping the frontmatter accurate is worthwhile even if you start out manual — it's
the on-ramp to automation later.

See **[stagecrew](https://github.com/domek-at/stagecrew)** for the primitives and
setup. Whether you adopt it or stay manual, the file model in this template
(one folder per application + append-only event log + generated board) is the same.
