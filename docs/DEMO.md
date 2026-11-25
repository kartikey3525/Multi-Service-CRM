# Frontend demo

## Start the mock frontend

From the repository root, run:

```sh
make demo
```

This starts only the Next.js web development server in mock mode at
`http://localhost:3000`. It does not start Docker, MongoDB, Redis, the API, or a
database. Demo state is stored in this browser's local storage. Use **Reset demo
data** in the header to restore the seeded state.

## Demo accounts

Use the role buttons on the sign-in pages. The development demo accepts any
non-empty password for the seeded accounts. Admin accounts include a simulated
2FA step; the on-screen demo code is `123456`.

| Role                     | Sign-in page   | Account                              |
| ------------------------ | -------------- | ------------------------------------ |
| Super administrator      | `/admin/login` | `admin@servicenetwork.demo`          |
| Operations administrator | `/admin/login` | `operations@servicenetwork.demo`     |
| Finance staff            | `/admin/login` | `finance@servicenetwork.demo`        |
| Partner review staff     | `/admin/login` | `partner.review@servicenetwork.demo` |
| Support staff            | `/admin/login` | `support@servicenetwork.demo`        |
| Content staff            | `/admin/login` | `content@servicenetwork.demo`        |
| Master distributor       | `/login`       | `partner@servicenetwork.demo`        |
| Distributor              | `/login`       | `distributor@servicenetwork.demo`    |
| Retailer                 | `/login`       | `retailer@servicenetwork.demo`       |

## Ten-minute client walkthrough

1. **Public site (1 min):** show the service catalogue and partner plans.
2. **Application (1 min):** submit a partner application and use its tokenized
   status page.
3. **Admin review (1 min):** sign in as partner review staff, inspect an
   application, select its parent, and approve or request more information.
4. **Partner network (1 min):** sign in as a master distributor and review the
   seeded subtree and profile/KYC status.
5. **Lead pipeline (1 min):** add a prospect with consent, move it through the
   ordered stages or mark it lost, then publish a capture page and submit a test
   enquiry. The enquiry appears only in that page owner’s pipeline. Honeypot
   submissions are silently discarded; repeated submissions hit the mock throttle.
6. **Partner tools (1 min):** complete each learning module and pass its quiz to
   unlock a one-time printable certificate. Download a marketing message. In the
   invoice tool, save a client, calculate state-based GST, issue and print an invoice,
   then show its partner-scoped history and financial-year number. The mock uses
   line-level half-up rounding; PDF generation belongs to the real API.
7. **Wallet (1 min):** request a top-up from a partner account, then approve it
   as finance staff. Confirm the wallet and immutable ledger update.
8. **Order operations (1 min):** create an order from the partner portal, then
   assign and advance it through valid processing states as operations staff.
9. **Close the loop (1 min):** show the order timeline, customer tracking link,
   ledger entry, and corresponding audit event.
10. **Reports (1 min):** export the filtered demo report as CSV and reset demo
    data before the next walkthrough.

## Demo boundaries

- The mock adapter is deliberately isolated from the real HTTP adapter. It
  simulates server-side permissions, persistence, partner scoping, lifecycle,
  paise arithmetic, GST, and audit writes in browser local storage.
- No data is sent to a backend while mock mode is selected. Tokenized links,
  file previews, email delivery, payments, bank transfers, lead-page hosting,
  and external service integrations are simulated. Public demo lead pages accept
  sample enquiries into local demo data only.
- The real API must provide the corresponding authorization, persisted records,
  document storage, notifications, reports, and service integrations before
  production use. See `docs/PROGRESS.md` for the milestone mapping.
