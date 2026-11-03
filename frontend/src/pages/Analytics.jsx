import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { Alert, Button, EmptyState, Skeleton } from "../components/ui.jsx";
import "./Analytics.css";

const RANGES = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];
const MIN_COMPARE = 5; // groups smaller than this are flagged, not compared
const STAGE_CLASS = { Applied: 0, OA: 1, Interview: 2, Offer: 3, Rejected: "x" };

const fmtPct = (n) => (n == null ? "–" : `${Math.round(n)}%`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------- Hover tooltip shared by every tile ---------- */
// One tooltip for the whole dashboard. Marks spread `tip(lines)` to show it on hover and focus.
function useTooltip() {
  const root = useRef(null);
  const [state, setState] = useState(null);
  const place = (clientX, clientY, lines) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    setState({ x: clientX - box.left, y: clientY - box.top, lines });
  };
  const tip = (lines) => ({
    onPointerMove: (e) => place(e.clientX, e.clientY, lines),
    onPointerLeave: () => setState(null),
    onFocus: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      place(r.left + r.width / 2, r.top, lines);
    },
    onBlur: () => setState(null),
  });
  const node = state && (
    <div className="tip" role="presentation" style={{ left: state.x, top: state.y }}>
      <strong>{state.lines[0]}</strong>
      {state.lines.slice(1).map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
  return { root, tip, node };
}

/* ---------- Tiles ---------- */
function Tile({ title, sub, action, className = "", children, id }) {
  return (
    <section className={`tile ${className}`} aria-labelledby={id}>
      <header className="tile-head">
        <div>
          <h2 id={id}>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, text]) => (
        <button
          key={k}
          type="button"
          className={`seg-btn ${value === k ? "seg-btn--on" : ""}`}
          aria-pressed={value === k}
          onClick={() => onChange(k)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Spark({ values }) {
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 34;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${h} ${line} ${w},${h}`} className="spark-area" />
      <polyline points={line} className="spark-line" />
    </svg>
  );
}

function Meter({ value }) {
  return (
    <span className="kmeter" aria-hidden="true">
      <span style={{ width: `${Math.min(100, value ?? 0)}%` }} />
    </span>
  );
}

function Kpis({ data }) {
  const r = data.response;
  const reached = (i) => data.funnel[i].count;
  return (
    <div className="kpis">
      <div className="kpi">
        <h3>Applications</h3>
        <p className="kpi-value">{data.total}</p>
        <Spark values={data.perWeek.map((b) => b.count)} />
        <p className="kpi-note">Weekly pace, last 12 weeks</p>
      </div>
      <div className="kpi">
        <h3>Heard back</h3>
        <p className="kpi-value">{fmtPct(r.rate)}</p>
        <Meter value={r.rate} />
        <p className="kpi-note">
          {r.responded} of {data.total}, rejections included
          {r.medianDays != null && ` · usually ${r.medianDays} ${r.medianDays === 1 ? "day" : "days"}`}
        </p>
      </div>
      <div className="kpi">
        <h3>Reached interview</h3>
        <p className="kpi-value">{fmtPct(data.funnel[2].pctOfApplied)}</p>
        <Meter value={data.funnel[2].pctOfApplied} />
        <p className="kpi-note">{plural(reached(2), "application", "applications")} got this far</p>
      </div>
      <div className="kpi">
        <h3>Offers</h3>
        <p className="kpi-value">{reached(3)}</p>
        <Meter value={data.funnel[3].pctOfApplied} />
        <p className="kpi-note">{fmtPct(data.funnel[3].pctOfApplied)} of applications</p>
      </div>
    </div>
  );
}

/* ---------- Funnel: how far applications ever got ---------- */
function Funnel({ data, tip }) {
  const { funnel, total } = data;
  const drops = funnel.slice(1).map((f, i) => ({
    from: funnel[i].stage,
    to: f.stage,
    base: funnel[i].count,
    lost: funnel[i].count - f.count,
    kept: funnel[i].count ? Math.round((f.count / funnel[i].count) * 100) : null,
  }));
  const worst = drops.filter((d) => d.lost > 0).sort((a, b) => b.lost - a.lost)[0];
  return (
    <Tile
      id="t-funnel"
      className="tile--funnel"
      title="How far applications get"
      sub={
        worst
          ? `Biggest drop: ${worst.from} to ${worst.to}, where ${worst.lost} of ${worst.base} stop.`
          : `${plural(total, "application", "applications")}, each counted at the furthest stage it reached.`
      }
    >
      <ol className="funnel">
        {funnel.map((f, i) => (
          <li key={f.stage}>
            {i > 0 && (
              <span className="funnel-step">
                {drops[i - 1].kept == null ? "" : `${drops[i - 1].kept}% moved on`}
              </span>
            )}
            <div
              className="funnel-row"
              tabIndex={0}
              aria-label={`${f.stage}: ${f.count} of ${total}, ${fmtPct(f.pctOfApplied)} of applications`}
              {...tip([f.stage, `${f.count} of ${total} applications`, `${fmtPct(f.pctOfApplied)} of everything you sent`])}
            >
              <span className="funnel-label">{f.stage}</span>
              <span className="funnel-track">
                <span
                  className={`bar bar--${STAGE_CLASS[f.stage]}`}
                  style={{ width: `${Math.max(f.pctOfApplied ?? 0, f.count ? 1.5 : 0)}%` }}
                />
              </span>
              <span className="funnel-value">{f.count}</span>
            </div>
          </li>
        ))}
      </ol>
    </Tile>
  );
}

/* ---------- Status: where applications are right now ---------- */
function Status({ data, tip }) {
  const rows = data.byStatus;
  const live = rows.filter((r) => r.count);
  return (
    <Tile
      id="t-status"
      className="tile--status"
      title="Where things stand today"
      sub={
        data.stale > 0
          ? `${plural(data.stale, "application has", "applications have")} waited over 14 days for a reply.`
          : "Current stage of every application."
      }
      action={
        data.stale > 0 && (
          <Link to="/tracker" className="tile-link">
            Follow up
          </Link>
        )
      }
    >
      <div className="stack" role="img" aria-label={rows.map((r) => `${r.status} ${r.count}`).join(", ")}>
        {live.map((r) => (
          <span
            key={r.status}
            className={`bar bar--${STAGE_CLASS[r.status]}`}
            style={{ flexGrow: r.count }}
            {...tip([r.status, plural(r.count, "application", "applications")])}
          />
        ))}
      </div>
      <ul className="legend">
        {rows.map((r) => (
          <li key={r.status} className={r.count ? "" : "is-zero"}>
            <i className={`bar bar--${STAGE_CLASS[r.status]}`} aria-hidden="true" />
            <span>{r.status}</span>
            <b>{r.count}</b>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

/* ---------- Over time ---------- */
function niceMax(max) {
  if (max <= 2) return 2;
  if (max <= 10) return Math.ceil(max / 2) * 2;
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1) * 2;
  return Math.ceil(max / step) * step;
}

function OverTime({ data, tip }) {
  const [period, setPeriod] = useState("week");
  const series = period === "week" ? data.perWeek : data.perMonth;
  const top = niceMax(Math.max(...series.map((b) => b.count), 0));
  const ticks = [0, top / 2, top];
  const label = (b, long) => {
    const d = new Date(`${b.start}T00:00:00Z`);
    return period === "week"
      ? `${long ? "Week of " : ""}${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
      : d.toLocaleDateString("en-GB", { month: "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" });
  };
  const sum = series.reduce((s, b) => s + b.count, 0);
  const busiest = series.reduce((a, b) => (b.count > a.count ? b : a), series[0]);
  return (
    <Tile
      id="t-time"
      className="tile--time"
      title={`Applications per ${period}`}
      sub={
        sum
          ? `${plural(sum, "application", "applications")} in the last 12 ${period === "week" ? "weeks" : "months"}. Busiest: ${label(busiest, true)} (${busiest.count}).`
          : "Nothing sent in this window."
      }
      action={
        <Seg
          label="Group by"
          value={period}
          onChange={setPeriod}
          options={[["week", "Weekly"], ["month", "Monthly"]]}
        />
      }
    >
      <div className="cols" role="group" aria-label={`Applications per ${period}`}>
        <div className="cols-plot">
          {ticks.map((t) => (
            <span key={t} className="cols-grid" aria-hidden="true" style={{ bottom: `${(t / top) * 100}%` }}>
              <em>{t}</em>
            </span>
          ))}
          <div className="cols-bars">
            {series.map((b, i) => (
              <div
                className="col"
                key={b.start}
                tabIndex={0}
                aria-label={`${label(b, true)}: ${plural(b.count, "application", "applications")}`}
                {...tip([plural(b.count, "application", "applications"), label(b, true)])}
              >
                <span className="col-slot">
                  <span
                    className={`bar bar--3 col-bar ${i === series.length - 1 ? "is-now" : ""}`}
                    style={{ height: `${(b.count / top) * 100}%` }}
                  />
                </span>
                <span className={`col-x ${i % 2 ? "col-x--alt" : ""}`} aria-hidden="true">
                  {label(b)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Tile>
  );
}

/* ---------- Breakdown: which resume / source earns replies ---------- */
function Breakdown({ data, tip }) {
  const [by, setBy] = useState("resume");
  const rows = (by === "resume" ? data.byResume : data.bySource).filter((r) => r.applied > 0);
  const comparable = rows.filter((r) => !r.small);
  const best =
    comparable.length >= 2 ? [...comparable].sort((a, b) => b.responseRate - a.responseRate)[0] : null;
  return (
    <Tile
      id="t-break"
      className="tile--break"
      title={by === "resume" ? "Which resume gets replies" : "Which source gets replies"}
      sub={
        best
          ? `${best.label} leads at ${fmtPct(best.responseRate)} across ${plural(best.applied, "application", "applications")}.`
          : `Compare once a group has ${MIN_COMPARE}+ applications.`
      }
      action={<Seg label="Break down by" value={by} onChange={setBy} options={[["resume", "Resume"], ["source", "Source"]]} />}
    >
      <ul className="hbars">
        {rows.map((r) => (
          <li
            key={r.key}
            className={r.small ? "is-small" : ""}
            tabIndex={0}
            aria-label={`${r.label}: ${r.applied} applications, ${fmtPct(r.responseRate)} heard back, ${r.interviews} interviews, ${r.offers} offers`}
            {...tip([
              r.label,
              `${plural(r.applied, "application", "applications")}, ${fmtPct(r.responseRate)} heard back`,
              `${plural(r.interviews, "interview", "interviews")} · ${plural(r.offers, "offer", "offers")}`,
              ...(r.small ? [`Small sample: under ${MIN_COMPARE} applications`] : []),
            ])}
          >
            <span className="hbars-name">{r.label}</span>
            <span className="hbars-track">
              <span className="bar bar--2" style={{ width: `${r.responseRate ?? 0}%` }} />
            </span>
            <span className="hbars-val">{fmtPct(r.responseRate)}</span>
            <span className="hbars-n">
              {r.applied} sent{r.small ? " · small sample" : ""}
            </span>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

/* ---------- Page ---------- */
function summaryLine(data) {
  const r = data.response;
  const sent = plural(data.total, "application", "applications");
  if (!r.responded) return `You've sent ${sent} and haven't heard back yet.`;
  return `You've sent ${sent} and heard back on ${r.responded} (${fmtPct(r.rate)}).`;
}

export function Analytics() {
  const [range, setRange] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { root, tip, node } = useTooltip();

  const load = () => {
    const days = RANGES.find((r) => r.key === range)?.days;
    setLoading(true);
    return api(`/analytics${days ? `?days=${days}` : ""}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="page an-page">
      <header className="page-head rise">
        <h1 className="page-title">Analytics</h1>
        {data && data.total > 0 && <p className="db-lead">{summaryLine(data)}</p>}
      </header>

      {error && (
        <>
          <Alert>{error}</Alert>
          <div className="an-retry">
            <Button variant="ghost" onClick={load}>
              Try again
            </Button>
          </div>
        </>
      )}

      {!data && !error && (
        <div className="db" aria-busy="true" aria-label="Loading analytics">
          <Skeleton height="120px" style={{ borderRadius: 12, marginBottom: 16 }} />
          <Skeleton height="260px" style={{ borderRadius: 12 }} />
        </div>
      )}

      {data && (
        <div className="db" ref={root}>
          <div className="db-filters">
            <Seg
              label="Time range"
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => [r.key, r.label])}
            />
          </div>

          {data.total === 0 ? (
            range === "all" ? (
              <EmptyState
                title="Nothing to analyze yet"
                action={
                  <Button as={Link} to="/internships">
                    Browse internships
                  </Button>
                }
              >
                Apply to a few roles and move cards across the Tracker as you hear back. The charts build from that.
              </EmptyState>
            ) : (
              <p className="db-none">No applications in this period. Try a longer range.</p>
            )
          ) : (
            <div className={`db-body ${loading ? "is-loading" : ""}`}>
              <Kpis data={data} />
              <div className="db-grid">
                <Funnel data={data} tip={tip} />
                <Status data={data} tip={tip} />
                <OverTime data={data} tip={tip} />
                <Breakdown data={data} tip={tip} />
              </div>
            </div>
          )}
          {node}
        </div>
      )}
    </div>
  );
}

export default Analytics;
