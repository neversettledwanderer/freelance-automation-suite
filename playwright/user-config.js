/**
 * User Configuration — JS mirror of USER_CONFIG.md
 *
 * Generated and updated by the /setup agent.
 * Imported by scraper.js, scorer.js, and check-session.js.
 *
 * Do not edit manually — run /setup to update values.
 * If you need to make a quick fix, update both this file AND USER_CONFIG.md.
 */

module.exports = {

  // ── Identity ──────────────────────────────────────────────
  userName: '[Your Name]',
  upworkHeadline: '[Your Upwork headline]',
  nicheSummary: '[One sentence — what you do and for whom]',

  // ── Rate Strategy ─────────────────────────────────────────
  hourlyRateMin: 0,   // Phase 1 minimum — update after setup interview
  hourlyRateMax: 0,   // Phase 1 maximum — update after setup interview

  // ── Search Queries ────────────────────────────────────────
  // Max 10. Scraper runs these in batches of 3 with gaps between sessions.
  searchQueries: [
    // Populated by setup agent
  ],

  // ── Scoring Keywords ──────────────────────────────────────
  // Adjust weights in scorer.js if needed (default: high=10, med=5, mismatch=-20)

  highFitKeywords: [
    // Core keywords for your niche — populated by setup agent
  ],

  medFitKeywords: [
    // Adjacent or secondary keywords — populated by setup agent
  ],

  mismatchKeywords: [
    // Gigs containing these are heavily penalised — populated by setup agent
  ],

  // ── Proposal Rules ────────────────────────────────────────
  skipIfProposalsOver: 50,   // Skip gigs with more than this many proposals
  warnIfProposalsOver: 20,   // Add competition warning above this threshold

};
