import { getAuthUserId } from "@convex-dev/auth/server";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";

export const roleCapabilities = {
  owner: ["organization.manage", "members.manage", "payments.review", "bookings.manage"],
  manager: ["payments.review", "bookings.manage"],
  provider: ["bookings.manage"],
} as const;

export type OrganizationRole = keyof typeof roleCapabilities;
export type Capability = (typeof roleCapabilities)[OrganizationRole][number];

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (profile?.disabledAt !== undefined) {
    throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This account is disabled." });
  }
  return { userId, profile };
}

export const authenticatedQuery = customQuery(query, {
  args: {},
  input: async (ctx) => ({ ctx: await requireIdentity(ctx), args: {} }),
});
export const authenticatedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => ({ ctx: await requireIdentity(ctx), args: {} }),
});

export function organizationQuery(requiredCapability?: Capability) {
  return customQuery(query, {
    args: { organizationId: v.id("organizations") },
    input: async (ctx, { organizationId }) => {
      const identity = await requireIdentity(ctx);
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", organizationId).eq("userId", identity.userId),
        )
        .unique();
      requireActiveMembership(membership, requiredCapability);
      return { ctx: { ...identity, organizationId, membership }, args: {} };
    },
  });
}

export function organizationMutation(requiredCapability?: Capability) {
  return customMutation(mutation, {
    args: { organizationId: v.id("organizations") },
    input: async (ctx, { organizationId }) => {
      const identity = await requireIdentity(ctx);
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", organizationId).eq("userId", identity.userId),
        )
        .unique();
      requireActiveMembership(membership, requiredCapability);
      return { ctx: { ...identity, organizationId, membership }, args: {} };
    },
  });
}

export const platformAdminQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const identity = await requireIdentity(ctx);
    if (identity.profile?.platformRole !== "platform_admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform administrator access is required." });
    }
    return { ctx: identity, args: {} };
  },
});
export const platformAdminMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const identity = await requireIdentity(ctx);
    if (identity.profile?.platformRole !== "platform_admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform administrator access is required." });
    }
    return { ctx: identity, args: {} };
  },
});

export function assertOrganizationScope(
  organizationId: Id<"organizations">,
  record: { organizationId: Id<"organizations"> } | null,
) {
  if (record === null || record.organizationId !== organizationId) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Record not found." });
  }
  return record;
}

function requireActiveMembership(
  membership: Doc<"organizationMembers"> | null,
  requiredCapability?: Capability,
) {
  if (membership === null || membership.status !== "active") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Active Organization membership is required." });
  }
  if (
    requiredCapability !== undefined &&
    !(roleCapabilities[membership.role] as readonly Capability[]).includes(requiredCapability)
  ) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Your role cannot perform this action." });
  }
}
