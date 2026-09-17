export const RESUME_STORAGE_KEY = "profile.resumeVersions";
export const MAX_RESUME_VERSIONS = 5;
export const MAX_RESUME_FILE_SIZE = 40 * 1024 * 1024; // 4MB

export function loadResumeVersions() {
  try {
    const saved = localStorage.getItem(RESUME_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveResumeVersions(versions) {
  localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(versions));
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
