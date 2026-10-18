// Pure analytics over a student's applications. No database access here, so it can be
// tested with plain objects.

export const STAGES = ["Applied", "OA", "Interview", "Offer"]; // the funnel, in order
const RANK = { Applied: 0, OA: 1, Interview: 2, Offer: 3 };
const DAY = 24 * 60 * 60 * 1000;
export const SMALL_SAMPLE = 5; // groups smaller than this are flagged, not compared

const toDate = (v) => (v instanceof Date ? v : new Date(v));

/**
 * How far did an application get? Rejected cards keep the furthest stage their
 * history proves (their current status says nothing about it).
 */
function furthestRank(app, events) {
  let best = app.status in RANK ? RANK[app.status] : 0;
  for (const e of events) if (e.status in RANK) best = Math.max(best, RANK[e.status]);
  return best;
}

/** Time of the first move away from Applied, if we recorded one. */
function firstResponseAt(events) {
  const moves = events.filter((e) => e.status !== "Applied").map((e) => toDate(e.at));
  return moves.length ? new Date(Math.min(...moves)) : null;
}

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

function startOfWeek(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // Monday
  return x;
}
const startOfMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

function buckets(apps, kind, now, length) {
  const step = (d, i) =>
    kind === "week"
      ? new Date(d.getTime() - i * 7 * DAY)
      : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
  const start = kind === "week" ? startOfWeek(now) : startOfMonth(now);
  const out = [];
  for (let i = length - 1; i >= 0; i--) out.push({ start: step(start, i), count: 0 });
  for (const a of apps) {
    const key = (kind === "week" ? startOfWeek(toDate(a.created_at)) : startOfMonth(toDate(a.created_at))).getTime();
    const slot = out.find((b) => b.start.getTime() === key);
    if (slot) slot.count++;
  }
  return out.map((b) => ({ start: b.start.toISOString().slice(0, 10), count: b.count }));
}

function groupBy(infos, keyOf, labelOf) {
  const groups = new Map();
  for (const info of infos) {
    const key = keyOf(info.app);
    if (!groups.has(key)) groups.set(key, { key, label: labelOf(info.app), infos: [] });
    groups.get(key).infos.push(info);
  }
  return [...groups.values()]
    .map(({ key, label, infos: list }) => {
      const applied = list.length;
      const responded = list.filter((i) => i.responded).length;
      const interviews = list.filter((i) => i.rank >= RANK.Interview).length;
      const offers = list.filter((i) => i.rank >= RANK.Offer).length;
      return {
        key,
        label,
        applied,
        responded,
        interviews,
        offers,
        responseRate: pct(responded, applied),
        interviewRate: pct(interviews, applied),
        small: applied < SMALL_SAMPLE,
      };
    })
    .sort((a, b) => b.applied - a.applied || a.label.localeCompare(b.label));
}

const SOURCE_LABELS = { seed: "Sample listings", manual: "Posted on Campus2Career" };
const sourceLabel = (a) =>
  a.source == null
    ? "Added by hand"
    : (SOURCE_LABELS[a.source] ?? a.source.charAt(0).toUpperCase() + a.source.slice(1));

/**
 * @param apps   [{ id, status, created_at, source, resume_id, resume_name }]
 * @param events [{ application_id, status, at }]
 */
export function computeAnalytics(apps, events, now = new Date()) {
  const byApp = new Map();
  for (const e of events) {
    if (!byApp.has(e.application_id)) byApp.set(e.application_id, []);
    byApp.get(e.application_id).push(e);
  }

  const infos = apps.map((app) => {
    const evs = byApp.get(app.id) ?? [];
    const rank = furthestRank(app, evs);
    const responseAt = firstResponseAt(evs);
    return {
      app,
      rank,
      // Hearing back, even a rejection, counts as a response.
      responded: app.status !== "Applied" || responseAt !== null,
      responseDays: responseAt ? Math.max(0, (responseAt - toDate(app.created_at)) / DAY) : null,
    };
  });

  const total = apps.length;
  const funnel = STAGES.map((stage) => {
    const count = infos.filter((i) => i.rank >= RANK[stage]).length;
    return { stage, count, pctOfApplied: pct(count, total) };
  });

  const responded = infos.filter((i) => i.responded).length;
  const days = infos.map((i) => i.responseDays).filter((d) => d !== null).sort((a, b) => a - b);
  const mid = Math.floor(days.length / 2);
  const round1 = (n) => Math.round(n * 10) / 10;

  return {
    total,
    funnel,
    rejected: apps.filter((a) => a.status === "Rejected").length,
    response: {
      responded,
      rate: pct(responded, total),
      avgDays: days.length ? round1(days.reduce((s, d) => s + d, 0) / days.length) : null,
      medianDays: days.length ? round1(days.length % 2 ? days[mid] : (days[mid - 1] + days[mid]) / 2) : null,
      timedCount: days.length, // how many responses we have a timestamp for
    },
    perWeek: buckets(apps, "week", now, 12),
    perMonth: buckets(apps, "month", now, 12),
    bySource: groupBy(infos, (a) => a.source ?? "", sourceLabel),
    byResume: groupBy(infos, (a) => a.resume_id ?? "", (a) => a.resume_name ?? "No resume attached"),
  };
}
