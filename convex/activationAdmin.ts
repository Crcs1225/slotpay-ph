import { ConvexError, v } from "convex/values";
import { platformAdminMutation, platformAdminQuery } from "./lib/authz";

const queueItem = v.object({
  verificationId: v.id("merchantVerifications"),
  organizationId: v.id("organizations"),
  organizationName: v.string(),
  slug: v.string(),
  submittedAt: v.number(),
  evidenceCount: v.number(),
});

export const activationQueue = platformAdminQuery({
  args: {},
  returns: v.array(queueItem),
  handler: async (ctx) => {
    const verifications = await ctx.db
      .query("merchantVerifications")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .order("asc")
      .take(50);
    const items = await Promise.all(verifications.map(async (verification) => {
      const organization = await ctx.db.get(verification.organizationId);
      if (organization === null || verification.submittedAt === undefined) return null;
      return {
        verificationId: verification._id,
        organizationId: organization._id,
        organizationName: organization.name,
        slug: organization.slug,
        submittedAt: verification.submittedAt,
        evidenceCount: verification.evidenceStorageIds.length,
      };
    }));
    return items.filter((item): item is NonNullable<typeof item> => item !== null);
  },
});

export const managedOrganizations = platformAdminQuery({
  args: {},
  returns: v.array(v.object({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended")),
  })),
  handler: async (ctx) => {
    const [active, suspended] = await Promise.all([
      ctx.db.query("organizations").withIndex("by_status", (q) => q.eq("status", "active")).take(100),
      ctx.db.query("organizations").withIndex("by_status", (q) => q.eq("status", "suspended")).take(100),
    ]);
    return [...active, ...suspended].map((organization) => ({ organizationId: organization._id, name: organization.name, slug: organization.slug, status: organization.status as "active" | "suspended" }));
  },
});

export const openEvidence = platformAdminMutation({
  args: { verificationId: v.id("merchantVerifications") },
  returns: v.object({
    organizationName: v.string(),
    accountName: v.string(),
    accountIdentifier: v.string(),
    provider: v.string(),
    evidenceUrls: v.array(v.string()),
  }),
  handler: async (ctx, { verificationId }) => {
    const verification = await ctx.db.get(verificationId);
    if (verification === null) throw new ConvexError({ code: "NOT_FOUND", message: "Activation request not found." });
    const organization = await ctx.db.get(verification.organizationId);
    const destination = await ctx.db
      .query("paymentDestinations")
      .withIndex("by_organization_and_active", (q) => q.eq("organizationId", verification.organizationId).eq("active", true))
      .first();
    if (organization === null || destination === null) throw new ConvexError({ code: "NOT_FOUND", message: "Review details are incomplete." });
    const urls = await Promise.all(verification.evidenceStorageIds.map((storageId) => ctx.storage.getUrl(storageId)));
    const now = Date.now();
    await ctx.db.insert("auditEvents", {
      organizationId: organization._id,
      actorUserId: ctx.userId,
      action: "merchant_activation.evidence_accessed",
      entityType: "merchantVerification",
      entityId: verificationId,
      occurredAt: now,
    });
    return {
      organizationName: organization.name,
      accountName: destination.accountName,
      accountIdentifier: destination.accountIdentifier,
      provider: destination.provider,
      evidenceUrls: urls.filter((url): url is string => url !== null),
    };
  },
});

export const decideActivation = platformAdminMutation({
  args: {
    verificationId: v.id("merchantVerifications"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { verificationId, decision, reason }) => {
    const verification = await ctx.db.get(verificationId);
    if (verification === null || verification.status !== "submitted") {
      throw new ConvexError({ code: "INVALID_STATE", message: "This activation request is no longer pending." });
    }
    const organization = await ctx.db.get(verification.organizationId);
    if (organization === null || organization.status !== "submitted") {
      throw new ConvexError({ code: "INVALID_STATE", message: "The Organization is not awaiting activation." });
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10 || normalizedReason.length > 500) {
      throw new ConvexError({ code: "REASON_REQUIRED", message: "Provide a decision reason containing 10 to 500 characters." });
    }
    const now = Date.now();
    const approved = decision === "approve";
    await ctx.db.patch(verificationId, {
      status: approved ? "approved" : "rejected",
      reviewedByUserId: ctx.userId,
      decisionReason: normalizedReason,
      decidedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(organization._id, {
      status: approved ? "active" : "rejected",
      publishedAt: approved ? now : undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: organization._id,
      actorUserId: ctx.userId,
      action: approved ? "merchant_activation.approved" : "merchant_activation.rejected",
      entityType: "merchantVerification",
      entityId: verificationId,
      metadata: { reason: normalizedReason },
      occurredAt: now,
    });
    return null;
  },
});

export const suspendOrganization = platformAdminMutation({
  args: { organizationId: v.id("organizations"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, { organizationId, reason }) => {
    const organization = await ctx.db.get(organizationId);
    if (organization === null || organization.status !== "active") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only an active Organization can be suspended." });
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10 || normalizedReason.length > 500) {
      throw new ConvexError({ code: "REASON_REQUIRED", message: "Provide a suspension reason containing 10 to 500 characters." });
    }
    const now = Date.now();
    await ctx.db.patch(organizationId, { status: "suspended", updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId,
      actorUserId: ctx.userId,
      action: "organization.suspended",
      entityType: "organization",
      entityId: organizationId,
      metadata: { reason: normalizedReason },
      occurredAt: now,
    });
    return null;
  },
});

export const restoreOrganization = platformAdminMutation({
  args: { organizationId: v.id("organizations"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, { organizationId, reason }) => {
    const organization = await ctx.db.get(organizationId);
    if (organization === null || organization.status !== "suspended") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only a suspended Organization can be restored." });
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10 || normalizedReason.length > 500) {
      throw new ConvexError({ code: "REASON_REQUIRED", message: "Provide a restoration reason containing 10 to 500 characters." });
    }
    const now = Date.now();
    await ctx.db.patch(organizationId, { status: "active", updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId,
      actorUserId: ctx.userId,
      action: "organization.restored",
      entityType: "organization",
      entityId: organizationId,
      metadata: { reason: normalizedReason },
      occurredAt: now,
    });
    return null;
  },
});
