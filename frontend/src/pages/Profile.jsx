import "./Profile.css";

const student = {
  name: "Kiah Mandaliya",
  email: "kiahdmandaliya@gmail.com",
  course: "Full Stack Development",
  semester: "5th Semester",
  bio: "Aspiring frontend developer, currently exploring React and building small projects to learn by doing.",
  skills: ["HTML", "CSS", "JavaScript", "React"],
};

export function Profile() {
  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{student.name.charAt(0)}</div>

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
          {student.skills.map((skill) => (
            <span className="skill-badge" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
