import test from "node:test";
import assert from "node:assert/strict";
import { cleanProfile } from "./profile.js";

test("accepts a full, valid profile and tidies links", () => {
  const { values, error } = cleanProfile({
    course: "B.Tech / B.E.", semester: "5", branch: "Computer Science", grad_year: "2027", cgpa: "8.456",
    phone: "+91 98765 43210", github: "github.com/kiah", linkedin: "https://linkedin.com/in/kiah", portfolio: "",
  });
  assert.equal(error, undefined);
  assert.equal(values.github, "https://github.com/kiah");
  assert.equal(values.cgpa, 8.46);
  assert.equal(values.grad_year, 2027);
});

test("the extra profile links are tidied and validated too", () => {
  const { values } = cleanProfile({ leetcode: "leetcode.com/u/kiah", orcid: "orcid.org/0000-0002-1825-0097", codeforces: "codeforces.com/profile/kiah" });
  assert.equal(values.leetcode, "https://leetcode.com/u/kiah");
  assert.equal(values.orcid, "https://orcid.org/0000-0002-1825-0097");
  assert.equal(cleanProfile({ google_scholar: "nope" }).error, "Google Scholar doesn't look like a link");
});

test("rejects values outside the choices and ranges", () => {
  assert.match(cleanProfile({ course: "Full Stack Development" }).error, /course/);
  assert.match(cleanProfile({ semester: "11" }).error, /semester/);
  assert.match(cleanProfile({ cgpa: "11" }).error, /CGPA/);
  assert.match(cleanProfile({ grad_year: "27" }).error, /year/);
  assert.match(cleanProfile({ phone: "abc" }).error, /phone/);
  assert.match(cleanProfile({ github: "not a link" }).error, /GitHub/);
});

test("a stored legacy value can be kept so other edits still save", () => {
  const out = cleanProfile({ course: "Full Stack Development", semester: "5th" }, { course: "Full Stack Development", semester: "5th" });
  assert.equal(out.error, undefined);
  assert.equal(out.values.course, "Full Stack Development");
});
