import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAccount, loadStudent, saveStudent } from "../utils/student";
import { getRole, logout, setSessionName } from "../utils/auth";
import {
  Alert,
  Button,
  ConfirmDialog,
  Field,
  Select,
  Skeleton,
} from "../components/ui.jsx";
import {
  BRANCHES,
  COURSES,
  SEMESTERS,
  graduationYears,
  withCurrent,
} from "../utils/options";
import { completeness, hasValue } from "../utils/profileCompleteness";
import { ProfileConnectors } from "../components/ProfileConnectors.jsx";
import "./Profile.css";

const splitSkills = (skills) =>
  (skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

const LINKS = [
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["portfolio", "Portfolio"],
  ["google_scholar", "Google Scholar"],
  ["orcid", "ORCID"],
  ["codeforces", "Codeforces"],
  ["leetcode", "LeetCode"],
];

const hostOf = (url) => {
  try {
    return (
      new URL(url).host.replace(/^www\./, "") +
      new URL(url).pathname.replace(/\/$/, "")
    );
  } catch {
    return url;
  }
};

function Tile({ label, value }) {
  return (
    <div className="p-tile">
      <dt>{label}</dt>
      <dd className={hasValue(value) ? "" : "p-missing"}>
        {hasValue(value) ? value : "Not added"}
      </dd>
    </div>
  );
}

function Section({ id, title, action, children }) {
  return (
    <section className="p-card" aria-labelledby={id}>
      <header className="p-card-head">
        <h2 id={id} className="p-h">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
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

  const set = (e) =>
    setDraft((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const projects = draft?.projects ?? [];
  const setProjects = (next) =>
    setDraft((prev) => ({ ...prev, projects: next }));
  const editProject = (i, field) => (e) =>
    setProjects(
      projects.map((p, k) => (k === i ? { ...p, [field]: e.target.value } : p)),
    );
  const addProject = () =>
    setProjects([...projects, { name: "", url: "", description: "" }]);
  const removeProject = (i) => setProjects(projects.filter((_, k) => k !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await saveStudent(draft);
      setStudent(next);
      setDraft(next);
      setSessionName(next.name);
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
              <Button
                variant="ghost"
                onClick={() => {
                  setError("");
                  load();
                }}
              >
                Try again
              </Button>
            </div>
          </>
        ) : (
          <div className="p-wrap" aria-hidden="true">
            <Skeleton
              width="100%"
              height="200px"
              style={{ borderRadius: 14, marginBottom: 16 }}
            />
            <Skeleton
              width="100%"
              height="260px"
              style={{ borderRadius: 14 }}
            />
          </div>
        )}
      </section>
    );
  }

  const skills = splitSkills(student.skills);
  const draftSkills = splitSkills(draft.skills);
  const locations = splitSkills(student.preferred_locations);
  const { percent, missing } = completeness(student);
  const sub = [
    student.course,
    student.branch,
    student.semester && `Semester ${student.semester}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const editLink = (label) => (
    <button
      type="button"
      className="link-btn"
      onClick={() => setIsEditing(true)}
    >
      {label}
    </button>
  );

  return (
    <section className="page profile-page">
      <div className="p-wrap">
        <header className="p-hero rise">
          <div className="p-hero-body">
            <div className="p-avatar" aria-hidden="true">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="p-id">
              <h1 className="p-name">{student.name}</h1>
              <p className="p-sub">{sub || "Add your course and semester"}</p>
              <ul className="p-contact">
                {student.username && <li>@{student.username}</li>}
                <li>{student.email}</li>
                {student.phone && <li>{student.phone}</li>}
                {LINKS.filter(([key]) => student[key]).map(([key, label]) => (
                  <li key={key}>
                    <a
                      href={student[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label}: ${hostOf(student[key])} (opens in a new tab)`}
                    >
                      {label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {!isEditing && (
              <div className="p-head-actions">
                <Button onClick={() => setIsEditing(true)}>Edit profile</Button>
                <button
                  type="button"
                  className="link-btn p-logout"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="p-status" role="status" aria-live="polite">
          {saved && <span className="p-saved">Profile saved</span>}
        </div>
        <Alert onDismiss={() => setError("")}>{error}</Alert>

        {isEditing ? (
          <form className="p-form rise" onSubmit={handleSubmit}>
            <Section id="pe-basics" title="Basics">
              <div className="p-form-grid">
                <Field
                  id="pf-name"
                  label="Name"
                  name="name"
                  required
                  value={draft.name}
                  onChange={set}
                  ref={nameRef}
                />
                <Field
                  id="pf-email"
                  label="Email"
                  name="email"
                  type="email"
                  required
                  value={draft.email}
                  onChange={set}
                />
                <Field
                  id="pf-phone"
                  label="Phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={draft.phone || ""}
                  onChange={set}
                  placeholder="+91 98765 43210"
                />
                <Field
                  id="pf-locs"
                  label="Preferred locations"
                  name="preferred_locations"
                  value={draft.preferred_locations || ""}
                  onChange={set}
                  hint="Cities, separated by commas."
                />
              </div>
            </Section>

            <Section id="pe-edu" title="Education">
              <div className="p-form-grid">
                <Select
                  id="pf-course"
                  label="Course"
                  name="course"
                  required
                  value={draft.course || ""}
                  onChange={set}
                  placeholder="Select course"
                  options={withCurrent(COURSES, student.course)}
                />
                <Select
                  id="pf-branch"
                  label="Branch"
                  name="branch"
                  value={draft.branch || ""}
                  onChange={set}
                  placeholder="Select branch"
                  options={withCurrent(BRANCHES, student.branch)}
                />
                <Select
                  id="pf-sem"
                  label="Semester"
                  name="semester"
                  required
                  value={draft.semester || ""}
                  onChange={set}
                  placeholder="Select semester"
                  options={withCurrent(SEMESTERS, student.semester)}
                />
                <Select
                  id="pf-grad"
                  label="Graduation year"
                  name="grad_year"
                  value={draft.grad_year ?? ""}
                  onChange={set}
                  placeholder="Select year"
                  options={withCurrent(graduationYears(), student.grad_year)}
                />
                <Field
                  id="pf-cgpa"
                  label="CGPA (out of 10)"
                  name="cgpa"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="10"
                  step="0.01"
                  value={draft.cgpa ?? ""}
                  onChange={set}
                  placeholder="e.g. 8.4"
                />
              </div>
            </Section>

            <Section id="pe-links" title="Links">
              <div className="p-form-grid">
                <Field
                  id="pf-github"
                  label="GitHub"
                  name="github"
                  value={draft.github || ""}
                  onChange={set}
                  placeholder="github.com/username"
                />
                <Field
                  id="pf-linkedin"
                  label="LinkedIn"
                  name="linkedin"
                  value={draft.linkedin || ""}
                  onChange={set}
                  placeholder="linkedin.com/in/username"
                />
                <Field
                  id="pf-portfolio"
                  label="Portfolio"
                  name="portfolio"
                  value={draft.portfolio || ""}
                  onChange={set}
                  placeholder="yourname.dev"
                />
                <Field
                  id="pf-leetcode"
                  label="LeetCode"
                  name="leetcode"
                  value={draft.leetcode || ""}
                  onChange={set}
                  placeholder="leetcode.com/u/username"
                />
                <Field
                  id="pf-codeforces"
                  label="Codeforces"
                  name="codeforces"
                  value={draft.codeforces || ""}
                  onChange={set}
                  placeholder="codeforces.com/profile/handle"
                />
                <Field
                  id="pf-scholar"
                  label="Google Scholar"
                  name="google_scholar"
                  value={draft.google_scholar || ""}
                  onChange={set}
                  placeholder="scholar.google.com/citations?user=..."
                />
                <Field
                  id="pf-orcid"
                  label="ORCID"
                  name="orcid"
                  value={draft.orcid || ""}
                  onChange={set}
                  placeholder="orcid.org/0000-0000-0000-0000"
                />
              </div>
            </Section>

            <Section
              id="pe-projects"
              title="Projects"
              action={
                projects.length < 8 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addProject}
                  >
                    Add project
                  </Button>
                )
              }
            >
              {projects.length === 0 && (
                <p className="p-missing">
                  No projects yet. Add the apps or sites you've built, with a
                  link to each.
                </p>
              )}
              <ul className="p-projects-edit">
                {projects.map((pr, i) => (
                  <li key={i} className="p-project-edit">
                    <Field
                      id={`pj-name-${i}`}
                      label="Project name"
                      value={pr.name}
                      maxLength={100}
                      onChange={editProject(i, "name")}
                      placeholder="Campus2Career"
                    />
                    <Field
                      id={`pj-url-${i}`}
                      label="Link"
                      value={pr.url}
                      onChange={editProject(i, "url")}
                      placeholder="github.com/you/project or myapp.vercel.app"
                    />
                    <Field
                      id={`pj-desc-${i}`}
                      label="What is it?"
                      multiline
                      maxLength={300}
                      value={pr.description}
                      onChange={editProject(i, "description")}
                      hint="One or two lines: what it does and what you used."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-project-remove"
                      onClick={() => removeProject(i)}
                      aria-label={`Remove project ${pr.name || i + 1}`}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="pe-about" title="About you">
              <Field
                id="pf-bio"
                label="Bio"
                name="bio"
                multiline
                value={draft.bio || ""}
                onChange={set}
                hint="Two or three lines about what you're looking for."
              />
              <Field
                id="pf-skills"
                label="Skills"
                name="skills"
                value={draft.skills || ""}
                onChange={set}
                hint="Separate skills with commas. They're matched against internship descriptions."
              />
              {draftSkills.length > 0 && (
                <ul className="p-chips" aria-label="Skills preview">
                  {draftSkills.map((sk) => (
                    <li key={sk}>{sk}</li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="p-savebar">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-view rise" style={{ "--i": 1 }}>
            {missing.length > 0 && (
              <aside className="p-meter" aria-label="Profile completeness">
                <div className="p-meter-top">
                  <strong>Your profile is {percent}% complete</strong>
                  {editLink("Finish it")}
                </div>
                <div
                  className="p-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>
                <p className="p-meter-note">
                  Still missing:{" "}
                  {missing
                    .slice(0, 4)
                    .map(([, label]) => label)
                    .join(", ")}
                  {missing.length > 4 ? ` and ${missing.length - 4} more` : ""}.
                </p>
              </aside>
            )}

            <dl className="p-tiles">
              <Tile label="Graduating" value={student.grad_year} />
              <Tile label="CGPA" value={student.cgpa} />
              <Tile label="Semester" value={student.semester} />
              <Tile label="Branch" value={student.branch} />
            </dl>

            <div className="p-columns">
              <Section id="p-about" title="About">
                {student.bio ? (
                  <p className="p-bio">{student.bio}</p>
                ) : (
                  <p className="p-missing">No bio yet. {editLink("Add one")}</p>
                )}
              </Section>

              <Section id="p-skills" title="Skills">
                {skills.length > 0 ? (
                  <ul className="p-chips">
                    {skills.map((sk) => (
                      <li key={sk}>{sk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-missing">
                    No skills listed. {editLink("Add skills")}
                  </p>
                )}
              </Section>

              <Section id="p-where" title="Where you'd work">
                {locations.length > 0 ? (
                  <ul className="p-chips">
                    {locations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-missing">
                    No preferred cities yet. {editLink("Add some")}
                  </p>
                )}
              </Section>

              <Section id="p-projects" title="Projects">
                {student.projects?.length > 0 ? (
                  <ul className="p-projects">
                    {student.projects.map((pr, i) => (
                      <li key={`${pr.name}-${i}`}>
                        <h3>
                          {pr.url ? (
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {pr.name} ↗
                            </a>
                          ) : (
                            pr.name
                          )}
                        </h3>
                        {pr.description && <p>{pr.description}</p>}
                        {pr.url && (
                          <span className="p-project-host">
                            {hostOf(pr.url)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-missing">
                    No projects yet. {editLink("Add a project")}
                  </p>
                )}
              </Section>

              <ProfileConnectors
                profile={student}
                onChange={(next) => {
                  setStudent(next);
                  setDraft(next);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 3000);
                }}
              />
            </div>
          </div>
        )}

        <section className="p-account" aria-labelledby="p-account-h">
          <div>
            <h2 id="p-account-h" className="p-account-h">
              Delete account
            </h2>
            <p className="p-account-text">
              Permanently removes your profile, documents and tracked
              applications. This can&rsquo;t be undone.
            </p>
          </div>
          <Button
            variant="ghost"
            className="btn-delete"
            onClick={() => setConfirmOpen(true)}
          >
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
          This permanently deletes your profile, every resume version and all
          tracked applications.
          {getRole() === "poster"
            ? " Internships you posted are removed too."
            : ""}{" "}
          Enter your password to confirm.
        </p>
        <Field
          id="del-pw"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={deletePw}
          onChange={(e) => setDeletePw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && deletePw && !deleteBusy) handleDelete();
          }}
        />
        <Alert>{deleteError}</Alert>
      </ConfirmDialog>
    </section>
  );
}
