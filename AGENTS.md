<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance

- Before changing behavior, read `CONTEXT.md`, `docs/PRODUCT.md`, and the relevant architecture, data-model, flow, security, and ADR documents.
- Documentation describes target behavior; check `package.json` and source files before claiming a planned integration is implemented.
- This is a Next.js App Router project. Keep routes and layouts in `src/app/`.
- Keep route files thin. Product modules live under `src/` using the layer and public-interface rules in `docs/FOLDER-STRUCTURE.md`.
- Imports flow downward: `views` → `widgets` → `features` → `entities` → `shared`. Same-layer slices do not import each other.
- Reusable domain-independent UI belongs in `src/shared/ui`; domain-independent helpers belong in `src/shared/lib`.
- Import another slice only through its root `index.ts` (or explicit `server.ts` interface). Do not deep-import its implementation.
- Use the existing shadcn/ui setup and Tailwind CSS conventions before adding a new UI dependency.
- Prefer Server Components. Add `"use client"` only when browser state, event handlers, or client-only APIs are required.
- Follow `docs/NEXTJS-STANDARDS.md`: prefer static prerendering or Server Components, stream request-time work, and keep interactive or Convex-reactive Client Components as small islands. Never trade authorization or private-data safety for SSR.
- Follow `docs/ENGINEERING-STANDARDS.md` for TypeScript, module, domain-integrity, resilience, security, testing, and delivery rules.
- Keep TypeScript strict and avoid `any` unless there is a documented reason.
- When Convex is added, read `convex/_generated/ai/guidelines.md` if present. Use object-form functions, argument and return validators, indexed queries, tenant-aware authorization wrappers, private storage IDs, and internal functions by default.
- Preserve the trust invariant: Receipt OCR and matching are advisory; only authorized staff or an authenticated payment-provider event may verify a Deposit.
- Preserve tenant isolation: every protected operation must resolve membership and scope data by Organization.
- Before handing off a change, run `npm run lint` and, for production-sensitive changes, `npm run build`.
- Update the relevant file in `docs/` when an architectural or product decision changes.

## Documentation map

- [Documentation index](docs/README.md)
- [Domain glossary](CONTEXT.md)
- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Folder structure](docs/FOLDER-STRUCTURE.md)
- [Engineering standards](docs/ENGINEERING-STANDARDS.md)
- [Next.js standards](docs/NEXTJS-STANDARDS.md)
- [Data model](docs/DATA-MODEL.md)
- [Product flows](docs/FLOWS.md)
- [Security](docs/SECURITY.md)
- [CI/CD](docs/CI-CD.md)
- [Business risks](docs/RISKS.md)
- [Implementation roadmap](docs/IMPLEMENTATION-ROADMAP.md)
- [Project README](README.md)
