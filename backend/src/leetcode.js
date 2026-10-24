// Company-wise LeetCode questions from snehasishroy/leetcode-companywise-interview-questions.
// Fetched on demand from GitHub and cached in memory, so nothing is stored or copied into this repo.
export const WINDOWS = ["thirty-days", "three-months", "six-months", "more-than-six-months", "all"];

const RAW = "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master";
const TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map(); // "slug/window" -> { at, problems | null }

/** "Goldman Sachs" -> "goldman-sachs". The repo's folders are lowercase and hyphenated. */
export const slugify = (name) =>
  String(name ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Parses CSV text, honouring quoted fields (titles can contain commas). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const pct = (s) => Number.parseFloat(String(s).replace("%", "")) || 0;

/** CSV text -> problems sorted by frequency (most asked first). */
export function parseProblems(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const idx = { id: col("id"), url: col("url"), title: col("title"), difficulty: col("difficulty"), acceptance: col("acceptance %"), frequency: col("frequency %") };
  if (idx.url < 0 || idx.title < 0) return [];
  return rows
    .filter((r) => /^https:\/\/leetcode\.com\//.test(r[idx.url] ?? ""))
    .map((r) => ({
      id: Number(r[idx.id]) || null,
      url: r[idx.url].trim(),
      title: r[idx.title].trim(),
      difficulty: r[idx.difficulty]?.trim() || "",
      acceptance: pct(r[idx.acceptance]),
      frequency: pct(r[idx.frequency]),
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/** Problems for a company, or null when the repo has no folder for it. */
export async function companyProblems(companyName, window = "all", fetchImpl = fetch) {
  const slug = slugify(companyName);
  if (!slug || !WINDOWS.includes(window)) return null;
  const key = `${slug}/${window}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.problems;

  const res = await fetchImpl(`${RAW}/${slug}/${window}.csv`);
  if (res.status === 404) {
    cache.set(key, { at: Date.now(), problems: null });
    return null;
  }
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const problems = parseProblems(await res.text());
  cache.set(key, { at: Date.now(), problems });
  return problems;
}
