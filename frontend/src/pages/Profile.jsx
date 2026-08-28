import { useState } from "react";
import "./Profile.css";
import { STUDENT_STORAGE_KEY, loadStudent } from "../utils/student";

export function Profile() {
  const [student, setStudent] = useState(loadStudent);
  const [draft, setDraft] = useState(student);
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStudent(draft);
    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(draft));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(student);
    setIsEditing(false);
  };

  const skillList = student.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{student.name.charAt(0)}</div>

        {isEditing ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span className="form-label">Name</span>
              <input
                type="text"
                name="name"
                value={draft.name}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Email</span>
              <input
                type="email"
                name="email"
                value={draft.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Course</span>
              <input
                type="text"
                name="course"
                value={draft.course}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Semester</span>
              <input
                type="text"
                name="semester"
                value={draft.semester}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Bio</span>
              <textarea
                name="bio"
                value={draft.bio}
                onChange={handleChange}
                rows={3}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Skills (comma separated)</span>
              <input
                type="text"
                name="skills"
                value={draft.skills}
                onChange={handleChange}
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn btn-save">
                Save
              </button>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="profile-name">{student.name}</h1>
            <p className="profile-course">
              {student.course} · {student.semester}
            </p>

            <p className="profile-bio">{student.bio}</p>

            <div className="profile-detail">
              <span className="detail-label">Email</span>
              <span className="detail-value">{student.email}</span>
            </div>

            <div className="profile-skills">
              {skillList.map((skill) => (
                <span className="skill-badge" key={skill}>
                  {skill}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-edit"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          </>
        )}
      </div>
    </section>
  );
}
