import { useState } from "react";
import { LINK_KINDS, prep } from "../../utils/prep";
import { Button, EmptyState, Field } from "../ui.jsx";

export function LinksTab({ detail, update, onError }) {
  const empty = { title: "", url: "", kind: "dsa" };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const { company, links } = detail;
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const link = await prep.addLink(company.id, form);
      update((d) => ({ ...d, links: [...d.links, link] }));
      setForm({ ...empty, kind: form.kind });
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (link) => {
    try {
      await prep.deleteLink(link.id);
      update((d) => ({ ...d, links: d.links.filter((l) => l.id !== link.id) }));
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div>
      <form className="pr-form pr-form--links" onSubmit={add}>
        <Field id="lk-title" label="Title" name="title" required maxLength={150} value={form.title} onChange={set} placeholder="Two Sum" />
        <Field id="lk-url" label="Link" name="url" type="url" required value={form.url} onChange={set} placeholder="https://leetcode.com/problems/two-sum/" />
        <div className="field">
          <label className="field-label" htmlFor="lk-kind">Type</label>
          <select id="lk-kind" name="kind" className="field-input" value={form.kind} onChange={set}>
            {LINK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <Button type="submit" loading={busy}>Add link</Button>
      </form>

      {links.length === 0 ? (
        <EmptyState title="No links yet">
          Save the DSA problems you've solved and the notes you've written for {company.name}, so they're one click away before the interview.
        </EmptyState>
      ) : (
        LINK_KINDS.map((k) => {
          const group = links.filter((l) => l.kind === k.value);
          if (!group.length) return null;
          return (
            <section key={k.value} className="pr-linkgroup" aria-label={k.group}>
              <h4 className="pr-subh">{k.group}</h4>
              <ul className="pr-links">
                {group.map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}<span className="sr-only"> (opens in a new tab)</span></a>
                    <span className="pr-host">{new URL(l.url).hostname.replace(/^www\./, "")}</span>
                    <button type="button" className="pr-x" aria-label={`Remove ${l.title}`} onClick={() => remove(l)}>×</button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
