# Engineering and coding standards

These standards apply to all SlotPay PH production code. They supplement the product, architecture, security, folder-structure, and framework-specific documents. Intentional divergence must explain the trade-off and use an ADR for a durable architectural decision.

## Engineering principles

1. Optimize for correctness, tenant isolation, and recoverability before convenience.
2. Build the smallest complete vertical slice that can be tested by a real actor.
3. Keep business rules independent from framework UI and external-provider SDKs.
4. Prefer explicit state machines, named capabilities, and typed interfaces over implicit conventions.
5. Design every external operation for retry, idempotency, timeout, and manual fallback.
6. Treat observability, tests, migrations, accessibility, and documentation as part of the feature.

## TypeScript

- Keep `strict` enabled. Do not add `any`; use `unknown` and narrow it at the boundary.
- Model finite domain states with literal or discriminated unions, not arbitrary strings or boolean combinations.
- Use Convex IDs and domain-specific value types. Do not pass raw string IDs across trusted boundaries.
- Validate untrusted input at runtime even when the caller uses TypeScript.
- Prefer immutable values and pure functions for domain calculations. Isolate clocks, randomness, networks, and storage behind explicit interfaces.
- Return purpose-built view models. Never expose database documents, provider responses, secrets, or incidental fields.
- Avoid non-null assertions unless an invariant was checked immediately beforehand.

## Modules and dependencies

- Follow [the FSD import direction and slice interfaces](FOLDER-STRUCTURE.md). Cross-slice imports use the slice root or an explicit `server.ts` interface.
- Keep route files thin. Framework input parsing and route composition belong there; business behavior does not.
- Expose small, stable interfaces and hide volatile implementation details.
- Depend on adapters at external seams such as OCR, SMS, email, billing, and time. Provider SDK types do not enter domain modules.
- Do not add a package when a platform primitive or existing dependency adequately solves the problem.
- Avoid circular imports, same-layer slice imports, mutable global state, and barrels that pull server code into client bundles.

## Naming and style

- Use the canonical language in [`CONTEXT.md`](../CONTEXT.md). Organization, Member, Provider, Customer, Deposit, Receipt, Extraction, and Verification are distinct.
- Names state intent: `acceptDeposit` over `updateStatus`; `depositCentavos` over `amount`.
- Boolean names read as predicates: `isActive`, `hasPaymentInstructions`, `canReviewDeposit`.
- Include units where ambiguity is possible: `durationMinutes`, `expiresAt`, `priceCentavos`.
- Functions perform one coherent job. Extract helpers to create meaningful boundaries, not merely to reduce line count.
- Comments explain why, risk, invariants, or constraints; they do not narrate syntax.
- Use repository formatting and ESLint. A rule suppression requires a narrow explanation beside it.

## Domain and data integrity

- Make lifecycle transitions explicit and reject transitions not listed in product rules.
- Store money as integer centavos; never use floating-point pesos for persistence or arithmetic.
- Store instants as epoch milliseconds and business-local dates/times in documented formats.
- Sensitive mutations append their Audit Event in the same transaction.
- Never delete Bookings, payment history, or security history merely to represent a state change.
- Preserve the trust rule: Receipt analysis is advisory. Only an authorized Owner/Manager or authenticated payment-provider event can verify a Deposit.

## Errors and resilience

- Distinguish expected domain failures from unexpected defects. Expected failures use stable codes and safe user messages.
- Never expose stack traces, provider payloads, tokens, or cross-Organization existence.
- External requests require timeout behavior, bounded retries with backoff, and idempotency keys where supported.
- A retry must not duplicate a Payment Attempt, notification, Subscription event, or Audit Event.
- Preserve a documented manual path when OCR, SMS, email, or billing is unavailable.

## Security and privacy

- Authentication is not authorization. Every protected operation resolves the actor, active membership, required capability, and Organization scope server-side.
- Ignore client-supplied roles, ownership claims, totals, transitions, and Organization context unless independently authorized.
- Keep secrets in deployment variables. Only intentionally public values use `NEXT_PUBLIC_`.
- Minimize personal and financial data. Private files use storage IDs and short-lived URLs; logs use identifiers rather than receipt contents or contact details.
- Rate-limit public OTP, availability, booking, token, and upload boundaries.
- Review [the security standard](SECURITY.md) before adding public endpoints, uploads, webhooks, administrative actions, or integrations.

## Convex backend

- Every registered function uses object form with `args` and `returns` validators.
- Public functions exist only for direct client use. Helpers, scheduled work, and privileged orchestration are internal.
- Protected functions use shared auth/tenant wrappers. Tenant-owned reads start with an index containing `organizationId`.
- Use indexes instead of `.filter()`. Paginate or bound growing sets; never use an unbounded production `.collect()`.
- Use mutations for atomic changes, queries for deterministic reads, and actions for external I/O.
- Schema changes on populated tables follow widen → migrate → verify → narrow.
- Typecheck and push functions against an isolated Convex deployment before handoff.

## Testing standard

- Test behavior and invariants, not implementation details. A reproducible defect fix adds a regression test.
- Domain tests cover transitions/calculations; Convex tests cover authorization, tenant isolation, idempotency, concurrency, indexes, and audit coupling; component tests cover accessible behavior; Playwright covers critical actor journeys.
- Cross-Organization IDs fail for every protected query and mutation. Include unauthenticated, disabled-member, wrong-role, and platform-role cases.
- Use synthetic data only. Tests do not depend on production data, execution order, wall-clock time, or paid providers unless marked as opt-in smoke tests.
- Required gates are `npm run lint`, `npm run typecheck`, `npm test`, `npm run docs:check`, and `npm run build`.

## Review and delivery

- Keep changes scoped and preserve unrelated worktree changes.
- Review correctness, security, data integrity, accessibility, regression risk, and acceptance criteria—not only style.
- Schema changes include migration preflight and a post-deployment smoke test. Provider changes include sandbox evidence and rollback/manual-fallback instructions.
- Update implementation-status documentation in the same change. Never describe a planned capability as implemented.
- Work is complete only when required gates pass and remaining deployment/manual checks are explicit.

## Primary references

- [TypeScript strict mode](https://www.typescriptlang.org/tsconfig/strict.html)
- [React purity](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Convex best practices](https://docs.convex.dev/understanding/best-practices)
