# Upwork Gig Finder Agent

Run the Playwright scraper across all target search queries, score and deduplicate results, insert qualifying gigs to Supabase, and return a daily digest.

## Process

1. Read `USER_CONFIG.md` → Search Queries section. Load all non-empty queries (up to 10). If no queries are configured, exit with: "No search queries found. Run /setup first to configure your niche and search queries."
2. Check `playwright/state.json` — if 10 or more queries have already run today, exit with: "Daily query limit reached. Digest will run from existing pipeline data."
3. Call `isSessionValid()` from `playwright/check-session.js` — if false, exit with: "Session expired. Run `node playwright/save-session.js` before next scrape."
4. Run the canary check via `playwright/canary.js` — abort on failure.
5. Run `playwright/scraper.js` across all search queries in batches of 3, with a 25–40 minute gap (random) between batches.
6. For each valid card returned, run `playwright/scorer.js` to produce a score (0–100) and priority (high/medium/low).
7. Deduplicate against existing pipeline: skip any gig whose `url` already exists in Supabase (the UNIQUE constraint handles this at DB level — log the skip, don't error).
8. Insert qualifying gigs (score > 0, payment_verified = true, proposals_count < 50) via `add_gig` MCP tool.
9. Update `playwright/state.json` with today's query count.
10. Return daily digest.

## Search Queries

Read from `USER_CONFIG.md` → **Search Queries** section.

The scraper runs whatever queries are listed there (max 10). If the list is empty, prompt the user to run /setup before finding gigs.

Do not hardcode any queries in this agent file — all query configuration lives in USER_CONFIG.md.

## Exclusion Rules

- Skip if `paymentVerified = false`
- Skip if `proposals_count >= 50` (configurable via USER_CONFIG.md → Connects Budget)
- Skip if score < 1 after all deductions (mismatch keywords from USER_CONFIG.md → Scoring Keywords → Mismatch apply −20 each)
- Skip if title or description matches any keyword in `playwright/user-config.js` → `mismatchKeywords`

## Digest Format

```
=== Upwork Daily Digest — [date] ===

Scrape: [N] queries run | [N] gigs found | [N] valid | [N] inserted | [N] duplicates skipped

HIGH PRIORITY ([N] gigs)
━━━━━━━━━━━━━━━━━━━━━━━
[Title] — [budget] — posted [X]h ago — Score: [N]
[URL]

MEDIUM PRIORITY ([N] gigs)
━━━━━━━━━━━━━━━━━━━━━━━━━━
[Title] — [budget] — posted [X]h ago — Score: [N]
[URL]

Pipeline Status
━━━━━━━━━━━━━━━
Proposals sent this week: [N]
Awaiting response: [N]
Active contracts: [N]

Generate proposals for the HIGH priority gigs above? (Y/N)
```

## Rules

- Read-only Playwright — never interact with any form, button, or input
- Never submit proposals or click any action element
- Log all scrape runs to console with timestamps
- If SELECTOR_DEGRADED warning fires (>30% invalid cards), stop the session and note it in the digest
- All user-specific values (keywords, thresholds, queries) are loaded from USER_CONFIG.md and playwright/user-config.js — never hardcode them here
