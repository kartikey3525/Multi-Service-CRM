# Quality, security, deployment, and risks

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.

## Source page 39

Catalogue entries that need an adapter are created inactive, with fulfilment =
adapter and a coming-soon label.
Turning an adapter on needs: provider sandbox credentials in env, a settings page,
contract tests with recorded fixtures, an end-to-end test, and a written sign-off in the
release checklist that the required licence or agreement is in place.
Start the approval conversations early; they run in parallel with the engineering plan
and decide when each item can be scheduled. 14. Quality, security, deployment and definition of done
14.1 Targets (proposed starting values; challenge them in M0)
14.2 Security checklist (each item has a test or a recorded check)
Passwords hashed with argon2; sessions in HTTP-only, secure, same-site cookies;
CSRF protection on all state-changing calls.
Admin accounts always use 2FA; admin and partner logins are separate.
Every route has a permission; repository queries scope partner data with
`scopeToActor(actor, filter)` or document a permission-guarded admin-only bypass.
Area Target
Availability 99.9% monthly for the portal; maintenance
windows announced
Speed Pages usable in under 2 seconds on a mid-range
phone over 4G; API p95 under 500 ms for normal
reads
Scale to design for 10,000 partners, 500,000 customers, 100,000
orders a month
Recovery Nightly backups; recovery point 24 hours at worst
in release 1 (point-in-time recovery as an upgrade);
restore drill before go-live
Browsers Current Chrome, Edge, Safari and Firefox on
desktop and phone; layouts checked at phone,
tablet and desktop widths
Accessibility Keyboard navigable, labelled form fields, sufficient
contrast on all key flows

## Source page 40

Sensitive columns encrypted; files in private buckets; downloads through short-lived
signed URLs after a permission check.
Rate limits on login, password reset, application, lead-page and status-link endpoints.
Security headers (CSP, HSTS, frame and content-type protections); upload size and
type limits.
No personal data or secrets in logs; secrets only in environment variables;
dependency audit in CI.
Audit log for every admin and money action; ledger, audit and event tables cannot be
altered.
Independent penetration test before go-live, findings fixed or formally accepted.
14.3 Test strategy
Unit tests for money, GST split, invoice numbering, commission rule resolution, form
validation.
API tests for every endpoint: allowed role works, lower role is refused, other partner's
data is invisible, invalid input returns the standard error.
Concurrency tests for the ledger, invoice numbers and top-up approval.
End-to-end tests (Playwright, run against the compose stack): apply to activation,
top-up to order submission, order to completion with commission, refund, payout
batch.
Coverage: at least 80% on wallet , billing , commissions and orders modules; no
coverage rule elsewhere, but every bug fix adds a test.
14.4 Definition of done (every task)
Code reviewed and merged with CI green: lint, typecheck, unit, API, build, compose
smoke test.
Tests written for the behaviour, including permission and scoping tests for any
endpoint.
Audit entries and notifications in place where the spec requires them.
Docs updated: module README, docs/API.md or docs/DATA_MODEL.md if they
changed, docs/PROGRESS.md ticked.
Works from a clean docker compose up with seed data, with no manual steps.
14.5 Go-live checklist
All 100 tasks ticked and all gates approved.
Staging UAT script passed; every finding fixed or recorded as accepted.

## Source page 41

15. Risks and open questions
    15.1 Risks
    Production secrets set; first super admin created and 2FA enrolled.
    Plans, services, commission rules, company and bank settings loaded and reviewed by
    the owner.
    No service is orderable while flagged needs_review .
    Backup ran and a restore drill succeeded on a copy.
    Penetration test complete; no open high-severity findings.
    Load test meets the targets above.
    Legal pages, refund terms and income-calculator disclaimer approved by the owner.
    Runbook and user guides delivered; alert emails reach a monitored inbox.
    Rollback rehearsed.
    Risk Why it matters Mitigation
    Ledger or commission
    bug
    Direct money loss and
    partner disputes
    Append-only ledger, database
    restricted MongoDB runtime roles, concurrency tests,
    nightly reconciliation, line-by-line
    human review of M4 and M8
    Codex loses context
    across sessions
    Inconsistent code,
    duplicated logic
    AGENTS.md , module READMEs,
    task IDs, small tasks,
    docs/PROGRESS.md , no skipping
    ahead
    Scope creep from 100+
    services
    Late delivery Form builder and catalogue import
    make services configuration, not
    code
    Placeholder prices go live Wrong charges needs_review flag blocks
    ordering until the owner confirms
    Staff capacity for manual
    fulfilment
    Orders pile up SLA timers, assignment rules,
    reports on breaches; hire before
    partners are onboarded in volume
    Identity documents leak Legal and trust damage Encryption, private buckets,
    signed URLs, audit, penetration
    test

## Source page 42

15.2 Open questions (Codex uses the stated default and logs the question)
Appendix: files and prompts for Codex
A. AGENTS.md (copy into the repo root in task M0-01)

# AGENTS.md

## Project

Multi-service franchise portal: public site, partner portal, admin portal,
one API.
Full spec in docs/. Read docs/PROGRESS.md first; do the first unchecked task
Risk Why it matters Mitigation
Services marketed before
approvals exist
Regulatory and
reputational harm
Phase B services stay inactive and
labelled coming soon; sign-off
needed to switch on
Misleading income claims Reputation and legal
exposure
Calculator labelled illustrative;
legal text reviewed by the owner
Question Default used until answered
Final plan names, prices and ID quotas Three placeholder plans with editable bands
Final service prices, turnaround times and
document lists
Placeholders flagged needs_review
Is a partner's wallet price GST-inclusive or
exclusive?
Exclusive, tax added at order completion
Should commission be paid on the service
price or on our margin?
Service price excluding GST
Is TDS applicable to partner commission? Off; setting available
Which SMTP provider and hosting provider? Any SMTP; any Linux host with Docker
Who staffs order processing and KYC
review?
Admin sub-roles; owner assigns people
Languages beyond English at launch? English only, text ready for translation
Refund and cancellation terms? Refund before work starts; none after
completion unless admin approves
