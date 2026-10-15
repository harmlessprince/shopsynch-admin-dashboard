## Parent

`ecommerceapi/agents/knowledge/plans-and-gating.md` (admin plan management)

Status: done

## What to build

Plan work on the admin side has no guidance yet. Add `admin_dashboard/agents/knowledge/plan-management.md` (what the admin can and cannot change; that catalog plans are rewritten from code at every backend start; the three rule kinds and their missing-key defaults; the pages: plans editor, merchant effective-access panel, retired-plan report, resync) and `admin_dashboard/agents/skills/manage-plans/SKILL.md` (adding an admin screen or field for plan data, with links to the backend note and skill `gate-by-plan`). Link both from `admin_dashboard/AGENTS.md` and the workspace `AGENTS.md`.

## Acceptance criteria

- [x] The knowledge note and skill exist, are accurate for the screens built by 006 to 009, and link to the backend note and skill.
- [x] Both are listed in `admin_dashboard/AGENTS.md` and the workspace `AGENTS.md`.

## Blocked by

- `admin_dashboard/issues/006-structured-plan-rule-editor.md` through `009-resync-subscriptions-to-test.md` (write it once the screens exist)

## User stories addressed

The next developer is not lost debugging plans.
