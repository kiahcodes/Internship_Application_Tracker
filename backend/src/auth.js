import jwt from "jsonwebtoken";
import { pool } from "./db.js";

// ---- RBAC policy: role -> permissions ----
const STUDENT = ["tracker:own", "resumes:own", "profile:own", "internships:read"];
const POSTER = [...STUDENT, "internships:manage"];

export const ROLES = ["student", "poster"];
export const PERMISSIONS = { student: STUDENT, poster: POSTER };

export const signToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Authentication: who are you? The role is read from the DB on every request,
// so promotions/demotions apply immediately rather than when the JWT expires.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not signed in" });
  let id;
  try {
    id = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ error: "Session expired, please sign in again" });
  }
  try {
    const [rows] = await pool.query("SELECT role FROM users WHERE id = ?", [id]);
    if (!rows[0]) return res.status(401).json({ error: "Account no longer exists" });
    req.userId = id;
    req.role = rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
}

// Authorization: are you allowed?
export const requirePermission = (permission) => (req, res, next) => {
  if (!PERMISSIONS[req.role]?.includes(permission))
    return res.status(403).json({ error: "You don't have permission to do that" });
  next();
};
