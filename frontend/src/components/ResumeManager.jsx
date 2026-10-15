import { useEffect, useRef, useState } from "react";
import {
  MAX_RESUME_FILE_SIZE,
  deleteResume,
  downloadResume,
  formatFileSize,
  formatUploadDate,
  loadResumeVersions,
  setCurrentResume,
  uploadResume,
} from "../utils/resume";
import "./ResumeManager.css";

export function ResumeManager() {
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const refresh = () => loadResumeVersions().then(setVersions);

  // Run an API action, then reload the list from the server.
  const run = async (action) => {
    try {
      await action();
      await refresh();
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadResumeVersions()
      .then(setVersions)
      .catch((err) => setError(err.message));
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_RESUME_FILE_SIZE) {
      setError("That file is too large. Please upload something under 4MB.");
      return;
    }
    run(() => uploadResume(file));
  };

  const setCurrent = (id) => run(() => setCurrentResume(id));
  const removeVersion = (id) => run(() => deleteResume(id));
  const download = (v) => downloadResume(v).catch((err) => setError(err.message));

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
          <button
            type="button"
            className="resume-download-link"
            onClick={() => download(current)}
          >
            Download
          </button>
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
                  <button type="button" onClick={() => download(v)}>
                    Download
                  </button>
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
