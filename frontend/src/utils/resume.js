import { api } from "./api";

export const MAX_RESUME_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export const loadResumeVersions = () => api("/resumes");

export function uploadResume(file) {
  const body = new FormData();
  body.append("file", file);
  return api("/resumes", { method: "POST", body });
}

export const setCurrentResume = (id) =>
  api(`/resumes/${id}/current`, { method: "PATCH" });

export const deleteResume = (id) => api(`/resumes/${id}`, { method: "DELETE" });

// Downloads need the auth header, so fetch the file and save it via a blob URL.
export async function downloadResume(version) {
  const res = await api(`/resumes/${version.id}/download`, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = version.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
