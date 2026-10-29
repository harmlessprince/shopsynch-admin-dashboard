# 014: Bulk refresh plan terms screen

**Status:** ready-for-agent
**Type:** AFK
**Parent PRD:** None. Follows `ecommerceapi/issues/163-bulk-refresh-plan-terms-by-plan.md`
**Blocked by:** admin 012 (`admin_dashboard/issues/012-plan-terms-in-force-and-single-refresh.md`) and ecommerceapi 163 (`ecommerceapi/issues/163-bulk-refresh-plan-terms-by-plan.md`)
**GitHub tracker:** not filed yet

## What to build

A screen where a support or product admin gives every store on one plan the new plan terms. They pick the plan and the mode, see a preview of exactly what would change and which stores are skipped, confirm with a reason, watch the run finish, and can look back at earlier runs.

## Acceptance criteria

- [ ] The admin picks a plan and a mode. Improvements only is selected by default and described in plain words as "only gives stores more, never takes anything away"; full refresh is described as able to remove things.
- [ ] A preview button shows the numbers from the backend (matched, would change, already up to date, skipped) and the summary of differences, and nothing is changed by it.
- [ ] Stores skipped for restrictive differences or for their status are listed with the reason, and the list can be searched.
- [ ] Starting the real run needs a reason, and full refresh needs an extra confirmation that repeats the plan and the number of stores affected.
- [ ] The real run cannot be started without a recent preview of the same plan and mode; the screen explains this and offers to run the preview again.
- [ ] While a run is going, the screen shows progress and the final counts, and a second run on the same plan is not offered while one is in progress.
- [ ] An option lets the admin choose to notify the updated stores, off by default, with the effect explained.
- [ ] A history shows earlier runs: who, when, plan, mode, reason and counts, and opens the per-store results.
- [ ] A report view lists stores whose snapshot differs from the live plan, with counts per plan.
- [ ] Validation and server errors appear beside the field or action that caused them.
- [ ] Only admins with the plan management permission see the screen and its menu entry.
