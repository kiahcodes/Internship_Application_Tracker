import { api } from "./api";

export const loadStudent = () => api("/profile");

export const saveStudent = (student) =>
  api("/profile", { method: "PUT", body: student });
