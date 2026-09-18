---
status: superseded by ADR-0006
---

# Use Convex Auth behind a local identity mapping

Business Members will authenticate with Convex Auth despite its beta status. Domain authorization will depend on a thin local user record and Organization membership rather than provider-specific fields, preserving a migration seam if authentication must later move; guest Customers use scoped Booking credentials instead of auth accounts.
