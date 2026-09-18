# Next.js standards and server-first rendering

These rules target the repository's pinned Next.js App Router version. Before framework work, read the matching guides in `node_modules/next/dist/docs/`; installed-version guidance overrides memory and older tutorials.

## Rendering policy

SlotPay is **server-first**. Select the least client-heavy strategy that preserves correctness and user experience; do not force every route into dynamic SSR.

Priority order:

1. Static prerendering for stable marketing, pricing, legal, help, and explanatory content.
2. Cached Server Components for public data that tolerates explicit revalidation.
3. Request-time Server Components with streaming for personalized/request-dependent content safely available on the server.
4. A server-rendered shell plus small Client Component islands for forms, browser APIs, state, handlers, and realtime Convex subscriptions.
5. Fully client-driven screens only when reactivity or the current authentication integration makes a server data path unsafe or unsupported.

Layouts and pages are Server Components by default. Add `"use client"` only for state, effects, event handlers, browser APIs, or client-only libraries. It creates a client-module boundary for imports, so keep it at the smallest interactive leaf. Props crossing that boundary must be serializable. [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [`use client`](https://nextjs.org/docs/app/api-reference/directives/use-client), [React serialization rules](https://react.dev/reference/rsc/use-client)

## SlotPay rendering matrix

| Surface | Default | Notes |
| --- | --- | --- |
| Marketing, pricing, legal, security | Static Server Components | Add metadata, sitemap, robots, and social assets. |
| Public Organization profile | Prerendered or cached Server Component | Cache only activated, explicitly public fields; invalidate after publication changes. |
| Public booking | Server-rendered shell with client islands | Public profile/copy can render server-side; availability, OTP, uploads, and realtime status are interactive. |
| Sign-in and recovery | Server-rendered page shell with client form | Keep Convex Auth browser state inside the smallest client boundary. |
| Business dashboard | Server-rendered layout/skeleton with reactive islands | Prefer authenticated preloading only when token handling is supported and security-tested. |
| Platform administration | Server shell with authorized data islands | Convex authorization is mandatory; hiding UI is not authorization. |

Convex supports `preloadQuery`, but Next.js server-rendering support is beta and authenticated preloading needs a provider-specific server token. The official guide documents Clerk and Auth0 examples, not universal provider support. With current Convex Auth, public-safe data may render server-side; authenticated domain data remains reactive client-driven until a preview-tested token/cookie integration is deliberately adopted. [Convex Next.js server rendering](https://docs.convex.dev/client/nextjs/app-router/server-rendering)

## Routes and component boundaries

- Keep `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx` focused on framework concerns and composition.
- Keep pages/layouts as Server Components unless the whole boundary genuinely requires browser behavior.
- Compose Server Component output into Client Components rather than moving an entire tree behind `"use client"`.
- Render context providers as deep as practical so static ancestors remain optimizable.
- Use route groups for organization, not URL semantics. Avoid advanced routing until a real navigation requirement justifies it.
- Await `params` and `searchParams` according to generated route types for the installed version.

## Data access and caching

- Fetch server data directly from its owner in a Server Component or server-only module. Do not call an internal Route Handler merely to reach the same backend.
- Add `import "server-only"` to sensitive modules that must never enter a client graph.
- Choose and document whether data is static, time-revalidated, tag-invalidated, or uncached. Do not rely on remembered defaults.
- Cache Components are currently disabled. Under this model, `fetch` is not cached by default; opt into `force-cache` or `next.revalidate` only for safely shareable data. [Caching guide](https://nextjs.org/docs/app/guides/caching-without-cache-components), [extended `fetch`](https://nextjs.org/docs/app/api-reference/functions/fetch)
- Never cache authenticated, tenant-private, token-bearing, or permission-dependent output across users without an explicit security review.
- Start independent reads in parallel and use `Promise.all` when all results are required. Avoid waterfalls.
- Use `loading.tsx` or focused `<Suspense>` boundaries for slow sections so a static shell can stream early. [Streaming](https://nextjs.org/docs/app/getting-started/linking-and-navigating)

## Mutations and APIs

- Convex functions are SlotPay's application API for web and future mobile clients. Do not add a duplicate Next.js API layer around ordinary Convex operations.
- Use Route Handlers only for real HTTP boundaries that must terminate in Next.js; prefer Convex HTTP actions when Convex owns the integration.
- Treat every Route Handler and Server Action as a public endpoint: authenticate, authorize, validate, rate-limit where needed, and return safe DTOs. [Authentication](https://nextjs.org/docs/app/guides/authentication), [data security](https://nextjs.org/docs/app/guides/data-security)
- Server Actions are for mutations, not general data fetching; invocation is queued. [Backend-for-frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend)

## Loading, errors, and not-found states

- Important dynamic routes provide useful loading and recovery states.
- Represent expected failures as typed results or safe UI states; do not throw for routine validation failures.
- Use `notFound()` and segment `not-found.tsx` for absent public resources.
- Use segment `error.tsx` for uncaught exceptions and `global-error.tsx` only for root failures. Never reveal secrets, stacks, or cross-tenant existence. [Error handling](https://nextjs.org/docs/app/getting-started/error-handling), [`notFound`](https://nextjs.org/docs/app/api-reference/functions/not-found)

## Metadata, assets, and accessibility

- Define global `metadataBase`, title template, description, and social defaults in the root server layout. Use `generateMetadata` for data-dependent public routes.
- Add file-based robots, sitemap, icons, and Open Graph/Twitter images before launch. Metadata exports are server-only. [Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- Use `next/image`, `next/font`, `next/link`, and `next/script` for their intended purposes.
- Semantic HTML, keyboard operation, visible focus, labels, associated errors, live regions, and sufficient contrast are acceptance criteria.
- Reserve media and loading-shell dimensions to avoid layout shift.

## Performance and review

- Client JavaScript is a cost. Every new `"use client"` boundary needs an interaction reason.
- Do not ship provider SDKs, parsing libraries, or server utilities to the browser.
- Prefer server-rendered data over `useEffect` fetching. Effects synchronize external systems; they are not the default data layer.
- Lazy-load genuinely heavy client-only features absent from initial interaction.
- During review ask: Can this be a Server Component? Can it prerender safely? Is caching scoped correctly? Can a smaller child own interaction? Is useful HTML visible before hydration?
- Confirm rendering in `next build` output and inspect client bundles after substantial dependencies.

## Current constraints

- Do not casually enable experimental Cache Components or React taint APIs. They require an ADR, focused tests, and preview verification.
- Re-evaluate authenticated Convex preloading when the installed Convex Auth version documents stable server-token support for this Next.js version.
- SSR must never weaken tenant authorization, leak private Convex data into HTML/cache, or replace required realtime behavior.

## Research basis

Verified against first-party documentation on 2026-09-18:

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication)
- [Convex Next.js server rendering](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
