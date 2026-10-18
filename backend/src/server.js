import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import "dotenv/config";
import { pool } from "./db.js";
import { computeAnalytics } from "./analytics.js";
import { mountPrep } from "./prep.js";
import { startScraperSchedule } from "./scrapers/schedule.js";
import { ROLES, PERMISSIONS, requireAuth, requirePermission, signToken } from "./auth.js";

const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const MAX_RESUME_VERSIONS = 5;
const MAX_COVER_LETTER_FILES = 25; // letters are usually one per application
const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
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
  email: u.email,
  role: u.role,
  permissions: PERMISSIONS[u.role],
});

// ---------- Auth ----------
app.post("/api/auth/signup", h(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = req.body.role === "poster" ? "poster" : "student";
  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) return res.status(409).json({ error: "That email is already registered" });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, hash, role],
  );
  await pool.query("INSERT INTO profiles (user_id) VALUES (?)", [result.insertId]);
  const user = publicUser({ id: result.insertId, name, email, role });
  res.status(201).json({ token: signToken(user), user });
}));

app.post("/api/auth/login", h(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: "Invalid email or password" });
  res.json({ token: signToken(user), user: publicUser(user) });
}));

app.get("/api/auth/me", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [req.userId]);
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
  res.status(204).end();
}));

// ---------- Profile ----------
const profileQuery = `
  SELECT u.name, u.email, p.course, p.semester, p.bio, p.skills
  FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`;

app.get("/api/profile", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query(profileQuery, [req.userId]);
  res.json(rows[0]);
}));

app.put("/api/profile", requireAuth, h(async (req, res) => {
  const { name, email, course = "", semester = "", bio = "", skills = "" } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!String(name || "").trim()) return res.status(400).json({ error: "Name is required" });
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: "Enter a valid email" });

  const [clash] = await pool.query("SELECT id FROM users WHERE email = ? AND id <> ?", [
    cleanEmail,
    req.userId,
  ]);
  if (clash.length) return res.status(409).json({ error: "That email is already in use" });

  await pool.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
    String(name).trim(), cleanEmail, req.userId,
  ]);
  await pool.query(
    `INSERT INTO profiles (user_id, course, semester, bio, skills) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE course = VALUES(course), semester = VALUES(semester),
       bio = VALUES(bio), skills = VALUES(skills)`,
    [req.userId, course, semester, bio, skills],
  );
  const [rows] = await pool.query(profileQuery, [req.userId]);
  res.json(rows[0]);
}));

// ---------- Internships ----------
app.get("/api/internships", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.id, i.company, i.role, i.location, i.lat, i.lon,
            i.url, i.source, i.description, i.posted_at,
            (a.id IS NOT NULL) AS applied, (i.posted_by = ?) AS mine
     FROM internships i
     LEFT JOIN applications a ON a.internship_id = i.id AND a.user_id = ?
     WHERE i.is_active = 1 OR a.id IS NOT NULL
     ORDER BY i.posted_at IS NULL, i.posted_at DESC, i.id DESC`,
    [req.userId, req.userId],
  );
  res.json(rows.map((r) => ({ ...r, applied: Boolean(r.applied), mine: Boolean(r.mine) })));
}));

// Applying creates a tracker card in "Applied"; un-applying removes it.
app.post("/api/internships/:id/apply", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query("SELECT company, role FROM internships WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "Internship not found" });
  await pool.query(
    `INSERT IGNORE INTO applications (user_id, internship_id, title, status, resume_id)
     VALUES (?, ?, ?, 'Applied', (SELECT id FROM resumes WHERE user_id = ? AND is_current = 1 AND kind = 'resume' LIMIT 1))`,
    [req.userId, req.params.id, `${rows[0].role} – ${rows[0].company}`, req.userId],
  );
  res.status(201).json({ applied: true });
}));

app.delete("/api/internships/:id/apply", requireAuth, h(async (req, res) => {
  await pool.query("DELETE FROM applications WHERE user_id = ? AND internship_id = ?", [
    req.userId, req.params.id,
  ]);
  res.json({ applied: false });
}));

// Job posters manage the internships they posted.
const internshipFields = (body) => {
  const company = String(body.company || "").trim();
  const role = String(body.role || "").trim();
  const location = String(body.location || "").trim();
  const url = String(body.url || "").trim() || null;
  if (!company || !role || !location) return { error: "Company, role and location are required" };
  if (url && !/^https?:\/\//i.test(url)) return { error: "URL must start with http(s)://" };
  return { company, role, location, url };
};

app.post("/api/internships", requireAuth, requirePermission("internships:manage"), h(async (req, res) => {
  const f = internshipFields(req.body);
  if (f.error) return res.status(400).json({ error: f.error });
  const [result] = await pool.query(
    "INSERT INTO internships (company, role, location, url, source, posted_at, posted_by) VALUES (?, ?, ?, ?, 'manual', NOW(), ?)",
    [f.company, f.role, f.location, f.url, req.userId],
  );
  res.status(201).json({ id: result.insertId, ...f, source: "manual", applied: false, mine: true });
}));

app.put("/api/internships/:id", requireAuth, requirePermission("internships:manage"), h(async (req, res) => {
  const f = internshipFields(req.body);
  if (f.error) return res.status(400).json({ error: f.error });
  const [result] = await pool.query(
    "UPDATE internships SET company = ?, role = ?, location = ?, url = ? WHERE id = ? AND posted_by = ?",
    [f.company, f.role, f.location, f.url, req.params.id, req.userId],
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Internship not found, or you didn't post it" });
  res.json({ id: Number(req.params.id), ...f });
}));

app.delete("/api/internships/:id", requireAuth, requirePermission("internships:manage"), h(async (req, res) => {
  await pool.query("DELETE FROM internships WHERE id = ? AND posted_by = ?", [
    req.params.id, req.userId,
  ]);
  res.status(204).end();
}));

// ---------- Tracker cards ----------
const CARD_SELECT = `
  SELECT a.id, a.internship_id, a.title, a.status, a.resume_id, a.cover_letter, a.cover_letter_id,
         r.file_name AS resume_name, cl.file_name AS cover_letter_name,
         i.company, i.role, i.description
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
});
const MAX_COVER_LETTER = 8000;

app.get("/api/tracker", requireAuth, h(async (req, res) => {
  const [rows] = await pool.query(`${CARD_SELECT} WHERE a.user_id = ? ORDER BY a.id`, [
    req.userId,
  ]);
  res.json(rows.map(toCard));
}));

app.post("/api/tracker", requireAuth, h(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const status = req.body.status || "Applied";
  if (!title) return res.status(400).json({ error: "Title is required" });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const [result] = await pool.query(
    `INSERT INTO applications (user_id, title, status, resume_id)
     VALUES (?, ?, ?, (SELECT id FROM resumes WHERE user_id = ? AND is_current = 1 AND kind = 'resume' LIMIT 1))`,
    [req.userId, title.slice(0, 255), status, req.userId],
  );
  const [rows] = await pool.query(`${CARD_SELECT} WHERE a.id = ?`, [result.insertId]);
  res.status(201).json(toCard(rows[0]));
}));

// Update a card's status and/or the resume version sent with it.
app.patch("/api/tracker/:id", requireAuth, h(async (req, res) => {
  const { status, resumeId, coverLetter, coverLetterId } = req.body;
  const sets = [];
  const params = [];
  let statusChanged = false;
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
        "SELECT id FROM resumes WHERE id = ? AND user_id = ? AND kind = 'resume'",
        [resumeId, req.userId],
      );
      if (!owned.length) return res.status(404).json({ error: "Resume not found" });
    }
    sets.push("resume_id = ?");
    params.push(resumeId);
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
  res.json({ id: Number(req.params.id), status, resumeId, coverLetter, coverLetterId });
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
    "SELECT application_id, status, at FROM application_events WHERE user_id = ? ORDER BY at",
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

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("UPDATE resumes SET is_current = 0 WHERE user_id = ? AND kind = ?", [req.userId, kind]);
      const [result] = await conn.query(
        `INSERT INTO resumes (user_id, file_name, mime_type, file_size, data, is_current, kind)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [req.userId, file.originalname, file.mimetype, file.size, file.buffer, kind],
      );
      // Keep only the newest versions of this kind.
      await conn.query(
        `DELETE FROM resumes WHERE user_id = ? AND kind = ? AND id NOT IN (
           SELECT id FROM (SELECT id FROM resumes WHERE user_id = ? AND kind = ?
                           ORDER BY uploaded_at DESC, id DESC LIMIT ?) keep)`,
        [req.userId, kind, req.userId, kind, maxVersions],
      );
      await conn.commit();
      const [rows] = await pool.query(`SELECT ${fileCols} FROM resumes WHERE id = ?`, [result.insertId]);
      res.status(201).json(toFile(rows[0]));
    } catch (err) {
      // The connection may already be dead; don't let that hide the real error.
      await conn.rollback().catch(() => {});
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
    await pool.query("DELETE FROM resumes WHERE id = ? AND user_id = ? AND kind = ?", [
      req.params.id, req.userId, kind,
    ]);
    // If the current one was removed, promote the newest remaining version.
    await pool.query(
      `UPDATE resumes SET is_current = 1 WHERE user_id = ? AND kind = ? AND id = (
         SELECT id FROM (SELECT id FROM resumes WHERE user_id = ? AND kind = ?
                         ORDER BY uploaded_at DESC, id DESC LIMIT 1) newest)
       AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM resumes WHERE user_id = ? AND kind = ? AND is_current = 1) cur)`,
      [req.userId, kind, req.userId, kind, req.userId, kind],
    );
    res.status(204).end();
  }));

  // ?inline=1 lets the browser show a PDF in a tab. Anything else is always a download,
  // so an uploaded HTML file can never run in the page.
  app.get(`${base}/:id/download`, requireAuth, h(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT file_name, mime_type, data FROM resumes WHERE id = ? AND user_id = ? AND kind = ?",
      [req.params.id, req.userId, kind],
    );
    if (!rows[0]) return res.status(404).json({ error: `${label} not found` });
    const inline = req.query.inline === "1" && isPdf(rows[0]);
    res.set({
      "Content-Type": inline ? "application/pdf" : rows[0].mime_type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(rows[0].file_name)}`,
      "X-Content-Type-Options": "nosniff",
    });
    res.send(rows[0].data);
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

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  if (process.env.SCRAPER_ENABLED === "true") startScraperSchedule();
});
