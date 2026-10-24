export const NO_FILTERS = { mode: "", pay: "", minStipend: "", duration: "", batch: "", cgpa: "", branch: "" };

// Duration presets -> the month range sent to the server.
const DURATIONS = {
  short: { minMonths: "", maxMonths: "2" },
  mid: { minMonths: "3", maxMonths: "5" },
  long: { minMonths: "6", maxMonths: "" },
};

/** Turns the filter form's values into API query parameters (empty ones are left out). */
export function filtersToParams(f) {
  const range = DURATIONS[f.duration] ?? {};
  const params = {
    mode: f.mode, pay: f.pay, minStipend: f.minStipend, batch: f.batch, cgpa: f.cgpa, branch: f.branch,
    minMonths: range.minMonths, maxMonths: range.maxMonths,
  };
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined));
}

export const activeFilterCount = (f) => Object.values(f).filter(Boolean).length;
