import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import "dotenv/config";
import { extractFacts } from "./scrapers/facts.js";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

// Resume files are stored as BLOBs; XAMPP's default 1MB packet size is too small.
// This lasts until MySQL restarts - see README for the permanent my.cnf setting.
try {
  await conn.query("SET GLOBAL max_allowed_packet = 16777216");
} catch (err) {
  console.warn("Couldn't raise max_allowed_packet:", err.message);
}

await conn.query(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
// Databases created before roles / posted_by existed: CREATE IF NOT EXISTS won't add them.
const db = "internship_tracker";
const [[roleCol]] = await conn.query(`SHOW COLUMNS FROM ${db}.users LIKE 'role'`).then(([r]) => [r]);
if (!roleCol) {
  await conn.query(`ALTER TABLE ${db}.users ADD COLUMN role ENUM('student','poster') NOT NULL DEFAULT 'student' AFTER password_hash`);
  console.log("Added users.role column.");
} else if (/admin|coordinator/.test(roleCol.Type)) {
  // Collapse the old coordinator/admin roles into "poster".
  await conn.query(`ALTER TABLE ${db}.users MODIFY role ENUM('student','poster','coordinator','admin') NOT NULL DEFAULT 'student'`);
  await conn.query(`UPDATE ${db}.users SET role = 'poster' WHERE role IN ('coordinator','admin')`);
  await conn.query(`ALTER TABLE ${db}.users MODIFY role ENUM('student','poster') NOT NULL DEFAULT 'student'`);
  console.log("Migrated roles to student/poster.");
}
// Older internships tables predate the scraper/poster columns.
const [existing] = await conn.query(`SHOW COLUMNS FROM ${db}.internships`);
const have = new Set(existing.map((c) => c.Field));
const wanted = {
  source: "VARCHAR(30) NOT NULL DEFAULT 'seed'",
  external_id: "VARCHAR(190) NULL",
  url: "VARCHAR(500) NULL",
  description: "TEXT NULL",
  posted_at: "DATETIME NULL",
  scraped_at: "TIMESTAMP NULL",
  is_active: "TINYINT(1) NOT NULL DEFAULT 1",
  posted_by: "INT NULL",
};
for (const [name, def] of Object.entries(wanted)) {
  if (!have.has(name)) {
    await conn.query(`ALTER TABLE ${db}.internships ADD COLUMN ${name} ${def}`);
    console.log(`Added internships.${name}`);
  }
}
// Applications remember which resume version was sent with them.
const [appCols] = await conn.query(`SHOW COLUMNS FROM ${db}.applications LIKE 'resume_id'`);
if (!appCols.length) {
  await conn.query(`ALTER TABLE ${db}.applications ADD COLUMN resume_id INT NULL`);
  await conn.query(
    `ALTER TABLE ${db}.applications ADD CONSTRAINT fk_applications_resume
     FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL`,
  );
  console.log("Added applications.resume_id");
}
// The file name is copied onto the application so the record survives the resume being deleted or pruned.
const [nameCols] = await conn.query(`SHOW COLUMNS FROM ${db}.applications LIKE 'resume_file_name'`);
if (!nameCols.length) {
  await conn.query(`ALTER TABLE ${db}.applications ADD COLUMN resume_file_name VARCHAR(255) NULL`);
  await conn.query(
    `UPDATE ${db}.applications a JOIN ${db}.resumes r ON r.id = a.resume_id SET a.resume_file_name = r.file_name`,
  );
  console.log("Added applications.resume_file_name");
}
// Applications can carry a cover letter.
const [coverCols] = await conn.query(`SHOW COLUMNS FROM ${db}.applications LIKE 'cover_letter'`);
if (!coverCols.length) {
  await conn.query(`ALTER TABLE ${db}.applications ADD COLUMN cover_letter MEDIUMTEXT NULL`);
  console.log("Added applications.cover_letter");
}
// Resumes and cover letters share one table; applications can point at an uploaded letter.
const [kindCols] = await conn.query(`SHOW COLUMNS FROM ${db}.resumes LIKE 'kind'`);
if (!kindCols.length) {
  await conn.query(`ALTER TABLE ${db}.resumes ADD COLUMN kind ENUM('resume','cover_letter') NOT NULL DEFAULT 'resume'`);
  console.log("Added resumes.kind");
}
const [letterIdCols] = await conn.query(`SHOW COLUMNS FROM ${db}.applications LIKE 'cover_letter_id'`);
if (!letterIdCols.length) {
  await conn.query(`ALTER TABLE ${db}.applications ADD COLUMN cover_letter_id INT NULL`);
  await conn.query(
    `ALTER TABLE ${db}.applications ADD CONSTRAINT fk_applications_cover_letter
     FOREIGN KEY (cover_letter_id) REFERENCES resumes(id) ON DELETE SET NULL`,
  );
  console.log("Added applications.cover_letter_id");
}
// Older applications tables only know Applied / Interview / Offer.
const [[statusCol]] = await conn.query(`SHOW COLUMNS FROM ${db}.applications LIKE 'status'`).then(([r]) => [r]);
if (statusCol && !/'OA'/.test(statusCol.Type)) {
  await conn.query(
    `ALTER TABLE ${db}.applications MODIFY status
     ENUM('Applied','OA','Interview','Offer','Rejected') NOT NULL DEFAULT 'Applied'`,
  );
  console.log("Added OA and Rejected stages.");
}
// Filters, deadlines and eligibility on postings; reminders on applications; richer profiles.
async function addColumns(table, wanted) {
  const [cols] = await conn.query(`SHOW COLUMNS FROM ${db}.${table}`);
  const have = new Set(cols.map((c) => c.Field));
  for (const [name, def] of Object.entries(wanted)) {
    if (!have.has(name)) {
      await conn.query(`ALTER TABLE ${db}.${table} ADD COLUMN ${name} ${def}`);
      console.log(`Added ${table}.${name}`);
    }
  }
}
await addColumns("internships", {
  work_mode: "ENUM('onsite','remote','hybrid') NOT NULL DEFAULT 'onsite'",
  stipend_min: "INT NULL",
  stipend_max: "INT NULL",
  duration_months: "TINYINT NULL",
  deadline: "DATE NULL",
  min_cgpa: "DECIMAL(4,2) NULL",
  batch_year: "SMALLINT NULL",
  branches: "VARCHAR(255) NULL",
});
await addColumns("applications", { deadline: "DATE NULL", remind_on: "DATE NULL" });
await addColumns("profiles", {
  branch: "VARCHAR(100) NOT NULL DEFAULT ''",
  grad_year: "SMALLINT NULL",
  cgpa: "DECIMAL(4,2) NULL",
  phone: "VARCHAR(30) NOT NULL DEFAULT ''",
  github: "VARCHAR(200) NOT NULL DEFAULT ''",
  linkedin: "VARCHAR(200) NOT NULL DEFAULT ''",
  portfolio: "VARCHAR(200) NOT NULL DEFAULT ''",
  preferred_locations: "VARCHAR(300) NOT NULL DEFAULT ''",
});
// Listings scraped before work_mode existed: infer it from the location text.
await conn.query(`UPDATE ${db}.internships SET work_mode = 'hybrid' WHERE work_mode = 'onsite' AND location REGEXP 'hybrid'`);
await conn.query(`UPDATE ${db}.internships SET work_mode = 'remote' WHERE work_mode = 'onsite' AND location REGEXP 'remote|anywhere|work from home|wfh'`);
// Same for pay and duration, which Internshala listings carry in the description.
const [legacy] = await conn.query(
  `SELECT id, source, location, description FROM ${db}.internships
   WHERE source = 'internshala' AND stipend_max IS NULL AND duration_months IS NULL`,
);
for (const row of legacy) {
  const f = extractFacts(row);
  await conn.query(`UPDATE ${db}.internships SET stipend_min = ?, stipend_max = ?, duration_months = ? WHERE id = ?`, [
    f.stipend_min, f.stipend_max, f.duration_months, row.id,
  ]);
}
if (legacy.length) console.log(`Filled pay/duration for ${legacy.length} listings.`);
// Semester used to be free text ("5th", "Sem 5"); it is a 1-10 choice now.
await conn.query(`UPDATE ${db}.profiles SET semester = REGEXP_SUBSTR(semester, '[0-9]+') WHERE semester REGEXP '[0-9]' AND semester NOT REGEXP '^[0-9]+$'`);
// Posted internships have no coordinates, so lat/lon must allow NULL.
await conn.query(`ALTER TABLE ${db}.internships MODIFY lat DOUBLE NULL, MODIFY lon DOUBLE NULL`);
console.log("Database ready.");
await conn.end();
