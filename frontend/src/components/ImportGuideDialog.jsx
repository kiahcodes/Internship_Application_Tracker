import { Button, Modal } from "./ui.jsx";

// Same header row the Export button writes, so an exported file can be edited and imported back.
const TEMPLATE = [
  "Title,Company,Role,Status,Applied on,Deadline,Remind on,Link",
  "SDE Intern – Acme,Acme,SDE Intern,Applied,2026-10-28,2026-11-15,2026-11-10,https://acme.example/jobs/1",
  "Frontend Intern – Globex,Globex,Frontend Intern,Interview,2026-10-20,,,",
  "Data Analyst Intern – Initech,Initech,Data Analyst Intern,Rejected,2026-10-05,,,",
].join("\n");

const COLUMNS = [
  ["Title", "The name of the card. If you leave it empty we use \"Role – Company\".", "Required*"],
  ["Company", "Used to build the title when Title is empty.", "Optional"],
  ["Role", "Used to build the title when Title is empty.", "Optional"],
  ["Status", "Applied, OA, Interview, Offer or Rejected. Anything else becomes Applied.", "Optional"],
  ["Applied on", "Date you applied. Defaults to today.", "Optional"],
  ["Deadline", "Application deadline.", "Optional"],
  ["Remind on", "Date you want a reminder (\"Result by\" works too).", "Optional"],
  ["Link", "Web address of the posting (starts with http).", "Optional"],
];

function downloadTemplate() {
  // The BOM makes Excel read the file as UTF-8.
  const url = URL.createObjectURL(new Blob(["﻿", TEMPLATE, "\n"], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "applications-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Explains the CSV format before the file picker opens. */
export function ImportGuideDialog({ open, onChoose, onClose }) {
  return (
    <Modal open={open} title="Import from a CSV" onClose={onClose}>
      <p className="imp-lede">
        Your file needs a <strong>header row</strong> (the first line) followed by one application per line.
        You can see what will be added before anything is saved.
      </p>

      <table className="imp-table">
        <caption className="sr-only">CSV columns</caption>
        <thead>
          <tr><th scope="col">Column</th><th scope="col">What goes in it</th><th scope="col" /></tr>
        </thead>
        <tbody>
          {COLUMNS.map(([name, text, need]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{text}</td>
              <td>{need}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="imp-notes">
        <li>*Each row needs a Title, or at least a Company or Role.</li>
        <li>Dates can be <code>2026-11-15</code>, <code>15/11/2026</code> (day first) or <code>15 Nov 2026</code>.</li>
        <li>
          Column order doesn&rsquo;t matter, and common names work too: &ldquo;Company name&rdquo;, &ldquo;Position&rdquo;,
          &ldquo;Stage&rdquo;, &ldquo;Application date&rdquo;, &ldquo;Result by&rdquo;, &ldquo;URL&rdquo;.
        </li>
        <li>Columns we can&rsquo;t keep yet (like Locations, Skillset or Avg package) are listed in the preview, not silently dropped.</li>
        <li>Up to 500 rows and 1 MB. Rows already in your tracker are skipped, so importing twice is safe.</li>
        <li>Tip: <strong>Export CSV</strong> writes this same format. Edit it in Excel or Google Sheets and import it back.</li>
      </ul>

      <pre className="imp-sample" aria-label="Example file">{TEMPLATE}</pre>

      <div className="dialog-ui-actions imp-actions">
        <Button variant="ghost" onClick={downloadTemplate}>Download template</Button>
        <Button onClick={onChoose}>Choose file…</Button>
      </div>
    </Modal>
  );
}
