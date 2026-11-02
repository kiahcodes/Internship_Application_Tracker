// Builds a LaTeX resume from the student's profile. The templates are our own and use only packages
// every Overleaf install has, so the result compiles as-is and the student can keep editing it there.

export const OVERLEAF_CV_TEMPLATES = "https://www.overleaf.com/latex/templates/tagged/cv";
export const OVERLEAF_OPEN = "https://www.overleaf.com/docs";

export const TEMPLATES = [
  { id: "classic", name: "Classic", blurb: "Serif, centred header, ruled section titles. Safe for any recruiter or ATS." },
  { id: "modern", name: "Modern", blurb: "Sans-serif with a blue accent on the name and headings." },
  { id: "compact", name: "Compact", blurb: "Tight margins and small type, to fit more on one page." },
];

const SPECIAL = { "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", $: "\\$", "#": "\\#", _: "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" };
/** Escapes text so characters like & and % can't break the document. */
export const esc = (v) => String(v ?? "").replace(/[\\&%$#_{}~^]/g, (c) => SPECIAL[c]).replace(/\s*\n\s*/g, " ").trim();

// Inside \href{...} only % and # need a backslash; braces and backslashes never belong in a URL.
const escUrl = (u) => String(u).replace(/[{}\\\s]/g, "").replace(/([%#])/g, "\\$1");
const shortUrl = (u) => String(u).replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "");
const link = (url) => `\\href{${escUrl(url)}}{${esc(shortUrl(url))}}`;

const has = (v) => v !== null && v !== undefined && String(v).trim() !== "";

const PREAMBLES = {
  classic: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage[T1]{fontenc}
\usepackage[hidelinks]{hyperref}
\usepackage{enumitem,titlesec}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\titleformat{\section}{\large\scshape}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{10pt}{6pt}
\setlist[itemize]{leftmargin=1.2em,itemsep=2pt,topsep=2pt}
\newcommand{\resumename}[1]{{\LARGE\scshape #1}}
\newcommand{\rsection}[1]{\section*{#1}}`,
  modern: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage[dvipsnames]{xcolor}
\definecolor{accent}{RGB}{14,104,24}
\usepackage[hidelinks]{hyperref}
\usepackage{enumitem,titlesec}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\titleformat{\section}{\large\bfseries\color{accent}}{}{0em}{}[{\color{accent}\titlerule[0.8pt]}]
\titlespacing*{\section}{0pt}{10pt}{6pt}
\setlist[itemize]{leftmargin=1.2em,itemsep=2pt,topsep=2pt}
\newcommand{\resumename}[1]{{\Huge\bfseries\color{accent} #1}}
\newcommand{\rsection}[1]{\section*{#1}}`,
  compact: String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[margin=0.5in]{geometry}
\usepackage[T1]{fontenc}
\usepackage[hidelinks]{hyperref}
\usepackage{enumitem,titlesec}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\titleformat{\section}{\normalsize\bfseries\scshape}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{6pt}{3pt}
\setlist[itemize]{leftmargin=1.1em,itemsep=0pt,topsep=1pt}
\newcommand{\resumename}[1]{{\Large\bfseries #1}}
\newcommand{\rsection}[1]{\section*{#1}}`,
};

const LINKS = ["github", "linkedin", "portfolio", "leetcode", "codeforces", "google_scholar", "orcid"];

/** Which parts of the resume the profile can't fill yet, so the UI can say what to add. */
export function missingForResume(p) {
  const gaps = [];
  if (!has(p?.course) && !has(p?.branch)) gaps.push("education");
  if (!has(p?.skills)) gaps.push("skills");
  if (!(p?.projects?.length > 0)) gaps.push("projects");
  return gaps;
}

export function buildResumeLatex(p, templateId = "classic") {
  const preamble = PREAMBLES[templateId] ?? PREAMBLES.classic;

  const contact = [
    has(p.email) && `\\href{mailto:${escUrl(p.email)}}{${esc(p.email)}}`,
    has(p.phone) && esc(p.phone),
    ...LINKS.filter((k) => has(p[k])).map((k) => link(p[k])),
  ].filter(Boolean);

  const body = [];
  body.push(
    "\\begin{center}",
    `  \\resumename{${esc(p.name) || "Your Name"}}\\\\[4pt]`,
    `  ${contact.join(String.raw` \;|\; `)}`,
    "\\end{center}",
  );

  if (has(p.bio)) body.push("", "\\rsection{Summary}", esc(p.bio));

  const degree = [p.course, p.branch].filter(has).map(esc).join(", ");
  if (degree || has(p.grad_year) || has(p.cgpa)) {
    body.push("", "\\rsection{Education}");
    body.push(`\\textbf{${degree || "Degree"}}${has(p.grad_year) ? ` \\hfill Expected ${esc(p.grad_year)}` : ""}`);
    if (has(p.cgpa)) body.push(`\\\\ CGPA: ${esc(p.cgpa)} / 10`);
  }

  const skills = String(p.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (skills.length) body.push("", "\\rsection{Skills}", skills.map(esc).join(", "));

  body.push(
    "",
    "% Add your internships, work or leadership here, for example:",
    "% \\rsection{Experience}",
    "% \\textbf{Role, Company} \\hfill Jun 2025 -- Aug 2025",
    "% \\begin{itemize} \\item What you built and the result. \\end{itemize}",
  );

  const projects = (p.projects ?? []).filter((x) => has(x.name));
  if (projects.length) {
    body.push("", "\\rsection{Projects}", "\\begin{itemize}");
    for (const pr of projects) {
      const title = has(pr.url) ? `\\href{${escUrl(pr.url)}}{\\textbf{${esc(pr.name)}}}` : `\\textbf{${esc(pr.name)}}`;
      body.push(`  \\item ${title}${has(pr.description) ? ` -- ${esc(pr.description)}` : ""}`);
    }
    body.push("\\end{itemize}");
  }

  return `${preamble}\n\n\\begin{document}\n\n${body.join("\n")}\n\n\\end{document}\n`;
}
