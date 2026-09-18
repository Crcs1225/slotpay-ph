# SlotPay PH

SlotPay PH is a planned booking and reservation-deposit platform for Philippine fixed-appointment service businesses.

The V1 product promise is: **bookings and deposits in one place, with receipts pre-checked for faster confirmation.** Receipt analysis is advisory; it never proves that funds reached a merchant.

## Project status

Phases 1 and 2 are implemented locally: the repository has a Next.js application shell, Convex backend and Auth, tenant/platform authorization, audit events, automated tests, self-serve business onboarding, merchant activation review, and SSR marketing/legal pages. Scheduling, public booking, receipt processing, notifications, and billing remain planned phases. A linked preview deployment is still required before calling either phase production-ready.

Start with:

- [Documentation index](docs/README.md)
- [Domain glossary](CONTEXT.md)
- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Engineering standards](docs/ENGINEERING-STANDARDS.md)
- [Next.js standards](docs/NEXTJS-STANDARDS.md)
- [Implementation roadmap](docs/IMPLEMENTATION-ROADMAP.md)

## Getting started

Use Node.js 22.22.2 or newer. CI uses Node.js 22.22.2 and npm 10.8.2.

Install dependencies, initialize a local Convex deployment, and run the application:

```bash
npm install
npx convex dev --once
npm run auth:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Current checks:

```bash
npm run lint
npm run typecheck
npm test
npm run docs:check
npm run build
```

## Technology direction

- Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui
- Pragmatic Feature-Sliced Design with thin routes and public slice interfaces
- Convex backend, storage, scheduling, and realtime data
- Convex Auth for business Members and platform administrators
- PayMongo recurring billing for the ₱499 monthly Plan after a 14-day Trial
- Google Document AI OCR with deterministic payment-provider parsers
- Semaphore SMS with Resend email fallback
- Vercel hosting with coordinated Convex preview/production deployment

Convex, Convex Auth, and the CI foundation are implemented. The remaining services are approved directions for later phases. Consult [CI/CD](docs/CI-CD.md) and [Security](docs/SECURITY.md) before expanding infrastructure.
