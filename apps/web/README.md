# Web application

Responsive Next.js portal with public, partner, and admin route groups.

## Frontend demo foundation

- Run the mock-only site from the repository root with `make demo` (default URL `http://localhost:3000`); it starts only the Next.js web server and requires no Docker, MongoDB, Redis, API, or external services. The equivalent package command is `pnpm --filter @franchise-crm/web dev`.
- Mock mode is the default. Set `VITE_API_MODE=http` before starting Next.js to send browser calls to the real `/api` endpoints; the API client keeps the same transport surface.
- `src/api/client.ts` contains typed domain methods. `src/lib/api-client.ts` routes them through either HTTP or the mock transport in `src/lib/mock-adapter.ts`.
- Shared Mongo record Zod schemas and inferred types live in `@franchise-crm/shared`; `src/lib/contracts.ts` re-exports frontend view types.
- Fixtures for roles, partners, orders, services, wallet requests, immutable ledger entries, payouts, customers, tickets, KYC, notifications, and audit events live in `src/lib/demo-fixtures.ts` and `src/lib/demo-business-fixtures.ts`. Mutations persist in browser localStorage; use **Reset demo data** to restore the initial state.
- Mock requests simulate 200–500 ms latency and a 1% error rate; set `franchise-crm-mock-error-rate` in localStorage to `0` for deterministic checks. Demo credentials and codes stay local to the mock transport.
- Brand defaults live in `src/lib/brand.ts`. Shared route-group shells live in `src/components/app-shell.tsx`; the light theme and responsive base styles live in `src/app/globals.css`.
- Switch from the mock transport with **Use live API** in the header.

## Partner growth demo flows

- `/partner/leads` creates consent-recorded leads, scopes them to the partner subtree, and follows `new → contacted → qualified → won`; `lost` is available from every active stage and `won`/`lost` are terminal.
- `/p/[slug]` submits through the mock API. The hidden honeypot is silently discarded, consent is required, and the mock returns the standard `{ code, message }` error with `RATE_LIMITED` after the per-IP or per-slug limit. Public leads are assigned to the lead-page owner.
- `/partner/learn` stores lesson completion and quiz scores for the signed-in demo user. A score of at least 80% is required for each quiz; the printable certificate can be issued once after all lessons and quizzes pass.
- `/partner/tools/invoice` saves partner-scoped clients and invoice history, issues gapless per-partner numbers per April–March financial year under concurrent mock requests, and uses shared integer-paise Money/GST calculation. It supports browser printing; PDF generation is not part of the mock.
- All new flow copy is in `src/messages/en.json`; mock data resets with **Reset demo data**.

## Public entry points

- `/` public home page.
- `/partner` and `/admin` portal entry points.
- `/login` partner sign-in placeholder and `/admin/login` separate admin sign-in placeholder.

## Client demo run sheet

1. Run `make demo` from the repository root. Confirm the browser address is `http://localhost:3000` and leave the API mode set to **Mock demo**.
2. Start at `/`, show service categories and partner plans, then submit a sample application at `/apply`. Use the generated status link to show the applicant-side progress page.
3. Open `/admin/login`, choose the partner review staff shortcut, enter any non-empty password and demo authenticator code `123456`. In Applications, review a seeded case and use the available review action.
4. Sign in at `/login` as the master distributor. The dashboard summarizes wallet, orders, and support. Visit Services to place a sample customer order, then Wallet to submit a top-up request.
5. In Leads, add a prospect with consent and move it through the pipeline. In Learning and marketing kit, mark a module complete and download an outreach template.
6. Open Invoice builder, calculate both local and inter-state GST examples, and print the draft preview. In Lead pages, create and publish a page, open its public link, and submit a sample enquiry; confirm the result appears in Leads.
7. Show Customers, Support, Team, Notices, Commissions, and Payouts. Use the search and notification controls in the portal header.
8. Return to the admin workspace to demonstrate the order queue, top-up approvals, report CSV download, and audit trail. Finish by choosing **Reset demo data**.

The demo accounts, simulated actions, and boundaries are documented in the repository's `docs/DEMO.md`. Invite email, 2FA, payments, tokenized customer links, and document storage shown in mock mode are browser simulations.

## Invariants

- The browser calls the API; it never connects directly to MongoDB.
- Admin and partner pages use separate layouts and sign-in entry points.
- All user-visible strings belong in `src/messages/en.json` for translation readiness.

## Checks that protect the application

`pnpm --filter @franchise-crm/shared test`, `pnpm --filter @franchise-crm/web test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and the focused mock Playwright suite cover the shared rules, fixture schemas, transport permissions, portal behavior, and public flows. The API-backed part of `make check` requires the existing local Docker/Mongo stack.
