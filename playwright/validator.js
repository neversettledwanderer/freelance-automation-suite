/**
 * Per-card validation
 *
 * Runs on every raw card object returned by the scraper before
 * it touches the scoring function or the database.
 *
 * Broken selectors return undefined (optional chaining), not exceptions.
 * This catches the silent corruption case: a card with title=undefined
 * would otherwise score, insert, and pollute the pipeline.
 */

const REQUIRED_FIELDS = ['title', 'id', 'url'];

function validateJobCard(card, logger) {
  const missing = REQUIRED_FIELDS.filter(f => !card[f]);

  if (missing.length > 0) {
    const msg = `Card skipped — missing required fields: ${missing.join(', ')}`;
    if (logger) logger.warn(msg, { rawCard: card });
    else console.warn(msg, JSON.stringify(card));
    return false;
  }

  return true;
}

module.exports = { validateJobCard };
