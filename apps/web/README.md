# Web application

Responsive Next.js portal with public, partner, and admin route groups.

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
