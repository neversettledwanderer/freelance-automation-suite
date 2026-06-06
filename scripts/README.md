# scripts/

Standalone scripts that perform a single, focused task. Each script should be runnable on its own with minimal setup.

## Planned scripts

| Script | Language | Purpose |
|--------|----------|---------|
| `generate_invoice.py` | Python | Render an invoice PDF from a YAML/JSON project brief |
| `send_invoice.py` | Python | Email an invoice to a client |
| `billing_summary.py` | Python | Parse a time-tracking export and produce a billing report |
| `send_proposal.py` | Python | Fill a proposal template and deliver it via email |
| `follow_up.py` | Python | Send a payment or feedback follow-up for a given invoice ID |

## Conventions

- Each script reads config from `.env` (root) and accepts CLI arguments.
- Scripts exit with code `0` on success and a non-zero code on failure.
- No script should have side effects outside its stated purpose.
