import { Button } from "./ui.jsx";

/**
 * What a student can do with a posting. "Apply" opens the company's own page (that is where the
 * application actually happens); "I've applied" is the separate step that puts it on the tracker.
 */
export function InternshipActions({ item, busy, visited, onLinkOpened, onTrack, onUntrack }) {
  const source = item.source === "manual" ? "the company site" : item.source;

  if (item.applied) {
    return (
      <div className="card-actions">
        <span className="tracked-pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          On your tracker · {item.app_status}
        </span>
        <Button variant="ghost" className="btn-delete" onClick={() => onUntrack(item)} aria-label={`Remove ${item.role} at ${item.company} from your tracker`}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="card-actions card-actions--stack">
      {item.url && (
        <Button
          as="a"
          variant={visited ? "ghost" : "primary"}
          block
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onLinkOpened(item)}
          aria-label={`Apply for ${item.role} at ${item.company} on ${source} (opens in a new tab)`}
        >
          Apply on <span className="cap">{source}</span> ↗
        </Button>
      )}
      <Button
        variant={visited || !item.url ? "primary" : "soft"}
        block
        loading={busy}
        onClick={() => onTrack(item)}
        aria-label={`Add ${item.role} at ${item.company} to your tracker`}
      >
        {visited ? "I applied – add to tracker" : item.url ? "I've already applied" : "Add to tracker"}
      </Button>
    </div>
  );
}
