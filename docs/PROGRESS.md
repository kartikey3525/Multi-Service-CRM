# Progress

Task status and commit evidence are maintained in [ROADMAP.md](ROADMAP.md). Historical task notes and prior milestone checklists remain in [MILESTONES.md](MILESTONES.md) for reference.

## Verification status

| Item                               | Last verified (date, who, how)                                                                                | Status     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| Lint, typecheck, unit tests, build | 2026-11-26, Codex, `make check`; all passed                                                                   | Verified   |
| Mongo integration                  | 2026-11-26, Codex, `make check`; Docker socket denied before integration target; two Mongo-only tests skipped | Unverified |
| Authorization probe                | 2026-11-26, Codex; `make mongo-probe` not reached because `make api-test` failed                              | Unverified |
| Migration application              | No application evidence for M3-01 migration                                                                   | Unverified |
| Playwright/browser                 | Historical aggregate result in archived notes; current route-level run not evidenced                          | Unverified |
| Responsive 375/768/1280            | Historical aggregate 35-route sweep recorded; route membership/current state not evidenced                    | Unverified |
| Accessibility                      | No recorded run                                                                                               | Unverified |
| Local server/site reachability     | Not checked in the 2026-11-26 run                                                                             | Unverified |

Last check limitation: Docker could not access `/Users/admin/.docker/run/docker.sock` (`permission denied`).
