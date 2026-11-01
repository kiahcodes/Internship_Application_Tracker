import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Private bucket; only this server (using the service-role key) can read or write it.
const BUCKET = process.env.SUPABASE_BUCKET || "resumes";

const files = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }).storage.from(BUCKET);

export async function uploadFile(path, buffer, contentType) {
  const { error } = await files().upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function downloadFile(path) {
  const { data, error } = await files().download(path);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Best effort: a leftover file is harmless, so a failure here is logged rather than thrown. */
export async function removeFiles(paths) {
  if (!paths.length) return;
  const { error } = await files().remove(paths);
  if (error) console.error("Storage cleanup failed:", error.message);
}
