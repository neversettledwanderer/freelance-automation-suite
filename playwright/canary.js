/**
 * Canary check — runs before any search query.
 *
 * Uses a role-based selector (more stable than data-test attributes)
 * to confirm the page structure is recognisable. If this fails, the
 * entire scrape run is aborted — preventing junk or empty DB inserts.
 */

async function canaryCheck(page, logger) {
  await page.goto('https://www.upwork.com/nx/find-work/best-matches', {
    waitUntil: 'domcontentloaded',
  });

  const navCount = await page.getByRole('navigation').count();

  if (navCount === 0) {
    const msg = 'SCRAPER_ABORT: canary check failed — Upwork page structure unrecognised. Check DOM manually and update selectors.js if needed.';
    if (logger) logger.error(msg);
    else console.error(msg);
    throw new Error('CANARY_FAILED');
  }

  const info = 'Canary check passed — page structure looks normal.';
  if (logger) logger.info(info);
  else console.log(info);
}

module.exports = { canaryCheck };
