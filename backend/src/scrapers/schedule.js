import cron from "node-cron";
import { runScrape } from "./run.js";

let running = false;

async function job() {
  // A run takes ~1 minute, but a slow network could outlast the interval.
  if (running) {
    console.log("[scraper] previous run still going, skipping");
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const { saved, failed } = await runScrape();
    console.log(`[scraper] finished in ${Math.round((Date.now() - started) / 1000)}s (${saved} saved, ${failed} sources failed)`);
  } catch (err) {
    console.error("[scraper] run crashed:", err.message);
  } finally {
    running = false;
  }
}

export function startScraperSchedule() {
  cron.schedule("0 */2 * * *", job);
  job(); // don't wait 30 minutes for the first data
  console.log("[scraper] scheduled every 2 hours");
}
