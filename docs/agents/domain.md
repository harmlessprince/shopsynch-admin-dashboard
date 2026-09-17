# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- **`agents/knowledge/form-components-rule.md`** — currently the only knowledge
  file in this repo.
- **`CLAUDE.md`** and **`AGENTS.md`** at this repo's root.

This repo has **no domain model of its own**. The domain vocabulary is owned by
`ecommerceapi/agents/knowledge/domains.md` in the sibling repo — use those terms
rather than inventing admin-local names for the same concepts.

## Use the knowledge base's vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a
hypothesis, a test name), use the term as the knowledge base defines it. Don't
drift to synonyms it avoids.

If the concept you need isn't documented yet, that's a signal — either you're
inventing language the project doesn't use (reconsider), or there's a real gap
worth recording with the repo's own `capture-learning` / `extract-learning`
convention.

## Flag conflicts

If your output contradicts a documented decision or cross-domain rule, surface it
explicitly rather than silently overriding:

> _Contradicts the cross-domain rule in `domains.md` (product domains must not
> depend on order domains) — but worth reopening because…_

## On `CONTEXT.md` and `docs/adr/`

The mattpocock skills default to a root `CONTEXT.md` glossary plus `docs/adr/`.
**This repo does not use that layout** — `agents/knowledge/` is the single source
of truth, and the workspace root's `AGENTS.md` already routes agents to it.

Do not create `CONTEXT.md` or `docs/adr/` here. A second domain doc alongside
`agents/knowledge/` would compete with it, and agents would read whichever they
found first. Extend the knowledge base instead.
