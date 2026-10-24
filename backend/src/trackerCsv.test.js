import test from "node:test";
import assert from "node:assert/strict";
import { normalizeImport, normalizeStatus, parseCsv, parseDate, toCsv } from "./trackerCsv.js";

test("parseCsv handles quotes, embedded commas, CRLF and a BOM", () => {
  const rows = parseCsv('﻿Title,Notes\r\n"Dev, Intern – Zoho","said ""soon"""\r\nB,C\r\n');
  assert.deepEqual(rows, [["Title", "Notes"], ["Dev, Intern – Zoho", 'said "soon"'], ["B", "C"]]);
});

test("parseCsv detects semicolon-separated files", () => {
  assert.deepEqual(parseCsv("Company;Status\nZoho;Applied"), [["Company", "Status"], ["Zoho", "Applied"]]);
});

test("toCsv round-trips and neutralises spreadsheet formulas", () => {
  const csv = toCsv(["Title", "Status"], [["=HYPERLINK(\"x\")", "Applied"], ["A, B", "OA"]], [0]);
  const back = parseCsv(csv);
  assert.equal(back[1][0], "'=HYPERLINK(\"x\")");
  assert.equal(back[2][0], "A, B");
});

test("statuses map from the words people use", () => {
  assert.equal(normalizeStatus("Online Assessment").status, "OA");
  assert.equal(normalizeStatus("HR round").status, "Interview");
  assert.equal(normalizeStatus("Not selected").status, "Rejected");
  assert.equal(normalizeStatus("Selected").status, "Offer");
  assert.equal(normalizeStatus("").status, "Applied");
  assert.equal(normalizeStatus("???").unknown, true);
});

test("dates read day-first, ISO and month names; junk is flagged", () => {
  assert.equal(parseDate("04/11/2025"), "2025-11-04");
  assert.equal(parseDate("2025-11-04"), "2025-11-04");
  assert.equal(parseDate("4 Nov 2025"), "2025-11-04");
  assert.equal(parseDate("31/02/2025"), undefined);
  assert.equal(parseDate(""), null);
});

test("normalizeImport builds titles, skips empties and duplicates, and reports what it changed", () => {
  const out = normalizeImport(
    "Company,Role,Stage,Applied on,Deadline\nZoho,Backend Intern,Interview,01/10/2025,\nZoho,Backend Intern,Offer,,\n,,Applied,,\nAcme,Dev,Hmm,soon,32/13/2025\n",
  );
  assert.equal(out.rows.length, 2);
  assert.equal(out.rows[0].title, "Backend Intern – Zoho");
  assert.equal(out.rows[0].status, "Interview");
  assert.equal(out.rows[0].applied_on, "2025-10-01");
  assert.equal(out.skipped.length, 2);
  assert.equal(out.warnings.length, 3); // unknown status, two bad dates
  assert.equal(out.rows[1].status, "Applied");
});

test("normalizeImport explains a file it cannot use", () => {
  assert.match(normalizeImport("Foo,Bar\n1,2").error, /Couldn't find/);
  assert.match(normalizeImport("").error, /no rows/);
});
