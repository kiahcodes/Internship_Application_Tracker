import { BRANCHES, COURSES, SEMESTERS } from "./options.js";

const PHONE_RE = /^\+?[\d\s()-]{7,20}$/;

// A link people type as "github.com/me" becomes https://github.com/me.
function cleanUrl(raw, label) {
  const s = String(raw ?? "").trim();
  if (!s) return { value: "" };
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) throw new Error();
  } catch {
    return { error: `${label} doesn't look like a link` };
  }
  return withScheme.length > 200 ? { error: `${label} is too long` } : { value: withScheme };
}

/**
 * Validates the editable profile fields. `current` is what is stored now: a value that is
 * already stored (e.g. a free-text course from before these became choices) may be kept as-is,
 * so old accounts can still save other changes.
 */
export function cleanProfile(body, current = {}) {
  const choice = (key, label, allowed) => {
    const v = String(body[key] ?? "").trim();
    if (v && !allowed.includes(v) && v !== current[key]) return { error: `Pick a ${label} from the list` };
    return { value: v };
  };
  const course = choice("course", "course", COURSES);
  const semester = choice("semester", "semester", SEMESTERS);
  const branch = choice("branch", "branch", BRANCHES);
  const github = cleanUrl(body.github, "GitHub");
  const linkedin = cleanUrl(body.linkedin, "LinkedIn");
  const portfolio = cleanUrl(body.portfolio, "Portfolio");
  const failed = [course, semester, branch, github, linkedin, portfolio].find((x) => x.error);
  if (failed) return { error: failed.error };

  let grad_year = null;
  if (body.grad_year !== undefined && body.grad_year !== null && body.grad_year !== "") {
    grad_year = Number(body.grad_year);
    if (!Number.isInteger(grad_year) || grad_year < 2000 || grad_year > 2100)
      return { error: "Graduation year must be a year like 2027" };
  }
  let cgpa = null;
  if (body.cgpa !== undefined && body.cgpa !== null && body.cgpa !== "") {
    cgpa = Math.round(Number(body.cgpa) * 100) / 100;
    if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) return { error: "CGPA must be between 0 and 10" };
  }
  const phone = String(body.phone ?? "").trim();
  if (phone && !PHONE_RE.test(phone)) return { error: "Enter a valid phone number" };

  return {
    values: {
      course: course.value, semester: semester.value, branch: branch.value,
      grad_year, cgpa, phone,
      github: github.value, linkedin: linkedin.value, portfolio: portfolio.value,
      preferred_locations: String(body.preferred_locations ?? "").trim().slice(0, 300),
      bio: String(body.bio ?? ""), skills: String(body.skills ?? "").slice(0, 500),
    },
  };
}

export const shapeProfile = (row) => ({ ...row, cgpa: row.cgpa === null || row.cgpa === undefined ? null : Number(row.cgpa) });
