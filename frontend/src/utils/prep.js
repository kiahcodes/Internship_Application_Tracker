import { api } from "./api";

export const ROUND_TYPES = ["OA", "Technical", "System design", "Behavioral", "HR", "Managerial", "Other"];

export const LINK_KINDS = [
  { value: "dsa", label: "DSA problem", group: "DSA problems" },
  { value: "notes", label: "Notes", group: "Notes" },
  { value: "other", label: "Other", group: "Other" },
];

// Offered when a company has no checklist yet. Edit freely once added.
export const STARTER_ITEMS = [
  "Read the job description and note the skills it asks for",
  "Research the company: what they build and who uses it",
  "Update your resume for this role",
  "Prepare a short answer to \"Tell me about yourself\"",
  "Prepare 3 stories for behavioral questions (situation, action, result)",
  "Practice 5 DSA problems on the topics this role needs",
  "Write 3 questions to ask the interviewer",
  "Test your camera, mic and internet before the call",
];

const send = (path, method, body) => api(path, { method, body });

export const prep = {
  companies: () => api("/prep/companies"),
  addCompany: (name) => send("/prep/companies", "POST", { name }),
  deleteCompany: (id) => send(`/prep/companies/${id}`, "DELETE"),
  company: (id) => api(`/prep/companies/${id}`),

  addItem: (companyId, text) => send("/prep/items", "POST", { companyId, text }),
  setItem: (id, patch) => send(`/prep/items/${id}`, "PATCH", patch),
  deleteItem: (id) => send(`/prep/items/${id}`, "DELETE"),

  addLink: (companyId, link) => send("/prep/links", "POST", { companyId, ...link }),
  deleteLink: (id) => send(`/prep/links/${id}`, "DELETE"),

  addRound: (companyId, round) => send("/prep/rounds", "POST", { companyId, ...round }),
  updateRound: (id, patch) => send(`/prep/rounds/${id}`, "PATCH", patch),
  deleteRound: (id) => send(`/prep/rounds/${id}`, "DELETE"),

  addQuestion: (companyId, q) => send("/prep/questions", "POST", { companyId, ...q }),
  updateQuestion: (id, patch) => send(`/prep/questions/${id}`, "PATCH", patch),
  deleteQuestion: (id) => send(`/prep/questions/${id}`, "DELETE"),

  quiz: (companyId) => api(`/prep/quiz${companyId ? `?companyId=${companyId}` : ""}`),
  review: (id, result) => send(`/prep/questions/${id}/review`, "POST", { result }),
};
