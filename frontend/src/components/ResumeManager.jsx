import { useEffect, useRef, useState } from "react";
import {
  MAX_RESUME_FILE_SIZE,
  canPreview,
  coverLetterApi,
  formatFileSize,
  formatUploadDate,
  resumeApi,
} from "../utils/resume";
import { Alert, Button, ConfirmDialog, Skeleton } from "./ui.jsx";
import "./ResumeManager.css";

// What differs between the two kinds of file.
const FILE_KINDS = {
  resume: {
    api: resumeApi,
    title: "Resume",
    noun: "resume",
    versioned: true, // one is "current"; the rest are earlier versions
    hint: "PDF or Word, up to 4 MB",
    empty: "No resume yet. Upload one so it's ready whenever you apply.",
    uploadFirst: "Upload resume",
    uploadNext: "Upload new version",
  },
  coverLetter: {
    api: coverLetterApi,
    title: "Cover letters",
    noun: "cover letter",
    versioned: false,
    hint: "PDF or Word, up to 4 MB. Attach one to each application.",
    empty: "No cover letters yet. Upload a file, then attach it to an application.",
    uploadFirst: "Upload cover letter",
    uploadNext: "Upload cover letter",
  },
};

/** Upload, list, view, download and remove one kind of file. */
export function ResumeManager({ kind = "resume", onChange }) {
  const cfg = FILE_KINDS[kind];
  const { api } = cfg;
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);
  const titleId = `files-${kind}`;

  const apply = (list, initial = false) => {
    setVersions(list);
    onChange?.(list, initial);
  };
  const refresh = () => api.load().then(apply);

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
    api
      .load()
      .then((list) => apply(list, true))
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_RESUME_FILE_SIZE) {
      setError("That file is too large. Please upload something under 4MB.");
      return;
    }
    setUploading(true);
    run(() => api.upload(file)).finally(() => setUploading(false));
  };

  const removeVersion = async () => {
    setRemoving(true);
    await run(() => api.remove(pendingRemove.id));
    setRemoving(false);
    setPendingRemove(null);
  };

  const show = (v) => api.view(v).catch((err) => setError(err.message));
  const download = (v) => api.download(v).catch((err) => setError(err.message));

  const current = cfg.versioned ? versions.find((v) => v.current) : null;
  const rest = cfg.versioned ? versions.filter((v) => !v.current) : versions;

  const viewButton = (v, variant = "ghost") =>
    canPreview(v) && (
      <Button variant={variant} size="sm" onClick={() => show(v)} aria-label={`View ${v.fileName}`}>
        View
      </Button>
    );

  return (
    <section className="resume" aria-labelledby={titleId}>
      <div className="resume-top">
        <div>
          <h2 className="resume-title" id={titleId}>{cfg.title}</h2>
          <p className="resume-subtitle">
            {versions.length > 0
              ? cfg.versioned
                ? `${versions.length} version${versions.length > 1 ? "s" : ""} saved`
                : `${versions.length} saved`
              : cfg.hint}
          </p>
        </div>
        <Button
          className="resume-upload"
          variant={versions.length ? "ghost" : "primary"}
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {versions.length ? cfg.uploadNext : cfg.uploadFirst}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="resume-file-input"
          aria-label={`Choose a ${cfg.noun} file`}
          onChange={handleUpload}
        />
      </div>

      <Alert onDismiss={() => setError("")}>{error}</Alert>

      {!loaded ? (
        <Skeleton height="76px" style={{ borderRadius: 8 }} />
      ) : versions.length === 0 ? (
        <p className="resume-empty">{cfg.empty}</p>
      ) : (
        <>
          {current && (
            <div className="resume-current">
              <div className="resume-file-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M6 2h9l5 5v15H6z" />
                  <path d="M15 2v5h5" />
                </svg>
              </div>
              <div className="resume-file-meta">
                <p className="resume-file-name">{current.fileName}</p>
                <p className="resume-file-detail">
                  <span className="resume-badge">Current</span>
                  {formatFileSize(current.fileSize)}, uploaded {formatUploadDate(current.uploadedAt)}
                </p>
              </div>
              {viewButton(current, "ghost")}
              <Button variant="soft" size="sm" onClick={() => download(current)}>
                Download
              </Button>
            </div>
          )}

          {rest.length > 0 && (
            <div className={current ? "resume-history" : undefined}>
              {cfg.versioned && <h3 className="resume-history-label">Earlier versions</h3>}
              <ul className="resume-history-list">
                {rest.map((v) => (
                  <li className="resume-history-item" key={v.id}>
                    <div>
                      <p className="resume-file-name">{v.fileName}</p>
                      <p className="resume-file-detail">
                        {formatFileSize(v.fileSize)}, uploaded {formatUploadDate(v.uploadedAt)}
                      </p>
                    </div>
                    <div className="resume-history-actions">
                      {cfg.versioned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => run(() => api.setCurrent(v.id))}
                        >
                          Make current
                        </Button>
                      )}
                      {viewButton(v)}
                      <Button variant="ghost" size="sm" onClick={() => download(v)}>
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="resume-remove"
                        aria-label={`Remove ${v.fileName}`}
                        onClick={() => setPendingRemove(v)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        title={`Remove this ${cfg.noun}?`}
        confirmLabel="Remove"
        busy={removing}
        onConfirm={removeVersion}
        onCancel={() => setPendingRemove(null)}
      >
        {pendingRemove && `${pendingRemove.fileName} will be deleted and detached from any application using it. This can't be undone.`}
      </ConfirmDialog>
    </section>
  );
}

export default ResumeManager;
