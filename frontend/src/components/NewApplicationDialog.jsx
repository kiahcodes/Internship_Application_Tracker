import { useState } from "react";
import { Alert, Button, Field, Modal, Select } from "./ui.jsx";

const EMPTY = { company: "", role: "", location: "", link: "", deadline: "", status: "Applied" };

/** A proper form for a new application, so every detail is captured at once. */
export function NewApplicationDialog({ open, stages, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const close = () => {
    setForm(EMPTY);
    setError("");
    onClose();
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() && !form.role.trim()) return setError("Add a company or a role.");
    setBusy(true);
    try {
      await onSave(form);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} title="Add an application" onClose={close}>
      <form className="na" onSubmit={submit}>
        <Alert onDismiss={() => setError("")}>{error}</Alert>
        <div className="na-grid">
          <Field label="Company" id="na-company" value={form.company} onChange={set("company")} maxLength={100} placeholder="e.g. Zoho" autoFocus />
          <Field label="Role" id="na-role" value={form.role} onChange={set("role")} maxLength={150} placeholder="e.g. Backend Intern" />
          <Field label="Location" id="na-location" value={form.location} onChange={set("location")} maxLength={100} placeholder="e.g. Bengaluru or Remote" />
          <Select label="Stage" id="na-status" value={form.status} onChange={set("status")} options={stages} />
          <Field label="Posting link" id="na-link" inputMode="url" value={form.link} onChange={set("link")} maxLength={500} placeholder="company.com/careers" className="na-wide" />
          <Field label="Application deadline" id="na-deadline" type="date" value={form.deadline} onChange={set("deadline")} />
        </div>
        <div className="na-foot">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit" loading={busy}>Add application</Button>
        </div>
      </form>
    </Modal>
  );
}

export default NewApplicationDialog;
