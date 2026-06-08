/**
 * Gig Scoring Algorithm
 *
 * Returns a score 0–100 and a priority label (high / medium / low).
 * All input values are strings from the DOM — parse defensively.
 *
 * Keywords are loaded from playwright/user-config.js — edit there, not here.
 */

const {
  highFitKeywords: HIGH_FIT_KEYWORDS,
  medFitKeywords: MED_FIT_KEYWORDS,
  mismatchKeywords: MISMATCH_KEYWORDS,
  skipIfProposalsOver,
  warnIfProposalsOver,
} = require('./user-config');

function parseHourlyRate(budgetStr = '') {
  // Handles strings like "$40.00/hr", "$40-80/hr", "Up to $60/hr"
  const match = budgetStr.match(/\$?([\d,]+)/);
  return match ? parseFloat(match[1].replace(',', '')) : null;
}

function parseBudget(budgetStr = '') {
  // Handles strings like "$500", "$1,000–$5,000", "Up to $2,000"
  const match = budgetStr.match(/\$?([\d,]+)/);
  return match ? parseFloat(match[1].replace(',', '')) : null;
}

function parseClientRating(ratingStr = '') {
  // Handles strings like "4.93 of 5", "4.93", "No reviews yet"
  const match = ratingStr.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function parsePostedHoursAgo(postedStr = '') {
  // Handles strings like "2 hours ago", "1 day ago", "3 days ago"
  if (postedStr.includes('hour')) {
    const m = postedStr.match(/(\d+)/);
    return m ? parseInt(m[1]) : 999;
  }
  if (postedStr.includes('day')) {
    const m = postedStr.match(/(\d+)/);
    return m ? parseInt(m[1]) * 24 : 999;
  }
  if (postedStr.includes('minute') || postedStr.includes('just')) return 0;
  return 999;
}

function scoreGig(gig) {
  let score = 0;
  const text = `${gig.title || ''} ${gig.description || ''}`.toLowerCase();

  HIGH_FIT_KEYWORDS.forEach(kw => { if (text.includes(kw)) score += 10; });
  MED_FIT_KEYWORDS.forEach(kw => { if (text.includes(kw)) score += 5; });
  MISMATCH_KEYWORDS.forEach(kw => { if (text.includes(kw)) score -= 20; });

  // Budget scoring — handles both fixed and hourly
  const isHourly = (gig.budget || '').toLowerCase().includes('/hr');
  if (isHourly) {
    const rate = parseHourlyRate(gig.budget);
    if (rate !== null && rate >= 40) score += 10;
    if (rate !== null && rate >= 60) score += 10;
  } else {
    const budget = parseBudget(gig.budget);
    if (budget !== null && budget >= 500) score += 10;
    if (budget !== null && budget >= 1000) score += 10;
  }

  if (gig.paymentVerified) score += 10;

  const rating = parseClientRating(gig.clientRating);
  if (rating !== null && rating >= 4.5) score += 10;

  const hoursAgo = parsePostedHoursAgo(gig.postedAt);
  if (hoursAgo < 6) score += 15;
  else if (hoursAgo < 24) score += 5;

  const proposals = parseInt(gig.proposalCount) || 0;
  if (proposals > skipIfProposalsOver) score -= 20;
  else if (proposals > warnIfProposalsOver) score -= 10;

  const finalScore = Math.max(0, Math.min(100, score));

  const priority =
    finalScore >= 70 ? 'high' :
    finalScore >= 40 ? 'medium' :
    'low';

  return { score: finalScore, priority };
}

module.exports = { scoreGig };
