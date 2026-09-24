import { useState } from "react";
import "./DragDrop.css";

const COLUMNS = ["Applied", "Interview", "Offer"];

const INITIAL = [
  { id: 1, title: "Frontend Intern – Zoho", status: "Applied" },
  { id: 2, title: "Data Analyst Intern – TCS", status: "Applied" },
  { id: 3, title: "SDE Intern – Infosys", status: "Applied" },
  { id: 4, title: "Backend Intern – Freshworks", status: "Interview" },
];

export function DragDrop() {
  const [cards, setCards] = useState(INITIAL);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileOver, setFileOver] = useState(false);

  // --- Card dragging (dataTransfer carries the card id) ---
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
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: col } : c)));
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
                  {card.title}
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

export default DragDrop;
