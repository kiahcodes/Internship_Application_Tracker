import { useState } from "react";
import { api } from "../utils/api";
import { Alert, Button, Field, Select } from "./ui.jsx";
import { BRANCHES, graduationYears } from "../utils/options.js";

const EMPTY = {
  company: "", role: "", location: "", url: "", work_mode: "onsite", stipend_min: "", stipend_max: "",
  duration_months: "", deadline: "", min_cgpa: "", batch_year: "", branches: [], description: "",
};

/** Job posters only; the server enforces this too. */
export function PostInternshipForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleBranch = (b) =>
    setForm((f) => ({ ...f, branches: f.branches.includes(b) ? f.branches.filter((x) => x !== b) : [...f.branches, b] }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/internships", { method: "POST", body: form });
      setForm(EMPTY);
      setError("");
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="post-form rise" style={{ "--i": 2 }} onSubmit={submit}>
      <h2 className="post-form-title">Post an internship</h2>
      <div className="post-form-grid">
        <Field id="pf-company" label="Company" required value={form.company} onChange={set("company")} />
        <Field id="pf-role" label="Role" required value={form.role} onChange={set("role")} />
        <Field id="pf-location" label="Location" required value={form.location} onChange={set("location")} />
        <Field id="pf-url" label="Link to apply (optional)" type="url" value={form.url} onChange={set("url")} />
        <Select id="pf-mode" label="Work mode" value={form.work_mode} onChange={set("work_mode")}
          options={[{ value: "onsite", label: "On-site" }, { value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }]} />
        <Field id="pf-smin" label="Stipend from (₹/month)" type="number" min="0" value={form.stipend_min} onChange={set("stipend_min")} hint="Enter 0 for unpaid." />
        <Field id="pf-smax" label="Stipend up to (₹/month)" type="number" min="0" value={form.stipend_max} onChange={set("stipend_max")} />
        <Field id="pf-dur" label="Duration (months)" type="number" min="1" max="24" value={form.duration_months} onChange={set("duration_months")} />
        <Field id="pf-deadline" label="Apply by" type="date" value={form.deadline} onChange={set("deadline")} />
        <Field id="pf-cgpa" label="Minimum CGPA" type="number" min="0" max="10" step="0.01" value={form.min_cgpa} onChange={set("min_cgpa")} />
        <Select id="pf-batch" label="Batch" value={form.batch_year} onChange={set("batch_year")} placeholder="Any batch" options={graduationYears()} />
      </div>
      <fieldset className="post-branches">
        <legend>Open to branches (none selected means all)</legend>
        {BRANCHES.map((b) => (
          <label key={b} className="check-chip">
            <input type="checkbox" checked={form.branches.includes(b)} onChange={() => toggleBranch(b)} />
            <span>{b}</span>
          </label>
        ))}
      </fieldset>
      <Field id="pf-desc" label="Description" multiline className="post-form-wide" value={form.description} onChange={set("description")} hint="What the intern will do, skills needed, how to apply." />
      <Alert onDismiss={() => setError("")}>{error}</Alert>
      <Button type="submit" loading={busy}>Add internship</Button>
    </form>
  );
}
