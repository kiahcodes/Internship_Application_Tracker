import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import multer from "multer";
import "dotenv/config";
import { pool, isUniqueViolation } from "./db.js";
import { uploadFile, downloadFile, removeFiles } from "./storage.js";
import { normalizeUsername, usernameError } from "./username.js";
import { identityFromToken, suggestUsername } from "./oauth.js";
import { computeAnalytics } from "./analytics.js";
import { mountPrep } from "./prep.js";
import { mountInternships } from "./internships.js";
import { startScraperSchedule } from "./scrapers/schedule.js";
import { sendMail } from "./mailer.js";
import { rateLimit } from "./rateLimit.js";
import { cleanProfile, shapeProfile } from "./profile.js";
import { STATUSES, normalizeImport, parseDate, toCsv } from "./trackerCsv.js";
import { ROLES, PERMISSIONS, requireAuth, requirePermission, signToken } from "./auth.js";

const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const MAX_RESUME_VERSIONS = 5;
const MAX_COVER_LETTER_FILES = 25; // letters are usually one per application
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
});

// Wrap async handlers so thrown errors reach the error middleware.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  email: u.email,
  role: u.role,
  permissions: PERMISSIONS[u.role],
});

// Used by the host's health check (and handy for waking a sleeping free instance).
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---------- Auth ----------
const sameSecret = (a, b) => {
  const hash = (v) => crypto.createHash("sha256").update(String(v)).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
};
const byIp = (req) => req.ip;
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  key: (req) => `${req.ip}|${String(req.body?.identifier ?? req.body?.email ?? "").toLowerCase()}`,
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
});
const resetLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, key: byIp,
  message: "Too many reset requests. Please wait a few minutes and try again.",
});

app.post("/api/auth/signup", h(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || "");
  const role = req.body.role === "poster" ? "poster" : "student";
  if (!name) return res.status(400).json({ error: "Name is required" });
  const badUsername = usernameError(username);
  if (badUsername) return res.status(400).json({ error: badUsername });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  // Anyone can pick "poster" in the form, so posting rights need a code only the placement cell hands out.
  if (role === "poster") {
    const expected = process.env.POSTER_INVITE_CODE;
    if (!expected)
      return res.status(403).json({ error: "Poster sign-ups are closed. Ask the administrator for access." });
    if (!sameSecret(req.body.inviteCode || "", expected))
      return res.status(403).json({ error: "That invite code isn't right" });
  }

  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    // The unique constraints are the real guard, so two simultaneous sign-ups can't both win.
    [{ insertId: id }] = await conn.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?) RETURNING id",
      [name, username, email, hash, role],
    );
    await conn.query("INSERT INTO profiles (user_id) VALUES (?)", [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (isUniqueViolation(err, "users_email_key")) return res.status(409).json({ error: "That email is already registered" });
    if (isUniqueViolation(err, "uq_users_username")) return res.status(409).json({ error: "That username is taken" });
    throw err;
  } finally {
    conn.release();
  }
  const user = publicUser({ id, name, username, email, role });
  res.status(201).json({ token: signToken(user), user });
}));

// Sign in / sign up with Google, GitHub or LinkedIn. The browser signs in through Supabase Auth and
// sends us the resulting access token; we verify it and issue our own session token as usual.
// An existing account with the same verified email is signed in; a new one needs a username first.
app.post("/api/auth/oauth", h(async (req, res) => {
  const identity = await identityFromToken(String(req.body.accessToken || ""));
  if (!identity) return res.status(401).json({ error: "Couldn't verify that sign-in. Please try again." });

  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [identity.email]);
  if (rows[0]) return res.json({ token: signToken(rows[0]), user: publicUser(rows[0]) });

  const username = normalizeUsername(req.body.username);
  if (!username) {
    return res.json({ needsUsername: true, name: identity.name, email: identity.email, suggestedUsername: await suggestUsername(identity.handle) });
  }
  const badUsername = usernameError(username);
  if (badUsername) return res.status(400).json({ error: badUsername });

  // Social accounts have no password; store a random hash nobody can match. "Forgot password" can set one later.
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const conn = await pool.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    [{ insertId: id }] = await conn.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, 'student') RETURNING id",
      [identity.name, username, identity.email, hash],
    );
    await conn.query("INSERT INTO profiles (user_id) VALUES (?)", [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (isUniqueViolation(err, "uq_users_username")) return res.status(409).json({ error: "That username is taken" });
    if (isUniqueViolation(err, "users_email_key")) return res.status(409).json({ error: "That email is already registered" });
    throw err;
  } finally {
    conn.release();
  }
  const user = publicUser({ id, name: identity.name, username, email: identity.email, role: "student" });
  res.status(201).json({ token: signToken(user), user });
}));

// Live check for the sign-up form. Also used by the profile page when changing a username.
app.get("/api/auth/username-available", h(async (req, res) => {
  const username = normalizeUsername(req.query.u);
  const error = usernameError(username);
  if (error) return res.json({ available: false, reason: error });
  const [rows] = await pool.query("SELECT 1 FROM users WHERE lower(username) = ?", [username]);
  res.json({ available: rows.length === 0, reason: rows.length ? "That username is taken" : null });
}));

app.post("/api/auth/login", loginLimit, h(async (req, res) => {
  // Signs in with either the email or the username.
  const who = normalizeUsername(req.body.identifier ?? req.body.email);
  const password = String(req.body.password || "");
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? OR username = ?", [who, who]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: "Invalid email/username or password" });
  res.json({ token: signToken(user), user: publicUser(user) });
}));

// Password reset: a one-time link, valid for 30 minutes. The reply is the same whether or not the
// email exists, so this can't be used to find out who has an account.
app.post("/api/auth/forgot", resetLimit, h(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  const [rows] = await pool.query("SELECT id, name FROM users WHERE email = ?", [email]);
  if (rows[0]) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.query("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [rows[0].id]);
    await pool.query(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL '30 minutes')",
      [rows[0].id, tokenHash],
    );
    const base = process.env.APP_URL || "http://localhost:5173";
    sendMail({
      to: email,
      subject: "Reset your Internship Tracker password",
      text: `Hi ${rows[0].name},\n\nUse this link to choose a new password. It works once and expires in 30 minutes:\n${base}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`,
    }).catch((err) => console.error("[mail] reset email failed:", err.message));
  }
  res.json({ ok: true });
}));

app.post("/api/auth/reset", resetLimit, h(async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [rows] = await pool.query(
    "SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
    [tokenHash],
  );
  if (!rows[0]) return res.status(400).json({ error: "This reset link has expired or was already used. Request a new one." });
  const hash = await bcrypt.hash(password, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, rows[0].user_id]);
  await pool.query("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [rows[0].user_id]);
  res.json({ ok: true });
}));

app.get("/api/auth/me", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name, username, email, role FROM users WHERE id = ?", [req.userId]);
  res.json(publicUser(rows[0]));
}));

// Permanently deletes the signed-in account. The password is required so a stolen
// session token alone can't wipe an account. Profile, resumes and tracked applications
// go with it (ON DELETE CASCADE); internships the user posted are removed too.
app.delete("/api/account", requireAuth, h(async (req, res) => {
  const password = String(req.body?.password || "");
  const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.userId]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash)))
    return res.status(403).json({ error: "That password isn't right" });

  const [files] = await pool.query("SELECT storage_path FROM resumes WHERE user_id = ?", [req.userId]);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM internships WHERE posted_by = ?", [req.userId]);
    await conn.query("DELETE FROM users WHERE id = ?", [req.userId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
  await removeFiles(files.map((f) => f.storage_path));
  res.status(204).end();
}));

// ---------- Profile ----------
const profileQuery = `
  SELECT u.name, u.username, u.email, p.course, p.semester, p.bio, p.skills, p.branch, p.grad_year, p.cgpa,
         p.phone, p.github, p.linkedin, p.portfolio, p.google_scholar, p.orcid, p.codeforces, p.leetcode,
         p.preferred_locations
  FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`;

app.get("/api/profile", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query(profileQuery, [req.userId]);
  res.json(shapeProfile(rows[0]));
}));

app.put("/api/profile", requireAuth, h(async (req, res) => {
  const { name, email } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!String(name || "").trim()) return res.status(400).json({ error: "Name is required" });
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: "Enter a valid email" });

  const [[current]] = await pool.query(profileQuery, [req.userId]).then(([r]) => [r]);
  const cleaned = cleanProfile(req.body, current);
  if (cleaned.error) return res.status(400).json({ error: cleaned.error });
  const v = cleaned.values;

  const [clash] = await pool.query("SELECT id FROM users WHERE email = ? AND id <> ?", [
    cleanEmail,
    req.userId,
  ]);
  if (clash.length) return res.status(409).json({ error: "That email is already in use" });

  await pool.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
    String(name).trim(), cleanEmail, req.userId,
  ]);
  await pool.query(
    `INSERT INTO profiles (user_id, course, semester, bio, skills, branch, grad_year, cgpa, phone, github, linkedin, portfolio,
                           google_scholar, orcid, codeforces, leetcode, preferred_locations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET course = EXCLUDED.course, semester = EXCLUDED.semester, bio = EXCLUDED.bio,
       skills = EXCLUDED.skills, branch = EXCLUDED.branch, grad_year = EXCLUDED.grad_year, cgpa = EXCLUDED.cgpa,
       phone = EXCLUDED.phone, github = EXCLUDED.github, linkedin = EXCLUDED.linkedin,
       portfolio = EXCLUDED.portfolio, google_scholar = EXCLUDED.google_scholar, orcid = EXCLUDED.orcid,
       codeforces = EXCLUDED.codeforces, leetcode = EXCLUDED.leetcode,
       preferred_locations = EXCLUDED.preferred_locations`,
    [req.userId, v.course, v.semester, v.bio, v.skills, v.branch, v.grad_year, v.cgpa, v.phone,
     v.github, v.linkedin, v.portfolio, v.google_scholar, v.orcid, v.codeforces, v.leetcode, v.preferred_locations],
  );
  const [rows] = await pool.query(profileQuery, [req.userId]);
  res.json(shapeProfile(rows[0]));
}));

// ---------- Internships ----------
mountInternships(app);

// ---------- Tracker cards ----------
const CARD_SELECT = `
  SELECT a.id, a.internship_id, a.title, a.status, a.resume_id, a.cover_letter, a.cover_letter_id,
         COALESCE(r.file_name, a.resume_file_name) AS resume_name, cl.file_name AS cover_letter_name,
         i.company, i.role, i.description, i.url AS posting_url,
         COALESCE(to_char(i.deadline, 'YYYY-MM-DD'), to_char(a.deadline, 'YYYY-MM-DD')) AS deadline,
         to_char(a.remind_on, 'YYYY-MM-DD') AS remind_on
  FROM applications a
  LEFT JOIN resumes r ON r.id = a.resume_id
  LEFT JOIN resumes cl ON cl.id = a.cover_letter_id
  LEFT JOIN internships i ON i.id = a.internship_id`;
const toCard = (r) => ({
  id: r.id,
  internship_id: r.internship_id,
  title: r.title,
  status: r.status,
  resumeId: r.resume_id,
  resumeName: r.resume_name ?? null,
  coverLetter: r.cover_letter ?? "",
  coverLetterId: r.cover_letter_id,
  coverLetterName: r.cover_letter_name ?? null,
  // Posting details, when the card came from a listing (null for hand-added cards).
  company: r.company ?? null,
  role: r.role ?? null,
  description: r.description ?? null,
  postingUrl: r.posting_url ?? null,
  deadline: r.deadline ?? null,
  remindOn: r.remind_on ?? null,
});
const MAX_COVER_LETTER = 8000;

app.get("/api/tracker", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query(`${CARD_SELECT} WHERE a.user_id = ? ORDER BY a.id`, [
    req.userId,
  ]);
  res.json(rows.map(toCard));
}));

// ---------- Spreadsheet export / import ----------
app.get("/api/tracker/export", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.title, a.status, i.company, i.role, COALESCE(r.file_name, a.resume_file_name) AS resume,
            (a.cover_letter IS NOT NULL OR a.cover_letter_id IS NOT NULL) AS letter,
            to_char(a.created_at, 'YYYY-MM-DD') AS applied_on,
            COALESCE(to_char(i.deadline, 'YYYY-MM-DD'), to_char(a.deadline, 'YYYY-MM-DD')) AS deadline,
            to_char(a.remind_on, 'YYYY-MM-DD') AS remind_on, i.url
     FROM applications a
     LEFT JOIN resumes r ON r.id = a.resume_id
     LEFT JOIN internships i ON i.id = a.internship_id
     WHERE a.user_id = ? ORDER BY a.created_at, a.id`,
    [req.userId],
  );
  const csv = toCsv(
    ["Title", "Company", "Role", "Status", "Applied on", "Deadline", "Remind on", "Resume", "Cover letter", "Link"],
    rows.map((r) => [r.title, r.company, r.role, r.status, r.applied_on, r.deadline, r.remind_on, r.resume,
      r.letter ? "Yes" : "No", r.url]),
    [0, 1, 2, 7, 9], // free-text columns, guarded against spreadsheet formulas
  );
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
  res.send(csv);
}));

// Send the CSV text as the request body. ?dryRun=1 reports what would happen without saving.
app.post("/api/tracker/import", requireAuth, express.text({ type: ["text/csv", "text/plain"], limit: "1mb" }), h(async (req, res) => {
  const parsed = normalizeImport(typeof req.body === "string" ? req.body : "");
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  // Re-importing the same sheet must not double everything up.
  const [existing] = await pool.query("SELECT LOWER(title) AS t FROM applications WHERE user_id = ?", [req.userId]);
  const have = new Set(existing.map((r) => r.t));
  const skipped = [...parsed.skipped];
  const fresh = [];
  for (const row of parsed.rows) {
    if (have.has(row.title.toLowerCase())) skipped.push({ line: row.line, reason: "Already in your tracker" });
    else fresh.push(row);
  }

  if (req.query.dryRun !== "1" && fresh.length) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const r of fresh) {
        await conn.query(
          `INSERT INTO applications (user_id, title, status, deadline, remind_on, created_at)
           VALUES (?, ?, ?, ?, ?, COALESCE((?::text || ' 12:00:00')::timestamptz, NOW()))`,
          [req.userId, r.title, r.status, r.deadline, r.remind_on, r.applied_on],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  }
  res.json({
    added: fresh.length,
    skipped: skipped.sort((a, b) => a.line - b.line),
    warnings: parsed.warnings,
    preview: fresh.slice(0, 8).map(({ title, status, applied_on, deadline }) => ({ title, status, applied_on, deadline })),
    dryRun: req.query.dryRun === "1",
  });
}));

app.post("/api/tracker", requireAuth, h(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const status = req.body.status || "Applied";
  if (!title) return res.status(400).json({ error: "Title is required" });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const [result] = await pool.query(
    `INSERT INTO applications (user_id, title, status, resume_id, resume_file_name)
     SELECT ?::int, ?::text, ?::text, r.id, r.file_name
     FROM (SELECT 1) one
     LEFT JOIN resumes r ON r.user_id = ? AND r.is_current AND r.kind = 'resume'
     RETURNING id`,
    [req.userId, title.slice(0, 255), status, req.userId],
  );
  const [rows] = await pool.query(`${CARD_SELECT} WHERE a.id = ?`, [result.insertId]);
  res.status(201).json(toCard(rows[0]));
}));

// Update a card's status and/or the resume version sent with it.
app.patch("/api/tracker/:id", requireAuth, h(async (req, res) => {
  const { status, resumeId, coverLetter, coverLetterId, remindOn } = req.body;
  const sets = [];
  const params = [];
  let statusChanged = false;
  let resumeFileName = null;
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const [current] = await pool.query("SELECT status FROM applications WHERE id = ? AND user_id = ?", [
      req.params.id, req.userId,
    ]);
    statusChanged = current.length > 0 && current[0].status !== status;
    sets.push("status = ?");
    params.push(status);
  }
  if (resumeId !== undefined) {
    if (resumeId !== null) {
      const [owned] = await pool.query(
        "SELECT id, file_name FROM resumes WHERE id = ? AND user_id = ? AND kind = 'resume'",
        [resumeId, req.userId],
      );
      if (!owned.length) return res.status(404).json({ error: "Resume not found" });
      resumeFileName = owned[0].file_name;
    }
    sets.push("resume_id = ?", "resume_file_name = ?");
    params.push(resumeId, resumeFileName);
  }
  if (coverLetterId !== undefined) {
    if (coverLetterId !== null) {
      const [owned] = await pool.query(
        "SELECT id FROM resumes WHERE id = ? AND user_id = ? AND kind = 'cover_letter'",
        [coverLetterId, req.userId],
      );
      if (!owned.length) return res.status(404).json({ error: "Cover letter file not found" });
    }
    sets.push("cover_letter_id = ?");
    params.push(coverLetterId);
  }
  if (coverLetter !== undefined) {
    const text = coverLetter === null ? "" : String(coverLetter);
    if (text.length > MAX_COVER_LETTER)
      return res.status(400).json({ error: `Cover letter is too long (max ${MAX_COVER_LETTER} characters)` });
    sets.push("cover_letter = ?");
    params.push(text.trim() ? text : null);
  }
  if (remindOn !== undefined) {
    const date = remindOn === null || remindOn === "" ? null : parseDate(remindOn);
    if (date === undefined) return res.status(400).json({ error: "Reminder must be a date" });
    sets.push("remind_on = ?");
    params.push(date);
  }
  if (!sets.length) return res.status(400).json({ error: "Nothing to update" });

  const [result] = await pool.query(
    `UPDATE applications SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    [...params, req.params.id, req.userId],
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Card not found" });
  if (statusChanged) {
    await pool.query("INSERT INTO application_events (application_id, user_id, status) VALUES (?, ?, ?)", [
      req.params.id, req.userId, status,
    ]);
  }
  res.json({ id: Number(req.params.id), status, resumeId, coverLetter, coverLetterId, remindOn });
}));

app.delete("/api/tracker/:id", requireAuth, h(async (req, res) => {
  await pool.query("DELETE FROM applications WHERE id = ? AND user_id = ?", [
    req.params.id, req.userId,
  ]);
  res.status(204).end();
}));

mountPrep(app);

// ---------- Analytics ----------
app.get("/api/analytics", requireAuth, h(async (req, res) => {
  const [apps] = await pool.query(
    `SELECT a.id, a.status, a.created_at, a.resume_id, r.file_name AS resume_name, i.source
     FROM applications a
     LEFT JOIN resumes r ON r.id = a.resume_id
     LEFT JOIN internships i ON i.id = a.internship_id
     WHERE a.user_id = ?`,
    [req.userId],
  );
  const [events] = await pool.query(
    "SELECT application_id, status, changed_at AS at FROM application_events WHERE user_id = ? ORDER BY changed_at",
    [req.userId],
  );
  res.json(computeAnalytics(apps, events));
}));

// ---------- Resumes & cover letters ----------
// Both are uploaded files kept as versions in the `resumes` table, told apart by `kind`.
const fileCols = "id, file_name, file_size, is_current, uploaded_at";
const toFile = (r) => ({
  id: r.id,
  fileName: r.file_name,
  fileSize: r.file_size,
  uploadedAt: r.uploaded_at,
  current: Boolean(r.is_current),
});
const isPdf = (r) => r.mime_type === "application/pdf" && /\.pdf$/i.test(r.file_name);

function mountFiles(base, kind, label, maxVersions) {
  app.get(base, requireAuth, h(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${fileCols} FROM resumes WHERE user_id = ? AND kind = ? ORDER BY uploaded_at DESC, id DESC`,
      [req.userId, kind],
    );
    res.json(rows.map(toFile));
  }));

  app.post(base, requireAuth, upload.single("file"), h(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // The file goes to Supabase Storage under an opaque key; the original name stays in the row.
    const storagePath = `${req.userId}/${crypto.randomUUID()}`;
    await uploadFile(storagePath, file.buffer, file.mimetype);

    const conn = await pool.getConnection();
    let pruned = [];
    try {
      await conn.beginTransaction();
      await conn.query("UPDATE resumes SET is_current = FALSE WHERE user_id = ? AND kind = ?", [req.userId, kind]);
      const [result] = await conn.query(
        `INSERT INTO resumes (user_id, file_name, mime_type, file_size, storage_path, is_current, kind)
         VALUES (?, ?, ?, ?, ?, TRUE, ?) RETURNING id`,
        [req.userId, file.originalname, file.mimetype, file.size, storagePath, kind],
      );
      // Keep only the newest versions of this kind.
      [{ rows: pruned }] = await conn.query(
        `DELETE FROM resumes WHERE user_id = ? AND kind = ? AND id NOT IN (
           SELECT id FROM resumes WHERE user_id = ? AND kind = ?
           ORDER BY uploaded_at DESC, id DESC LIMIT ?)
         RETURNING storage_path`,
        [req.userId, kind, req.userId, kind, maxVersions],
      );
      await conn.commit();
      await removeFiles(pruned.map((r) => r.storage_path));
      const [rows] = await pool.query(`SELECT ${fileCols} FROM resumes WHERE id = ?`, [result.insertId]);
      res.status(201).json(toFile(rows[0]));
    } catch (err) {
      // The connection may already be dead; don't let that hide the real error.
      await conn.rollback().catch(() => {});
      await removeFiles([storagePath]);
      throw err;
    } finally {
      conn.release();
    }
  }));

  app.patch(`${base}/:id/current`, requireAuth, h(async (req, res) => {
    const [owned] = await pool.query(
      "SELECT id FROM resumes WHERE id = ? AND user_id = ? AND kind = ?",
      [req.params.id, req.userId, kind],
    );
    if (!owned[0]) return res.status(404).json({ error: `${label} not found` });
    await pool.query("UPDATE resumes SET is_current = (id = ?) WHERE user_id = ? AND kind = ?", [
      req.params.id, req.userId, kind,
    ]);
    res.json({ ok: true });
  }));

  app.delete(`${base}/:id`, requireAuth, h(async (req, res) => {
    const [{ rows: removed }] = await pool.query(
      "DELETE FROM resumes WHERE id = ? AND user_id = ? AND kind = ? RETURNING storage_path",
      [req.params.id, req.userId, kind],
    );
    await removeFiles(removed.map((r) => r.storage_path));
    // If the current one was removed, promote the newest remaining version.
    await pool.query(
      `UPDATE resumes SET is_current = TRUE WHERE user_id = ? AND kind = ? AND id = (
         SELECT id FROM resumes WHERE user_id = ? AND kind = ? ORDER BY uploaded_at DESC, id DESC LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM resumes WHERE user_id = ? AND kind = ? AND is_current)`,
      [req.userId, kind, req.userId, kind, req.userId, kind],
    );
    res.status(204).end();
  }));

  // ?inline=1 lets the browser show a PDF in a tab. Anything else is always a download,
  // so an uploaded HTML file can never run in the page.
  app.get(`${base}/:id/download`, requireAuth, h(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT file_name, mime_type, storage_path FROM resumes WHERE id = ? AND user_id = ? AND kind = ?",
      [req.params.id, req.userId, kind],
    );
    if (!rows[0]) return res.status(404).json({ error: `${label} not found` });
    const data = await downloadFile(rows[0].storage_path);
    const inline = req.query.inline === "1" && isPdf(rows[0]);
    res.set({
      "Content-Type": inline ? "application/pdf" : rows[0].mime_type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(rows[0].file_name)}`,
      "X-Content-Type-Options": "nosniff",
    });
    res.send(data);
  }));
}

mountFiles("/api/resumes", "resume", "Resume", MAX_RESUME_VERSIONS);
mountFiles("/api/cover-letters", "cover_letter", "Cover letter", MAX_COVER_LETTER_FILES);

// ---------- Errors ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ error: "That file is too large. Please upload something under 4MB." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

// Vercel runs the exported app as a serverless function, so there is no port to listen on and no
// process to keep the scraper's cron timer alive. Locally (`npm run dev`) we start both as before.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    if (process.env.SCRAPER_ENABLED === "true") startScraperSchedule();
  });
}

export default app;
