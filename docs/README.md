# Documentation

SlotPay PH has its Phase 1 Next.js, Convex, Convex Auth, authorization, audit, test, and CI foundation. The remaining documents distinguish implemented foundations from approved target capabilities for later phases.

Read [the domain glossary](../CONTEXT.md) first. It defines canonical terms such as Organization, Provider, Booking, Receipt, Extraction, and Verification.

## Product and design

- [Product specification](PRODUCT.md) — target users, promise, roles, lifecycle, non-goals, and success metrics
- [Architecture](ARCHITECTURE.md) — system context, deep modules, authorization, concurrency, and integrations
- [Folder structure](FOLDER-STRUCTURE.md) — pragmatic FSD layers, interfaces, imports, and placement rules
- [Data model](DATA-MODEL.md) — proposed Convex tables, fields, indexes, relationships, and invariants
- [Product flows](FLOWS.md) — onboarding, OTP/holds, Deposit review, cancellation, rescheduling, and notifications

## Delivery and risk

- [Engineering standards](ENGINEERING-STANDARDS.md) — coding style, correctness, security, testing, and delivery rules
- [Next.js standards](NEXTJS-STANDARDS.md) — server-first rendering, component boundaries, caching, errors, metadata, and performance
- [Security and privacy](SECURITY.md) — trust boundaries, tenant isolation, private files, abuse controls, and launch gate
- [CI/CD](CI-CD.md) — target checks, environments, coordinated deployment, rollback, and operations
- [Business risks](RISKS.md) — challenged assumptions, competitors, regulatory pitfalls, validation, and unit economics
- [Implementation roadmap](IMPLEMENTATION-ROADMAP.md) — phased vertical delivery and exit criteria
- [SaaS MVP delivery plan](SAAS-MVP-PLAN.md) — authoritative public-launch phases, test gates, billing, and administration scope

## Decisions

Accepted architectural decisions live in [`docs/adr/`](adr/):

1. [Convex as the application backend](adr/0001-convex-as-application-backend.md)
2. [Convex Auth behind identity mapping](adr/0002-convex-auth-behind-identity-mapping.md) — superseded
3. [Receipt analysis is advisory](adr/0003-receipt-analysis-is-advisory.md)
4. [Merchant-controlled payment accounts](adr/0004-support-merchant-controlled-payment-accounts.md)
5. [Coordinated Vercel and Convex deployment](adr/0005-coordinate-vercel-and-convex-deployment.md)
6. [Clerk behind local identity mapping](adr/0006-clerk-behind-identity-mapping.md) — superseded
7. [PayMongo for SaaS subscriptions](adr/0007-paymongo-for-saas-subscriptions.md)
8. [Convex Auth for the initial SaaS release](adr/0008-convex-auth-for-initial-saas.md)

## Maintenance rule

Keep these documents aligned with implementation. When code intentionally diverges, update the relevant specification and create an ADR only for a hard-to-reverse, surprising trade-off. External prices, provider rules, laws, and product capabilities must be re-verified before relying on them.
