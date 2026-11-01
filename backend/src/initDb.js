import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { pool } from "./db.js";

await pool.query(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
console.log("Tables ready.");

// Create the private bucket that holds resumes and cover letters (no-op if it exists).
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const bucket = process.env.SUPABASE_BUCKET || "resumes";
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: 4 * 1024 * 1024 });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`Storage bucket "${bucket}" ready.`);
} else {
  console.warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set - create the storage bucket by hand.");
}
await pool.end();
