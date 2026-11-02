export const CONNECTORS = [
  { key: "github", name: "GitHub", description: "Show your repositories and developer identity.", oauth: true },
  { key: "leetcode", name: "LeetCode", description: "Link your coding-practice profile.", placeholder: "username or leetcode.com/u/username" },
  { key: "codeforces", name: "Codeforces", description: "Link your competitive-programming handle.", placeholder: "handle or codeforces.com/profile/handle" },
  { key: "linkedin", name: "LinkedIn", description: "Add your professional profile.", placeholder: "username or linkedin.com/in/username" },
  { key: "google_scholar", name: "Google Scholar", description: "Add your publications and research profile.", placeholder: "Scholar ID or profile URL" },
  { key: "orcid", name: "ORCID", description: "Link your persistent researcher identity.", placeholder: "0000-0000-0000-0000 or ORCID URL" },
];

const cleanHost = (host) => host.toLowerCase().replace(/^www\./, "");
const cleanHandle = (value) => value.trim().replace(/^@/, "").replace(/^\/+|\/+$/g, "");

function asUrl(raw) {
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** Turns a handle or provider URL into one canonical profile URL. */
export function connectorUrl(key, input) {
  const raw = String(input ?? "").trim();
  if (!raw) return { error: "Enter a username or profile link" };
  const parsed = asUrl(raw);
  let handle = cleanHandle(raw);

  if (key === "leetcode") {
    if (parsed) {
      if (!/(^|\.)leetcode\.com$/i.test(cleanHost(parsed.hostname)))
        return { error: "That isn't a LeetCode profile" };
      handle = cleanHandle(parsed.pathname.replace(/^\/u\//i, ""));
    }
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(handle)) return { error: "Enter a valid LeetCode username" };
    return { handle, url: `https://leetcode.com/u/${handle}/` };
  }

  if (key === "codeforces") {
    if (parsed) {
      if (!/(^|\.)codeforces\.com$/i.test(cleanHost(parsed.hostname)))
        return { error: "That isn't a Codeforces profile" };
      handle = cleanHandle(parsed.pathname.replace(/^\/profile\//i, ""));
    }
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(handle)) return { error: "Enter a valid Codeforces handle" };
    return { handle, url: `https://codeforces.com/profile/${handle}` };
  }

  if (key === "linkedin") {
    if (parsed) {
      if (!/(^|\.)linkedin\.com$/i.test(cleanHost(parsed.hostname)))
        return { error: "That isn't a LinkedIn profile" };
      handle = cleanHandle(parsed.pathname.replace(/^\/in\//i, ""));
    }
    if (!/^[A-Za-z0-9-]{2,100}$/.test(handle)) return { error: "Enter a valid LinkedIn username" };
    return { handle, url: `https://www.linkedin.com/in/${handle}` };
  }

  if (key === "google_scholar") {
    if (parsed) {
      if (!/(^|\.)scholar\.google\.[a-z.]+$/i.test(cleanHost(parsed.hostname)))
        return { error: "That isn't a Google Scholar profile" };
      handle = parsed.searchParams.get("user") ?? "";
    }
    if (!/^[A-Za-z0-9_-]{5,30}$/.test(handle)) return { error: "Enter the Scholar ID from your profile link" };
    return { handle, url: `https://scholar.google.com/citations?user=${encodeURIComponent(handle)}` };
  }

  if (key === "orcid") {
    if (parsed) {
      if (cleanHost(parsed.hostname) !== "orcid.org") return { error: "That isn't an ORCID profile" };
      handle = cleanHandle(parsed.pathname);
    }
    handle = handle.toUpperCase();
    if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(handle))
      return { error: "Use the ORCID format 0000-0000-0000-0000" };
    return { handle, url: `https://orcid.org/${handle}` };
  }

  return { error: "That connector isn't supported" };
}

export function connectorHandle(key, value) {
  if (!value) return "";
  if (key === "github") {
    try {
      return cleanHandle(new URL(value).pathname);
    } catch {
      return value;
    }
  }
  return connectorUrl(key, value).handle || value;
}
