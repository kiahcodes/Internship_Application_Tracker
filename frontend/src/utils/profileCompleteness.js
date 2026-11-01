// What a typical application form asks for. Drives the progress bar under the navbar
// and the "complete your profile" card on the Profile page.
export const CHECKLIST = [
  ["phone", "phone number"],
  ["course", "course"],
  ["branch", "branch"],
  ["semester", "semester"],
  ["grad_year", "graduation year"],
  ["cgpa", "CGPA"],
  ["skills", "skills"],
  ["bio", "short bio"],
  ["preferred_locations", "preferred locations"],
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["portfolio", "portfolio"],
  ["projects", "projects"],
  ["google_scholar", "Google Scholar"],
  ["orcid", "ORCID"],
  ["codeforces", "Codeforces"],
  ["leetcode", "LeetCode"],
];

export const hasValue = (v) =>
  Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim() !== "";

export function completeness(profile) {
  const missing = CHECKLIST.filter(([key]) => !hasValue(profile?.[key]));
  const percent = Math.round(((CHECKLIST.length - missing.length) / CHECKLIST.length) * 100);
  return { percent, missing };
}
