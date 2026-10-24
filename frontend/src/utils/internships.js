const inr = new Intl.NumberFormat("en-IN");
const DAY = 24 * 60 * 60 * 1000;

export const MODE_LABEL = { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" };

/** "₹12,000 – 15,000 /month", "Unpaid", or null when the posting doesn't say. */
export function formatStipend({ stipend_min: min, stipend_max: max }) {
  if (min == null && max == null) return null;
  const hi = max ?? min;
  const lo = min ?? max;
  if (hi === 0) return "Unpaid";
  return lo === hi ? `₹${inr.format(hi)} /month` : `₹${inr.format(lo)} – ${inr.format(hi)} /month`;
}

export const formatDuration = (months) =>
  months == null ? null : `${months} ${months === 1 ? "month" : "months"}`;

// "2025-11-04" as a local calendar day (new Date("2025-11-04") would be UTC and can slip a day).
const localDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
export const daysUntil = (iso) => Math.round((localDay(iso) - today()) / DAY);

export const formatDay = (iso) =>
  localDay(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** How a deadline reads on a card, and whether it deserves attention. */
export function describeDeadline(iso) {
  if (!iso) return null;
  const days = daysUntil(iso);
  if (days < 0) return { text: `Closed ${formatDay(iso)}`, tone: "past" };
  if (days === 0) return { text: "Closes today", tone: "urgent" };
  if (days === 1) return { text: "Closes tomorrow", tone: "urgent" };
  if (days <= 7) return { text: `Closes in ${days} days`, tone: "soon" };
  return { text: `Apply by ${formatDay(iso)}`, tone: "later" };
}

export function formatPosted(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days < 1) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Plain-language reasons this student may not qualify; empty when they do (or we can't tell). */
export function eligibilityIssues(item, profile) {
  if (!profile) return [];
  const issues = [];
  if (item.min_cgpa != null && profile.cgpa != null && profile.cgpa < item.min_cgpa)
    issues.push(`Needs a CGPA of ${item.min_cgpa}+ (yours is ${profile.cgpa})`);
  if (item.batch_year != null && profile.grad_year != null && Number(profile.grad_year) !== item.batch_year)
    issues.push(`Open to the ${item.batch_year} batch (yours is ${profile.grad_year})`);
  if (item.branches && profile.branch && !item.branches.split(",").includes(profile.branch))
    issues.push(`Open to ${item.branches.split(",").join(", ")} (yours is ${profile.branch})`);
  return issues;
}

export function eligibilityText(item) {
  const parts = [];
  if (item.batch_year != null) parts.push(`${item.batch_year} batch`);
  if (item.min_cgpa != null) parts.push(`CGPA ${item.min_cgpa}+`);
  if (item.branches) parts.push(item.branches.split(",").join(", "));
  return parts.length ? parts.join(" · ") : null;
}
