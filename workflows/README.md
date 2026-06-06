# workflows/

Multi-step workflow definitions that chain several scripts or API calls together. Designed to be triggered by a scheduler, webhook, or workflow engine (e.g. GitHub Actions, n8n, Make, cron).

## Planned workflows

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `new_project.yml` | Manual / webhook | Create Notion page → send welcome email → generate contract |
| `invoice_cycle.yml` | Scheduled (monthly) | Generate invoice → send to client → log to spreadsheet |
| `overdue_follow_up.yml` | Scheduled (weekly) | Query unpaid invoices → send follow-up emails |
| `project_close.yml` | Manual | Send final invoice → request testimonial → archive project |

## Format

Workflows can be plain YAML (documenting the steps) or runnable workflow files for your chosen automation platform. Prefix platform-specific files with the platform name, e.g. `gh_` for GitHub Actions.
