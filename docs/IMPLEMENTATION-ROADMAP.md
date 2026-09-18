# Implementation roadmap

The authoritative public-launch scope, deliverables, required tests, and exit gates are defined in [SaaS MVP delivery plan](SAAS-MVP-PLAN.md). Work proceeds in this order, and a phase does not begin until the previous phase's exit gate passes.

1. **Production foundation**: Convex, Convex Auth, tenant authorization, platform authorization, audit, tests, CI, and preview environments.
2. **SaaS onboarding and activation**: Trial, business setup, Merchant Activation, platform review, and public marketing/legal pages.
3. **Scheduling and business calendar**: Providers, Services, Availability, atomic slot claims, staff-created Bookings, and calendar operations.
4. **Public booking and guest security**: public booking, Turnstile, OTP, holds, access links, expiration, and entitlement enforcement.
5. **Deposit review and advisory OCR**: private Receipts, Google Document AI, match signals, duplicate detection, staff decisions, and retention.
6. **Notifications and SMS Credits**: included email, prepaid SMS, reminders, retries, delivery state, and credit ledger.
7. **Subscription billing and sales administration**: PayMongo, Plan and Subscription lifecycle, usage limits, grace periods, manual fallback, and admin sales metrics.
8. **Public launch hardening**: security, privacy, accessibility, performance, operations, production smoke tests, and incident readiness.

## Current implementation status

- Phase 1 is implemented locally: Convex Auth, tenant/platform authorization wrappers, audit events, tests, and CI contracts.
- Phase 2 is implemented locally: self-serve trial onboarding, merchant setup and activation, private evidence review, admin decisions, SSR marketing/legal pages, and an activated non-bookable public preview.
- A linked Convex preview deployment and production environment remain deployment gates; local completion does not imply production release.

## Delivery rule

Every phase must deliver a vertical, testable capability, preserve a manual fallback for external-provider failures, and include its required tests in CI. Schema work follows widen, migrate, verify, and narrow. Production data is never used in local or preview environments.

## Deferred until post-launch evidence

- Multiple locations or branches
- Native mobile applications
- Customer accounts
- Integrated customer-deposit collection or automatic refunds
- Automatic screenshot verification
- Custom roles
- Annual Plans, coupons, automatic overages, and tax-invoice automation
- Marketplace discovery, POS, CRM, payroll, inventory, loyalty, or marketing automation
