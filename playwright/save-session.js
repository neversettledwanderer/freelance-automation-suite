/**
 * Save Upwork Session
 *
 * Run once to create playwright/session.json.
 * Re-run whenever check-session.js reports session expired.
 *
 * Usage: node playwright/save-session.js
 *
 * Opens a headed browser window. Log in manually (including any 2FA).
 * The script waits for Upwork's find-work page to load, then saves the
 * session state and closes the browser.
 *
 * session.json is gitignored — never commit it.
 */

const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, 'session.json');

async function saveSession() {
  console.log('Opening browser — log in to Upwork manually (including 2FA if prompted).');
  console.log('The browser will close automatically once you reach the find-work page.');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.upwork.com/login');

  // Wait for successful login — allow up to 3 minutes for manual auth including 2FA
  await page.waitForURL('**/nx/find-work/**', { timeout: 180000 });

  await context.storageState({ path: SESSION_PATH });
  await browser.close();

  console.log(`Session saved to ${SESSION_PATH}`);
  console.log('You can now run the scraper. Session typically lasts 7–14 days.');
}

saveSession().catch(err => {
  console.error('Failed to save session:', err.message);
  process.exit(1);
});
