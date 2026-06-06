# templates/

Document and message templates. Scripts in `scripts/` read these files and substitute variables before delivery or export.

## Planned templates

| File | Format | Purpose |
|------|--------|---------|
| `invoice.html.j2` | Jinja2/HTML | Invoice layout rendered to PDF |
| `proposal.md.j2` | Jinja2/Markdown | Project proposal document |
| `welcome_email.md.j2` | Jinja2/Markdown | Client welcome email body |
| `follow_up_email.md.j2` | Jinja2/Markdown | Payment or feedback follow-up |
| `contract.md.j2` | Jinja2/Markdown | Simple freelance service contract |

## Variable conventions

Templates use `{{ variable_name }}` syntax (Jinja2). Each template should have a corresponding `*.schema.json` that documents the expected variables and their types.
