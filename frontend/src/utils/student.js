import { api } from "./api";

export const loadStudent = () => api("/profile");

export const saveStudent = (student) =>
  api("/profile", { method: "PUT", body: student });

export const deleteAccount = (password) =>
  api("/account", { method: "DELETE", body: { password } });
