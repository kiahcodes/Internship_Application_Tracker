import { Button, Select } from "./ui.jsx";
import { BRANCHES, graduationYears } from "../utils/options.js";
import { activeFilterCount } from "../utils/filters.js";

export function InternshipFilters({ filters, onChange, onClear, profile }) {
  const count = activeFilterCount(filters);
  const set = (key) => (e) => onChange({ [key]: e.target.value });
  // Read the profile only once it exists: the click handler below would otherwise touch it while it is still loading.
  const fromProfile = profile && (profile.grad_year || profile.cgpa != null || profile.branch)
    ? {
        batch: profile.grad_year ? String(profile.grad_year) : "",
        cgpa: profile.cgpa != null ? String(profile.cgpa) : "",
        branch: profile.branch || "",
      }
    : null;

  return (
    <details className="filters rise" style={{ "--i": 2 }} open={count > 0 || undefined}>
      <summary className="filters-summary">
        Filters{count > 0 && <span className="filters-count" aria-label={`${count} active`}>{count}</span>}
      </summary>

      <div className="filters-body">
        <div className="filters-grid">
          <Select label="Where" id="f-mode" value={filters.mode} onChange={set("mode")} placeholder="Any"
            options={[{ value: "onsite", label: "On-site" }, { value: "remote", label: "Remote / work from home" }, { value: "hybrid", label: "Hybrid" }]} />
          <Select label="Pay" id="f-pay" value={filters.pay} onChange={set("pay")} placeholder="Any"
            options={[{ value: "paid", label: "Paid" }, { value: "unpaid", label: "Unpaid" }]} />
          <Select label="Stipend (per month)" id="f-stipend" value={filters.minStipend} onChange={set("minStipend")} placeholder="Any"
            options={[5000, 10000, 15000, 25000, 40000].map((n) => ({ value: String(n), label: `₹${n.toLocaleString("en-IN")} or more` }))} />
          <Select label="Duration" id="f-duration" value={filters.duration} onChange={set("duration")} placeholder="Any"
            options={[{ value: "short", label: "Up to 2 months" }, { value: "mid", label: "3 to 5 months" }, { value: "long", label: "6 months or more" }]} />
        </div>

        <fieldset className="filters-elig">
          <legend>Eligibility</legend>
          <p className="filters-note">
            Shows roles you can apply to, including ones that don't state any requirement.
          </p>
          <div className="filters-grid">
            <Select label="Batch (graduating in)" id="f-batch" value={filters.batch} onChange={set("batch")} placeholder="Any" options={graduationYears()} />
            <div className="field">
              <label className="field-label" htmlFor="f-cgpa">My CGPA</label>
              <input id="f-cgpa" className="field-input" type="number" inputMode="decimal" min="0" max="10" step="0.01"
                placeholder="e.g. 8.2" value={filters.cgpa} onChange={set("cgpa")} />
            </div>
            <Select label="Branch" id="f-branch" value={filters.branch} onChange={set("branch")} placeholder="Any" options={BRANCHES} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={!fromProfile}
            title={fromProfile ? undefined : "Add your batch, CGPA and branch in your profile first"}
            onClick={() => onChange(fromProfile)}
          >
            Use my profile
          </Button>
        </fieldset>

        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear all filters
          </Button>
        )}
      </div>
    </details>
  );
}
