import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAccount, loadStudent, saveStudent } from "../utils/student";
import { getRole, logout } from "../utils/auth";
import { ResumeManager } from "../components/ResumeManager.jsx";
import { Alert, Button, ConfirmDialog, Field, Skeleton } from "../components/ui.jsx";
import "./Profile.css";

const splitSkills = (skills) =>
  (skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

function Details({ student }) {
  const rows = [
    ["Email", student.email],
    ["Course", student.course],
    ["Semester", student.semester],
  ];
  return (
    <dl className="p-details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={value ? "" : "p-missing"}>{value || "Not added"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Profile() {
  const [student, setStudent] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef(null);
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () =>
    loadStudent()
      .then((data) => {
        setStudent(data);
        setDraft(data);
      })
      .catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isEditing) nameRef.current?.focus();
  }, [isEditing]);

  const set = (e) => setDraft((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await saveStudent(draft);
      setStudent(next);
      setDraft(next);
      setError("");
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const closeDelete = () => {
    setConfirmOpen(false);
    setDeletePw("");
    setDeleteError("");
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePw);
      logout();
      navigate("/signup", { replace: true });
    } catch (err) {
      setDeleteError(err.message);
      setDeleteBusy(false);
    }
  };

  const handleCancel = () => {
    setDraft(student);
    setError("");
    setIsEditing(false);
  };

  if (!student) {
    return (
      <section className="page profile-page" aria-busy={!error}>
        {error ? (
          <>
            <Alert>{error}</Alert>
            <div className="p-retry">
              <Button variant="ghost" onClick={() => { setError(""); load(); }}>Try again</Button>
            </div>
          </>
        ) : (
          <div className="p-wrap" aria-hidden="true">
            <div className="p-head">
              <Skeleton width="72px" height="72px" style={{ borderRadius: "50%" }} />
              <div className="p-skel">
                <Skeleton width="min(320px, 70%)" height="2.4rem" />
                <Skeleton width="180px" height="1rem" />
              </div>
            </div>
            <Skeleton width="100%" height="220px" style={{ borderRadius: 14 }} />
          </div>
        )}
      </section>
    );
  }

  const skills = splitSkills(student.skills);
  const draftSkills = splitSkills(draft.skills);

  return (
    <section className="page profile-page">
      <div className="p-wrap">
        <header className="p-head rise">
          <div className="p-avatar" aria-hidden="true">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="p-id">
            <h1 className="page-title p-name">{student.name}</h1>
            <p className="p-sub">
              {[student.course, student.semester].filter(Boolean).join(", ") ||
                "Add your course and semester"}
            </p>
          </div>
          <div className="p-head-actions">
            {!isEditing && (
              <Button variant="ghost" className="p-edit" onClick={() => setIsEditing(true)}>
                Edit profile
              </Button>
            )}
            <button type="button" className="link-btn p-logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        <div className="p-status" role="status" aria-live="polite">
          {saved && <span className="p-saved">Profile saved</span>}
        </div>
        <Alert onDismiss={() => setError("")}>{error}</Alert>

        {isEditing ? (
          <form className="p-form rise" onSubmit={handleSubmit}>
            <div className="p-form-grid">
              <Field id="pf-name" label="Name" name="name" required value={draft.name} onChange={set} ref={nameRef} />
              <Field id="pf-email" label="Email" name="email" type="email" required value={draft.email} onChange={set} />
              <Field id="pf-course" label="Course" name="course" required value={draft.course} onChange={set} />
              <Field id="pf-sem" label="Semester" name="semester" required value={draft.semester} onChange={set} />
            </div>
            <Field id="pf-bio" label="Bio" name="bio" multiline value={draft.bio || ""} onChange={set} hint="Two or three lines about what you're looking for." />
            <Field id="pf-skills" label="Skills" name="skills" value={draft.skills || ""} onChange={set} hint="Separate skills with commas." />
            {draftSkills.length > 0 && (
              <ul className="p-chips" aria-label="Skills preview">
                {draftSkills.map((s) => <li key={s}>{s}</li>)}
              </ul>
            )}
            <div className="p-actions">
              <Button type="submit" loading={saving}>Save changes</Button>
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="p-grid rise" style={{ "--i": 1 }}>
            <div className="p-main">
              <section aria-labelledby="p-about">
                <h2 id="p-about" className="p-h">About</h2>
                {student.bio ? (
                  <p className="p-bio">{student.bio}</p>
                ) : (
                  <p className="p-missing">
                    No bio yet. <button type="button" className="link-btn" onClick={() => setIsEditing(true)}>Add one</button>
                  </p>
                )}
              </section>

              <section aria-labelledby="p-skills">
                <h2 id="p-skills" className="p-h">Skills</h2>
                {skills.length > 0 ? (
                  <ul className="p-chips">
                    {skills.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                ) : (
                  <p className="p-missing">
                    No skills listed. <button type="button" className="link-btn" onClick={() => setIsEditing(true)}>Add skills</button>
                  </p>
                )}
              </section>
            </div>

            <aside aria-labelledby="p-details">
              <h2 id="p-details" className="p-h">Details</h2>
              <Details student={student} />
            </aside>
          </div>
        )}

        <ResumeManager />

        <section className="p-account" aria-labelledby="p-account-h">
          <h2 id="p-account-h" className="p-h">Delete account</h2>
          <p className="p-account-text">
            Permanently removes your profile, resumes and tracked applications. This can&rsquo;t be undone.
          </p>
          <Button variant="ghost" className="btn-delete" onClick={() => setConfirmOpen(true)}>
            Delete my account
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete your account?"
        confirmLabel="Delete account"
        busy={deleteBusy}
        confirmDisabled={!deletePw}
        onConfirm={handleDelete}
        onCancel={closeDelete}
      >
        <p>
          This permanently deletes your profile, every resume version and all tracked applications.
          {getRole() === "poster" ? " Internships you posted are removed too." : ""} Enter your password to confirm.
        </p>
        <Field
          id="del-pw"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={deletePw}
          onChange={(e) => setDeletePw(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && deletePw && !deleteBusy) handleDelete(); }}
        />
        <Alert>{deleteError}</Alert>
      </ConfirmDialog>
    </section>
  );
}
