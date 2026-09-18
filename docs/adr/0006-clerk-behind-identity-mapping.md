---
status: superseded by ADR-0008
---

# Use Clerk behind a local identity mapping

Business Members and Platform Administrators will authenticate with Clerk because SlotPay is launching as a public Next.js SaaS and needs a production-oriented Next.js integration with a future React Native path. Domain authorization remains based on a local User, Organization membership, and explicit platform role so Clerk can be replaced without rewriting business permissions; guest Customers continue to use scoped Booking credentials.
