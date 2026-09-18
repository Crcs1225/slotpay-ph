# SaaS MVP delivery plan

## Goal and launch contract

SlotPay PH will launch as a self-serve SaaS for Philippine fixed-appointment businesses. An Owner receives a 14-day Trial, configures one Organization, submits it for manual Merchant Activation, and then pays ₱499 per month to keep accepting new Bookings.

The initial Plan includes:

- one Organization and one location;
- 150 created Bookings per billing period;
- three active Members;
- 150 Receipt Extractions per billing period;
- transactional email reminders; and
- optional prepaid SMS Credits.

The Trial does not require a payment method. Merchant Activation and Subscription status are independent: approval establishes trust to publish payment instructions, while entitlement determines whether the Organization may accept new Bookings. PayMongo recurring subscriptions are the primary billing path; a Platform Administrator can record a time-bounded manual Subscription while PayMongo account capabilities are pending.

## Product surfaces

### Public

- Marketing, features, pricing, security, terms, privacy, sign-up, and sign-in pages.
- Public Organization page at `/book/[businessSlug]` with Service, date, Availability, contact, OTP, Deposit instructions, Receipt upload, and confirmation.
- Scoped Booking Access Link at `/booking/[accessToken]` for status and cancellation requests.
- Public payment instructions appear only for an activated Organization with an entitled Subscription.

### Business application

- Convex Auth sign-up/sign-in and Organization onboarding.
- Profile, location, Services, Providers, Availability, Payment Destinations, and Merchant Activation submission.
- Calendar, Booking details, staff-created Bookings, Customers, and payment-review inbox.
- Advisory OCR, deterministic match signals, duplicate warnings, and Owner/Manager Deposit decisions.
- Team management for Owner, Manager, and Provider roles.
- Billing page with Trial deadline, usage, PayMongo checkout, Subscription state, renewal date, cancellation, and SMS Credit balance.

### Platform administration

- Separate `platform_admin` authorization for `/admin` routes and functions.
- Merchant Activation queue with audited approve, reject, suspend, and restore operations.
- Organization and Member search, Subscription state, trial extension, manual entitlement, and usage adjustment.
- Sales dashboard for trials, activation, trial conversion, monthly recurring revenue, failed payments, past-due accounts, and churn.
- Operations dashboard for overdue reviews, failed Receipt Extractions, failed notifications, webhook failures, retention backlog, and per-Organization usage cost.
- Audited support notes and diagnostic views. Admin impersonation is excluded from the MVP.

## Architecture and boundaries

- Next.js renders all three surfaces and remains a thin UI layer.
- Convex Auth authenticates Members and Platform Administrators; Customers remain guests using OTP and Booking Access Links.
- Authenticated product screens use the Convex React client. They do not depend on Convex Auth inside Next.js server rendering, middleware, or Route Handlers while those integrations remain experimental.
- Convex is the application backend, database, private file store, scheduler, realtime source, and webhook endpoint.
- First-party clients call public Convex functions directly. Next.js API routes are used only for a concrete HTTP-specific need.
- PayMongo manages recurring SaaS billing. Verified, idempotent webhooks update local Subscription state; browser redirects never grant entitlement.
- Google Document AI performs advisory OCR. Only an authorized Owner/Manager or a future authenticated deposit-provider event can verify a Deposit.
- Resend sends included email notifications. Semaphore consumes prepaid SMS Credits.
- Cloudflare Turnstile and Convex rate limits protect public OTP, Availability, Booking, token, and upload operations.

## Phased implementation

Each phase is independently testable and must pass its exit gate before the next phase begins.

### Phase 1: Production foundation

Deliver:

- Install Convex, Convex Auth, `convex-helpers`, rate limiting, Vitest, `convex-test`, Testing Library, and Playwright.
- Create development, preview, and production environment contracts.
- Implement local User mapping, Organization membership, fixed roles/capabilities, platform role, and Audit Events.
- Add shared tenant-aware Convex wrappers and the initial schema/indexes.
- Add CI for lint, typecheck, unit/Convex tests, documentation checks, and production build.

Required tests:

- Unauthenticated calls fail.
- Cross-Organization IDs fail for every protected function.
- Disabled Members and incorrect roles fail.
- Platform routes require `platform_admin`; Organization ownership never implies platform access.
- Sensitive changes append an Audit Event in the same mutation.

Exit gate: a Vercel preview uses an isolated Convex preview deployment, Convex Auth sign-in and recovery work, and all authorization tests pass.

### Phase 2: SaaS onboarding and activation

Deliver:

- Organization creation and 14-day Trial start.
- Profile, unique slug, location, Services, Providers, Service assignments, weekly Availability, exceptions, and Payment Destinations.
- Setup checklist, booking-page preview, payment-account attestation, private evidence upload, and activation submission.
- Admin activation queue with approve/reject/resubmit/suspend and required reasons.
- Marketing, pricing, sign-up, sign-in, terms, privacy, security, and acceptable-use pages.

Required tests:

- Slugs are normalized and unique under concurrency.
- Deposit never exceeds Service price; duration aligns to the booking interval.
- An unactivated or suspended Organization cannot expose Payment Destinations or accept public Bookings.
- Evidence is private and only accessible to the submitting Owner and Platform Administrator.
- Activation decisions and evidence access are audited.

Exit gate: a new Owner can sign up, configure an Organization, submit evidence, receive approval, and publish a non-bookable preview without developer intervention.

### Phase 3: Scheduling and business calendar

Deliver:

- Availability engine using Provider rules, exceptions, holds, and non-terminal Bookings.
- Atomic Provider assignment and overlap prevention.
- Day/week calendar, Booking details, staff-created Booking flow, and Organization-local Customers.
- Completion, no-show, cancellation, and staff rescheduling with preserved snapshots.

Required tests:

- Concurrent overlapping claims produce exactly one winner.
- “Any Provider” assignment is deterministic.
- Rescheduling claims the replacement and releases the original in one mutation.
- Service edits do not change historical Booking price, duration, or Deposit snapshots.

Exit gate: an activated business can maintain a conflict-free source-of-truth calendar for web, Messenger, phone, and walk-in Bookings.

### Phase 4: Public booking and guest security

Deliver:

- Public Service/date/time/contact flow.
- Turnstile, SMS OTP, a 10-minute OTP hold, a 30-minute payment hold, and Booking Access Links.
- Accountless status and cancellation-request pages.
- Hold-expiration scheduler and public rate limits.

Required tests:

- OTP codes and access tokens are hashed, scoped, expiring, and rate-limited.
- Abandoned holds release Provider time.
- Two Customers cannot reserve the same Provider time.
- Trial-expired, unpaid, unactivated, and suspended Organizations cannot receive new public Bookings.
- Existing Bookings remain readable when new booking entitlement is blocked.

Exit gate: a real Customer can create a pending Booking and receive private Deposit instructions without creating an account.

### Phase 5: Deposit review and advisory OCR

Deliver:

- One-use private Receipt uploads with MIME, size, and image-dimension validation.
- Payment Attempt, Receipt, Extraction, content hash, reference hash, and protected review hold.
- Google Document AI adapter plus deterministic GCash, Maya, and bank-transfer parsers.
- Review inbox with likely-match, mismatch, duplicate, suspicious, and unreadable signals.
- Owner/Manager accept, reject, resubmit, and externally verified flows with required reasons.
- Receipt deletion 90 days after terminal Booking state.

Required tests:

- Extraction and Match Assessment can never set `verified`.
- OCR failure and unreadable Receipts route to manual review.
- Duplicate detection reveals no other Organization's identity or data.
- Only Owner/Manager can view Receipts or decide Deposits.
- Receipt submission replaces the expiring payment hold with a protected review hold.
- Acceptance confirms exactly once; rejection creates one resubmission window.

Exit gate: Booking to Receipt to staff decision to confirmation works with full audit history and a manual fallback for every OCR failure.

### Phase 6: Notifications and SMS Credits

Deliver:

- Idempotent notification intents for access links, unpaid deposits, review outcomes, confirmations, cancellations, and reminders.
- Resend email as the included channel.
- Semaphore SMS adapter, prepaid SMS Credit ledger, purchase/admin adjustment, and low-balance warnings.
- Bounded retry, channel fallback, cancellation/reschedule handling, and delivery visibility.

Required tests:

- A domain event schedules each notification exactly once.
- Failed delivery retries within limits and never double-debits SMS Credits.
- Zero SMS balance falls back to email when available and never creates negative credits.
- Rescheduling cancels obsolete reminders and creates replacement reminders.

Exit gate: transactional messages are observable, idempotent, and bounded by paid credits and provider budgets.

### Phase 7: Subscription billing and sales administration

Deliver:

- Plan, Subscription, billing event, billing-period usage, and entitlement-adjustment records.
- PayMongo customer, checkout, recurring Subscription, cancellation, and webhook adapter.
- Trial countdown, checkout, billing status, usage meters, renewal, cancellation, and recovery UI.
- Admin subscription search, trial extension, manual Subscription, usage adjustment, payment failures, and sales metrics.
- Entitlement rules for trialing, active, past due, unpaid, cancelled, and manual-review states.

Required tests:

- A Trial starts once and ends after 14 days.
- Webhook signatures are verified and provider event IDs are idempotent.
- Redirects and client claims cannot activate a Subscription.
- Past-due Organizations receive a seven-day grace period; unpaid Organizations cannot create new Bookings or Extractions.
- Booking, Member, and Extraction limits hold under concurrent requests.
- Cancellation takes effect at period end and preserves data access.
- Manual entitlements require a reason, actor, and expiration.
- MRR and conversion metrics reconcile to Subscription and billing-event fixtures.

Exit gate: trial, checkout, renewal, failure, grace, cancellation, manual fallback, and admin adjustment pass end-to-end in provider sandbox/preview.

### Phase 8: Public launch hardening

Deliver:

- Accessibility and mobile QA, SEO metadata, analytics events, error monitoring, and operational alerts.
- Threat model, tenant-isolation audit, webhook replay tests, retention checks, export/deletion procedures, and incident runbooks.
- Load tests for public Availability, OTP, slot claims, calendar, review inbox, and webhooks.
- Production smoke tests and launch dashboard.

Required tests:

- Critical customer, business, admin, and billing journeys pass Playwright in preview.
- Receipt and merchant-evidence signed access cannot be reused after expiration.
- Production secrets never enter client bundles or logs.
- Provider outages preserve manual operation and produce actionable alerts.
- Core pages pass agreed accessibility and performance budgets on mobile.

Exit gate: the launch checklist passes, rollback is rehearsed, PayMongo production capability is active or the documented manual billing fallback is enabled, and support/incident ownership is assigned.

## Entitlement policy

| Subscription state | Configure/view data | Accept new Bookings | Run Receipt Extraction |
| --- | --- | --- | --- |
| `trialing` | Yes | Yes after Merchant Activation | Yes within limit |
| `active` | Yes | Yes within limit | Yes within limit |
| `past_due` | Yes | Yes during seven-day grace | Yes during grace |
| `unpaid` | Yes | No | No |
| `cancelled` before period end | Yes | Yes until period end | Yes until period end |
| `cancelled` after period end | Yes | No | No |
| `manual_review` | Yes | Only when an active manual entitlement exists | Same |

Usage exhaustion blocks only the exhausted capability. It never hides existing data. Platform Administrators may add time-bounded adjustments; they may not silently reset usage history.

## Launch metrics

- Trial signups, completed onboarding, Merchant Activation rate, and time to activation.
- Trial-to-paid conversion, monthly recurring revenue, active Subscriptions, failed payments, past-due recovery, and churn.
- Weekly active Organizations, Bookings per active Organization, Deposit submission rate, and confirmation rate.
- Median Receipt-review time, Extraction success, manual-review, suspicious, and duplicate rates.
- Email/SMS delivery success, SMS Credit revenue/usage, and provider costs.
- Four-week Organization retention and cost per active Organization.

The primary MVP success signal is not registration volume. It is paid Organizations repeatedly processing real Bookings and Deposits.

## Explicitly deferred

- Multiple locations or branches.
- Customer accounts, marketplace discovery, POS, CRM, payroll, inventory, loyalty, and marketing automation.
- Integrated customer-deposit collection, automatic refunds, installments, or automatic screenshot verification.
- Custom roles, annual Plans, coupons, usage overage charging, tax invoicing automation, and admin impersonation.
- Native mobile applications. The Convex boundary remains compatible with a future React Native client.
