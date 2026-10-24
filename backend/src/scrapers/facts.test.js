import test from "node:test";
import assert from "node:assert/strict";
import { extractFacts } from "./facts.js";

test("reads a stipend range and duration from an Internshala card", () => {
  const f = extractFacts({ source: "internshala", location: "Pune", description: "₹ 12,000 - 15,000 /month · 6 Months" });
  assert.deepEqual(f, { work_mode: "onsite", stipend_min: 12000, stipend_max: 15000, duration_months: 6 });
});

test("a single stipend figure is both ends of the range", () => {
  const f = extractFacts({ source: "internshala", location: "Work From Home", description: "₹ 5,000 /month · 2 Months" });
  assert.equal(f.work_mode, "remote");
  assert.equal(f.stipend_min, 5000);
  assert.equal(f.stipend_max, 5000);
});

test("unpaid is zero, not unknown", () => {
  const f = extractFacts({ source: "internshala", location: "Delhi", description: "Unpaid · 1 Month" });
  assert.equal(f.stipend_max, 0);
  assert.equal(f.duration_months, 1);
});

test("weeks round to months; performance-based pay stays unknown", () => {
  const f = extractFacts({ source: "internshala", location: "Delhi", description: "Performance based · 8 Weeks" });
  assert.equal(f.duration_months, 2);
  assert.equal(f.stipend_min, null);
});

test("other boards only get a work mode", () => {
  const f = extractFacts({ source: "greenhouse", location: "Hybrid - Bengaluru", description: "Paid 3 months internship" });
  assert.deepEqual(f, { work_mode: "hybrid", stipend_min: null, stipend_max: null, duration_months: null });
});
