import test from "node:test";
import assert from "node:assert/strict";
import { buildFilters, internshipFields, parseListQuery } from "./internships.js";

test("query strings are clamped and unknown values dropped", () => {
  const f = parseListQuery({ page: "0", pageSize: "500", mode: "remote,moon", pay: "maybe", cgpa: "11", batch: "2027", sort: "random" });
  assert.equal(f.page, 1);
  assert.equal(f.pageSize, 12); // out of range falls back to the default
  assert.deepEqual(f.modes, ["remote"]);
  assert.equal(f.pay, null);
  assert.equal(f.cgpa, null);
  assert.equal(f.batch, 2027);
  assert.equal(f.sort, "newest");
});

test("eligibility treats 'no rule' as open to everyone, stipend does not", () => {
  const { where } = buildFilters(parseListQuery({ cgpa: "7.5", batch: "2027", branch: "Civil", minStipend: "10000" }));
  const sql = where.join(" AND ");
  assert.match(sql, /i\.min_cgpa IS NULL OR i\.min_cgpa <= \?/);
  assert.match(sql, /i\.batch_year IS NULL OR i\.batch_year = \?/);
  assert.match(sql, /FIND_IN_SET/);
  assert.match(sql, /COALESCE\(i\.stipend_max, i\.stipend_min\) >= \?/);
});

test("search text is escaped so % and _ are literal", () => {
  const { params } = buildFilters(parseListQuery({ q: "100%_" }));
  assert.equal(params[0], "%100\\%\\_%");
});

test("expired postings are hidden unless the student tracks them", () => {
  assert.match(buildFilters(parseListQuery({})).where.join(" "), /deadline >= CURDATE\(\) OR a\.id IS NOT NULL/);
});

test("posting fields are validated and normalised", () => {
  assert.match(internshipFields({ company: "A", role: "B" }).error, /required/);
  assert.match(internshipFields({ company: "A", role: "B", location: "C", stipend_min: 5000, stipend_max: 1000 }).error, /Maximum/);
  assert.match(internshipFields({ company: "A", role: "B", location: "C", deadline: "tomorrow" }).error, /date/);
  const ok = internshipFields({ company: "A", role: "B", location: "C", stipend_min: "8000", branches: ["Civil", "Nope"], work_mode: "remote" });
  assert.equal(ok.stipend_max, 8000);
  assert.equal(ok.branches, "Civil");
  assert.equal(ok.work_mode, "remote");
});

test("Internshala's pay/duration line isn't repeated as a description", async () => {
  const { withoutFacts } = await import("./internships.js");
  assert.equal(withoutFacts("₹ 12,000 - 15,000 /month · 6 Months", "internshala"), "");
  assert.equal(withoutFacts("Performance based · 2 Months", "internshala"), "Performance based");
  assert.equal(withoutFacts("₹ 5 /month", "lever"), "₹ 5 /month");
});
