# Web application

Responsive Next.js portal with public, partner, and admin route groups.

## Frontend demo foundation

- Shared display/API contracts live in `src/lib/contracts.ts`.
- `src/lib/api-client.ts` sends requests to the real API by default. Selecting **Preview demo data** stores an explicit browser-local demo-mode flag and routes requests to `src/lib/mock-adapter.ts` instead.
- Realistic, deterministic public, partner, admin, KYC, application, and audit fixtures live in `src/lib/demo-fixtures.ts`. Demo sign-in uses any valid email and non-empty password; the admin authenticator step accepts any entered code. These values are local demo behavior and are not sent to the API.
- Brand defaults live in `src/lib/brand.ts`. Shared route-group shells live in `src/components/app-shell.tsx`; the light theme and responsive base styles live in `src/app/globals.css`.
- Exit demo mode with **Demo data on · exit** in the header to return to the real API.

## Public entry points

- `/` public home page.
- `/partner` and `/admin` portal entry points.
- `/login` partner sign-in placeholder and `/admin/login` separate admin sign-in placeholder.

## Invariants

- The browser calls the API; it never connects directly to MongoDB.
- Admin and partner pages use separate layouts and sign-in entry points.
- All user-visible strings belong in `src/messages/en.json` for translation readiness.

## Checks that protect the application

M0 acceptance covers route rendering and portal redirects. Component and end-to-end tests are added in their roadmap tasks.
