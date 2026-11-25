# Frontend demo plan

Start point: branch `frontend-demo` from `m2-partner-onboarding` at `f1aff40`.

## Build steps

| Step | Scope                                                                                   | Status      |
| ---- | --------------------------------------------------------------------------------------- | ----------- |
| 1    | Shared types, API client, mock adapter, fixtures, theme and branding config, app shell  | Done        |
| 2    | Public site and authentication                                                          | Done        |
| 3    | Admin area                                                                              | Not started |
| 4    | Partner area                                                                            | Not started |
| 5    | Polish, responsive review at 375/768/1280 px, accessibility, performance/code splitting | Not started |
| 6    | Documentation and demo script                                                           | Not started |

## Screen checklist

Status means complete for the frontend demo, not merely present in the M2 implementation.

| Screen                                                              | Status      |
| ------------------------------------------------------------------- | ----------- |
| Shared app shell, navigation, theme, and brand config               | Done        |
| `/` public landing                                                  | Done        |
| `/services` catalogue                                               | Done        |
| `/plans` partner plans                                              | Done        |
| `/apply` application                                                | Done        |
| `/apply/verify` email verification                                  | Done        |
| `/login` partner sign-in                                            | Done        |
| `/forgot-password`, `/reset-password` partner recovery              | Done        |
| `/2fa/verify` partner second factor                                 | Done        |
| `/admin/login`, `/admin/forgot-password` admin sign-in and recovery | Done        |
| `/admin/2fa/setup`, `/admin/2fa/verify` admin second factor         | Done        |
| `/admin` dashboard                                                  | Not started |
| `/admin/applications` review queue                                  | Not started |
| `/admin/partners` partner management                                | Not started |
| `/admin/users` user management                                      | Not started |
| `/admin/audit` audit log                                            | Not started |
| `/partner` partner dashboard                                        | Not started |
| `/partner/profile` profile and KYC                                  | Not started |
| `/partner/network` partner network                                  | Not started |

## Review notes

- Step 2 passed on the local site. All 21 existing routes were opened at 375, 768, and 1280 px; the browser check reported no page errors, console errors, or horizontal overflow. The 10-test Playwright suite passed, including partner/admin demo sign-in and public application submission.
- Public/auth screenshots at 1280 px are in `docs/screenshots/`; see that folder's README.
- Keep MongoDB as the primary database; Redis remains limited to sessions and queues.
- Use deterministic local mock data only when demo mode is explicitly enabled. Normal mode continues to use the API.
- Keep the deferred M2 tasks listed in `docs/PROGRESS.md` until the demo is accepted.
- Do not merge `frontend-demo` to `main` without owner approval.
