import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { Alert, Button, EmptyState, Skeleton } from "../components/ui.jsx";
import "./Analytics.css";

const MIN_COMPARE = 5; // groups smaller than this are flagged, not compared

const fmtPct = (n) => (n == null ? "–" : `${Math.round(n)}%`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <dt className="kpi-label">{label}</dt>
      <dd className="kpi-value">{value}</dd>
      {note && <dd className="kpi-note">{note}</dd>}
    </div>
  );
}

function TableToggle({ on, onChange }) {
  return (
    <button
      type="button"
      className="link-btn an-toggle"
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      {on ? "Show chart" : "Show as table"}
    </button>
  );
}

/* ---------- Funnel: ordered stages, so one hue stepping light to dark ---------- */
function Funnel({ data }) {
  const [table, setTable] = useState(false);
  const { funnel, total, rejected } = data;
  const reachedOA = funnel[1].count;

  return (
    <section className="an-section" aria-labelledby="an-funnel">
      <div className="an-head">
        <div>
          <h2 id="an-funnel" className="an-h">
            Where applications get to
          </h2>
          <p className="an-sub">
            Share of your {plural(total, "application", "applications")} that
            reached each stage.
          </p>
        </div>
        <TableToggle on={table} onChange={setTable} />
      </div>

      {table ? (
        <table className="an-table">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col" className="num">
                Applications
              </th>
              <th scope="col" className="num">
                Of all applied
              </th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((f) => (
              <tr key={f.stage}>
                <th scope="row">{f.stage}</th>
                <td className="num">{f.count}</td>
                <td className="num">{fmtPct(f.pctOfApplied)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ol className="funnel">
          {funnel.map((f, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            return (
              <li className="funnel-row" key={f.stage}>
                <span className="funnel-label">{f.stage}</span>
                <span className="funnel-track" aria-hidden="true">
                  <span
                    className={`funnel-bar funnel-bar--${i}`}
                    style={{ width: `${f.pctOfApplied ?? 0}%` }}
                  />
                </span>
                <span className="funnel-value">
                  <strong>{f.count}</strong>
                  <span className="funnel-pct">{fmtPct(f.pctOfApplied)}</span>
                </span>
                <span className="funnel-step">
                  {prev
                    ? `${Math.round((f.count / prev) * 100)}% of previous stage`
                    : ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="an-note">
        {rejected > 0 && (
          <>
            {plural(rejected, "application was", "applications were")}{" "}
            rejected.{" "}
          </>
        )}
        Not every company runs an online assessment, so applications that skip
        it still count as past it
        {reachedOA === 0 ? "" : "."}
      </p>
    </section>
  );
}

/* ---------- Applications over time: one series, one color, no legend ---------- */
function niceMax(max) {
  if (max <= 2) return 2; // keeps the middle tick a whole number
  if (max <= 10) return Math.ceil(max / 2) * 2;
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1) * 2;
  return Math.ceil(max / step) * step;
}

function OverTime({ data }) {
  const [period, setPeriod] = useState("week");
  const [table, setTable] = useState(false);
  const series = period === "week" ? data.perWeek : data.perMonth;
  const max = Math.max(...series.map((b) => b.count), 0);
  const top = niceMax(max);
  const ticks = [0, top / 2, top];
  const latest = series[series.length - 1]; // the one value we label: where you are now

  const label = (b, long) => {
    const d = new Date(`${b.start}T00:00:00Z`);
    return period === "week"
      ? `${long ? "Week of " : ""}${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
      : d.toLocaleDateString("en-GB", {
          month: "short",
          ...(long ? { year: "numeric" } : {}),
          timeZone: "UTC",
        });
  };
  const sum = series.reduce((s, b) => s + b.count, 0);

  return (
    <section className="an-section" aria-labelledby="an-time">
      <div className="an-head">
        <div>
          <h2 id="an-time" className="an-h">
            Applications over time
          </h2>
          <p className="an-sub">
            {plural(sum, "application", "applications")} in the last 12{" "}
            {period === "week" ? "weeks" : "months"}.
          </p>
        </div>
        <div className="an-controls">
          <div className="seg" role="group" aria-label="Group by">
            {["week", "month"].map((p) => (
              <button
                key={p}
                type="button"
                className={`seg-btn ${period === p ? "seg-btn--on" : ""}`}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
          <TableToggle on={table} onChange={setTable} />
        </div>
      </div>

      {table ? (
        <table className="an-table">
          <thead>
            <tr>
              <th scope="col">
                {period === "week" ? "Week starting" : "Month"}
              </th>
              <th scope="col" className="num">
                Applications
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((b) => (
              <tr key={b.start}>
                <th scope="row">{label(b, true)}</th>
                <td className="num">{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="cols"
          role="group"
          aria-label={`Applications per ${period}`}
        >
          <div className="cols-y" aria-hidden="true">
            {ticks.map((t) => (
              <span
                key={t}
                className="cols-tick"
                style={{ bottom: `${(t / top) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="cols-plot">
            {ticks.map((t) => (
              <span
                key={t}
                className="cols-grid"
                aria-hidden="true"
                style={{ bottom: `${(t / top) * 100}%` }}
              />
            ))}
            <div className="cols-bars">
              {series.map((b, i) => (
                <div
                  className="col"
                  key={b.start}
                  tabIndex={0}
                  aria-label={`${label(b, true)}: ${plural(b.count, "application", "applications")}`}
                >
                  <span className="col-slot">
                    <span
                      className="col-barwrap"
                      style={{ height: `${(b.count / top) * 100}%` }}
                    >
                      {b === latest && b.count > 0 && (
                        <span className="col-peak" aria-hidden="true">
                          {b.count}
                        </span>
                      )}
                      <span className="col-bar" />
                    </span>
                  </span>
                  <span
                    className={`col-x ${i % 2 === 0 ? "" : "col-x--alt"}`}
                    aria-hidden="true"
                  >
                    {label(b)}
                  </span>
                  <span className="col-tip" aria-hidden="true">
                    <strong>
                      {plural(b.count, "application", "applications")}
                    </strong>
                    <span>{label(b, true)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Which resume / source gets replies ---------- */
function Breakdown({ data }) {
  const [by, setBy] = useState("resume");
  const rows = by === "resume" ? data.byResume : data.bySource;
  const comparable = rows.filter((r) => !r.small);
  const best =
    comparable.length >= 2
      ? [...comparable].sort((a, b) => b.responseRate - a.responseRate)[0]
      : null;

  return (
    <section className="an-section" aria-labelledby="an-break">
      <div className="an-head">
        <div>
          <h2 id="an-break" className="an-h">
            {by === "resume"
              ? "Which resume gets replies"
              : "Which source gets replies"}
          </h2>
          <p className="an-sub">
            {best
              ? `${best.label} has the highest reply rate: ${fmtPct(best.responseRate)} across ${plural(best.applied, "application", "applications")}.`
              : `Groups need ${MIN_COMPARE}+ applications before they're worth comparing. Small samples swing a lot.`}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Break down by">
          {[
            ["resume", "Resume"],
            ["source", "Source"],
          ].map(([k, text]) => (
            <button
              key={k}
              type="button"
              className={`seg-btn ${by === k ? "seg-btn--on" : ""}`}
              aria-pressed={by === k}
              onClick={() => setBy(k)}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="an-scroll">
        <table className="an-table an-table--break">
          <thead>
            <tr>
              <th scope="col">{by === "resume" ? "Resume" : "Source"}</th>
              <th scope="col" className="num">
                Applied
              </th>
              <th scope="col">Heard back</th>
              <th scope="col" className="num">
                Interviews
              </th>
              <th scope="col" className="num">
                Offers
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.small ? "is-small" : ""}>
                <th scope="row">
                  {r.label}
                  {r.small && <span className="small-tag">Small sample</span>}
                </th>
                <td className="num">{r.applied}</td>
                <td>
                  <span className="meter">
                    <span className="meter-track" aria-hidden="true">
                      <span
                        className="meter-fill"
                        style={{ width: `${r.responseRate ?? 0}%` }}
                      />
                    </span>
                    <span className="meter-text">{fmtPct(r.responseRate)}</span>
                  </span>
                </td>
                <td className="num">{r.interviews}</td>
                <td className="num">{r.offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="an-note">
        These show what happened, not why. A resume can look better simply
        because it was sent to easier roles.
      </p>
    </section>
  );
}

export function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api("/analytics")
      .then(setData)
      .catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  const r = data?.response;

  return (
    <div className="page an-page">
      <header className="page-head rise">
        <h1 className="page-title">Analytics</h1>
      </header>

      {error && (
        <>
          <Alert>{error}</Alert>
          <div className="an-retry">
            <Button
              variant="ghost"
              onClick={() => {
                setError("");
                load();
              }}
            >
              Try again
            </Button>
          </div>
        </>
      )}

      {!data && !error && (
        <div
          className="an-wrap"
          aria-busy="true"
          aria-label="Loading analytics"
        >
          <Skeleton
            height="96px"
            style={{ borderRadius: 10, marginBottom: 24 }}
          />
          <Skeleton
            height="220px"
            style={{ borderRadius: 10, marginBottom: 24 }}
          />
          <Skeleton height="220px" style={{ borderRadius: 10 }} />
        </div>
      )}

      {data && data.total === 0 && (
        <div className="an-wrap">
          <EmptyState
            title="Nothing to analyze yet"
            action={
              <Button as={Link} to="/internships">
                Browse internships
              </Button>
            }
          >
            Apply to a few roles and move cards across the Tracker as you hear
            back. Your funnel and reply rates build from that.
          </EmptyState>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="an-wrap">
          <dl className="kpis rise" style={{ "--i": 1 }}>
            <Kpi label="Applications" value={data.total} />
            <Kpi
              label="Heard back"
              value={fmtPct(r.rate)}
              note={`${r.responded} of ${data.total}, including rejections`}
            />
            <Kpi
              label="Average time to hear back"
              value={
                r.avgDays == null
                  ? "–"
                  : `${r.avgDays} ${r.avgDays === 1 ? "day" : "days"}`
              }
              note={
                r.avgDays == null
                  ? "Shows up once you move a card to a new stage"
                  : `Median ${r.medianDays} days, from ${plural(r.timedCount, "reply", "replies")}`
              }
            />
            <Kpi
              label="Offers"
              value={data.funnel[3].count}
              note={`${fmtPct(data.funnel[3].pctOfApplied)} of applications`}
            />
          </dl>

          <Funnel data={data} />
          <OverTime data={data} />
          <Breakdown data={data} />

          <p className="an-foot">
            Time to hear back counts stage changes made in this app. Older cards
            still count toward reply rates, just not toward the average.
          </p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
