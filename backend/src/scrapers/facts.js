import { isRemote } from "./geo.js";

const num = (s) => Number(String(s).replace(/,/g, ""));

/**
 * Structured facts a listing states in plain text: how it is worked, what it pays, how long it runs.
 * Pay and duration are only read from Internshala, whose cards put them in a fixed
 * "₹ 12,000 - 15,000 /month · 6 Months" shape; other boards' prose is too loose to trust.
 * Anything not stated stays null, so filters treat it as unknown rather than guessing.
 */
export function extractFacts({ source, location = "", description = "" }) {
  const work_mode = /hybrid/i.test(location) ? "hybrid" : isRemote(location) ? "remote" : "onsite";
  const facts = { work_mode, stipend_min: null, stipend_max: null, duration_months: null };
  if (source !== "internshala") return facts;

  if (/\bunpaid\b/i.test(description)) {
    facts.stipend_min = facts.stipend_max = 0;
  } else {
    const pay = description.match(/₹\s*([\d,]+)(?:\s*-\s*([\d,]+))?\s*\/\s*month/i);
    if (pay) {
      facts.stipend_min = num(pay[1]);
      facts.stipend_max = pay[2] ? num(pay[2]) : facts.stipend_min;
    }
  }
  const months = description.match(/(\d+)\s*months?\b/i);
  const weeks = description.match(/(\d+)\s*weeks?\b/i);
  if (months) facts.duration_months = Number(months[1]);
  else if (weeks) facts.duration_months = Math.max(1, Math.round(Number(weeks[1]) / 4.345));
  return facts;
}
