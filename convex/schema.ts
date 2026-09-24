import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const organizationRole = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("provider"),
);

export const membershipStatus = v.union(
  v.literal("active"),
  v.literal("disabled"),
);

export const platformRole = v.union(
  v.literal("platform_admin"),
  v.literal("platform_support"),
);

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    platformRole: v.optional(platformRole),
    disabledAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    timezone: v.string(),
    currency: v.literal("PHP"),
    bookingIntervalMinutes: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("active"),
      v.literal("rejected"),
      v.literal("suspended"),
    ),
    addressLine1: v.optional(v.string()),
    locality: v.optional(v.string()),
    region: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactMobile: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: organizationRole,
    status: membershipStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),

  auditEvents: defineTable({
    organizationId: v.optional(v.id("organizations")),
    actorUserId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
    occurredAt: v.number(),
  })
    .index("by_organization_and_time", ["organizationId", "occurredAt"])
    .index("by_actor_and_time", ["actorUserId", "occurredAt"]),

  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    planKey: v.literal("launch"),
    status: v.union(v.literal("trialing"), v.literal("active"), v.literal("ended")),
    trialStartedAt: v.number(),
    trialEndsAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  services: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    priceCentavos: v.number(),
    depositCentavos: v.number(),
    durationMinutes: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_active", ["organizationId", "active"]),

  providers: defineTable({
    organizationId: v.id("organizations"),
    displayName: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_active", ["organizationId", "active"]),

  serviceProviders: defineTable({
    organizationId: v.id("organizations"),
    serviceId: v.id("services"),
    providerId: v.id("providers"),
    createdAt: v.number(),
  })
    .index("by_organization_and_service", ["organizationId", "serviceId"])
    .index("by_organization_and_provider", ["organizationId", "providerId"])
    .index("by_service_and_provider", ["serviceId", "providerId"]),

  availabilityRules: defineTable({
    organizationId: v.id("organizations"),
    providerId: v.id("providers"),
    weekday: v.number(),
    startLocalTime: v.string(),
    endLocalTime: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization_and_provider_and_weekday", [
    "organizationId",
    "providerId",
    "weekday",
  ]),

  availabilityExceptions: defineTable({
    organizationId: v.id("organizations"),
    providerId: v.id("providers"),
    localDate: v.string(),
    kind: v.union(v.literal("unavailable"), v.literal("custom_hours")),
    startLocalTime: v.optional(v.string()),
    endLocalTime: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization_and_provider_and_date", [
    "organizationId",
    "providerId",
    "localDate",
  ]),

  customers: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    mobileE164: v.string(),
    email: v.optional(v.string()),
    lastBookingAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_and_mobile", ["organizationId", "mobileE164"])
    .index("by_organization_and_last_booking", ["organizationId", "lastBookingAt"]),

  bookings: defineTable({
    organizationId: v.id("organizations"),
    publicCode: v.string(),
    customerId: v.id("customers"),
    serviceId: v.id("services"),
    providerId: v.id("providers"),
    source: v.union(v.literal("staff"), v.literal("walk_in"), v.literal("phone"), v.literal("messenger"), v.literal("public")),
    startAt: v.number(),
    endAt: v.number(),
    serviceName: v.string(),
    priceCentavos: v.number(),
    depositCentavos: v.number(),
    durationMinutes: v.number(),
    appointmentStatus: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"), v.literal("expired")),
    depositStatus: v.union(v.literal("not_required"), v.literal("awaiting_payment"), v.literal("processing"), v.literal("needs_review"), v.literal("suspicious"), v.literal("verified"), v.literal("rejected"), v.literal("refund_due"), v.literal("refunded_external"), v.literal("retained")),
    depositDisposition: v.optional(v.union(v.literal("not_paid"), v.literal("retained"), v.literal("refund_due"), v.literal("refunded_external"))),
    createdByUserId: v.id("users"),
    decisionReason: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_and_start", ["organizationId", "startAt"])
    .index("by_organization_and_provider_and_start", ["organizationId", "providerId", "startAt"])
    .index("by_organization_and_customer_and_start", ["organizationId", "customerId", "startAt"])
    .index("by_organization_and_status_and_start", ["organizationId", "appointmentStatus", "startAt"])
    .index("by_organization_and_public_code", ["organizationId", "publicCode"]),

  bookingHolds: defineTable({
    organizationId: v.id("organizations"),
    providerId: v.id("providers"),
    startAt: v.number(),
    endAt: v.number(),
    expiresAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
  }).index("by_organization_and_provider_and_start", ["organizationId", "providerId", "startAt"]),

  paymentDestinations: defineTable({
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("gcash"), v.literal("maya"), v.literal("bank")),
    accountName: v.string(),
    accountIdentifier: v.string(),
    instructions: v.optional(v.string()),
    ownershipAttestedAt: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_active", ["organizationId", "active"]),

  merchantVerifications: defineTable({
    organizationId: v.id("organizations"),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("rejected")),
    submittedByUserId: v.id("users"),
    reviewedByUserId: v.optional(v.id("users")),
    evidenceStorageIds: v.array(v.id("_storage")),
    decisionReason: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["status"]),
});
