---
status: accepted
---

# Use PayMongo for SaaS subscriptions

SlotPay will use PayMongo recurring subscriptions for the ₱499 monthly Plan because it provides PHP billing with locally relevant payment methods. Convex remains the source of truth for Subscription state and entitlement, updated only from verified idempotent webhooks; a Platform Administrator may create an audited, expiring manual entitlement while PayMongo subscription capability is pending or unavailable.
