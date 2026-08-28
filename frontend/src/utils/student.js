export const STUDENT_STORAGE_KEY = "profile.student";

export const defaultStudent = {
  name: "Kiah Mandaliya",
  email: "kiahdmandaliya@gmail.com",
  course: "Full Stack Development",
  semester: "5th Semester",
  bio: "Aspiring frontend developer, currently exploring React and building small projects to learn by doing.",
  skills: "HTML, CSS, JavaScript, React",
};

export function loadStudent() {
  try {
    const saved = localStorage.getItem(STUDENT_STORAGE_KEY);
    return saved ? { ...defaultStudent, ...JSON.parse(saved) } : defaultStudent;
  } catch {
    return defaultStudent;
  }
}
