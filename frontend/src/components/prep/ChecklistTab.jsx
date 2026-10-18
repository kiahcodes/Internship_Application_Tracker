import { useState } from "react";
import { STARTER_ITEMS, prep } from "../../utils/prep";
import { Button, EmptyState } from "../ui.jsx";

export function ChecklistTab({ detail, update, onError }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { company, items } = detail;
  const done = items.filter((i) => i.done).length;

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const item = await prep.addItem(company.id, text);
      update((d) => ({ ...d, items: [...d.items, item] }));
      setText("");
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addStarter = async () => {
    setBusy(true);
    try {
      const created = [];
      for (const t of STARTER_ITEMS) created.push(await prep.addItem(company.id, t)); // in order
      update((d) => ({ ...d, items: [...d.items, ...created] }));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    const set = (v) => update((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, done: v } : i)) }));
    set(!item.done);
    try {
      await prep.setItem(item.id, { done: !item.done });
    } catch (err) {
      set(item.done);
      onError(err.message);
    }
  };

  const remove = async (item) => {
    try {
      await prep.deleteItem(item.id);
      update((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }));
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        <EmptyState
          title="No checklist yet"
          action={<Button onClick={addStarter} loading={busy}>Add a starter checklist</Button>}
        >
          Start with a ready-made list for a typical internship interview, then edit it. Or add your own items below.
        </EmptyState>
      ) : (
        <>
          <div className="pr-progress" aria-label={`${done} of ${items.length} done`}>
            <span className="pr-progress-track" aria-hidden="true">
              <span className="pr-progress-fill" style={{ width: `${(done / items.length) * 100}%` }} />
            </span>
            <span className="pr-progress-text">{done} of {items.length} done</span>
          </div>
          <ul className="pr-checks">
            {items.map((item) => (
              <li key={item.id} className={item.done ? "is-done" : ""}>
                <label>
                  <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
                  <span>{item.text}</span>
                </label>
                <button type="button" className="pr-x" aria-label={`Remove "${item.text}"`} onClick={() => remove(item)}>×</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <form className="pr-add" onSubmit={add}>
        <label className="sr-only" htmlFor="pr-item">New checklist item</label>
        <input id="pr-item" className="field-input" value={text} maxLength={300} placeholder="Add an item, e.g. Revisit graph traversal" onChange={(e) => setText(e.target.value)} />
        <Button type="submit" loading={busy} disabled={!text.trim()}>Add</Button>
      </form>
    </div>
  );
}
