import { useEffect, useState } from "react";
import { api } from "../utils/api";
import "./Tracker.css";

const COLUMNS = ["Applied", "Interview", "Offer"];

export function Tracker() {
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileOver, setFileOver] = useState(false);

  useEffect(() => {
    api("/tracker")
      .then(setCards)
      .catch((err) => setError(err.message));
  }, []);

  const addCard = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      const card = await api("/tracker", { method: "POST", body: { title } });
      setCards((prev) => [...prev, card]);
      setNewTitle("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const removeCard = async (id) => {
    try {
      await api(`/tracker/${id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const onDragStart = (e, card) => {
    e.dataTransfer.setData("text/plain", String(card.id));
    e.dataTransfer.effectAllowed = "move";
    setDragId(card.id);
  };

  const onDragEnd = () => {
    setDragId(null);
    setOverCol(null);
  };

  const onDragOver = (e, col) => {
    e.preventDefault(); // required, otherwise drop is not allowed
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  };

  const onDrop = (e, col) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    const card = cards.find((c) => c.id === id);
    if (card && card.status !== col) {
      const previous = card.status;
      const setStatus = (status) =>
        setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      setStatus(col); // optimistic; roll back if the server rejects it
      api(`/tracker/${id}`, { method: "PATCH", body: { status: col } }).catch(
        (err) => {
          setStatus(previous);
          setError(err.message);
        },
      );
    }
    onDragEnd();
  };

  // --- File dropping (dataTransfer.files) ---
  const onFileDrop = (e) => {
    e.preventDefault();
    setFileOver(false);
    const dropped = Array.from(e.dataTransfer.files).map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + " KB",
      type: f.type || "unknown",
    }));
    setFiles((prev) => [...prev, ...dropped]);
  };

  return (
    <div className="dd-page">
      <header className="dd-header">
        <h1 className="dd-title">Tracker</h1>
      </header>

      <form className="dd-add" onSubmit={addCard}>
        <input
          type="text"
          placeholder="Add an application, e.g. Backend Intern – Zoho"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      {error && <p className="dd-error">{error}</p>}

      <div className="dd-board">
        {COLUMNS.map((col) => (
          <section
            key={col}
            className={`dd-column ${overCol === col ? "dd-over" : ""}`}
            onDragOver={(e) => onDragOver(e, col)}
            onDragLeave={() => setOverCol(null)}
            onDrop={(e) => onDrop(e, col)}
          >
            <h2>
              {col} <span>{cards.filter((c) => c.status === col).length}</span>
            </h2>
            {cards
              .filter((c) => c.status === col)
              .map((card) => (
                <div
                  key={card.id}
                  className={`dd-card ${dragId === card.id ? "dd-dragging" : ""}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, card)}
                  onDragEnd={onDragEnd}
                >
                  <span>{card.title}</span>
                  <button
                    type="button"
                    className="dd-remove"
                    aria-label={`Remove ${card.title}`}
                    onClick={() => removeCard(card.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
          </section>
        ))}
      </div>

      <div
        className={`dd-dropzone ${fileOver ? "dd-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={onFileDrop}
      >
        <p>Drop your resume or files here</p>
        <ul>
          {files.map((f, i) => (
            <li key={i}>
              {f.name} · {f.size} · {f.type}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Tracker;
