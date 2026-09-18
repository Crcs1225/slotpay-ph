---
status: accepted
---

# Use Convex Auth for the initial SaaS release

SlotPay will use Convex Auth for Business Members and Platform Administrators to keep identity and the application backend in one platform and avoid an additional authentication bill during the initial release. Because Convex Auth is beta and its Next.js server integration is experimental, authenticated product screens use the Convex React client and every protected Convex function enforces local User mapping, Organization membership, or explicit platform role; this boundary preserves a future migration path to another OpenID Connect provider.
