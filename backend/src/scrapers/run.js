import { fileURLToPath } from "node:url";
import { pool } from "../db.js";
import { SOURCES } from "./sources.js";
import { coordsFor, isIndia, isRemote } from "./geo.js";

// Idempotent migration so an existing DB gets the scraper columns.
async function ensureSchema() {
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'internships'",
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  const add = (name, ddl) => have.has(name) ? null : pool.query(`ALTER TABLE internships ADD COLUMN ${name} ${ddl}`);
  await add("source", "VARCHAR(30) NOT NULL DEFAULT 'seed'");
  await add("external_id", "VARCHAR(190) NULL");
  await add("url", "VARCHAR(500) NULL");
  await add("description", "TEXT NULL");
  await add("posted_at", "DATETIME NULL");
  await add("scraped_at", "TIMESTAMP NULL");
  await add("is_active", "TINYINT(1) NOT NULL DEFAULT 1");
  // The unique key is what stops re-runs from inserting the same listing again.
  // Check for the key itself (not the column): the column may already exist without it.
  const [idx] = await pool.query("SHOW INDEX FROM internships WHERE Key_name = 'uq_source_ext'");
  if (idx.length === 0) {
    // Collapse existing duplicates first, keeping the oldest row of each listing.
    const keepers = `(SELECT source, external_id, MIN(id) AS keep_id FROM internships
                      WHERE external_id IS NOT NULL GROUP BY source, external_id) k`;
    // Re-point tracked applications at the surviving row so none are orphaned.
    await pool.query(
      `UPDATE IGNORE applications a
         JOIN internships i ON a.internship_id = i.id
         JOIN ${keepers} ON k.source = i.source AND k.external_id = i.external_id
       SET a.internship_id = k.keep_id WHERE i.id <> k.keep_id`,
    );
    const [del] = await pool.query(
      `DELETE i FROM internships i
         JOIN ${keepers} ON k.source = i.source AND k.external_id = i.external_id
       WHERE i.id <> k.keep_id`,
    );
    console.log(`Removed ${del.affectedRows} duplicate listings.`);
    await pool.query("ALTER TABLE internships ADD UNIQUE KEY uq_source_ext (source, external_id)");
  }
  await pool.query("ALTER TABLE internships MODIFY lat DOUBLE NULL, MODIFY lon DOUBLE NULL");
}

export async function runScrape() {
  await ensureSchema();

  const runStart = new Date();
  let saved = 0;
  let failed = 0;
  for (const [name, fetchJobs] of SOURCES) {
    try {
      const jobs = (await fetchJobs()).filter((j) => j.source === "internshala" || isIndia(j.location) || isRemote(j.location));
      for (const j of jobs) {
        const [lat, lon] = coordsFor(j.location);
        const posted = j.posted_at ? new Date(j.posted_at) : null;
        await pool.query(
          `INSERT INTO internships
             (company, role, location, lat, lon, source, external_id, url, description, posted_at, scraped_at, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
           ON DUPLICATE KEY UPDATE company = VALUES(company), role = VALUES(role),
             location = VALUES(location), lat = VALUES(lat), lon = VALUES(lon), url = VALUES(url),
             description = VALUES(description), posted_at = VALUES(posted_at),
             scraped_at = NOW(), is_active = 1`,
          [j.company.slice(0, 100), j.role.slice(0, 150), j.location.slice(0, 100), lat, lon,
           j.source, j.external_id, j.url, j.description, posted && !isNaN(posted) ? posted : null],
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
      "UPDATE internships SET is_active = 0 WHERE source <> 'seed' AND (scraped_at IS NULL OR scraped_at < ?)",
      [runStart],
    );
    console.log(`Deactivated ${r.affectedRows} stale listings.`);
  }
  if (saved > 0) await pool.query("UPDATE internships SET is_active = 0 WHERE source = 'seed'");
  console.log(`Done. ${saved} listings saved.`);
  return { saved, failed };
}

// Only when executed directly (`npm run scrape`), not when imported by the scheduler.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runScrape();
  await pool.end();
}
