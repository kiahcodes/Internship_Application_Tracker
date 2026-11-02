import { useState } from "react";
import { saveStudent } from "../utils/student";
import {
  CONNECTORS,
  beginGithubConnect,
  connectorHandle,
  connectorUrl,
} from "../utils/connectors";
import { Alert, Button, Field, Modal } from "./ui.jsx";
import "./ProfileConnectors.css";

function ConnectorMark({ name }) {
  if (name === "GitHub")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 .8a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.5v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.3 11.3 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.5 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 12 .8Z" />
      </svg>
    );
  if (name === "Codeforces")
    return (
      <span className="pc-bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  if (name === "LinkedIn") return <b aria-hidden="true">in</b>;
  if (name === "ORCID") return <b aria-hidden="true">iD</b>;
  return <b aria-hidden="true">{name === "Google Scholar" ? "S" : "L"}</b>;
}

/** One-click account links. GitHub verifies with OAuth; other services need only a public handle. */
export function ProfileConnectors({ profile, onChange }) {
  const [selected, setSelected] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const openEditor = (connector) => {
    setSelected(connector);
    setValue(connectorHandle(connector.key, profile[connector.key]));
    setError("");
  };

  const update = async (key, url) => {
    setBusy(key);
    setError("");
    try {
      const next = await saveStudent({ ...profile, [key]: url });
      onChange(next);
      setSelected(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const connect = async (connector) => {
    if (!connector.oauth) return openEditor(connector);
    setBusy(connector.key);
    setError("");
    try {
      await beginGithubConnect();
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const result = connectorUrl(selected.key, value);
    if (result.error) return setError(result.error);
    update(selected.key, result.url);
  };

  const connected = CONNECTORS.filter((item) => profile[item.key]).length;

  return (
    <section className="p-card pc" aria-labelledby="profile-connectors-title">
      <header className="p-card-head pc-head">
        <div>
          <h2 id="profile-connectors-title" className="p-h">
            Connected accounts
          </h2>
          <p>Link the profiles recruiters use to understand your work.</p>
        </div>
        <span className="pc-count">
          {connected}/{CONNECTORS.length}
        </span>
      </header>

      <Alert onDismiss={() => setError("")}>{!selected && error}</Alert>
      <ul className="pc-list">
        {CONNECTORS.map((connector) => {
          const url = profile[connector.key];
          const handle = connectorHandle(connector.key, url);
          return (
            <li
              key={connector.key}
              className={`pc-row pc-${connector.key} ${url ? "is-connected" : ""}`}
            >
              <span className="pc-mark">
                <ConnectorMark name={connector.name} />
              </span>
              <span className="pc-copy">
                <strong>{connector.name}</strong>
                <span>
                  {url ? `Connected as ${handle}` : connector.description}
                </span>
              </span>
              <span className="pc-actions">
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                )}
                <Button
                  variant={url ? "ghost" : "soft"}
                  size="sm"
                  loading={busy === connector.key}
                  onClick={() => connect(connector)}
                >
                  {url ? "Change" : "Connect"}
                </Button>
                {url && (
                  <button
                    type="button"
                    className="pc-unlink"
                    onClick={() => update(connector.key, "")}
                    aria-label={`Disconnect ${connector.name}`}
                    title={`Disconnect ${connector.name}`}
                  >
                    ×
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!selected}
        title={selected ? `Connect ${selected.name}` : "Connect account"}
        onClose={() => {
          setSelected(null);
          setError("");
        }}
      >
        {selected && (
          <form className="pc-form" onSubmit={submit}>
            <p>Paste a profile link, or enter only your username.</p>
            <Field
              id={`connector-${selected.key}`}
              label={`${selected.name} username or link`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selected.placeholder}
              autoFocus
              required
            />
            <Alert onDismiss={() => setError("")}>{error}</Alert>
            <div className="dialog-ui-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy === selected.key}>
                Save connection
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

export default ProfileConnectors;
