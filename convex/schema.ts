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
