# job-search-loop-template

Ein **git-natives Job-Search-System**: Lebenslauf und Suchkriterien liegen als
versionierte Dateien vor, ein LLM (optional ein automatisierter Loop) findet
passende Stellen, und die Bewerbungs-Pipeline wird als reine Dateien mit einem
**generierten** Board geführt.

> _[English version](README.md)_

Das hier ist ein **anonymisiertes öffentliches Template**. Alle Inhalte sind
Platzhalter / fiktiv — forke es, trag deine echten Daten ein und stell das Repo
auf privat.

---

## Die Idee

- **Master-CV + Master-Anschreiben sind die Source of Truth.** Dein Lebenslauf
  liegt unter [`cv/master.example.md`](cv/master.example.md) (in `cv/master.md`
  umbenennen, sobald du deinen eigenen einträgst). Jede Per-Job-Variante leitet
  sich daraus ab — ein Diff zeigt exakt, was umgewichtet wurde.

- **Kriterien sind Code.** Welche Rollen / Regionen / Branchen dich interessieren
  (und welche nicht), wie weit du pendelst, deine Gehaltsspanne, welchen
  Job-Quellen du traust — alles in [`AGENTS.example.md`](AGENTS.example.md) als
  Single Source of Truth. Ein Mensch oder ein LLM liest das, um zu entscheiden,
  was ein Match ist.

- **Ein LLM findet passende Stellen.** Gib einem fähigen LLM deine Kriterien und
  eine Whitelist erlaubter Job-Quellen; es schlägt Matches mit Match-Score und
  Begründung vor. Das geht manuell ("hier meine Kriterien, hier 10 Stellen, welche
  passen?") oder automatisiert per Loop (siehe unten).

- **Per-Job-CV — nur Umgewichtung, nie Erfindung.** Für eine konkrete Stelle
  ordnest und betonst du vorhandene Erfolge um. Du **erfindest niemals** Erfahrung
  oder Skills, die du nicht hast, und du **schreibst niemals** deine echten
  Jobtitel um, damit sie zur Zielrolle passen. Siehe die CV-Tailoring-Leitplanken
  in `AGENTS.example.md`.

- **Bewerbungs-Status als Dateien.** Ein Ordner pro Bewerbung unter
  `applications/<firma-rolle>/`, jeweils mit `job.md` (Metadaten + hand-editierbarer
  `status`) und einem append-only `events.jsonl` (die Historie). Board, Funnel und
  Headhunter-Tabelle in [`applications/README.md`](applications/README.md) werden
  von [`scripts/build_board.js`](scripts/build_board.js) **generiert** — ohne
  Dependencies, reines Node.

Warum Dateien statt Tabelle oder SaaS-Tracker? Weil git einen kostenlosen
Audit-Trail, Diffs und merge-freundliche Historie liefert — und ein append-only
Event-Log ist das eine Primitiv, aus dem sich sowohl der aktuelle Status als auch
ein Funnel (Zählungen, Time-to-Close) deterministisch ableiten lassen. Siehe
[`docs/data-model.md`](docs/data-model.md).

---

## Repo-Struktur

```
.
├── README.md                    # englische Version
├── README.de.md                 # diese Datei
├── AGENTS.example.md            # Kriterien-als-Code (Rollen, Regionen, Gehalt, Quellen, Leitplanken)
├── LICENSE                      # MIT
├── cv/
│   ├── master.example.md        # Platzhalter-Master-CV — durch deinen eigenen ersetzen
│   └── README.md                # wo der echte CV hingehört + Build-Hinweis
├── style/
│   └── README.md                # wie man anonymisierte Stil-Samples ergänzt
├── applications/
│   ├── README.md                # GENERIERTES Board / Funnel / Headhunter (zwischen Markern)
│   └── example-company-role/    # eine Demo-Bewerbung
│       ├── job.md               # Frontmatter (status hand-editierbar) + Notizen
│       └── events.jsonl         # append-only Event-Historie
├── outreach/
│   └── headhunters.example.json # Headhunter- / Recruiter-Beziehungs-CRM
├── scripts/
│   └── build_board.js           # Board-Generator (Node 20+, keine Deps, idempotent)
└── docs/
    ├── data-model.md            # das Ordner-pro-Bewerbung- + Event-Log-Modell
    └── loop.md                  # optionaler automatisierter Loop-Workflow
```

---

## Schnellstart

```bash
# 1. Board aus der Beispiel-Bewerbung generieren
node scripts/build_board.js

# 2. es überschreibt den Bereich zwischen <!-- board:start --> / <!-- board:end -->
#    in applications/README.md. Ein zweiter Lauf ist ein No-op (idempotent).
node scripts/build_board.js
```

Danach [`AGENTS.example.md`](AGENTS.example.md) lesen und eigene Kriterien eintragen.

---

## Wie du daraus dein eigenes privates Repo machst

Dieses Template ist öffentlich. Dein echter CV, deine Gehaltsvorstellung und deine
Bewerbungs-Historie sollen **nicht** öffentlich sein. Zwei saubere Wege, das in ein
privates Repo zu forken:

**Option A — "Use this template" (empfohlen):** Auf der GitHub-Seite des Templates
**Use this template → Create a new repository** klicken und die Sichtbarkeit auf
**Private** stellen. Du bekommst eine frische Historie ohne die Template-Commits.

**Option B — klonen + in ein neues privates Repo pushen:**

```bash
git clone https://github.com/domek-at/job-search-loop-template.git job-search
cd job-search
rm -rf .git && git init
# zuerst ein LEERES privates Repo auf GitHub anlegen, dann:
git remote add origin git@github.com:<du>/<dein-privates-repo>.git
git add -A && git commit -m "chore: initial import from template"
git push -u origin main
```

Danach:

1. `cv/master.example.md` → `cv/master.md` umbenennen und echten CV eintragen.
2. `AGENTS.example.md` → `AGENTS.md` umbenennen und echte Kriterien eintragen.
3. `outreach/headhunters.example.json` → `outreach/headhunters.json` umbenennen
   (das Board-Script liest die echte Datei, falls vorhanden, sonst die Beispieldatei).
4. `applications/example-company-role/` löschen, sobald du echte Bewerbungen hast.

Die [`.gitignore`](.gitignore) schließt gerenderte CV-Artefakte (`*.pdf`, `*.docx`)
bereits aus, damit du nicht versehentlich einen echten CV-Export committest.

---

## Optional: mit einem Loop automatisieren

Du kannst alles manuell fahren: Master-CV + Kriterien aktuell halten, Stellen in ein
fähiges LLM kippen und gegen `AGENTS.md` bewerten lassen. **Der Loop unten ist rein
optional.**

Wenn du den create-issue → work-issue-Flow automatisieren willst (LLM schlägt
Matches vor, öffnet Tickets, erzeugt Per-Job-CV/Cover-Entwürfe), liegen die
Loop-Engineering-Primitive in
**[stagecrew](https://github.com/domek-at/stagecrew)**. Das ist eine empfohlene
Ausgangsbasis, keine Voraussetzung — siehe [`docs/loop.md`](docs/loop.md), wie
beides zusammenspielt.

---

## Lizenz

MIT — siehe [LICENSE](LICENSE).
