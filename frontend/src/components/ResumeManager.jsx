import { useRef, useState } from "react";
import {
  MAX_RESUME_FILE_SIZE,
  MAX_RESUME_VERSIONS,
  formatFileSize,
  formatUploadDate,
  loadResumeVersions,
  saveResumeVersions,
} from "../utils/resume";
import "./ResumeManager.css";

export function ResumeManager() {
  const [versions, setVersions] = useState(loadResumeVersions);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const persist = (next) => {
    try {
      saveResumeVersions(next);
      setVersions(next);
      setError("");
    } catch {
      setError(
        "Couldn't save — storage limit reached. Remove an older version and try again.",
      );
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_RESUME_FILE_SIZE) {
      setError("That file is too large. Please upload something under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newVersion = {
        id: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl: reader.result,
        current: true,
      };
      const rest = versions.map((v) => ({ ...v, current: false }));
      persist([newVersion, ...rest].slice(0, MAX_RESUME_VERSIONS));
    };
    reader.onerror = () => setError("Couldn't read that file. Please try again.");
    reader.readAsDataURL(file);
  };

  const setCurrent = (id) => {
    persist(versions.map((v) => ({ ...v, current: v.id === id })));
  };

  const removeVersion = (id) => {
    const removingCurrent = versions.find((v) => v.id === id)?.current;
    let next = versions.filter((v) => v.id !== id);
    if (removingCurrent && next.length > 0) {
      next = next.map((v, i) => ({ ...v, current: i === 0 }));
    }
    persist(next);
  };

  const current = versions.find((v) => v.current);
  const history = versions.filter((v) => !v.current);

  return (
    <div className="resume-card">
      <div className="resume-card-header">
        <div>
          <h2 className="resume-title">Resume</h2>
          <p className="resume-subtitle">
            {versions.length > 0
              ? `${versions.length} version${versions.length > 1 ? "s" : ""} saved`
              : "No resume uploaded yet"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-edit resume-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          {current ? "Upload new version" : "Upload resume"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="resume-file-input"
          onChange={handleUpload}
        />
      </div>

      {error && <p className="resume-error">{error}</p>}

      {current ? (
        <div className="resume-current">
          <div className="resume-file-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 2h9l5 5v15H6z" />
              <path d="M15 2v5h5" />
            </svg>
          </div>
          <div className="resume-file-meta">
            <p className="resume-file-name">{current.fileName}</p>
            <p className="resume-file-detail">
              {formatFileSize(current.fileSize)} · Uploaded{" "}
              {formatUploadDate(current.uploadedAt)}
            </p>
          </div>
          <a
            className="resume-download-link"
            href={current.dataUrl}
            download={current.fileName}
          >
            Download
          </a>
        </div>
      ) : (
        <p className="resume-empty">
          Upload a PDF or Word document so it's ready whenever you apply.
        </p>
      )}

      {history.length > 0 && (
        <div className="resume-history">
          <p className="resume-history-label">Earlier versions</p>
          <ul className="resume-history-list">
            {history.map((v) => (
              <li className="resume-history-item" key={v.id}>
                <div className="resume-history-meta">
                  <p className="resume-file-name">{v.fileName}</p>
                  <p className="resume-file-detail">
                    {formatFileSize(v.fileSize)} · {formatUploadDate(v.uploadedAt)}
                  </p>
                </div>
                <div className="resume-history-actions">
                  <button type="button" onClick={() => setCurrent(v.id)}>
                    Make current
                  </button>
                  <a href={v.dataUrl} download={v.fileName}>
                    Download
                  </a>
                  <button
                    type="button"
                    className="resume-remove"
                    onClick={() => removeVersion(v.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ResumeManager;
