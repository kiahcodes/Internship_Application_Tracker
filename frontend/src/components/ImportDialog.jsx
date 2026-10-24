import { Button, Modal } from "./ui.jsx";
import { formatDay } from "../utils/internships";

/** Shows what an import would do before anything is saved. `report` is the server's dry-run answer. */
export function ImportDialog({ report, fileName, busy, onConfirm, onClose }) {
  const open = !!report;
  const added = report?.added ?? 0;

  return (
    <Modal open={open} title="Import applications" onClose={onClose}>
      {report && (
        <>
          <p className="imp-lede">
            <strong>{added}</strong> {added === 1 ? "application" : "applications"} from <em>{fileName}</em> will be added to your tracker.
            {report.skipped.length > 0 && ` ${report.skipped.length} ${report.skipped.length === 1 ? "row was" : "rows were"} skipped.`}
          </p>

          {report.preview.length > 0 && (
            <table className="imp-table">
              <caption className="sr-only">First rows that will be added</caption>
              <thead>
                <tr><th scope="col">Application</th><th scope="col">Stage</th><th scope="col">Applied</th></tr>
              </thead>
              <tbody>
                {report.preview.map((r) => (
                  <tr key={r.title}>
                    <td>{r.title}</td>
                    <td>{r.status}</td>
                    <td>{r.applied_on ? formatDay(r.applied_on) : "Today"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {added > report.preview.length && <p className="imp-more">…and {added - report.preview.length} more.</p>}

          {report.warnings.length > 0 && (
            <details className="imp-details">
              <summary>{report.warnings.length} {report.warnings.length === 1 ? "thing" : "things"} we changed</summary>
              <ul>{report.warnings.map((w, i) => <li key={i}>Row {w.line}: {w.reason}</li>)}</ul>
            </details>
          )}
          {report.skipped.length > 0 && (
            <details className="imp-details">
              <summary>Skipped rows</summary>
              <ul>{report.skipped.map((w, i) => <li key={i}>Row {w.line}: {w.reason}</li>)}</ul>
            </details>
          )}

          <div className="dialog-ui-actions imp-actions">
            <Button variant="ghost" onClick={onClose}>{added ? "Cancel" : "Close"}</Button>
            {added > 0 && <Button loading={busy} onClick={onConfirm}>Add {added}</Button>}
          </div>
        </>
      )}
    </Modal>
  );
}
