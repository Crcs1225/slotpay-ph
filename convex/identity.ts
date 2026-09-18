import { v } from "convex/values";
import { authenticatedQuery } from "./lib/authz";

export const current = authenticatedQuery({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    platformRole: v.optional(v.union(v.literal("platform_admin"), v.literal("platform_support"))),
  }),
  handler: async (ctx) => ({
    userId: ctx.userId,
    platformRole: ctx.profile?.platformRole,
  }),
});
