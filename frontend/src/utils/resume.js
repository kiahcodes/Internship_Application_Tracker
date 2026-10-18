import { api } from "./api";

export const MAX_RESUME_FILE_SIZE = 4 * 1024 * 1024; // 4MB

const isPdfName = (name) => /\.pdf$/i.test(name);

// Resumes and cover letters are the same kind of uploaded file behind different endpoints.
export function fileApi(base) {
  async function fetchBlob(version, inline) {
    const res = await api(`${base}/${version.id}/download${inline ? "?inline=1" : ""}`, { raw: true });
    return res.blob();
  }

  function save(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    load: () => api(base),
    upload(file) {
      const body = new FormData();
      body.append("file", file);
      return api(base, { method: "POST", body });
    },
    setCurrent: (id) => api(`${base}/${id}/current`, { method: "PATCH" }),
    remove: (id) => api(`${base}/${id}`, { method: "DELETE" }),
    // Downloads need the auth header, so fetch the file and save it via a blob URL.
    async download(version) {
      save(await fetchBlob(version, false), version.fileName);
    },
    // PDFs open in a new tab. Other types (Word) can't be shown, so they download.
    async view(version) {
      if (!isPdfName(version.fileName)) return this.download(version);
      const tab = window.open("", "_blank"); // opened first so popup blockers allow it
      try {
        const blob = await fetchBlob(version, true);
        if (!tab) return save(blob, version.fileName);
        tab.location.href = URL.createObjectURL(blob);
      } catch (err) {
        tab?.close();
        throw err;
      }
    },
  };
}

export const resumeApi = fileApi("/resumes");
export const coverLetterApi = fileApi("/cover-letters");
export const canPreview = (version) => isPdfName(version.fileName);

// Kept for existing imports.
export const loadResumeVersions = resumeApi.load;

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
