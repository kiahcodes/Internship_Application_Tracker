// CSV export / import for the tracker. Pure functions, so they can be tested without a database.

export const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
export const MAX_IMPORT_ROWS = 500;

// Column names people actually use in their own spreadsheets. Earlier names win, and a blank
// cell falls through to the next matching column ("Application date" before a bare "Applied").
const HEADERS = {
  title: ["title", "application", "applications", "name", "internship"],
  company: ["company", "company name", "organisation", "organization", "employer", "firm"],
  role: ["role", "job role", "position", "job", "job title", "designation", "profile"],
  location: ["location", "city", "place", "work location", "job location"],
  status: ["status", "stage", "state", "progress", "result"],
  applied: ["applied on", "application date", "date applied", "applied date", "applied", "date"],
  deadline: ["deadline", "due", "due date", "last date", "apply by", "closing date"],
  remind: ["remind on", "reminder", "remind", "follow up", "follow-up", "follow up on", "result by", "result date", "result on"],
  link: ["link", "url", "job link", "apply link", "application link", "posting", "posting link"],
};
// Columns we know about but have nowhere to keep; not worth warning about.
const IGNORABLE = ["sr no", "sr. no.", "sr. no", "s no", "s. no.", "sno", "no", "no.", "#", "serial no", "sl no", "sl. no."];
// "Applied" is often a tick box rather than a date.
const TICK = /^(yes|no|y|n|true|false|done|x|✓|✔|✗|☑|☐|1|0)$/i;

/** RFC 4180 parsing, plus the `;` and tab separators Excel uses in some locales. */
export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0];
  const delim = [",", ";", "\t"].reduce((best, d) => (first.split(d).length > first.split(best).length ? d : best), ",");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// A cell starting with = + - @ would run as a formula when the file is opened in Excel.
const guard = (v) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const unguard = (v) => v.replace(/^'(?=[=+\-@])/, "");
const quote = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(header, rows, textCols = []) {
  const line = (r, isHeader) => r.map((v, i) => {
    const s = v === null || v === undefined ? "" : String(v);
    return quote(!isHeader && textCols.includes(i) ? guard(s) : s);
  }).join(",");
  return "﻿" + [line(header, true), ...rows.map((r) => line(r, false))].join("\r\n") + "\r\n";
}

export function normalizeStatus(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s.trim()) return { status: "Applied" };
  if (/reject|declin|not selected|unsuccessful|not shortlisted/.test(s)) return { status: "Rejected" };
  if (/offer|selected|accepted|hired|placed/.test(s)) return { status: "Offer" };
  if (/interview|\bhr\b|technical|round|screening/.test(s)) return { status: "Interview" };
  if (/\boa\b|assessment|test|coding/.test(s)) return { status: "OA" };
  if (/appl|submit|sent|wait|pending/.test(s)) return { status: "Applied" };
  return { status: "Applied", unknown: true };
}

const realDate = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    : undefined;
};

/** "2025-11-04", "04/11/2025" (day first, as in India), "4 Nov 2025". "" is null; garbage is undefined. */
export function parseDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return realDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) return realDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  if (/[a-z]{3}/i.test(s)) {
    const t = new Date(`${s} 12:00 UTC`);
    if (!Number.isNaN(t.getTime())) return realDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  return undefined;
}

/**
 * Turns a spreadsheet's text into cards. Rows that can't become a card are listed in `skipped`;
 * values we had to drop or guess are listed in `warnings`. Nothing is silently lost.
 */
export function normalizeImport(text) {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "That file has no rows. The first row should be column names." };
  if (table.length - 1 > MAX_IMPORT_ROWS) return { error: `That file has more than ${MAX_IMPORT_ROWS} rows. Split it and import in parts.` };

  const names = table[0].map((h) => h.trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " "));
  const col = Object.fromEntries(Object.entries(HEADERS).map(([k, aliases]) => [k, aliases.map((a) => names.indexOf(a)).filter((i) => i >= 0)]));
  if (!col.title.length && !col.company.length && !col.role.length)
    return { error: `Couldn't find a Title, Company or Role column. Found: ${table[0].map((h) => h.trim()).filter(Boolean).join(", ") || "nothing"}.` };
  const used = new Set(Object.values(col).flat());
  const ignored = table[0].map((h, i) => [h.trim(), i]).filter(([h, i]) => h && !used.has(i) && !IGNORABLE.includes(h.toLowerCase())).map(([h]) => h);

  const rows = [];
  const skipped = [];
  const warnings = [];
  const seen = new Map();
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k) => {
      for (const i of col[k]) {
        const v = unguard((cells[i] ?? "").trim());
        if (v && !(k === "applied" && TICK.test(v))) return v;
      }
      return "";
    };
    const title = (get("title") || [get("role"), get("company")].filter(Boolean).join(" – ")).slice(0, 255);
    if (!title) return skipped.push({ line, reason: "No title, role or company" });
    const key = title.toLowerCase();
    if (seen.has(key)) return skipped.push({ line, reason: `Same as line ${seen.get(key)}` });
    seen.set(key, line);

    const { status, unknown } = normalizeStatus(get("status"));
    if (unknown) warnings.push({ line, reason: `Status "${get("status")}" isn't one we know, so it was set to Applied` });
    const dates = {};
    for (const [field, key2, label] of [["applied_on", "applied", "Applied date"], ["deadline", "deadline", "Deadline"], ["remind_on", "remind", "Reminder"]]) {
      const d = parseDate(get(key2));
      if (d === undefined) warnings.push({ line, reason: `${label} "${get(key2)}" isn't a date, so it was left out` });
      dates[field] = d ?? null;
    }
    let link = get("link");
    if (link && (!/^https?:\/\/\S+$/i.test(link) || link.length > 500)) {
      warnings.push({ line, reason: "Link isn't a web address (http/https), so it was left out" });
      link = "";
    }
    rows.push({
      line, title, status, ...dates, link: link || null,
      company: get("company").slice(0, 100) || null, role: get("role").slice(0, 150) || null,
      location: get("location").slice(0, 100) || null,
    });
  });
  return { rows, skipped, warnings, ignored };
}
