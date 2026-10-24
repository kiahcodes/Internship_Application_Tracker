// Fixed choices for profile and eligibility fields. Mirrored in backend/src/options.js.
export const COURSES = ["B.Tech / B.E.", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc", "BBA", "MBA", "Diploma", "Other"];
export const BRANCHES = [
  "Computer Science", "Information Technology", "AI & Data Science", "Electronics & Communication",
  "Electrical", "Mechanical", "Civil", "Chemical", "Other",
];
export const SEMESTERS = Array.from({ length: 10 }, (_, i) => String(i + 1));

/** Graduation years worth offering: last year (alumni) through six years out. */
export const graduationYears = () => {
  const year = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => String(year - 1 + i));
};

// A stored value that isn't one of the choices (an old free-text answer) is still shown, not lost.
export const withCurrent = (options, current) =>
  current && !options.includes(String(current)) ? [String(current), ...options] : options;
