# freelance-automation-suite

A collection of scripts, workflows, and templates to automate repetitive freelance business tasks — invoicing, client onboarding, project tracking, and more.

## Structure

```
freelance-automation-suite/
├── scripts/        # Standalone automation scripts
├── workflows/      # Multi-step workflow definitions
├── templates/      # Document and message templates
└── docs/           # Usage guides and reference
```

## Getting Started

1. Clone the repo and install dependencies (see each subdirectory's README for specifics).
2. Copy `.env.example` to `.env` and fill in your credentials.
3. Run scripts directly or wire them into your workflow tool of choice.

## Areas Covered

- **Invoicing** — generate and send invoices from a template
- **Client onboarding** — automate welcome emails, contract delivery, project setup
- **Time tracking** — parse time logs and produce billing summaries
- **Proposals** — fill proposal templates from a project brief
- **Follow-ups** — scheduled reminder messages for outstanding invoices or feedback

## Dependencies

Depends on the specific script — see each subdirectory. Most scripts target Python 3.11+ or Node 20+.

## License

MIT
