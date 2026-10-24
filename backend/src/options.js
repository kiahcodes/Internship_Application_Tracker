// Fixed choices for profile and eligibility fields. Mirrored in frontend/src/utils/options.js.
export const COURSES = ["B.Tech / B.E.", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc", "BBA", "MBA", "Diploma", "Other"];
export const BRANCHES = [
  "Computer Science", "Information Technology", "AI & Data Science", "Electronics & Communication",
  "Electrical", "Mechanical", "Civil", "Chemical", "Other",
];
export const SEMESTERS = Array.from({ length: 10 }, (_, i) => String(i + 1));
