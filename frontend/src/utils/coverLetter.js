import { matchSkills, parseSkills } from "./skillMatch";

export const MAX_COVER_LETTER = 8000;

const joinList = (items) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// "Solutions Engineer Intern – Pinterest" -> { role, company }, for hand-added cards.
function splitTitle(title) {
  const parts = String(title).split(/\s[–-]\s/);
  return parts.length >= 2
    ? { role: parts.slice(0, -1).join(" – "), company: parts[parts.length - 1] }
    : { role: title, company: "" };
}

// Phone and email, then profile links, so the reader can reach the applicant.
function contactLines(student) {
  if (!student) return [];
  return [
    [student.phone, student.email].filter(Boolean).join(" · "),
    [student.linkedin, student.github, student.portfolio].filter(Boolean).join(" · "),
  ].filter(Boolean);
}

/**
 * A starting draft, not a finished letter. Anything the app can't know (your own
 * projects, why you want this company) is left as a [bracketed placeholder].
 */
export function draftCoverLetter(card, student) {
  const fallback = splitTitle(card.title);
  const role = card.role || fallback.role;
  const company = card.company || fallback.company;
  const name = student?.name || "[Your name]";

  const matched = matchSkills(parseSkills(student?.skills), {
    role,
    description: card.description,
  });

  const course = student?.course ? `${student.course}${student.branch ? ` (${student.branch})` : ""}` : "";
  const education = course ? `, a ${course} student${student.grad_year ? ` graduating in ${student.grad_year}` : ""}` : "";
  const intro = `I'm ${name}${education}, and I'm applying for the ${role} position${company ? ` at ${company}` : ""}.`;
  const fit = matched.length
    ? ` My skills in ${joinList(matched)} match what the role asks for.`
    : "";

  return [
    company ? `Dear ${company} hiring team,` : "Dear hiring team,",
    `${intro}${fit}`,
    "[Describe one project or experience that shows you can do this work: what you built, which tools you used, and the result.]",
    `[Say why ${company ? company : "this company"} or this role interests you.]`,
    "I've attached my resume and would welcome the chance to talk. Thank you for your time.",
    [`Sincerely,\n${name}`, ...contactLines(student)].join("\n"),
  ].join("\n\n");
}

export const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);
export const countPlaceholders = (text) => (text.match(/\[[^\]\n]+\]/g) || []).length;
