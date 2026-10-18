import test from "node:test";
import assert from "node:assert/strict";
import { computeAnalytics } from "./analytics.js";

const NOW = new Date("2026-10-18T12:00:00Z");
const app = (id, status, created, extra = {}) => ({
  id, status, created_at: created, source: null, resume_id: null, resume_name: null, ...extra,
});

test("empty input gives zeros and null rates", () => {
  const r = computeAnalytics([], [], NOW);
  assert.equal(r.total, 0);
  assert.equal(r.response.rate, null);
  assert.equal(r.response.avgDays, null);
  assert.equal(r.funnel[0].pctOfApplied, null);
  assert.equal(r.perWeek.length, 12);
});

test("funnel counts how far each application got, and skipping OA still counts as past it", () => {
  const apps = [
    app(1, "Applied", "2026-10-01"),
    app(2, "OA", "2026-10-01"),
    app(3, "Interview", "2026-10-01"), // skipped the OA
    app(4, "Offer", "2026-10-01"),
  ];
  const f = Object.fromEntries(computeAnalytics(apps, [], NOW).funnel.map((x) => [x.stage, x.count]));
  assert.deepEqual(f, { Applied: 4, OA: 3, Interview: 2, Offer: 1 });
});

test("a rejected card keeps the furthest stage its history shows", () => {
  const apps = [app(1, "Rejected", "2026-10-01"), app(2, "Rejected", "2026-10-01")];
  const events = [
    { application_id: 1, status: "Interview", at: "2026-10-05" },
    { application_id: 1, status: "Rejected", at: "2026-10-09" },
  ];
  const r = computeAnalytics(apps, events, NOW);
  assert.equal(r.funnel.find((x) => x.stage === "Interview").count, 1);
  assert.equal(r.rejected, 2);
  assert.equal(r.response.rate, 100); // a rejection is still a response
});

test("response rate and time to first response", () => {
  const apps = [app(1, "Interview", "2026-10-01"), app(2, "Applied", "2026-10-01"), app(3, "Offer", "2026-10-01")];
  const events = [
    { application_id: 1, status: "OA", at: "2026-10-05T00:00:00Z" }, // 4 days
    { application_id: 1, status: "Interview", at: "2026-10-10T00:00:00Z" },
    { application_id: 3, status: "Interview", at: "2026-10-07T00:00:00Z" }, // 6 days
  ];
  const r = computeAnalytics(apps, events, NOW);
  assert.equal(r.response.rate, 66.7);
  assert.equal(r.response.avgDays, 5);
  assert.equal(r.response.medianDays, 5);
  assert.equal(r.response.timedCount, 2);
});

test("responses without a recorded time count in the rate but not the average", () => {
  const r = computeAnalytics([app(1, "Interview", "2026-10-01")], [], NOW);
  assert.equal(r.response.rate, 100);
  assert.equal(r.response.avgDays, null);
});

test("weekly buckets start on Monday and ignore anything older than 12 weeks", () => {
  const apps = [app(1, "Applied", "2026-10-18T10:00:00Z"), app(2, "Applied", "2026-10-12T00:00:00Z"), app(3, "Applied", "2025-01-01")];
  const last = computeAnalytics(apps, [], NOW).perWeek.at(-1);
  assert.equal(last.start, "2026-10-12"); // Sunday the 18th belongs to the week of Monday the 12th
  assert.equal(last.count, 2);
});

test("breakdown by resume compares response rates and flags small samples", () => {
  const apps = [
    app(1, "Interview", "2026-10-01", { resume_id: 7, resume_name: "v2.pdf" }),
    app(2, "Applied", "2026-10-01", { resume_id: 7, resume_name: "v2.pdf" }),
    app(3, "Applied", "2026-10-01"),
  ];
  const [v2, none] = computeAnalytics(apps, [], NOW).byResume;
  assert.equal(v2.label, "v2.pdf");
  assert.equal(v2.responseRate, 50);
  assert.equal(v2.interviewRate, 50);
  assert.equal(v2.small, true);
  assert.equal(none.label, "No resume attached");
});

test("source labels", () => {
  const apps = [app(1, "Applied", "2026-10-01", { source: "internshala" }), app(2, "Applied", "2026-10-01"), app(3, "Applied", "2026-10-01", { source: "manual" })];
  const labels = computeAnalytics(apps, [], NOW).bySource.map((g) => g.label).sort();
  assert.deepEqual(labels, ["Added by hand", "Internshala", "Posted on Campus2Career"]);
});
