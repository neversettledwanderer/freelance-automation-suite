/**
 * Session Health Check
 *
 * Three uses:
 *   1. Scheduled nightly at 22:00 — pre-flight before morning scrape
 *   2. Called by scraper.js at startup — skips gracefully if session invalid
 *   3. Manual: node playwright/check-session.js
 *
 * If run as a scheduled job (22:00) and session is invalid:
 *   - Sends macOS desktop notification
 *   - Exits with code 1 (scheduler logs the failure)
 *
 * If session is valid:
 *   - Logs confirmation
 *   - Exits with code 0
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SELECTORS = require('./selectors');

async function isSessionValid() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: './playwright/session.json',
    });
    const page = await context.newPage();
    await page.goto('https://www.upwork.com/nx/find-work/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    const avatar = await page.$(SELECTORS.USER_AVATAR);
    return avatar !== null;
  } catch (err) {
    console.warn(`Session check error: ${err.message}`);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

async function preFlightCheck() {
  console.log(`[${new Date().toISOString()}] Running Upwork session pre-flight check...`);

  const valid = await isSessionValid();

  if (valid) {
    console.log('[check-session] Session OK — morning scrape (06:30) is ready to run.');
    process.exit(0);
  } else {
    const message = 'Run: node playwright/save-session.js before 06:30';
    const title = 'Upwork: Session Expired';

    try {
      execSync(
        `osascript -e 'display notification "${message}" with title "${title}" sound name "Basso"'`
      );
      console.warn(`[check-session] Session expired — macOS notification sent.`);
    } catch {
      // osascript may fail if running headlessly without display
      console.warn(`[check-session] Session expired — could not send macOS notification. Re-auth manually.`);
    }

    console.warn(`[check-session] Action required: ${message}`);
    process.exit(1);
  }
}

module.exports = { isSessionValid };

// Run directly as script
if (require.main === module) {
  preFlightCheck().catch(err => {
    console.error('Pre-flight check crashed:', err);
    process.exit(1);
  });
}
