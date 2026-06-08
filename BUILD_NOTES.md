# Upwork Automation Suite — Build Notes

**Version:** 1.1
**Date:** 5 June 2026
**Reference:** PRD.md

---

## Change Log

| Version | Change |
|---------|--------|
| 1.0 | Initial build plan including Playwright submission bot |
| 1.1 | Removed submitter entirely. System is now discovery + proposal generation only. Yogesh submits manually. Added Phase 0 setup agent with interview format. |
| 1.2 | Architecture review fixes: corrected MCP tool signatures (add_gig now includes client fields; mark_submitted now includes connects_spent and screening_answers); added get_gig and log_contract signatures; fixed scheduler to two separate jobs (scrape 06:30, digest 08:30); added pre-flight 22:00 session health check with macOS notification; added selector registry pattern; updated scraper with canary check, per-card validation, correct UA/viewport, domcontentloaded wait, scroll simulation, and session state refresh; fixed clientRating string parsing in scorer. |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Claude Code Agents                       │
│   upwork-setup  │  upwork-gig-finder  │  upwork-proposal-    │
│   (interview)   │  (read-only scrape) │  writer              │
└───────┬─────────┴──────────┬──────────┴──────────┬───────────┘
        │                    │                      │
        ▼                    ▼                      ▼
┌───────────────┐   ┌────────────────────┐  ┌────────────────┐
│  Knowledge    │   │  Playwright Browser│  │  Supabase DB   │
│  Base Files   │   │  (Upwork scraper   │  │  (pipeline,    │
│  MASTER_*.md  │◄──│   read-only)       │  │   proposals)   │
└───────────────┘   └────────────────────┘  └────────────────┘
        │
        ▼
┌───────────────┐
│  MCP Server   │
│  (Supabase    │
│   Edge Fn)    │
└───────────────┘

Yogesh reviews daily digest → picks gigs → generates proposal → pastes manually into Upwork

Note: Knowledge Base Files are written exclusively by the setup agent (interview). Playwright reads
Upwork and writes to Supabase only. The proposal writer reads KB files; it does not modify them.
```

---

## Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Browser automation | Playwright (Node.js) | Read-only. Already installed at job-hunt project. |
| Database | Supabase | Extend existing job-hunt Supabase instance or create new project |
| MCP server | Supabase Edge Functions | Same pattern as job-hunt MCP |
| Agent runtime | Claude Code | Same as job-hunt toolkit |
| Knowledge base | Markdown files | Built by setup agent via interview |
| Config | CLAUDE.md | Per-project agent instructions |

---

## Project Structure

```
/Users/yogeshmistry/IDE/GitHub/freelance-automation-suite/
├── CLAUDE.md                    # Project config and agent instructions
├── PRD.md                       # Product spec
├── BUILD_NOTES.md               # This file
├── MASTER_PROFILE.md            # Upwork profile copy — built by setup agent
├── MASTER_PROPOSALS.md          # Proposal hooks, proof snippets, templates — built by setup agent
├── MASTER_SKILLS.md             # Skills list — built by setup agent
├── mcp-server/                  # Supabase Edge Functions for MCP tools
│   ├── index.ts                 # Main router
│   ├── tools/
│   │   ├── add_gig.ts
│   │   ├── update_gig.ts
│   │   ├── search_gigs.ts
│   │   ├── get_pipeline_overview.ts
│   │   └── log_contract.ts
│   └── schema.sql               # DB schema (see PRD Section 7)
├── agents/
│   ├── upwork-setup.md          # Setup agent — interview format
│   ├── upwork-gig-finder.md     # Gig discovery agent instructions
│   └── upwork-proposal-writer.md# Proposal generation agent instructions
├── playwright/
│   ├── selectors.js             # Centralised selector registry — update here when Upwork changes DOM
│   ├── scraper.js               # Upwork job board scraper (read-only)
│   ├── scorer.js                # Gig scoring algorithm
│   ├── validator.js             # Per-card validation before scoring/insert
│   ├── canary.js                # Pre-scrape structural check — aborts on DOM mismatch
│   ├── save-session.js          # One-off: manual login flow that writes session.json
│   ├── check-session.js         # Nightly pre-flight: validates session, sends notification if expired
│   ├── state.json               # Daily query counter (gitignore this)
│   └── session.json             # Saved browser session (gitignore this)
├── proposals/                   # Generated proposal archives
└── contracts/                   # Active and completed contract docs
```

**Removed from v1.0:** `playwright/submitter.js`, `mcp-server/tools/submit_proposal.ts`, `PERSONAL_INFO.md`

---

## Build Sequence

### Phase 0 — Setup Agent (Day 1)

This is built and run before any other component. Everything else depends on the knowledge base files it produces.

---

#### The Setup Agent: Design and Interview Flow

**File:** `agents/upwork-setup.md`

The setup agent runs as an interactive Claude Code session. It interviews Yogesh in a structured conversation, one section at a time, building up the three knowledge base files. It mirrors the job-hunt toolkit setup flow.

**Invocation:**
```
claude agents/upwork-setup.md
```
Or from CLAUDE.md, referenced as a slash command: `/setup`

---

**Agent instructions (`agents/upwork-setup.md`):**

```markdown
# Upwork Setup Agent

You are setting up the Upwork Freelance Automation Suite for Yogesh Mistry.
Your job is to interview Yogesh and produce three knowledge base files:
- MASTER_PROFILE.md
- MASTER_PROPOSALS.md
- MASTER_SKILLS.md

## Rules
- Work through one section at a time. Do not dump all questions at once.
- After each section, summarise what you heard and confirm before moving on.
- Ask follow-up questions when an answer is vague or could be more specific.
- When Yogesh gives a good proof point, push for the outcome: "What was the result?"
- You are building marketing copy, not a CV. Push for concrete, specific, vivid language.
- Never invent experience. If Yogesh is unsure, write it as aspirational context only.
- At the end of each section, write the relevant block to the file immediately — don't wait until the end.
- If a file already exists, offer to update individual sections rather than starting over.

## Section Order

1. Positioning & Headline
2. Work History & Proof Points
3. Skills & Tools
4. Proposal Style & Voice
5. Rate Strategy
6. Target Gig Categories (confirm/adjust from PRD defaults)

---

## Section 1: Positioning & Headline

Goal: Produce the top section of MASTER_PROFILE.md — Yogesh's Upwork headline, tagline, and positioning statement.

Ask:
- "How do you currently describe yourself on Upwork — or how would you like to?"
- "Who is your ideal client? Big company rolling out Copilot? SME trying to get their team using AI? Somewhere else?"
- "What problem do you solve that most consultants don't?"
- "What's the outcome a client gets from working with you — not the deliverable, the result?"

Push for specificity. "Helps teams adopt AI" is not enough. "Cuts the gap between a Copilot licence and an employee who actually uses it daily" is better.

Write output to MASTER_PROFILE.md → Section: Positioning

---

## Section 2: Work History & Proof Points

Goal: Produce the proof snippets for MASTER_PROPOSALS.md — specific, credible, outcome-led stories that can be matched to different gig types.

For each role Yogesh mentions, extract:
- Organisation name and context (size, industry)
- What he actually did (not job title — specific actions)
- Who he worked with (stakeholders, audience, scale)
- The outcome or result (numbers if possible, or qualitative change if not)

Roles to cover (prompt if not raised):
- Currys (current — AI specialist / Copilot context)
- Convergys / Intuit (training, LMS, international)
- Any freelance or consulting work
- The ecommerce AI operations build (personal project)
- Any training facilitation or workshop delivery

For each, draft a proof snippet in first person, past tense, 2-3 sentences.
Example format:
"At [Org], I [specific action] for [audience/scale]. The result was [outcome]."

Write output to MASTER_PROPOSALS.md → Section: Proof Snippets

---

## Section 3: Skills & Tools

Goal: Produce MASTER_SKILLS.md — a honest, specific skills inventory for keyword matching and proposal accuracy.

Ask Yogesh to rate each category:
- **Confident (use daily or have delivered professionally)**
- **Comfortable (have used, can deliver with some prep)**
- **Familiar (know it, wouldn't lead a project in it)**

Categories to cover:
- Microsoft 365 tools (Copilot, Teams, SharePoint, Power Platform)
- AI tools (Claude, ChatGPT, Gemini, Perplexity — which ones and how)
- Training & facilitation (virtual, in-person, group size, format)
- L&D / instructional design (tools: Articulate, Rise, other)
- Change management frameworks (Prosci, ADKAR, other)
- Project management (tools, methodology)
- Any technical skills (no-code tools, automation platforms)

Flag honestly: if a skill is "familiar" only, mark it in the file so the proposal writer knows not to lead with it.

Write output to MASTER_SKILLS.md

---

## Section 4: Proposal Style & Voice

Goal: Calibrate the proposal writer's tone and style to sound like Yogesh, not like a generic AI consultant.

Ask:
- "Read this sample hook. Does this sound like you, or too formal/too casual?" (Show a hook from PRD Section 8)
- "Are there phrases you hate seeing in proposals? Things that feel generic?"
- "How direct are you — do you like to name the problem bluntly, or ease in?"
- "Any proposals you've written before that you thought landed well? What made them work?"

Capture style notes as a short brief. Examples:
- "Direct, conversational. Names the problem without softening it."
- "Avoids: 'I am passionate about', 'leverage', 'synergy', 'extensive experience'"
- "Preferred CTA: 15-minute call, not 'happy to discuss further'"

Write output to MASTER_PROPOSALS.md → Section: Voice and Style Notes

---

## Section 5: Rate Strategy

Goal: Confirm the rate logic for the proposal writer.

Ask:
- "What's your current rate on Upwork and what are you targeting by end of year?"
- "For fixed-price gigs, how do you think about sizing — daily rate equivalent, or something else?"
- "Are there gig types where you'd go lower to get a review? Or is that off the table?"
- "Any industries or client types where you'd charge more?"

Write output to MASTER_PROFILE.md → Section: Rate Strategy

---

## Section 6: Target Gig Categories

Goal: Confirm or adjust the gig category list in the PRD (Section 4).

Show Yogesh the current PRIMARY and SECONDARY lists. Ask:
- "Does this match what you'd actually search for? Anything missing?"
- "Any of these feel like a stretch you'd rather remove?"
- "Any new categories based on what's been popular lately?"

Update the category list in MASTER_PROFILE.md → Section: Target Categories

---

## Completion

When all sections are done:
1. Show Yogesh a summary: "Here's what we've built — [list of files with section counts]"
2. Offer a quick review: "Want to read through any section before we finish?"
3. Confirm: "The setup is complete. Run `upwork-gig-finder` to pull today's gigs, or `upwork-proposal-writer <gig-url>` to generate a proposal for a specific gig."
```

---

### Phase 1A — Foundation (Day 1-2)

**Step 1: Supabase setup**
1. Create new Supabase project: `upwork-suite` (or add tables to existing job-hunt DB)
2. Run schema from PRD Section 7
3. Enable RLS, create service role key
4. Store key in environment: `UPWORK_SUPABASE_URL`, `UPWORK_SUPABASE_KEY`

**Step 2: MCP server**
1. Clone/adapt the job-hunt MCP server pattern
2. Implement core tools: `add_gig`, `update_gig`, `search_gigs`, `get_pipeline_overview`, `log_contract`
3. Note: `submit_proposal` tool is NOT built — replaced by `mark_submitted` (Yogesh calls this manually after pasting)
4. Deploy as Supabase Edge Function
5. Register in `~/.claude/claude_desktop_config.json` as `upwork-hunt` MCP server
6. Test with a manual `add_gig` call

**Step 3: Project config**
1. Create `CLAUDE.md` with user config, agent references, writing rules
2. MASTER_* files come from the setup agent (Phase 0) — don't write these manually

---

### Phase 1B — Gig Discovery (Day 2-3)

**Step 4: Playwright scraper (read-only)**

Upwork job search URL pattern:
```
https://www.upwork.com/nx/search/jobs/?q=AI+adoption&sort=recency&per_page=20
```

Key search queries:
```javascript
const searches = [
  'AI adoption consultant',
  'Microsoft 365 Copilot training',
  'digital adoption specialist',
  'AI enablement',
  'AI literacy training',
  'change management AI',
  'AI workshop facilitator',
  'Copilot onboarding',
  'digital transformation training',
  'AI tools training corporate'
];
```

**Step 4a: Selector registry (`playwright/selectors.js`)**

All `data-test` attributes are centralised here. When Upwork changes a selector, update this one file only — never hunt through scraper code.

```javascript
// playwright/selectors.js
module.exports = {
  JOB_TILE:          '[data-test="job-tile"]',
  JOB_TITLE:         '[data-test="job-title"]',
  JOB_TITLE_LINK:    '[data-test="job-title"] a',
  JOB_BUDGET:        '[data-test="budget"]',
  JOB_POSTED_ON:     '[data-test="posted-on"]',
  JOB_PROPOSALS:     '[data-test="proposals"]',
  CLIENT_RATING:     '[data-test="client-rating"]',
  CLIENT_SPENT:      '[data-test="client-total-spent"]',
  CLIENT_NAME:       '[data-test="client-name"]',
  PAYMENT_VERIFIED:  '[data-test="payment-verified"]',
  JOB_DESCRIPTION:   '[data-test="job-description-text"]',
  USER_AVATAR:       '[data-test="user-avatar"]',  // used by session health check
};
```

**Important:** Treat these as a starting point, not ground truth. Run the scraper against a live Upwork search and inspect the DOM before your first real run. Update this file if selectors differ.

**Step 4b: Per-card validation (`playwright/validator.js`)**

Prevents silent corruption — broken selectors return `undefined`, not exceptions. Any card with missing required fields is logged and skipped before reaching the scorer or DB.

```javascript
// playwright/validator.js
const REQUIRED_FIELDS = ['title', 'id', 'url'];

function validateJobCard(card, logger) {
  const missing = REQUIRED_FIELDS.filter(f => !card[f]);
  if (missing.length > 0) {
    logger.warn(`Card skipped — missing fields: ${missing.join(', ')}`, { card });
    return false;
  }
  return true;
}

module.exports = { validateJobCard };
```

**Step 4c: Canary check (`playwright/canary.js`)**

Runs before any search query. Uses a role-based selector (not a `data-test` attribute) so it survives minor DOM changes. If it fails, the entire run aborts — no partial/junk inserts.

```javascript
// playwright/canary.js
async function canaryCheck(page, logger) {
  await page.goto('https://www.upwork.com/nx/find-work/best-matches', {
    waitUntil: 'domcontentloaded'
  });
  const navCount = await page.getByRole('navigation').count();
  if (navCount === 0) {
    logger.error('SCRAPER_ABORT: canary check failed — Upwork page structure unrecognised');
    throw new Error('CANARY_FAILED');
  }
  logger.info('Canary check passed');
}

module.exports = { canaryCheck };
```

**Step 4d: Main scraper (`playwright/scraper.js`)**

```javascript
const { chromium } = require('playwright');
const SELECTORS = require('./selectors');
const { validateJobCard } = require('./validator');
const { canaryCheck } = require('./canary');

async function searchUpworkJobs(query, logger) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: './playwright/session.json',
    // Match your actual machine UA and screen — check chrome://version
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    slowMo: 300
  });

  const page = await context.newPage();

  // Canary check before any real work
  await canaryCheck(page, logger);

  const url = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(query)}&sort=recency&per_page=20&payment_verified=1`;

  // Use domcontentloaded + explicit selector wait — not networkidle (bot signal)
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(SELECTORS.JOB_TILE, { timeout: 10000 });

  // Simulate human reading/scrolling before extracting data
  await page.evaluate(() => window.scrollBy(0, 300 + Math.random() * 200));
  await page.waitForTimeout(800 + Math.random() * 400);

  // Human-like pause before reading
  await page.waitForTimeout(1000 + Math.random() * 2000);

  const rawCards = await page.evaluate((sel) => {
    const cards = document.querySelectorAll(sel.JOB_TILE);
    return Array.from(cards).map(card => ({
      title:           card.querySelector(sel.JOB_TITLE)?.innerText?.trim(),
      id:              card.getAttribute('data-job-uid'),
      budget:          card.querySelector(sel.JOB_BUDGET)?.innerText?.trim(),
      postedAt:        card.querySelector(sel.JOB_POSTED_ON)?.innerText?.trim(),
      proposalCount:   card.querySelector(sel.JOB_PROPOSALS)?.innerText?.trim(),
      clientRating:    card.querySelector(sel.CLIENT_RATING)?.innerText?.trim(),
      clientSpent:     card.querySelector(sel.CLIENT_SPENT)?.innerText?.trim(),
      clientName:      card.querySelector(sel.CLIENT_NAME)?.innerText?.trim(),
      paymentVerified: !!card.querySelector(sel.PAYMENT_VERIFIED),
      description:     card.querySelector(sel.JOB_DESCRIPTION)?.innerText?.trim(),
      url:             card.querySelector(sel.JOB_TITLE_LINK)?.href
    }));
  }, SELECTORS);

  // Validate cards before scoring — log and skip invalid ones
  const validCards = rawCards.filter(card => validateJobCard(card, logger));

  // Health metric: alert if >30% of cards are invalid (selector degradation signal)
  const invalidRatio = (rawCards.length - validCards.length) / (rawCards.length || 1);
  if (invalidRatio > 0.3) {
    logger.warn(`SELECTOR_DEGRADED: ${Math.round(invalidRatio * 100)}% of cards failed validation for query "${query}"`);
  }

  logger.info(`Query "${query}": ${rawCards.length} found, ${validCards.length} valid`);

  // Persist any new cookies written during this session
  await context.storageState({ path: './playwright/session.json' });
  await browser.close();

  return validCards;
}

module.exports = { searchUpworkJobs };
```

**Step 5: Gig scoring algorithm**

```javascript
function scoreGig(gig) {
  let score = 0;

  const highFitKeywords = [
    'copilot', 'microsoft 365', 'm365', 'ai adoption',
    'ai enablement', 'digital adoption', 'ai literacy',
    'ai training', 'ai workshop', 'change management ai'
  ];

  const medFitKeywords = [
    'ai tools', 'chatgpt', 'llm', 'prompt engineering',
    'digital transformation', 'training design', 'l&d',
    'instructional design', 'enablement', 'onboarding'
  ];

  const mismatchKeywords = [
    'python developer', 'machine learning', 'tensorflow',
    'data scientist', 'backend', 'react', 'wordpress'
  ];

  const text = (gig.title + ' ' + gig.description).toLowerCase();

  highFitKeywords.forEach(kw => { if (text.includes(kw)) score += 10; });
  medFitKeywords.forEach(kw => { if (text.includes(kw)) score += 5; });
  mismatchKeywords.forEach(kw => { if (text.includes(kw)) score -= 20; });

  if (gig.budgetMin >= 500 || gig.hourlyMin >= 40) score += 10;
  if (gig.budgetMin >= 1000 || gig.hourlyMin >= 60) score += 10;
  if (gig.paymentVerified) score += 10;
  // clientRating arrives as a DOM string like "4.93 of 5" — extract the float first
  const rating = parseFloat((gig.clientRating || '').split(' ')[0]);
  if (!isNaN(rating) && rating >= 4.5) score += 10;
  if (gig.postedHoursAgo < 6) score += 15;
  else if (gig.postedHoursAgo < 24) score += 5;

  const proposals = parseInt(gig.proposalCount) || 0;
  if (proposals > 50) score -= 20;
  if (proposals > 20) score -= 10;

  return Math.max(0, Math.min(100, score));
}
```

Priority mapping: score >= 70 → HIGH, 40-69 → MEDIUM, < 40 → LOW

**Step 6: `upwork-gig-finder` agent**

```markdown
# Upwork Gig Finder Agent

Run Playwright scraper across all target search queries.
Score and deduplicate results against existing pipeline.
Add HIGH and MEDIUM gigs to Supabase via MCP tools.
Return daily digest: X gigs found, Y HIGH, Z MEDIUM, W excluded.

Rules:
- Only add gigs where paymentVerified = true
- Skip gigs with 50+ proposals already submitted
- Never add gigs that require coding, ML, or data science as primary skill
- Do not submit any proposals — read only
```

---

### Phase 1C — Proposal Writer (Day 3-4)

**Step 7: `upwork-proposal-writer` agent**

The proposal writer takes a gig URL or gig ID from the pipeline and produces a ready-to-paste proposal.

**File:** `agents/upwork-proposal-writer.md`

```markdown
# Upwork Proposal Writer Agent

Given a gig URL or gig ID, generate a tailored, ready-to-paste proposal for Yogesh to submit manually.

## Process
1. If given a URL: use Playwright to read the full gig description, client details, and any screening questions
2. If given a gig ID: read from Supabase pipeline
3. Read MASTER_PROFILE.md, MASTER_PROPOSALS.md, MASTER_SKILLS.md
4. Select the most relevant hook from MASTER_PROPOSALS.md based on gig category
5. Select 1-2 proof snippets that match the gig's context or industry
6. Write the proposal following the 4-part structure (Hook → Proof → Offer → CTA)
7. Generate bid amount using rate strategy from MASTER_PROFILE.md
8. Answer any screening questions using knowledge base
9. Output the result

## Output format

---
PROPOSAL (copy from here)

[proposal text — plain paragraphs, no markdown, 150-250 words]

---
BID: £[amount] / hr  (or £[amount] fixed)
CONNECTS: 6 (standard)

SCREENING QUESTIONS:
Q: [question text]
A: [answer]

CONFIDENCE: high / medium / low
NOTES: [any gaps flagged, e.g. "Client asked for Salesforce experience — not in your profile, flagged"]
---

## Rules
- Never start the proposal with "I"
- Never claim skills not in MASTER_SKILLS.md
- Plain text output only — no bullet points, no bold, no headers in the proposal body
- If the gig has 20+ proposals already, add a note: "High competition gig — consider skipping"
- Flag any gap between gig requirements and Yogesh's profile. Be specific.
```

**Step 8: Session management for scraping**

Upwork requires a logged-in session to view full gig details. Manual login flow:

```javascript
// Run once: saves session cookies to file
async function saveSession() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.upwork.com/login');
  // Pause here — Yogesh logs in manually including any 2FA
  await page.waitForURL('**/nx/find-work/**', { timeout: 120000 });

  await context.storageState({ path: './playwright/session.json' });
  await browser.close();
  console.log('Session saved.');
}
```

**Session health check (`playwright/check-session.js`)**

Three uses: (1) 22:00 nightly pre-flight job, (2) guard at the top of every scrape run, (3) manual invocation.

```javascript
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SELECTORS = require('./selectors');

async function isSessionValid() {
  const browser = await chromium.launch({ headless: true }); // headless fine for a quick check
  const context = await browser.newContext({
    storageState: './playwright/session.json'
  });
  const page = await context.newPage();
  await page.goto('https://www.upwork.com/nx/find-work/', { waitUntil: 'domcontentloaded' });
  const isLoggedIn = (await page.$(SELECTORS.USER_AVATAR)) !== null;
  await browser.close();
  return isLoggedIn;
}

async function preFlightCheck() {
  const valid = await isSessionValid();
  if (valid) {
    console.log('[22:00 check] Session OK — morning scrape is ready to run.');
    process.exit(0);
  } else {
    // macOS desktop notification so Yogesh sees it before bed
    execSync(`osascript -e 'display notification "Run: node playwright/save-session.js before 06:30" with title "Upwork: Session Expired" sound name "Basso"'`);
    console.warn('[22:00 check] Session expired — notification sent. Re-auth required before morning scrape.');
    process.exit(1); // non-zero so the scheduler can log the failure
  }
}

module.exports = { isSessionValid, preFlightCheck };

// Run directly: node playwright/check-session.js
if (require.main === module) preFlightCheck();
```

The 06:30 scrape job calls `isSessionValid()` as its first action. If it returns false, the job logs "Skipping scrape — session invalid. Re-auth required." and exits cleanly (no partial run, no CAPTCHA risk). The 08:30 digest job then reads whatever is already in the DB from the previous valid scrape.

Add to `.gitignore`:
```
playwright/session.json
playwright/state.json
.env
```

---

### Phase 2 — Notifications and Monitoring

**Step 9: Response monitoring (Phase 2)**

Read-only poll of Upwork messages to flag new client replies:
```javascript
async function checkForResponses(context) {
  const page = await context.newPage();
  await page.goto('https://www.upwork.com/nx/messages/');
  // Scrape unread threads, match to pipeline gigs by client name
  // Return list of new messages for Yogesh to review
}
```

**Step 10: Scheduled jobs (three separate tasks)**

The pipeline runs across three scheduled jobs, not one monolith. With 10 queries × max 3/session × 30-min gaps, scraping takes ~90 min elapsed. A single 08:00 job cannot search AND deliver a populated digest in the same run.

| Job | Schedule | Action |
|-----|----------|--------|
| `session-check` | 22:00 nightly | Run `check-session.js` pre-flight. Send macOS notification if re-auth needed. |
| `scrape-job` | 06:30 daily | Check session valid first. Run all 10 queries across sessions with gaps. Insert qualifying gigs to Supabase. |
| `digest-job` | 08:30 daily | Read DB — new HIGH/MEDIUM gigs since yesterday. Show pipeline status. Prompt: "Generate proposals for these HIGH gigs? Y/N" |

The 06:30 start means scraping finishes by ~08:00 at worst, giving the 08:30 digest a fully populated DB to read from.

If `session-check` exits with code 1 (session invalid), `scrape-job` detects the invalid session at startup, logs "Skipping — re-auth required", and exits. The `digest-job` still runs at 08:30 and reports from existing pipeline data.

Implement all three as Claude Code scheduled tasks.

---

## Technical Challenges

### Selector instability
Upwork updates their React app frequently. **Mitigation:**
- All selectors centralised in `playwright/selectors.js` — one file to update, not scattered inline
- Canary check aborts the full run if page structure is unrecognised — prevents junk DB inserts
- Per-card validation (`validateJobCard`) skips individual malformed cards and logs them — never silently passes `undefined` into the scorer or DB
- Health metric: if >30% of cards on a page are invalid, emit `SELECTOR_DEGRADED` warning and stop the session — early signal before a selector fully breaks
- `data-test` attributes preferred over class names; role-based selectors used for canary (more stable than any `data-test`)

### Rate limiting / bot detection
Upwork uses Cloudflare Bot Management (behavioural fingerprinting). **Mitigation:**
- `headless: false` — headed browser is harder to fingerprint
- Real Chrome User-Agent pinned to your actual Chrome version (not default Playwright UA)
- Viewport set to `1440×900` to match your machine — not the default 1280×720 that all Playwright bots share
- `waitUntil: 'domcontentloaded'` + explicit selector wait — replaces `networkidle` (a Playwright-specific concept that real browsers don't implement and Cloudflare recognises)
- Scroll simulation before data extraction — real users scroll before reading
- Timing at multiple levels: 200–500ms between card reads, 8–15s between queries within a session, 25–40min (with variance) between sessions
- Max 3 search queries per session, max 10 queries per calendar day (tracked in `playwright/state.json`)
- Session cookies persisted back to `session.json` after every run — avoids session degradation from cookie loss
- Read-only scraping significantly lowers detection risk vs. form interaction

### Session expiry
Upwork sessions expire periodically. **Mitigation:**
- 22:00 nightly pre-flight check (`check-session.js`) detects expiry before the morning run
- macOS desktop notification sent immediately if re-auth is needed ("Upwork: Session Expired")
- 06:30 scrape job re-checks session validity at startup — skips gracefully if still invalid (no failed run, no CAPTCHA exposure)
- Manual re-auth flow (`save-session.js`) takes < 2 minutes and is fully documented
- `session.json` is gitignored — credentials never touch version control

### ToS compliance
System is read-only scraping + proposal generation. No automated form submission. This is consistent with personal productivity use. Risk is low.

---

## MCP Tool Signatures

```typescript
// add_gig
// Inserts a new gig discovered by the scraper. url has UNIQUE constraint — duplicate inserts are silently ignored.
{
  title: string,
  upwork_job_id: string,
  url: string,                      // UNIQUE — used for deduplication
  budget_type: 'fixed' | 'hourly',
  budget_min?: number,
  budget_max?: number,
  description: string,
  skills_required: string[],
  client_id?: string,               // Gap 3 fix: added
  client_name?: string,             // Gap 3 fix: added
  client_payment_verified: boolean,
  client_rating?: number,           // Pass as float — scorer handles string parsing upstream
  client_spent?: string,            // Gap 3 fix: added (raw string, e.g. "$10K+")
  score: number,
  priority: 'high' | 'medium' | 'low',
  posted_at: string                 // ISO 8601
}

// get_gig
// Fetches a single gig by ID — used by proposal writer when given a gig_id rather than a URL
{
  gig_id: string
}
// Returns: single upwork_gigs row or 404 error

// update_gig
{
  gig_id: string,
  status?: GigStatus,
  notes?: string,
  score?: number
}

// mark_submitted  (replaces submit_proposal from v1.0)
// Called by Yogesh after manually submitting on Upwork. Creates a row in upwork_proposals.
{
  gig_id: string,
  proposal_text: string,
  bid_amount: number,
  bid_type: 'hourly' | 'fixed',
  connects_spent: number,           // Gap 2 fix: stored in upwork_proposals
  screening_answers?: Array<{ question: string, answer: string }>  // Gap 2 fix: JSONB
}

// search_gigs
{
  id?: string,                      // Gap 6 fix: exact ID lookup
  status?: GigStatus,
  priority?: string,
  posted_after?: string,
  query?: string
}

// log_contract
// Gap 4 fix: signature now fully defined. Call at contract start; update at close.
{
  gig_id: string,
  proposal_id: string,
  client_name: string,
  contract_type: 'hourly' | 'fixed',
  rate: number,
  total_value?: number,             // Nullable at start — set when contract closes
  started_at: string,               // ISO 8601
  completed_at?: string,            // Nullable until contract closes
  earnings?: number,                // Net after Upwork fees — set at close
  review_received?: boolean,
  review_score?: number
}

// get_pipeline_overview
// Returns: total gigs by status, proposals sent this week,
//          response rate (responded / submitted), active contracts count
```

---

## Environment Variables Required

```bash
UPWORK_SUPABASE_URL=https://xxxx.supabase.co
UPWORK_SUPABASE_KEY=service_role_key_here
```

No Upwork credentials stored. Session is managed via `playwright/session.json` (gitignored).

---

## Known Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| playwright | ^1.44 | Browser automation (read-only) |
| @supabase/supabase-js | ^2.x | DB client |
| node | 20+ | Runtime |
| typescript | ^5.x | Optional but recommended |

---

## Testing Strategy

1. **Setup agent test:** Run the interview, verify all three MASTER_* files are produced and populated
2. **Scraper test:** Run against Upwork search, verify at least 5 results returned and scoring logic fires correctly
3. **Proposal generation test:** Generate proposals for 3 real gigs manually found on Upwork, review for quality and accuracy
4. **End-to-end test:** Run full pipeline (find gig → score → generate proposal) on 1 real gig before treating as production

---

## Estimated Build Time

| Phase | Work | Estimate |
|-------|------|---------|
| Phase 0: Setup agent | Interview flow + agent file | 2-3 hours |
| Phase 1A: Foundation | Supabase + MCP server | 3-4 hours |
| Phase 1B: Gig Discovery | Playwright scraper + scorer + agent | 5-7 hours |
| Phase 1C: Proposal Writer | Proposal writer agent | 3-4 hours |
| Testing + polish | End-to-end test + fixes | 3-4 hours |
| **Total Phase 1** | | **16-22 hours** |

Phase 2 (response monitoring, contract management, rate optimisation): additional 10-15 hours.

**Removed from v1.0 estimate:** Phase 1D submitter (6-8 hours) and associated session/submission complexity.

---

## Recommended Build Order

1. Run Phase 0 setup agent first — get the knowledge base files done. Nothing else is useful without them.
2. Supabase schema — everything else writes to it.
3. Build and test the Playwright scraper in isolation before wiring to agents.
4. Build the proposal writer as a standalone test on 3 gigs before integrating.
5. Wire everything together and run one full end-to-end cycle.
6. Only then enable the daily scheduled run.
