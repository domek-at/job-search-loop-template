#!/usr/bin/env node
/*
 * build_board.js — generates the applications board from per-application
 * job.md frontmatter + append-only events.jsonl, plus the headhunter CRM.
 *
 * ZERO npm deps — Node builtins only (fs, path). Requires Node 20+.
 *
 * What it does:
 *  1. Reads every applications/<slug>/job.md frontmatter (tiny YAML parser).
 *  2. Reads every applications/<slug>/events.jsonl (if present).
 *  3. Reads outreach/headhunters.json — or headhunters.example.json if the real
 *     file is absent (so the template works out of the box).
 *  4. Regenerates the region between <!-- board:start --> / <!-- board:end -->
 *     in applications/README.md with THREE sections: Board, Funnel, Headhunters.
 *     Content OUTSIDE the markers is preserved verbatim.
 *  5. Validates: warns (stderr) on unknown status, on a job.md whose latest
 *     event is inconsistent with its frontmatter status, and on malformed
 *     events. Exit 0 on warnings; non-zero only on hard parse errors.
 *  6. Idempotent: a second run produces zero diff.
 *
 * Usage:  node scripts/build_board.js
 * (no arguments, no dependencies, no build step)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT, 'applications');
const BOARD_FILE = path.join(APPS_DIR, 'README.md');
const HEADHUNTERS_FILE = path.join(ROOT, 'outreach', 'headhunters.json');
const HEADHUNTERS_EXAMPLE = path.join(ROOT, 'outreach', 'headhunters.example.json');

const START_MARKER = '<!-- board:start -->';
const END_MARKER = '<!-- board:end -->';

// --- Status taxonomy -------------------------------------------------------

const STATUS_ENUM = [
  'draft', 'applied', 'screening', 'interview',
  'offer', 'accepted', 'rejected', 'withdrawn', 'discarded',
];

// Event type -> the status it moves the application into (for consistency
// checks and the fold). Non-state-changing events (follow_up, note, ack,
// assessment) are intentionally absent.
const EVENT_TO_STATUS = {
  created: 'draft',
  applied: 'applied',
  screen: 'screening',
  interview: 'interview',
  offer: 'offer',
  accepted: 'accepted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  discarded: 'discarded',
};

const EVENT_TYPES = [
  'created', 'applied', 'ack', 'screen', 'interview', 'assessment',
  'offer', 'accepted', 'rejected', 'withdrawn', 'discarded', 'follow_up', 'note',
];

const REJECT_REASONS = [
  'not_a_fit', 'salary', 'location', 'process_cancelled',
  'other_offer', 'no_response', 'other',
];

// Status -> emoji + label used in the Board cell.
const STATUS_DISPLAY = {
  draft: '📝 draft',
  applied: '📤 applied',
  screening: '🔎 screening',
  interview: '🗣️ interview',
  offer: '📬 offer',
  accepted: '✅ accepted',
  rejected: '❌ rejected',
  withdrawn: '↩️ withdrawn',
  discarded: '🗑️ discarded',
};

const warnings = [];
function warn(msg) { warnings.push(msg); }

// --- Tiny YAML frontmatter parser -----------------------------------------
// Handles the simple `key: value` frontmatter used in job.md:
//  - strips trailing `# ...` inline comments (outside quotes)
//  - unquotes "..." / '...' values
//  - leaves empty values as null
// It does NOT handle nested structures or block lists (none are used here).

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const body = m[1];
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1);
    val = stripInlineComment(val).trim();
    if (val === '') { out[key] = null; continue; }
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Strip a trailing `# comment`, but not a `#` inside a quoted string.
function stripInlineComment(s) {
  let inSingle = false, inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '#' && !inSingle && !inDouble) {
      // require whitespace before # so URLs / values with # aren't cut
      if (i === 0 || /\s/.test(s[i - 1])) return s.slice(0, i);
    }
  }
  return s;
}

// --- Event log reading -----------------------------------------------------

function readEvents(slug, file) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  const events = [];
  raw.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    let obj;
    try {
      obj = JSON.parse(t);
    } catch (e) {
      warn(`[${slug}] events.jsonl:${i + 1} — invalid JSON, line skipped: ${t.slice(0, 60)}`);
      return;
    }
    if (!obj.ts || !/^\d{4}-\d{2}-\d{2}$/.test(obj.ts)) {
      warn(`[${slug}] events.jsonl:${i + 1} — missing/invalid "ts" (YYYY-MM-DD)`);
    }
    if (!obj.type || !EVENT_TYPES.includes(obj.type)) {
      warn(`[${slug}] events.jsonl:${i + 1} — unknown event type "${obj.type}"`);
    }
    if (obj.type === 'rejected' && obj.reason && !REJECT_REASONS.includes(obj.reason)) {
      warn(`[${slug}] events.jsonl:${i + 1} — unknown rejection reason "${obj.reason}"`);
    }
    events.push(obj);
  });
  return events;
}

// Chronological sort (stable); events with equal ts keep file order.
function sortEvents(events) {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ta = a.e.ts || '';
      const tb = b.e.ts || '';
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return a.i - b.i;
    })
    .map((x) => x.e);
}

// Fold: last state-changing event wins.
function deriveStatus(events) {
  let status = null;
  for (const e of sortEvents(events)) {
    if (EVENT_TO_STATUS[e.type]) status = EVENT_TO_STATUS[e.type];
  }
  return status;
}

// --- Load applications -----------------------------------------------------

function loadApplications() {
  const apps = [];
  if (!fs.existsSync(APPS_DIR)) return apps;
  const entries = fs.readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const slug of entries) {
    const jobFile = path.join(APPS_DIR, slug, 'job.md');
    if (!fs.existsSync(jobFile)) continue;
    const fm = parseFrontmatter(fs.readFileSync(jobFile, 'utf8'));
    const events = readEvents(slug, path.join(APPS_DIR, slug, 'events.jsonl'));

    const status = (fm.status || '').trim();
    if (status && !STATUS_ENUM.includes(status)) {
      warn(`[${slug}] job.md — unknown status "${status}" (allowed: ${STATUS_ENUM.join(', ')})`);
    }

    // Consistency: derived status from events vs. hand-edited frontmatter.
    const derived = deriveStatus(events);
    if (derived && status && derived !== status) {
      warn(`[${slug}] inconsistency: frontmatter status "${status}" != status derived from events "${derived}" (last state-changing event).`);
    }

    apps.push({ slug, fm, events, status });
  }
  return apps;
}

// --- Rendering helpers -----------------------------------------------------

function esc(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').trim();
}

function statusCell(app) {
  const s = app.status;
  const label = STATUS_DISPLAY[s] || esc(s || '—');
  const date = lastRelevantDate(app);
  return date ? `${label} (${fmtDate(date)})` : label;
}

// Date shown next to the status: the ts of the latest state-changing event that
// matches the current status, else the `updated`/`created` frontmatter date.
function lastRelevantDate(app) {
  const sorted = sortEvents(app.events);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (EVENT_TO_STATUS[sorted[i].type] === app.status) return sorted[i].ts;
  }
  return app.fm.updated || app.fm.created || null;
}

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function linksCell(app) {
  const parts = [];
  const src = app.fm.source;
  if (src && /^https?:\/\//.test(src)) parts.push(`[Source](${src})`);
  else if (src) parts.push(esc(src));
  parts.push(`[Folder](${app.slug}/)`);
  return parts.join(' · ');
}

function recruiterCell(app) {
  const r = app.fm.recruiter;
  if (r === 'true' || r === true) return 'yes';
  if (r === 'false' || r === false) return '—';
  if (r == null || r === '' || r === '—') return '—';
  return esc(r);
}

// --- Section renderers -----------------------------------------------------

function renderBoard(apps) {
  const sorted = apps.slice().sort((a, b) => {
    const sa = STATUS_ENUM.indexOf(a.status);
    const sb = STATUS_ENUM.indexOf(b.status);
    if (sa !== sb) return sa - sb;
    const ca = (a.fm.company || '').toLowerCase();
    const cb = (b.fm.company || '').toLowerCase();
    if (ca < cb) return -1;
    if (ca > cb) return 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });

  const lines = [];
  lines.push('## Board');
  lines.push('');
  lines.push('| Company | Role | Location | Match | Status | Recruiter | Links | Channel |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const app of sorted) {
    lines.push('| ' + [
      esc(app.fm.company),
      esc(app.fm.role),
      esc(app.fm.location),
      esc(app.fm.match) || '—',
      statusCell(app),
      recruiterCell(app),
      linksCell(app),
      esc(app.fm.channel) || '—',
    ].join(' | ') + ' |');
  }
  if (sorted.length === 0) {
    lines.push('| _no applications yet_ |  |  |  |  |  |  |  |');
  }
  return lines.join('\n');
}

function renderFunnel(apps, headhunters) {
  const lines = [];
  lines.push('## Funnel');
  lines.push('');

  // Counts per status (only statuses that occur), in enum order.
  const counts = {};
  for (const app of apps) counts[app.status] = (counts[app.status] || 0) + 1;
  const countParts = STATUS_ENUM
    .filter((s) => counts[s])
    .map((s) => `${STATUS_DISPLAY[s] || s}: ${counts[s]}`);
  lines.push('**Status distribution:** ' + (countParts.join(' · ') || '—'));
  lines.push('');

  // Open next-actions: applications in a non-terminal state + headhunters with a
  // next_action.
  const TERMINAL = new Set(['accepted', 'rejected', 'withdrawn', 'discarded']);
  const openApps = apps.filter((a) => !TERMINAL.has(a.status));
  lines.push('**Open next-actions:**');
  lines.push('');
  const naLines = [];
  for (const app of openApps) {
    const na = nextActionFor(app);
    const due = app.fm.next_action_due ? ` (due ${fmtDate(app.fm.next_action_due)})` : '';
    naLines.push(`- **${esc(app.fm.company)}** — ${na}${due}`);
  }
  for (const hh of headhunters) {
    if (hh.next_action && hh.status !== 'closed' && hh.status !== 'dormant') {
      const due = hh.next_action_due ? ` (due ${fmtDate(hh.next_action_due)})` : '';
      naLines.push(`- **${esc(hh.name)}** (headhunter) — ${esc(hh.next_action)}${due}`);
    }
  }
  if (naLines.length === 0) naLines.push('- _no open next-actions_');
  lines.push(...naLines);
  lines.push('');

  // Median time applied -> terminal (best-effort).
  const durations = [];
  for (const app of apps) {
    const sorted = sortEvents(app.events);
    const applied = sorted.find((e) => e.type === 'applied');
    const terminal = [...sorted].reverse().find(
      (e) => ['rejected', 'withdrawn', 'offer', 'accepted'].includes(e.type));
    if (applied && terminal && applied.ts && terminal.ts) {
      const d = daysBetween(applied.ts, terminal.ts);
      if (d != null && d >= 0) durations.push(d);
    }
  }
  if (durations.length >= 1) {
    lines.push(`**Median time applied→close:** ${median(durations)} days (n=${durations.length})`);
  } else {
    lines.push('**Median time applied→close:** not derivable yet (too few closed applications with event data)');
  }
  return lines.join('\n');
}

function nextActionFor(app) {
  switch (app.status) {
    case 'draft': return 'Finish / submit the application';
    case 'applied': return 'Await response / follow up if needed';
    case 'screening': return 'Await interview invite';
    case 'interview': return 'Prepare interview / await feedback';
    case 'offer': return 'Review / negotiate the offer';
    default: return 'Define the next step';
  }
}

function renderHeadhunters(headhunters) {
  const lines = [];
  lines.push('## Headhunters');
  lines.push('');
  lines.push('| Name | Type | Status | Next action | Since |');
  lines.push('|---|---|---|---|---|');
  const sorted = headhunters.slice().sort((a, b) => {
    const sa = a.since || '';
    const sb = b.since || '';
    if (sa !== sb) return sa < sb ? -1 : 1;
    return (a.name || '') < (b.name || '') ? -1 : 1;
  });
  for (const hh of sorted) {
    lines.push('| ' + [
      esc(hh.name),
      esc(hh.type),
      esc(hh.status),
      esc(hh.next_action),
      hh.since ? fmtDate(hh.since) : '—',
    ].join(' | ') + ' |');
  }
  if (sorted.length === 0) {
    lines.push('| _no headhunter contacts yet_ |  |  |  |  |');
  }
  return lines.join('\n');
}

// --- Date math -------------------------------------------------------------

function daysBetween(a, b) {
  const da = Date.parse(a + 'T00:00:00Z');
  const db = Date.parse(b + 'T00:00:00Z');
  if (isNaN(da) || isNaN(db)) return null;
  return Math.round((db - da) / 86400000);
}

function median(arr) {
  const s = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// --- Main ------------------------------------------------------------------

function main() {
  let apps, headhunters, boardRaw;
  try {
    apps = loadApplications();
  } catch (e) {
    console.error('HARD ERROR loading applications:', e.message);
    process.exit(1);
  }

  // Prefer the real outreach/headhunters.json; fall back to the example file so
  // the template works out of the box.
  const hhFile = fs.existsSync(HEADHUNTERS_FILE) ? HEADHUNTERS_FILE : HEADHUNTERS_EXAMPLE;
  try {
    if (fs.existsSync(hhFile)) {
      headhunters = JSON.parse(fs.readFileSync(hhFile, 'utf8'));
      if (!Array.isArray(headhunters)) throw new Error('headhunters file is not an array');
    } else {
      headhunters = [];
    }
  } catch (e) {
    console.error(`HARD ERROR loading ${path.relative(ROOT, hhFile)}:`, e.message);
    process.exit(1);
  }

  try {
    boardRaw = fs.readFileSync(BOARD_FILE, 'utf8');
  } catch (e) {
    console.error('HARD ERROR reading applications/README.md:', e.message);
    process.exit(1);
  }

  const generated = [
    START_MARKER,
    '',
    '<!-- GENERATED by scripts/build_board.js — DO NOT EDIT BY HAND. -->',
    '<!-- To change status: edit status in <slug>/job.md + append a line to <slug>/events.jsonl, then `node scripts/build_board.js`. -->',
    '',
    renderBoard(apps),
    '',
    renderFunnel(apps, headhunters),
    '',
    renderHeadhunters(headhunters),
    '',
    END_MARKER,
  ].join('\n');

  let out;
  const startIdx = boardRaw.indexOf(START_MARKER);
  const endIdx = boardRaw.indexOf(END_MARKER);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    out = boardRaw.slice(0, startIdx) + generated +
          boardRaw.slice(endIdx + END_MARKER.length);
  } else {
    console.error('HARD ERROR: markers <!-- board:start --> / <!-- board:end --> not found in applications/README.md.');
    process.exit(1);
  }

  // Normalize to exactly one trailing newline to keep idempotency stable.
  out = out.replace(/\n*$/, '\n');

  if (out !== boardRaw) {
    fs.writeFileSync(BOARD_FILE, out);
    console.error(`Board regenerated: ${apps.length} application(s), ${headhunters.length} headhunter(s).`);
  } else {
    console.error(`Board unchanged (idempotent): ${apps.length} application(s), ${headhunters.length} headhunter(s).`);
  }

  if (warnings.length) {
    console.error(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.error('  ⚠️  ' + w);
  }
  // Warnings do not fail the build.
  process.exit(0);
}

main();
