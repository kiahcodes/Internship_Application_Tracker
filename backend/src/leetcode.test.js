import test from "node:test";
import assert from "node:assert/strict";
import { companyProblems, parseCsv, parseProblems, slugify } from "./leetcode.js";

const CSV = `ID,URL,Title,Difficulty,Acceptance %,Frequency %
1,https://leetcode.com/problems/two-sum,Two Sum,Easy,57.8%,75.0%
3,https://leetcode.com/problems/lru-cache,"LRU Cache, Design",Medium,40.1%,100.0%
9,http://evil.example/x,Not LeetCode,Easy,1%,99%
`;

test("slugify matches the repo's folder names", () => {
  assert.equal(slugify("Amazon"), "amazon");
  assert.equal(slugify("Goldman Sachs"), "goldman-sachs");
  assert.equal(slugify("  Bank of America! "), "bank-of-america");
  assert.equal(slugify("AT&T"), "at-and-t");
  assert.equal(slugify("???"), "");
});

test("parseCsv handles quoted commas, escaped quotes and CRLF", () => {
  assert.deepEqual(parseCsv('a,"b,c","d ""e"""\r\n1,2,3\r\n'), [["a", "b,c", 'd "e"'], ["1", "2", "3"]]);
});

test("parseProblems sorts by frequency and drops non-LeetCode links", () => {
  const p = parseProblems(CSV);
  assert.deepEqual(p.map((x) => x.title), ["LRU Cache, Design", "Two Sum"]);
  assert.equal(p[1].frequency, 75);
  assert.equal(p[1].acceptance, 57.8);
});

test("companyProblems returns null for a missing company, caches hits, and rejects bad windows", async () => {
  let calls = 0;
  const fake = async (url) => {
    calls++;
    return url.includes("/acme/") ? { status: 404, ok: false } : { status: 200, ok: true, text: async () => CSV };
  };
  assert.equal(await companyProblems("Acme", "all", fake), null);
  assert.equal((await companyProblems("Cachetest Co", "all", fake)).length, 2);
  await companyProblems("Cachetest Co", "all", fake);
  assert.equal(calls, 2);
  assert.equal(await companyProblems("Amazon", "../x", fake), null);
});
