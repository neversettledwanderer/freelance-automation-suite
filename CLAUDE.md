# Upwork Freelance Automation Suite — Claude Config

## Project
Owner: See USER_CONFIG.md → Identity
Root: (set to your local clone path)
Status: Sprint 0 — run /setup first

## First-Time Setup
1. Run /setup — this builds all knowledge base files and USER_CONFIG.md for your niche
2. Set UPWORK_SUPABASE_URL and UPWORK_SUPABASE_KEY in .env
3. Run `node playwright/save-session.js` to save your Upwork login session
4. Deploy mcp-server/ as a Supabase Edge Function and register as upwork-hunt

## Agents

| Command | File | Purpose |
|---------|------|---------|
| /setup | agents/upwork-setup.md | Interview agent — builds all knowledge base and config files |
| /find-gigs | agents/upwork-gig-finder.md | Runs Playwright scraper, scores, inserts to DB |
| /write-proposal <gig-id or url> | agents/upwork-proposal-writer.md | Generates ready-to-paste proposal |

## Config & Knowledge Base Files (built by /setup — do not edit manually)
- USER_CONFIG.md — niche, search queries, scoring keywords, rate strategy
- playwright/user-config.js — JS mirror of USER_CONFIG.md (used by scraper and scorer)
- MASTER_PROFILE.md — Upwork headline, positioning, rate strategy, target categories
- MASTER_PROPOSALS.md — Proof snippets, hooks, voice and style notes
- MASTER_SKILLS.md — Skills rated Confident / Comfortable / Familiar

## Writing Rules (enforced by all agents)
- Never start a proposal with "I"
- Never claim skills not in MASTER_SKILLS.md
- Proposals are plain text only — no markdown, no bullet points, no bold
- Proposal length: 150-250 words
- Rate: read from USER_CONFIG.md → Rate Strategy
- Never fabricate credentials, outcomes, or experience

## Environment
- UPWORK_SUPABASE_URL — set in .env
- UPWORK_SUPABASE_KEY — set in .env (service role)
- Playwright session: playwright/session.json (gitignored — run save-session.js to create)

## Scheduled Jobs
- 22:00 nightly: node playwright/check-session.js (pre-flight — sends macOS notification if re-auth needed)
- 06:30 daily: upwork-gig-finder (scrape all queries across sessions)
- 08:30 daily: digest — show new HIGH/MEDIUM gigs, pipeline status

## MCP Server
- Registered as: upwork-hunt
- Tools: add_gig, get_gig, update_gig, search_gigs, mark_submitted, log_contract, get_pipeline_overview

## Key Constraints
- Read-only Playwright — no automated form submission ever
- User submits all proposals manually on Upwork
- Max 3 search queries per Playwright session, 25-40 min gap between sessions
- Max 10 search queries per calendar day (tracked in playwright/state.json)
