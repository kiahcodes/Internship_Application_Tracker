import * as cheerio from "cheerio";

// Each source returns normalized listings:
// { source, external_id, company, role, location, url, description, posted_at }
const UA = "Mozilla/5.0 (student project: internship tracker)";
const INTERN = /\b(intern|internship|trainee|apprentice)\b/i;

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const strip = (html = "") =>
  html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);

// Public job-board APIs: Greenhouse and Lever.
const GREENHOUSE = ["groww", "stripe", "databricks", "cloudflare", "twilio", "mongodb",
  "elastic", "datadog", "pinterest", "gitlab", "airbnb", "coinbase", "robinhood"];
const LEVER = ["paytm", "palantir"];

export async function greenhouse(board) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  return data.jobs.filter((j) => INTERN.test(j.title)).map((j) => ({
    source: "greenhouse",
    external_id: `${board}-${j.id}`,
    company: j.company_name || board[0].toUpperCase() + board.slice(1),
    role: j.title,
    location: j.location?.name || "Unknown",
    url: j.absolute_url,
    description: strip(j.content),
    posted_at: j.first_published || j.updated_at || null,
  }));
}

export async function lever(board) {
  const data = await getJson(`https://api.lever.co/v0/postings/${board}?mode=json`);
  return data.filter((j) => INTERN.test(j.text)).map((j) => ({
    source: "lever",
    external_id: `${board}-${j.id}`,
    company: board[0].toUpperCase() + board.slice(1),
    role: j.text,
    location: j.categories?.location || "Unknown",
    url: j.hostedUrl,
    description: (j.descriptionPlain || "").slice(0, 1500),
    posted_at: j.createdAt ? new Date(j.createdAt) : null,
  }));
}

// Remote-only feeds.
export async function remotive() {
  const data = await getJson("https://remotive.com/api/remote-jobs?search=intern");
  return data.jobs.filter((j) => INTERN.test(j.title)).map((j) => ({
    source: "remotive",
    external_id: String(j.id),
    company: j.company_name,
    role: j.title,
    location: `Remote${j.candidate_required_location ? ` (${j.candidate_required_location})` : ""}`,
    url: j.url,
    description: strip(j.description),
    posted_at: j.publication_date,
  }));
}

export async function remoteok() {
  const data = await getJson("https://remoteok.com/api");
  return data.filter((j) => j.position && INTERN.test(j.position)).map((j) => ({
    source: "remoteok",
    external_id: String(j.id),
    company: j.company,
    role: j.position,
    location: "Remote",
    url: j.url,
    description: strip(j.description),
    posted_at: j.date,
  }));
}

// Internshala: HTML listing pages only (robots.txt disallows detail pages and
// query strings). Pages are fetched slowly, one per call.
const INTERNSHALA = ["computer-science-internship", "web-development-internship",
  "software-development-internship", "data-science-internship", "python-django-internship",
  "machine-learning-internship", "work-from-home-internships"];

export async function internshala(slug) {
  const res = await fetch(`https://internshala.com/internships/${slug}/`, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) student project" },
  });
  if (!res.ok) throw new Error(`${res.status} internshala ${slug}`);
  const $ = cheerio.load(await res.text());
  await new Promise((r) => setTimeout(r, 1500));
  return $(".individual_internship[internshipid]").map((_, el) => {
    const c = $(el);
    const items = c.find(".detail-row-1 .row-1-item").map((__, e) => $(e).text().trim().replace(/\s+/g, " ")).get();
    return {
      source: "internshala",
      external_id: c.attr("internshipid"),
      company: c.find(".company-name").first().text().trim(),
      role: c.find(".job-internship-name, .profile").first().text().trim(),
      location: items[0] || "Unknown",
      url: `https://internshala.com${c.attr("data-href")}`,
      description: items.slice(1).join(" · "),
      posted_at: null,
    };
  }).get();
}

export const SOURCES = [
  ...INTERNSHALA.map((s) => [`internshala:${s}`, () => internshala(s)]),
  ...GREENHOUSE.map((b) => [`greenhouse:${b}`, () => greenhouse(b)]),
  ...LEVER.map((b) => [`lever:${b}`, () => lever(b)]),
  ["remotive", remotive],
  ["remoteok", remoteok],
];
