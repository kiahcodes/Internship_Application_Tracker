import { fileURLToPath } from "node:url";
import { pool } from "../db.js";
import { SOURCES } from "./sources.js";
import { coordsFor, isIndia, isRemote } from "./geo.js";
import { extractFacts } from "./facts.js";

export async function runScrape() {
  const runStart = new Date();
  let saved = 0;
  let failed = 0;
  for (const [name, fetchJobs] of SOURCES) {
    try {
      const jobs = (await fetchJobs()).filter((j) => j.source === "internshala" || isIndia(j.location) || isRemote(j.location));
      for (const j of jobs) {
        const [lat, lon] = coordsFor(j.location);
        const facts = extractFacts(j);
        const posted = j.posted_at ? new Date(j.posted_at) : null;
        await pool.query(
          `INSERT INTO internships
             (company, role, location, lat, lon, source, external_id, url, description, posted_at, scraped_at, is_active,
              work_mode, stipend_min, stipend_max, duration_months)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), TRUE, ?, ?, ?, ?)
           ON CONFLICT (source, external_id) DO UPDATE SET company = EXCLUDED.company, role = EXCLUDED.role,
             location = EXCLUDED.location, lat = EXCLUDED.lat, lon = EXCLUDED.lon, url = EXCLUDED.url,
             description = EXCLUDED.description, posted_at = EXCLUDED.posted_at,
             scraped_at = NOW(), is_active = TRUE, work_mode = EXCLUDED.work_mode,
             stipend_min = EXCLUDED.stipend_min, stipend_max = EXCLUDED.stipend_max,
             duration_months = EXCLUDED.duration_months`,
          [j.company.slice(0, 100), j.role.slice(0, 150), j.location.slice(0, 100), lat, lon,
           j.source, j.external_id, j.url, j.description, posted && !isNaN(posted) ? posted : null,
           facts.work_mode, facts.stipend_min, facts.stipend_max, facts.duration_months],
        );
      }
      saved += jobs.length;
      console.log(`${name}: ${jobs.length} matching listings`);
    } catch (err) {
      failed++;
      console.warn(`${name} failed: ${err.message}`);
    }
  }

  if (saved > 0 && failed === 0) {
    // Only when every source succeeded: unseen listings have been taken down.
    const [r] = await pool.query(
      "UPDATE internships SET is_active = FALSE WHERE source <> 'seed' AND (scraped_at IS NULL OR scraped_at < ?)",
      [runStart],
    );
    console.log(`Deactivated ${r.affectedRows} stale listings.`);
  }
  if (saved > 0) await pool.query("UPDATE internships SET is_active = FALSE WHERE source = 'seed'");
  console.log(`Done. ${saved} listings saved.`);
  return { saved, failed };
}

// Only when executed directly (`npm run scrape`), not when imported by the scheduler.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runScrape();
  await pool.end();
}
