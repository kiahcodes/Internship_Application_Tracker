// Interview prep: companies, checklists, links, interview rounds and a question bank
// with a simple spaced-repetition quiz. Everything is scoped to the signed-in user.
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";
import { WINDOWS, companyProblems } from "./leetcode.js";

export const ROUND_TYPES = ["OA", "Technical", "System design", "Behavioral", "HR", "Managerial", "Other"];
export const LINK_KINDS = ["dsa", "notes", "other"];
// Days until a question is asked again, by box. Missing a question resets it to box 1.
export const BOX_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14 };
export const MAX_BOX = 4;

const LIMITS = { name: 100, item: 300, title: 150, url: 500, question: 2000, answer: 4000, reflection: 4000 };
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const clean = (v) => String(v ?? "").trim();
const fail = (res, status, error) => res.status(status).json({ error });

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isUrl = (v) => /^https?:\/\/\S+$/i.test(v);

async function ownsCompany(userId, companyId) {
  const [rows] = await pool.query("SELECT id FROM prep_companies WHERE id = ? AND user_id = ?", [companyId, userId]);
  return rows.length > 0;
}

/** A round must belong to this user and company. */
async function ownsRound(userId, companyId, roundId) {
  const [rows] = await pool.query(
    "SELECT id FROM interview_rounds WHERE id = ? AND user_id = ? AND company_id = ?",
    [roundId, userId, companyId],
  );
  return rows.length > 0;
}

const toQuestion = (r) => ({
  id: r.id,
  companyId: r.company_id,
  roundId: r.round_id,
  question: r.question,
  answer: r.answer ?? "",
  box: r.box,
  nextReview: r.next_review,
  lastReviewed: r.last_reviewed,
});
const toRound = (r) => ({
  id: r.id,
  companyId: r.company_id,
  roundType: r.round_type,
  heldOn: r.held_on,
  reflection: r.reflection ?? "",
});

export function mountPrep(app) {
  const auth = requireAuth;

  // ---------- Companies ----------
  app.get("/api/prep/companies", auth, wrap(async (req, res) => {
    const [companies] = await pool.query(
      `SELECT c.id, c.name,
         (SELECT COUNT(*) FROM prep_items i WHERE i.company_id = c.id) AS items_total,
         (SELECT COUNT(*) FROM prep_items i WHERE i.company_id = c.id AND i.done = 1) AS items_done,
         (SELECT COUNT(*) FROM interview_rounds r WHERE r.company_id = c.id) AS rounds,
         (SELECT COUNT(*) FROM interview_questions q WHERE q.company_id = c.id) AS questions,
         (SELECT COUNT(*) FROM interview_questions q WHERE q.company_id = c.id AND q.next_review <= CURDATE()) AS due
       FROM prep_companies c WHERE c.user_id = ? ORDER BY c.name`,
      [req.userId],
    );
    // Companies from the user's applications that they haven't started prep for.
    const [apps] = await pool.query(
      `SELECT DISTINCT i.company FROM applications a JOIN internships i ON i.id = a.internship_id
       WHERE a.user_id = ? AND i.company NOT IN (SELECT name FROM prep_companies WHERE user_id = ?)
       ORDER BY i.company`,
      [req.userId, req.userId],
    );
    res.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        itemsTotal: c.items_total,
        itemsDone: c.items_done,
        rounds: c.rounds,
        questions: c.questions,
        due: c.due,
      })),
      suggestions: apps.map((a) => a.company),
    });
  }));

  app.post("/api/prep/companies", auth, wrap(async (req, res) => {
    const name = clean(req.body.name);
    if (!name) return fail(res, 400, "Enter a company name");
    if (name.length > LIMITS.name) return fail(res, 400, `Company name is too long (max ${LIMITS.name} characters)`);
    await pool.query("INSERT IGNORE INTO prep_companies (user_id, name) VALUES (?, ?)", [req.userId, name]);
    const [rows] = await pool.query("SELECT id, name FROM prep_companies WHERE user_id = ? AND name = ?", [req.userId, name]);
    res.status(201).json(rows[0]);
  }));

  app.delete("/api/prep/companies/:id", auth, wrap(async (req, res) => {
    await pool.query("DELETE FROM prep_companies WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.status(204).end();
  }));

  app.get("/api/prep/companies/:id", auth, wrap(async (req, res) => {
    const [[company]] = await pool.query("SELECT id, name FROM prep_companies WHERE id = ? AND user_id = ?", [
      req.params.id, req.userId,
    ]).then(([r]) => [r]);
    if (!company) return fail(res, 404, "Company not found");
    const q = (sql) => pool.query(sql, [company.id]).then(([r]) => r);
    const [items, links, rounds, questions] = await Promise.all([
      q("SELECT id, text, done FROM prep_items WHERE company_id = ? ORDER BY id"),
      q("SELECT id, title, url, kind FROM prep_links WHERE company_id = ? ORDER BY id"),
      q("SELECT * FROM interview_rounds WHERE company_id = ? ORDER BY held_on IS NULL, held_on DESC, id DESC"),
      q("SELECT * FROM interview_questions WHERE company_id = ? ORDER BY id"),
    ]);
    res.json({
      company,
      items: items.map((i) => ({ id: i.id, text: i.text, done: Boolean(i.done) })),
      links,
      rounds: rounds.map(toRound),
      questions: questions.map(toQuestion),
    });
  }));

  // LeetCode problems other candidates were asked at this company (see leetcode.js).
  app.get("/api/prep/companies/:id/leetcode", auth, wrap(async (req, res) => {
    const [[company]] = await pool.query("SELECT id, name FROM prep_companies WHERE id = ? AND user_id = ?", [
      req.params.id, req.userId,
    ]).then(([r]) => [r]);
    if (!company) return fail(res, 404, "Company not found");
    const window = WINDOWS.includes(req.query.window) ? req.query.window : "all";
    let problems;
    try {
      problems = await companyProblems(company.name, window);
    } catch (err) {
      console.error("LeetCode list failed:", err.message);
      return fail(res, 502, "Couldn't load the question list right now. Try again in a minute.");
    }
    if (!problems) return res.json({ available: false, window, problems: [] });
    const [saved] = await pool.query("SELECT url FROM prep_links WHERE company_id = ? AND user_id = ?", [company.id, req.userId]);
    const have = new Set(saved.map((l) => l.url));
    res.json({ available: true, window, problems: problems.map((p) => ({ ...p, saved: have.has(p.url) })) });
  }));

  // ---------- Checklist ----------
  app.post("/api/prep/items", auth, wrap(async (req, res) => {
    const text = clean(req.body.text);
    if (!text) return fail(res, 400, "Write the checklist item first");
    if (text.length > LIMITS.item) return fail(res, 400, `Keep it under ${LIMITS.item} characters`);
    if (!(await ownsCompany(req.userId, req.body.companyId))) return fail(res, 404, "Company not found");
    const [r] = await pool.query("INSERT INTO prep_items (company_id, user_id, text) VALUES (?, ?, ?)", [
      req.body.companyId, req.userId, text,
    ]);
    res.status(201).json({ id: r.insertId, text, done: false });
  }));

  app.patch("/api/prep/items/:id", auth, wrap(async (req, res) => {
    const sets = [];
    const params = [];
    if (req.body.done !== undefined) { sets.push("done = ?"); params.push(req.body.done ? 1 : 0); }
    if (req.body.text !== undefined) {
      const text = clean(req.body.text);
      if (!text || text.length > LIMITS.item) return fail(res, 400, "Item must be 1 to 300 characters");
      sets.push("text = ?"); params.push(text);
    }
    if (!sets.length) return fail(res, 400, "Nothing to update");
    const [r] = await pool.query(`UPDATE prep_items SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, [
      ...params, req.params.id, req.userId,
    ]);
    if (!r.affectedRows) return fail(res, 404, "Item not found");
    res.json({ ok: true });
  }));

  app.delete("/api/prep/items/:id", auth, wrap(async (req, res) => {
    await pool.query("DELETE FROM prep_items WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.status(204).end();
  }));

  // ---------- Links ----------
  app.post("/api/prep/links", auth, wrap(async (req, res) => {
    const title = clean(req.body.title);
    const url = clean(req.body.url);
    const kind = LINK_KINDS.includes(req.body.kind) ? req.body.kind : "notes";
    if (!title) return fail(res, 400, "Give the link a title");
    if (title.length > LIMITS.title) return fail(res, 400, `Title is too long (max ${LIMITS.title} characters)`);
    if (!isUrl(url) || url.length > LIMITS.url) return fail(res, 400, "Enter a full link starting with http:// or https://");
    if (!(await ownsCompany(req.userId, req.body.companyId))) return fail(res, 404, "Company not found");
    const [r] = await pool.query(
      "INSERT INTO prep_links (company_id, user_id, title, url, kind) VALUES (?, ?, ?, ?, ?)",
      [req.body.companyId, req.userId, title, url, kind],
    );
    res.status(201).json({ id: r.insertId, title, url, kind });
  }));

  app.delete("/api/prep/links/:id", auth, wrap(async (req, res) => {
    await pool.query("DELETE FROM prep_links WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.status(204).end();
  }));

  // ---------- Interview rounds ----------
  function roundFields(body, partial) {
    const out = {};
    if (!partial || body.roundType !== undefined) {
      if (!ROUND_TYPES.includes(body.roundType)) return { error: "Pick a round type" };
      out.round_type = body.roundType;
    }
    if (body.heldOn !== undefined) {
      const d = clean(body.heldOn);
      if (d && !isDate(d)) return { error: "Enter the date as YYYY-MM-DD" };
      out.held_on = d || null;
    }
    if (body.reflection !== undefined) {
      const text = String(body.reflection ?? "");
      if (text.length > LIMITS.reflection) return { error: `Reflection is too long (max ${LIMITS.reflection} characters)` };
      out.reflection = text.trim() ? text : null;
    }
    return { out };
  }

  app.post("/api/prep/rounds", auth, wrap(async (req, res) => {
    const { out, error } = roundFields(req.body, false);
    if (error) return fail(res, 400, error);
    if (!(await ownsCompany(req.userId, req.body.companyId))) return fail(res, 404, "Company not found");
    const [r] = await pool.query(
      "INSERT INTO interview_rounds (company_id, user_id, round_type, held_on, reflection) VALUES (?, ?, ?, ?, ?)",
      [req.body.companyId, req.userId, out.round_type, out.held_on ?? null, out.reflection ?? null],
    );
    const [rows] = await pool.query("SELECT * FROM interview_rounds WHERE id = ?", [r.insertId]);
    res.status(201).json(toRound(rows[0]));
  }));

  app.patch("/api/prep/rounds/:id", auth, wrap(async (req, res) => {
    const { out, error } = roundFields(req.body, true);
    if (error) return fail(res, 400, error);
    const keys = Object.keys(out);
    if (!keys.length) return fail(res, 400, "Nothing to update");
    const [r] = await pool.query(
      `UPDATE interview_rounds SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ? AND user_id = ?`,
      [...keys.map((k) => out[k]), req.params.id, req.userId],
    );
    if (!r.affectedRows) return fail(res, 404, "Round not found");
    const [rows] = await pool.query("SELECT * FROM interview_rounds WHERE id = ?", [req.params.id]);
    res.json(toRound(rows[0]));
  }));

  app.delete("/api/prep/rounds/:id", auth, wrap(async (req, res) => {
    await pool.query("DELETE FROM interview_rounds WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.status(204).end(); // its questions stay in the company's question bank
  }));

  // ---------- Questions ----------
  app.post("/api/prep/questions", auth, wrap(async (req, res) => {
    const question = clean(req.body.question);
    const answer = String(req.body.answer ?? "");
    if (!question) return fail(res, 400, "Write the question first");
    if (question.length > LIMITS.question) return fail(res, 400, `Question is too long (max ${LIMITS.question} characters)`);
    if (answer.length > LIMITS.answer) return fail(res, 400, `Answer is too long (max ${LIMITS.answer} characters)`);
    const { companyId } = req.body;
    if (!(await ownsCompany(req.userId, companyId))) return fail(res, 404, "Company not found");
    const roundId = req.body.roundId ?? null;
    if (roundId !== null && !(await ownsRound(req.userId, companyId, roundId))) return fail(res, 404, "Round not found");
    const [r] = await pool.query(
      `INSERT INTO interview_questions (company_id, user_id, round_id, question, answer, next_review)
       VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [companyId, req.userId, roundId, question, answer.trim() ? answer : null],
    );
    const [rows] = await pool.query("SELECT * FROM interview_questions WHERE id = ?", [r.insertId]);
    res.status(201).json(toQuestion(rows[0]));
  }));

  app.patch("/api/prep/questions/:id", auth, wrap(async (req, res) => {
    const [[current]] = await pool.query("SELECT company_id FROM interview_questions WHERE id = ? AND user_id = ?", [
      req.params.id, req.userId,
    ]).then(([r]) => [r]);
    if (!current) return fail(res, 404, "Question not found");
    const sets = [];
    const params = [];
    if (req.body.question !== undefined) {
      const q = clean(req.body.question);
      if (!q || q.length > LIMITS.question) return fail(res, 400, "Question must be 1 to 2000 characters");
      sets.push("question = ?"); params.push(q);
    }
    if (req.body.answer !== undefined) {
      const a = String(req.body.answer ?? "");
      if (a.length > LIMITS.answer) return fail(res, 400, `Answer is too long (max ${LIMITS.answer} characters)`);
      sets.push("answer = ?"); params.push(a.trim() ? a : null);
    }
    if (req.body.roundId !== undefined) {
      const rid = req.body.roundId;
      if (rid !== null && !(await ownsRound(req.userId, current.company_id, rid))) return fail(res, 404, "Round not found");
      sets.push("round_id = ?"); params.push(rid);
    }
    if (!sets.length) return fail(res, 400, "Nothing to update");
    await pool.query(`UPDATE interview_questions SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, [
      ...params, req.params.id, req.userId,
    ]);
    const [rows] = await pool.query("SELECT * FROM interview_questions WHERE id = ?", [req.params.id]);
    res.json(toQuestion(rows[0]));
  }));

  app.delete("/api/prep/questions/:id", auth, wrap(async (req, res) => {
    await pool.query("DELETE FROM interview_questions WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.status(204).end();
  }));

  // ---------- Quiz ----------
  // Questions that are due, hardest (lowest box) first. Optionally for one company.
  app.get("/api/prep/quiz", auth, wrap(async (req, res) => {
    const params = [req.userId];
    let scope = "";
    if (req.query.companyId) {
      scope = "AND q.company_id = ?";
      params.push(req.query.companyId);
    }
    const [rows] = await pool.query(
      `SELECT q.*, c.name AS company_name FROM interview_questions q
       JOIN prep_companies c ON c.id = q.company_id
       WHERE q.user_id = ? ${scope} AND q.next_review <= CURDATE()
       ORDER BY q.box, q.next_review, q.id LIMIT 30`,
      params,
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM interview_questions q WHERE q.user_id = ? ${scope}`,
      params,
    ).then(([r]) => [r]);
    res.json({ total, cards: rows.map((r) => ({ ...toQuestion(r), companyName: r.company_name })) });
  }));

  app.post("/api/prep/questions/:id/review", auth, wrap(async (req, res) => {
    if (!["got", "missed"].includes(req.body.result)) return fail(res, 400, "Result must be got or missed");
    const [[q]] = await pool.query("SELECT box FROM interview_questions WHERE id = ? AND user_id = ?", [
      req.params.id, req.userId,
    ]).then(([r]) => [r]);
    if (!q) return fail(res, 404, "Question not found");
    const box = req.body.result === "got" ? Math.min(q.box + 1, MAX_BOX) : 1;
    await pool.query(
      `UPDATE interview_questions SET box = ?, last_reviewed = CURDATE(),
         next_review = DATE_ADD(CURDATE(), INTERVAL ? DAY) WHERE id = ? AND user_id = ?`,
      [box, BOX_DAYS[box], req.params.id, req.userId],
    );
    res.json({ box, nextInDays: BOX_DAYS[box] });
  }));
}
