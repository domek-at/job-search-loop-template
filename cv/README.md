# CV — master résumé

`master.md` is the single source of truth for your CV. Every per-job variant is
derived from it and lives at `applications/<company-slug>-<role-slug>/cv.md`, so a
diff against the master shows exactly what was re-weighted.

This template ships a placeholder [`master.example.md`](master.example.md). To use
it:

1. Copy it to `cv/master.md`.
2. Replace all placeholder content with your own.

## Format convention (`master.md`)

A simple, diff-friendly Markdown layout (adjust after your first pass):

```
# Your Name

## Profile
[1–2 sentence positioning — starts with your REAL current title]

## Key achievements
- ...

## Experience
### YYYY-MM – YYYY-MM | Role | Company
- Responsibility / impact

## Education
### YYYY – YYYY | Degree | Institution

## Skills
- ...

## Languages
- ...
```

## Rendering to PDF/DOCX (optional, generic)

Keeping the CV as Markdown gives you clean diffs. When you need a PDF/DOCX to send
out, render it with whatever toolchain you like — e.g. [Pandoc](https://pandoc.org)
(`pandoc cv/master.md -o cv/master.pdf`) with a reference document for layout, or a
headless-browser HTML→PDF step. That build step is intentionally left to you and is
**not** part of this template.

Rendered artifacts (`*.pdf`, `*.docx`) are git-ignored by default so you don't
commit a real CV export by accident — see [`.gitignore`](../.gitignore).

## Guardrails

Per-job tailoring only **re-weights** existing content — it never invents
experience and never rewrites your real job titles. See the CV-tailoring guardrails
in [`AGENTS.example.md`](../AGENTS.example.md).
