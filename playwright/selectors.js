/**
 * Upwork DOM Selector Registry
 *
 * ALL data-test attributes live here. When Upwork changes their DOM,
 * update this file only — never hunt through scraper.js.
 *
 * Status: UNVERIFIED — these are starting-point values from DOM inspection
 * notes in BUILD_NOTES.md. Run `node playwright/save-session.js`, navigate
 * to a live Upwork search, and verify each selector before Sprint 2 begins.
 *
 * Last verified: not yet verified against live DOM
 */

module.exports = {
  // Job listing cards
  JOB_TILE:         '[data-test="job-tile"]',
  JOB_TITLE:        '[data-test="job-title"]',
  JOB_TITLE_LINK:   '[data-test="job-title"] a',
  JOB_BUDGET:       '[data-test="budget"]',
  JOB_POSTED_ON:    '[data-test="posted-on"]',
  JOB_PROPOSALS:    '[data-test="proposals"]',
  JOB_DESCRIPTION:  '[data-test="job-description-text"]',

  // Client information
  CLIENT_RATING:    '[data-test="client-rating"]',
  CLIENT_SPENT:     '[data-test="client-total-spent"]',
  CLIENT_NAME:      '[data-test="client-name"]',
  PAYMENT_VERIFIED: '[data-test="payment-verified"]',

  // Session / auth check
  USER_AVATAR:      '[data-test="user-avatar"]',
};
