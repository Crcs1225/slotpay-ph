import { v } from "convex/values";
import { organizationMutation, organizationQuery } from "./lib/authz";

export const get = organizationQuery()({
  args: {},
  returns: v.object({
    _id: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    timezone: v.string(),
    currency: v.literal("PHP"),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("active"), v.literal("rejected"), v.literal("suspended")),
  }),
  handler: async (ctx) => {
    const organization = await ctx.db.get(ctx.organizationId);
    if (organization === null) throw new Error("Organization not found.");
    return {
      _id: organization._id,
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      currency: organization.currency,
      status: organization.status,
    };
  },
});

export const rename = organizationMutation("organization.manage")({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, { name }) => {
    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      throw new Error("Organization name must contain 2 to 80 characters.");
    }
    const now = Date.now();
    await ctx.db.patch(ctx.organizationId, { name: normalizedName, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: "organization.renamed",
      entityType: "organization",
      entityId: ctx.organizationId,
      metadata: { name: normalizedName },
      occurredAt: now,
    });
    return null;
  },
});
