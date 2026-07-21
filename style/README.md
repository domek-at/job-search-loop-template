# Style samples

Anonymized excerpts from your own writing (emails, messages). They give an LLM a
calibration reference so cover letters and outreach sound like *you*, not like
generic corporate boilerplate.

Put the samples under `style/samples/` (create it) as plain Markdown. **Keep only
anonymized excerpts here — never the originals.**

## Anonymization convention

- People → `[recipient]`, `[colleague]`, `[partner]`, `[manager]`
- Companies → `[Client A]`, `[Client B]`, `[my company]`, `[vendor]`
- Numbers / amounts → `[number]`, `[amount]`, `[%]`
- Domains / URLs → `[domain.tld]`, `[link]`
- Dates → keep coarse (month/year only) when context needs them

Pick longer, self-authored messages where your voice is recognizable — not plain
confirmations or forwards.

## Voice pattern (derive your own)

After collecting a few samples, note the recurring patterns an LLM should imitate,
for example:

- Salutation style (e.g. "Hi [name]." with a period, not a comma)
- Direct opener, often picking up a shared context
- Bullet / numbered structure for complex topics
- Reasoning made explicit
- Sign-off style
- Dry and precise rather than flowery; no generic corporate phrases

These observations feed the `style_calibration` guardrail in
[`../AGENTS.example.md`](../AGENTS.example.md).
