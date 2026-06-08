# Upwork Freelance Automation Suite — Product Requirements Document

**Owner:** Yogesh Mistry
**Version:** 1.1
**Date:** 5 June 2026
**Status:** Active

---

## Change Log

| Version | Change |
|---------|--------|
| 1.0 | Initial draft including automated proposal submission |
| 1.1 | Removed automated submission. System now surfaces gigs and generates proposals; Yogesh submits manually on Upwork. Added setup agent (Phase 0). |
| 1.2 | Schema corrections: added `url` (UNIQUE) to `upwork_gigs`; added `connects_spent`, `screening_answers`, `created_at`, `updated_at` to `upwork_proposals`; added `created_at`, `updated_at` to `upwork_contracts`; changed `started_at`/`completed_at` from DATE to TIMESTAMPTZ. Added F1.5 session health check and notification feature. |

---

## 1. Overview

A freelance management suite that automates gig discovery and proposal writing for an AI Adoption / Digital Enablement consultant. Yogesh reviews found gigs, generates tailored proposals via the system, and submits manually on Upwork.

**Core goal:** Reduce time from gig discovery to a ready-to-submit proposal to under 15 minutes, with zero manual research or copy-paste work.

**What this system does NOT do:** Submit proposals automatically. Yogesh always clicks Submit on Upwork himself.

---

## 2. Problem Statement

Upwork freelance success requires:
- Monitoring job boards continuously for relevant gigs
- Submitting proposals within hours of posting (early proposals win disproportionately)
- Tailoring each proposal to the specific client's language and pain points
- Managing a pipeline of active proposals, contracts, and client relationships
- Tracking earnings, Connects spend, and conversion rates

Doing this manually across 10-20 gig categories is time-prohibitive. Discovery, triage, and proposal drafting can be automated. Submission stays manual.

---

## 3. Users

**Primary:** Yogesh Mistry — AI Adoption Consultant, Digital Enablement specialist, M365 Copilot practitioner

**Profile context:**
- Upwork title: AI Adoption Consultant | Training & Enablement
- Rate: $55-60/hr (entry), target $75-100/hr at 15+ reviews
- Service categories: AI adoption consulting, M365 Copilot training, digital adoption programmes, L&D design, AI literacy workshops, change management
- Connects budget: needs tracking (Upwork charges 6 Connects per proposal by default)

---

## 4. Target Gig Categories

### Primary (highest fit)
- AI adoption strategy and implementation
- Microsoft 365 / Copilot training and onboarding
- Digital adoption programme design
- AI literacy workshops for teams
- Change management — technology rollouts
- L&D / instructional design with AI tools

### Secondary (credible with existing background)
- AI workflow consulting (small business)
- Prompt engineering consulting
- Corporate training design (blended/online)
- Project management — digital transformation

### Exclude
- Software engineering / coding projects
- Data science / ML model building
- Graphic design / video production
- Any gig requiring physical presence outside London

---

## 5. System Components

### 5.0 Setup Agent (`upwork-setup`)
An interview-style onboarding agent that walks Yogesh through a structured conversation to produce all knowledge base files required for the system to work. Run once at project setup; re-run to update profile or proposal templates.

### 5.1 Gig Discovery Agent (`upwork-gig-finder`)
Searches Upwork for relevant posted projects via Playwright (read-only), scores and filters results, and adds qualifying gigs to the pipeline database. Presents a daily digest.

### 5.2 Proposal Writer Agent (`upwork-proposal-writer`)
Given a gig ID or URL, reads the job description plus Yogesh's knowledge base files and generates a tailored, ready-to-paste proposal with bid amount and screening question answers. Yogesh reviews and pastes into Upwork manually.

### 5.3 Pipeline Manager
Supabase database tracking gig status from discovery through to contract completion and payment.

### 5.4 Upwork Coach Agent (optional, Phase 2)
Strategy coaching: profile optimisation, rate calibration, specialisation advice, response rate analysis.

---

## 6. Feature Requirements

### Phase 0 — Setup

**F0.1 — Setup Agent (interview format)**
- Guide Yogesh through a structured interview to build all knowledge base files
- Cover sections: positioning & profile, work history & proof points, skills & tools, proposal style preferences, rate strategy, target gig categories
- Output: `MASTER_PROFILE.md`, `MASTER_PROPOSALS.md`, `MASTER_SKILLS.md`
- Conversational, one section at a time — not a form dump
- Allow partial runs: skip sections already completed, offer to update individual sections

### Phase 1 — Core Loop (MVP)

**F1.1 — Gig Search**
- Search Upwork job board for target categories (see Section 4) via Playwright (logged-in, read-only)
- Filter by: posted within last 24 hours, budget > $200 fixed or $40/hr+, client has payment verified
- Deduplicate against existing pipeline
- Add qualifying gigs to Supabase with source = "upwork"

**F1.2 — Gig Triage**
- Auto-score each gig: HIGH / MEDIUM / LOW based on keyword match, budget, and client history
- Flag gigs that mention specific tools (Copilot, M365, Claude, ChatGPT, AI adoption)
- Present daily triage summary to user for review

**F1.3 — Proposal Generation**
- Pull gig description, client history, and any screening questions
- Read master profile, skills, and proposal snippets from knowledge base
- Generate a tailored proposal: opening hook, relevant experience match, specific deliverable offer, call to action
- Proposal length: 150-250 words (Upwork sweet spot)
- Include rate and estimated delivery timeline
- Flag any gaps between gig requirements and Yogesh's current skills
- Output is a formatted, ready-to-paste block — not a draft requiring further editing

**F1.5 — Session Health Check & Notification**
- Run a pre-flight Playwright session check nightly at 22:00
- Navigate to Upwork's find-work page and assert the logged-in avatar selector is present
- If session is valid: log "Session OK — morning scrape ready to run" and exit cleanly
- If session is invalid: send a desktop notification (macOS `osascript` alert) with the message: "Upwork session expired — run `node playwright/save-session.js` before 06:30"
- If notification is triggered, the 06:30 scrape job checks for a valid session first and skips gracefully (no failed run, no empty digest) rather than aborting mid-scrape

**F1.4 — Pipeline Tracking**
- Gig statuses: `discovered`, `triaged`, `proposal_ready`, `submitted`, `viewed`, `shortlisted`, `interviewing`, `contract_offered`, `active`, `completed`, `archived`
- Yogesh manually updates status to `submitted` after pasting on Upwork
- Track: proposals sent this week, response rate, conversion rate
- Dashboard summary on demand: `get_pipeline_overview`

### Phase 2 — Growth Features

**F2.1 — Client Response Handling**
- Detect new messages from clients (via Playwright read of messages page)
- Draft response suggestions for common patterns (questions about experience, rate negotiation, scope clarification)
- Flag urgent messages for immediate attention

**F2.2 — Contract Management**
- Track active contracts: client, rate, hours/milestones, due dates
- Alert on approaching deadlines
- Draft milestone completion messages

**F2.3 — Review Solicitation**
- After contract completion, draft a polite review request message
- Track review status

**F2.4 — Rate Optimisation**
- Monitor win rate by rate bracket
- Alert when profile strength justifies a rate increase
- A/B test proposal openings over time

**F2.5 — Upwork Profile Optimisation Agent**
- Analyse profile completeness, keyword density, and search ranking signals
- Suggest profile copy improvements based on winning gig categories

---

## 7. Pipeline Database Schema

### Table: `upwork_gigs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| upwork_job_id | VARCHAR | Upwork's internal job ID |
| url | TEXT | Full gig URL — UNIQUE constraint for deduplication |
| title | TEXT | Gig title |
| client_id | VARCHAR | Upwork client profile ID |
| client_name | TEXT | |
| client_payment_verified | BOOLEAN | |
| client_rating | DECIMAL | Client's rating on Upwork |
| client_spent | VARCHAR | Total client spend on Upwork |
| budget_type | ENUM | fixed, hourly |
| budget_min | DECIMAL | |
| budget_max | DECIMAL | |
| posted_at | TIMESTAMPTZ | When gig was posted |
| expires_at | TIMESTAMPTZ | |
| description | TEXT | Full job description |
| skills_required | JSONB | Array of skill tags |
| proposals_count | INTEGER | Number of proposals already submitted |
| score | INTEGER | Auto-triage score 0-100 |
| priority | ENUM | high, medium, low |
| status | ENUM | discovered, triaged, proposal_ready, submitted, viewed, shortlisted, interviewing, contract_offered, active, completed, archived |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | Auto-set on insert |
| updated_at | TIMESTAMPTZ | Auto-updated on change |

### Table: `upwork_proposals`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| gig_id | UUID | FK to upwork_gigs |
| proposal_text | TEXT | Generated proposal text |
| bid_amount | DECIMAL | |
| bid_type | ENUM | hourly, fixed |
| submitted_at | TIMESTAMP | Set manually by Yogesh after submission |
| viewed_at | TIMESTAMP | |
| response_received_at | TIMESTAMP | |
| outcome | ENUM | pending, shortlisted, rejected, hired |
| connects_spent | INTEGER | Connects used when submitting |
| screening_answers | JSONB | Array of Q&A pairs for screening questions |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | Auto-set on insert |
| updated_at | TIMESTAMPTZ | Auto-updated on change |

### Table: `upwork_contracts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| gig_id | UUID | FK to upwork_gigs |
| proposal_id | UUID | FK to upwork_proposals |
| client_name | TEXT | |
| contract_type | ENUM | hourly, fixed |
| rate | DECIMAL | |
| total_value | DECIMAL | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | Nullable until contract closes |
| review_received | BOOLEAN | |
| review_score | DECIMAL | |
| earnings | DECIMAL | Net after Upwork fees |
| created_at | TIMESTAMPTZ | Auto-set on insert |
| updated_at | TIMESTAMPTZ | Auto-updated on change |

---

## 8. Proposal Template System

### Structure
Each proposal follows a 4-part structure:

1. **Hook** (1-2 sentences): Address the client's specific pain point using their own language from the job post. Never start with "I".
2. **Proof** (2-3 sentences): Specific relevant experience with a concrete outcome. Match to their industry/use case where possible.
3. **Offer** (1-2 sentences): Specific deliverable you will produce. Make it tangible.
4. **CTA** (1 sentence): Low-friction next step. "Happy to jump on a 15-minute call to talk through your setup."

### Output format
The proposal writer produces a clean, copy-paste-ready block of text — no markdown formatting, no bullet points, no headers. Plain paragraphs ready to drop into Upwork's proposal text field.

### Rate strategy
- Fixed price gigs under $500: bid as posted or 10% below
- Fixed price gigs $500-2000: bid at full rate, justify with deliverable detail
- Hourly: always bid $55-60 in Phase 1

### Connects guidance (informational only — no automation)
- Standard 6 Connects on HIGH gigs
- Consider Boosted Proposals for perfect-fit gigs posted under 2 hours ago
- Skip gigs with 50+ proposals already

---

## 9. Non-Functional Requirements

- **Speed:** Gig discovery to ready-to-paste proposal in under 15 minutes
- **Honesty:** Never fabricate credentials or claim experience not in master profile
- **Compliance:** Read-only Playwright usage only. No automated form submission. No fake reviews. No account sharing.
- **Resilience:** Handle Upwork UI changes gracefully — use semantic selectors, not brittle XPath
- **Logging:** All generated proposals logged with full audit trail

---

## 10. Out of Scope (All Phases)

- Automated proposal submission (intentional — Yogesh submits manually)
- Multi-account management
- Subcontracting / team proposals
- Non-English language markets
- Upwork Enterprise / client-side features
- Payment processing integration

---

## 11. Success Metrics

| Metric | Target (Month 3) |
|--------|-----------------|
| Proposals sent per week | 10-15 |
| Response rate | 20%+ |
| Contract conversion rate | 10%+ |
| Active contracts | 2-3 simultaneously |
| Monthly earnings (net) | $1,500+ |
| JSS (Job Success Score) | 90%+ |
| Hourly rate | $65+ |
| Time to ready proposal | < 15 minutes from gig discovery |
