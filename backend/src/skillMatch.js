// Copy of frontend/src/utils/skillMatch.js: the server matches skills so it can sort and page by them. Keep the two in step.
// Spellings that mean the same skill; any of them in a posting counts as a match.
const ALIAS_GROUPS = [
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["react", "reactjs", "react.js"],
  ["node.js", "nodejs", "node"],
  ["vue", "vuejs", "vue.js"],
  ["next.js", "nextjs"],
  ["express", "expressjs", "express.js"],
  ["mongodb", "mongo"],
  ["postgresql", "postgres"],
  ["python", "py"],
  ["c++", "cpp"],
  ["c#", "csharp"],
  ["tailwind", "tailwindcss", "tailwind css"],
  ["machine learning", "ml"],
  ["html", "html5"],
  ["css", "css3"],
];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function variantsOf(skill) {
  const key = skill.toLowerCase();
  const group = ALIAS_GROUPS.find((g) => g.includes(key));
  return group ?? [key];
}

export const parseSkills = (skills) =>
  [
    ...new Set(
      (skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];

const plainText = (html) => String(html || "").replace(/<[^>]*>/g, " ").toLowerCase();

/**
 * Which of the student's skills appear in a posting's title or description?
 * Whole-word matching, so "Java" doesn't match "JavaScript" and "C" doesn't match "C++".
 */
export function matchSkills(skills, internship) {
  const text = `${internship.role} ${plainText(internship.description)}`.toLowerCase();
  return skills.filter((skill) =>
    variantsOf(skill).some((v) =>
      new RegExp(`(?<![a-z0-9+#])${escapeRegExp(v)}(?![a-z0-9+#])`).test(text),
    ),
  );
}
