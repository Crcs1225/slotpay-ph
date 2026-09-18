---
status: accepted
---

# Coordinate Vercel and Convex deployment

Vercel will own preview and production releases using Convex's coordinated deploy command so each frontend is built against the matching backend. GitHub Actions remains the merge-quality gate, while branch-specific Convex previews prevent schema/function experiments from sharing production state.
