# Frontend demo plan

Start point: branch `frontend-demo` from `m2-partner-onboarding` at `f1aff40`.

## Build steps

| Step | Scope                                                                                   | Status      |
| ---- | --------------------------------------------------------------------------------------- | ----------- |
| 1    | Shared types, API client, mock adapter, fixtures, theme and branding config, app shell  | Done        |
| 2    | Public site and authentication                                                          | Not started |
| 3    | Admin area                                                                              | Not started |
| 4    | Partner area                                                                            | Not started |
| 5    | Polish, responsive review at 375/768/1280 px, accessibility, performance/code splitting | Not started |
| 6    | Documentation and demo script                                                           | Not started |

## Screen checklist

Status means complete for the frontend demo, not merely present in the M2 implementation.

| Screen                                                              | Status      |
| ------------------------------------------------------------------- | ----------- |
| Shared app shell, navigation, theme, and brand config               | Done        |
| `/` public landing                                                  | Not started |
| `/services` catalogue                                               | Not started |
| `/plans` partner plans                                              | Not started |
| `/apply` application                                                | Not started |
| `/apply/verify` email verification                                  | Not started |
| `/login` partner sign-in                                            | Not started |
| `/forgot-password`, `/reset-password` partner recovery              | Not started |
| `/2fa/verify` partner second factor                                 | Not started |
| `/admin/login`, `/admin/forgot-password` admin sign-in and recovery | Not started |
| `/admin/2fa/setup`, `/admin/2fa/verify` admin second factor         | Not started |
| `/admin` dashboard                                                  | Not started |
| `/admin/applications` review queue                                  | Not started |
| `/admin/partners` partner management                                | Not started |
| `/admin/users` user management                                      | Not started |
| `/admin/audit` audit log                                            | Not started |
| `/partner` partner dashboard                                        | Not started |
| `/partner/profile` profile and KYC                                  | Not started |
| `/partner/network` partner network                                  | Not started |

## Review notes

- Keep MongoDB as the primary database; Redis remains limited to sessions and queues.
- Use deterministic local mock data only when demo mode is explicitly enabled. Normal mode continues to use the API.
- Keep the deferred M2 tasks listed in `docs/PROGRESS.md` until the demo is accepted.
- Do not merge `frontend-demo` to `main` without owner approval.
