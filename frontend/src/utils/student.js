import { api } from "./api";

export const loadStudent = () => api("/profile");

// Tells the navbar's progress bar to re-read the profile.
export const PROFILE_CHANGED = "profile:changed";

export const saveStudent = (student) =>
  api("/profile", { method: "PUT", body: student }).then((saved) => {
    window.dispatchEvent(new Event(PROFILE_CHANGED));
    return saved;
  });

export const deleteAccount = (password) =>
  api("/account", { method: "DELETE", body: { password } });
