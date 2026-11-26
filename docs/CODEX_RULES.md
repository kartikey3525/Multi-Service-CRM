# Working rules

- Priority: Phase A frontend on demo data, then Phase B backend one feature at a time, then Phase C release work. Never skip a task or gate in `docs/ROADMAP.md`.
- Report what was actually run and what was not, including Docker, server, browser, Playwright, Mongo, responsive and accessibility checks. Mark missing evidence unverified.
- Write tests first for implementation tasks. One task per commit; use the new task ID in the commit message.
- Never force-push, rewrite history, delete branches, merge to `main`, or push without owner approval.
- Preserve unrelated working-tree changes and local data. Never read or commit secrets.
- Every report ends with a `NEXT PROMPT` section containing a complete, self-contained prompt for the next unchecked task. It names the task ID, docs to read, preconditions and these rules in short form; the prompt itself ends by requiring the same `NEXT PROMPT` section.
- MongoDB is primary; Redis is limited to sessions/queues. Repository access is scoped to actor hierarchy. Money uses integer paise. Ledger and commission code require owner line-by-line review.
