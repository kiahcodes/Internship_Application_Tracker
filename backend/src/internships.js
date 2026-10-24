import { pool } from "./db.js";
import { requireAuth, requirePermission } from "./auth.js";
import { BRANCHES } from "./options.js";
import { matchSkills } from "./skillMatch.js";

const MAX_PAGE_SIZE = 48;
const MODES = ["onsite", "remote", "hybrid"];
const SORTS = ["nearest", "match", "newest", "deadline"];
const PAID = "COALESCE(i.stipend_max, i.stipend_min)";

const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Number from a query-string value, or null when missing / out of range.
const num = (v, min = -Infinity, max = Infinity) => {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export function parseListQuery(q) {
  return {
    page: Math.floor(num(q.page, 1) ?? 1),
    pageSize: Math.floor(num(q.pageSize, 1, MAX_PAGE_SIZE) ?? 12),
    q: String(q.q || "").trim().slice(0, 100),
    modes: String(q.mode || "").split(",").filter((m) => MODES.includes(m)),
    pay: q.pay === "paid" || q.pay === "unpaid" ? q.pay : null,
    minStipend: num(q.minStipend, 0),
    minMonths: num(q.minMonths, 0),
    maxMonths: num(q.maxMonths, 0),
    batch: num(q.batch, 2000, 2100),
    cgpa: num(q.cgpa, 0, 10),
    branch: String(q.branch || "").trim().slice(0, 100),
    sort: SORTS.includes(q.sort) ? q.sort : "newest",
    lat: num(q.lat, -90, 90),
    lon: num(q.lon, -180, 180),
    skills: String(q.skills || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40),
  };
}

/**
 * WHERE clauses for a listing request. Postings whose deadline has passed are hidden,
 * except ones the student already tracks. Unknown values (no stipend listed, no
 * eligibility rule) never match a filter that asks for a specific value, except eligibility,
 * where "no rule" means open to everyone.
 */
export function buildFilters(f) {
  const where = [
    "(i.is_active = 1 OR a.id IS NOT NULL)",
    "(i.deadline IS NULL OR i.deadline >= CURDATE() OR a.id IS NOT NULL)",
  ];
  const params = [];
  const add = (clause, ...values) => { where.push(clause); params.push(...values); };

  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
    add("(i.company LIKE ? OR i.role LIKE ? OR i.location LIKE ?)", like, like, like);
  }
  if (f.modes.length) add("i.work_mode IN (?)", f.modes);
  if (f.pay === "paid") add(`${PAID} > 0`);
  if (f.pay === "unpaid") add(`${PAID} = 0`);
  if (f.minStipend) add(`${PAID} >= ?`, f.minStipend);
  if (f.minMonths !== null) add("i.duration_months >= ?", f.minMonths);
  if (f.maxMonths !== null) add("i.duration_months <= ?", f.maxMonths);
  if (f.batch) add("(i.batch_year IS NULL OR i.batch_year = ?)", f.batch);
  if (f.cgpa !== null) add("(i.min_cgpa IS NULL OR i.min_cgpa <= ?)", f.cgpa);
  if (f.branch) add("(i.branches IS NULL OR i.branches = '' OR FIND_IN_SET(?, i.branches))", f.branch);
  return { where, params };
}

const orderFor = (sort, hasCoords) => {
  const newest = "i.posted_at IS NULL, i.posted_at DESC, i.id DESC";
  if (sort === "deadline") return `i.deadline IS NULL, i.deadline ASC, ${newest}`;
  if ((sort === "nearest" || sort === "match") && hasCoords) return `distance IS NULL, distance ASC, ${newest}`;
  return newest;
};

// Internshala's card text is only pay and duration, which the card already shows as facts;
// drop those parts so the same line isn't printed twice.
const FACT_PART = /₹|\/\s*(month|week)|^unpaid$|^\d+\s*(months?|weeks?)$/i;
export const withoutFacts = (description, source) =>
  source !== "internshala" ? description
    : String(description || "").split(" · ").filter((part) => !FACT_PART.test(part.trim())).join(" · ");

const plain = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const toListItem = (r, skills) => {
  const { description, ...rest } = r;
  return {
    ...rest,
    applied: Boolean(r.applied),
    mine: Boolean(r.mine),
    has_letter: Boolean(r.has_letter),
    distance: r.distance === null ? null : Number(r.distance),
    min_cgpa: r.min_cgpa === null ? null : Number(r.min_cgpa),
    snippet: plain(withoutFacts(description, r.source)).slice(0, 160),
    matched: skills.length ? matchSkills(skills, { role: r.role, description }) : [],
  };
};

const LIST_COLUMNS = `i.id, i.company, i.role, i.location, i.url, i.source, i.description, i.posted_at,
  DATE_FORMAT(i.deadline, '%Y-%m-%d') AS deadline, i.work_mode, i.stipend_min, i.stipend_max,
  i.duration_months, i.min_cgpa, i.batch_year, i.branches`;

// Fields a poster fills in. Returns { error } or the cleaned values.
export function internshipFields(body) {
  const text = (k, max) => String(body[k] ?? "").trim().slice(0, max);
  const company = text("company", 100);
  const role = text("role", 150);
  const location = text("location", 100);
  const url = text("url", 500) || null;
  if (!company || !role || !location) return { error: "Company, role and location are required" };
  if (url && !/^https?:\/\//i.test(url)) return { error: "URL must start with http(s)://" };

  const work_mode = MODES.includes(body.work_mode) ? body.work_mode : "onsite";
  const optNum = (k, label, min, max) => {
    if (body[k] === undefined || body[k] === null || body[k] === "") return { value: null };
    const n = num(body[k], min, max);
    return n === null ? { error: `${label} must be between ${min} and ${max}` } : { value: n };
  };
  const stipend_min = optNum("stipend_min", "Stipend", 0, 1_000_000);
  const stipend_max = optNum("stipend_max", "Stipend", 0, 1_000_000);
  const duration = optNum("duration_months", "Duration", 1, 24);
  const cgpa = optNum("min_cgpa", "Minimum CGPA", 0, 10);
  const batch = optNum("batch_year", "Batch year", 2000, 2100);
  const bad = [stipend_min, stipend_max, duration, cgpa, batch].find((x) => x.error);
  if (bad) return { error: bad.error };
  let [lo, hi] = [stipend_min.value, stipend_max.value];
  if (lo === null && hi !== null) lo = hi;
  if (hi === null && lo !== null) hi = lo;
  if (lo !== null && hi < lo) return { error: "Maximum stipend can't be lower than the minimum" };

  let deadline = null;
  if (body.deadline) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.deadline) || Number.isNaN(Date.parse(body.deadline)))
      return { error: "Deadline must be a date" };
    deadline = body.deadline;
  }
  const branches = [...new Set((Array.isArray(body.branches) ? body.branches : String(body.branches || "").split(","))
    .map((b) => String(b).trim()).filter((b) => BRANCHES.includes(b)))];

  return {
    company, role, location, url, work_mode, deadline,
    stipend_min: lo, stipend_max: hi, duration_months: duration.value,
    min_cgpa: cgpa.value, batch_year: batch.value,
    branches: branches.length ? branches.join(",") : null,
    description: text("description", 5000) || null,
  };
}

export function mountInternships(app) {
  app.get("/api/internships", requireAuth, h(async (req, res) => {
    const f = parseListQuery(req.query);
    const hasCoords = f.lat !== null && f.lon !== null;
    const { where, params: whereParams } = buildFilters(f);
    const distance = hasCoords
      ? `CASE WHEN i.lat IS NULL OR i.lon IS NULL THEN NULL ELSE 6371 * ACOS(LEAST(1, GREATEST(-1,
           COS(RADIANS(?)) * COS(RADIANS(i.lat)) * COS(RADIANS(i.lon) - RADIANS(?)) +
           SIN(RADIANS(?)) * SIN(RADIANS(i.lat))))) END`
      : "NULL";
    const from = `FROM internships i
      LEFT JOIN applications a ON a.internship_id = i.id AND a.user_id = ?
      WHERE ${where.join(" AND ")}`;

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${from}`, [req.userId, ...whereParams]);
    const order = orderFor(f.sort, hasCoords);
    const select = `SELECT ${LIST_COLUMNS}, ${distance} AS distance, (a.id IS NOT NULL) AS applied,
      (i.posted_by = ?) AS mine, a.status AS app_status,
      (a.cover_letter IS NOT NULL OR a.cover_letter_id IS NOT NULL) AS has_letter ${from} ORDER BY ${order}`;
    const base = [...(hasCoords ? [f.lat, f.lon, f.lat] : []), req.userId, req.userId, ...whereParams];

    const pages = Math.max(1, Math.ceil(total / f.pageSize));
    const page = Math.min(f.page, pages);
    let items;
    if (f.sort === "match" && f.skills.length) {
      // Skill matches live in the description text, so rank every hit and then cut the page.
      const [rows] = await pool.query(select, base);
      items = rows.map((r) => toListItem(r, f.skills))
        .sort((x, y) => y.matched.length - x.matched.length) // stable: ties keep distance/newest order
        .slice((page - 1) * f.pageSize, page * f.pageSize);
    } else {
      const [rows] = await pool.query(`${select} LIMIT ? OFFSET ?`, [...base, f.pageSize, (page - 1) * f.pageSize]);
      items = rows.map((r) => toListItem(r, f.skills));
    }
    res.json({ items, total, page, pages, pageSize: f.pageSize });
  }));

  // Full posting, for the details popup.
  app.get("/api/internships/:id", requireAuth, h(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${LIST_COLUMNS}, (a.id IS NOT NULL) AS applied, (i.posted_by = ?) AS mine, a.status AS app_status,
         (a.cover_letter IS NOT NULL OR a.cover_letter_id IS NOT NULL) AS has_letter
       FROM internships i
       LEFT JOIN applications a ON a.internship_id = i.id AND a.user_id = ?
       WHERE i.id = ?`,
      [req.userId, req.userId, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Internship not found" });
    const r = rows[0];
    res.json({
      ...r, description: plain(withoutFacts(r.description, r.source)) || null,
      applied: Boolean(r.applied), mine: Boolean(r.mine), has_letter: Boolean(r.has_letter),
      min_cgpa: r.min_cgpa === null ? null : Number(r.min_cgpa),
    });
  }));

  // "Track this": adds a card in Applied. Removing it deletes the card, so the client confirms first.
  app.post("/api/internships/:id/apply", requireAuth, h(async (req, res) => {
    const [rows] = await pool.query("SELECT company, role FROM internships WHERE id = ?", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Internship not found" });
    await pool.query(
      `INSERT IGNORE INTO applications (user_id, internship_id, title, status, resume_id, resume_file_name)
       SELECT ?, ?, ?, 'Applied', r.id, r.file_name
       FROM (SELECT 1) one
       LEFT JOIN resumes r ON r.user_id = ? AND r.is_current = 1 AND r.kind = 'resume'`,
      [req.userId, req.params.id, `${rows[0].role} – ${rows[0].company}`, req.userId],
    );
    res.status(201).json({ applied: true });
  }));

  app.delete("/api/internships/:id/apply", requireAuth, h(async (req, res) => {
    await pool.query("DELETE FROM applications WHERE user_id = ? AND internship_id = ?", [req.userId, req.params.id]);
    res.json({ applied: false });
  }));

  const COLS = ["company", "role", "location", "url", "work_mode", "deadline", "stipend_min", "stipend_max",
    "duration_months", "min_cgpa", "batch_year", "branches", "description"];

  app.post("/api/internships", requireAuth, requirePermission("internships:manage"), h(async (req, res) => {
    const f = internshipFields(req.body);
    if (f.error) return res.status(400).json({ error: f.error });
    const [result] = await pool.query(
      `INSERT INTO internships (${COLS.join(", ")}, source, posted_at, posted_by) VALUES (${COLS.map(() => "?").join(", ")}, 'manual', NOW(), ?)`,
      [...COLS.map((c) => f[c]), req.userId],
    );
    res.status(201).json({ id: result.insertId });
  }));

  app.put("/api/internships/:id", requireAuth, requirePermission("internships:manage"), h(async (req, res) => {
    const f = internshipFields(req.body);
    if (f.error) return res.status(400).json({ error: f.error });
    const [result] = await pool.query(
      `UPDATE internships SET ${COLS.map((c) => `${c} = ?`).join(", ")} WHERE id = ? AND posted_by = ?`,
      [...COLS.map((c) => f[c]), req.params.id, req.userId],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Internship not found, or you didn't post it" });
    res.json({ id: Number(req.params.id) });
  }));

  app.delete("/api/internships/:id", requireAuth, requirePermission("internships:manage"), h(async (req, res) => {
    await pool.query("DELETE FROM internships WHERE id = ? AND posted_by = ?", [req.params.id, req.userId]);
    res.status(204).end();
  }));
}
