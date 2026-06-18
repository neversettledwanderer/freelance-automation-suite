/**
 * Upwork Job Board Scraper
 *
 * Read-only Playwright scraper for discovering gigs.
 *
 * Exports:
 *   - searchUpworkJobs(query, logger): scrape a single search query
 *   - scrapeAllQueries(config, logger): scrape all configured queries with limits/delays
 *
 * CLI:
 *   node playwright/scraper.js [query]
 *   If no query is provided, runs all configured search queries.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SELECTORS = require('./selectors');
const { validateJobCard } = require('./validator');
const { canaryCheck } = require('./canary');
const { scoreGig } = require('./scorer');
const { isSessionValid } = require('./check-session');

const SESSION_PATH = path.join(__dirname, 'session.json');
const STATE_PATH = path.join(__dirname, 'state.json');

// Realistic Chrome on macOS user agent. Update if your local Chrome version differs.
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

/**
 * Ensure a usable logger object.
 */
function normalizeLogger(logger) {
  if (logger && typeof logger.info === 'function') return logger;
  return {
    info: (...args) => console.log(`[${new Date().toISOString()}]`, ...args),
    warn: (...args) => console.warn(`[${new Date().toISOString()}]`, ...args),
    error: (...args) => console.error(`[${new Date().toISOString()}]`, ...args),
  };
}

/**
 * Read the daily query state. Returns { date: 'YYYY-MM-DD', count: 0 }.
 */
function readQueryState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return { date: today(), count: 0 };
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.date !== today()) return { date: today(), count: 0 };
    return { date: parsed.date, count: parseInt(parsed.count, 10) || 0 };
  } catch (err) {
    console.warn(`Could not read query state: ${err.message}`);
    return { date: today(), count: 0 };
  }
}

/**
 * Write the daily query state.
 */
function writeQueryState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn(`Could not write query state: ${err.message}`);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Scrape a single Upwork search query.
 *
 * @param {string} query
 * @param {object} [logger]
 * @returns {Promise<object[]>} array of valid raw gig cards
 */
async function searchUpworkJobs(query, logger) {
  const log = normalizeLogger(logger);

  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error(
      `Session file not found at ${SESSION_PATH}. Run: node playwright/save-session.js`
    );
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    storageState: SESSION_PATH,
    userAgent: DEFAULT_USER_AGENT,
    viewport: DEFAULT_VIEWPORT,
  });

  const page = await context.newPage();
  let validCards = [];

  try {
    // Structural health check before any real search
    await canaryCheck(page, log);

    const url = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(
      query
    )}&sort=recency&per_page=20&payment_verified=1`;

    log.info(`Navigating to search: ${query}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector(SELECTORS.JOB_TILE, { timeout: 15000 });

    // Simulate human reading/scrolling before extracting data
    await page.evaluate(() => window.scrollBy(0, 300 + Math.random() * 200));
    await sleep(randomBetween(800, 1200));

    // Human-like pause before reading
    await sleep(randomBetween(1000, 3000));

    const rawCards = await page.evaluate(sel => {
      const cards = document.querySelectorAll(sel.JOB_TILE);
      return Array.from(cards).map(card => {
        const titleEl = card.querySelector(sel.JOB_TITLE);
        const titleLinkEl = card.querySelector(sel.JOB_TITLE_LINK);
        return {
          title: titleEl?.innerText?.trim(),
          id: card.getAttribute('data-job-uid') || titleLinkEl?.pathname?.split('/').pop(),
          budget: card.querySelector(sel.JOB_BUDGET)?.innerText?.trim(),
          postedAt: card.querySelector(sel.JOB_POSTED_ON)?.innerText?.trim(),
          proposalCount: card.querySelector(sel.JOB_PROPOSALS)?.innerText?.trim(),
          clientRating: card.querySelector(sel.CLIENT_RATING)?.innerText?.trim(),
          clientSpent: card.querySelector(sel.CLIENT_SPENT)?.innerText?.trim(),
          clientName: card.querySelector(sel.CLIENT_NAME)?.innerText?.trim(),
          paymentVerified: !!card.querySelector(sel.PAYMENT_VERIFIED),
          description: card.querySelector(sel.JOB_DESCRIPTION)?.innerText?.trim(),
          url: titleLinkEl?.href,
        };
      });
    }, SELECTORS);

    validCards = rawCards.filter(card => validateJobCard(card, log));

    const invalidRatio =
      (rawCards.length - validCards.length) / (rawCards.length || 1);
    if (invalidRatio > 0.3) {
      log.warn(
        `SELECTOR_DEGRADED: ${Math.round(
          invalidRatio * 100
        )}% of cards failed validation for query "${query}"`
      );
    }

    log.info(
      `Query "${query}": ${rawCards.length} found, ${validCards.length} valid`
    );

    // Persist any refreshed cookies
    await context.storageState({ path: SESSION_PATH });
  } catch (err) {
    log.error(`Scrape failed for query "${query}": ${err.message}`);
    throw err;
  } finally {
    await browser.close();
  }

  return validCards;
}

/**
 * Run all configured search queries with daily limits and human-like gaps.
 *
 * @param {object} config - expects { searchQueries: string[], ... } from user-config.js
 * @param {object} [logger]
 * @returns {Promise<object>}
 */
async function scrapeAllQueries(config, logger) {
  const log = normalizeLogger(logger);
  const queries = (config && config.searchQueries) || [];
  const maxQueriesPerDay = 10;
  const maxQueriesPerSession = 3;
  const sessionGapMin = 25 * 60 * 1000;
  const sessionGapMax = 40 * 60 * 1000;

  if (queries.length === 0) {
    const msg = 'No search queries found. Run /setup first to configure your niche and search queries.';
    log.info(msg);
    return { success: false, error: msg, results: [] };
  }

  // Session guard
  const sessionValid = await isSessionValid();
  if (!sessionValid) {
    const msg = 'Session expired. Run `node playwright/save-session.js` before next scrape.';
    log.warn(msg);
    return { success: false, error: msg, results: [] };
  }

  const state = readQueryState();
  const remainingToday = Math.max(0, maxQueriesPerDay - state.count);

  if (remainingToday <= 0) {
    const msg = 'Daily query limit reached. Digest will run from existing pipeline data.';
    log.info(msg);
    return { success: false, error: msg, results: [] };
  }

  const queriesToRun = queries.slice(0, remainingToday);
  log.info(
    `Starting scrape: ${queriesToRun.length} of ${queries.length} queries (daily limit allows ${remainingToday} more)`
  );

  const results = [];
  let sessionCounter = 0;

  for (let i = 0; i < queriesToRun.length; i++) {
    const query = queriesToRun[i];

    if (sessionCounter >= maxQueriesPerSession) {
      const gap = randomBetween(sessionGapMin, sessionGapMax);
      log.info(`Session limit reached. Sleeping ${Math.round(gap / 1000 / 60)} minutes before next batch...`);
      await sleep(gap);
      sessionCounter = 0;
    }

    try {
      const cards = await searchUpworkJobs(query, log);
      const scored = cards.map(card => {
        const { score, priority } = scoreGig(card);
        return { ...card, score, priority };
      });

      results.push({ query, cards: scored });
      state.count += 1;
      sessionCounter += 1;
    } catch (err) {
      log.error(`Skipping query "${query}" due to error: ${err.message}`);
      results.push({ query, cards: [], error: err.message });
      // Stop further scraping to avoid compounding errors (e.g. session issues)
      break;
    }
  }

  writeQueryState(state);

  const totalCards = results.reduce((sum, r) => sum + r.cards.length, 0);
  log.info(
    `Scrape complete. Ran ${results.length} queries, found ${totalCards} valid cards. Queries today: ${state.count}/${maxQueriesPerDay}`
  );

  return { success: true, queriesToday: state.count, results };
}

/**
 * CLI entry point.
 */
async function main() {
  const query = process.argv[2];
  const config = require('./user-config');

  if (query) {
    console.log(`Running single query: ${query}`);
    try {
      const cards = await searchUpworkJobs(query);
      const scored = cards.map(card => {
        const { score, priority } = scoreGig(card);
        return { ...card, score, priority };
      });
      console.log(JSON.stringify(scored, null, 2));
      process.exit(0);
    } catch (err) {
      console.error('Scrape failed:', err.message);
      process.exit(1);
    }
  }

  const summary = await scrapeAllQueries(config);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err.message);
    process.exit(1);
  });
}

module.exports = { searchUpworkJobs, scrapeAllQueries };
