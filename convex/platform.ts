import { v } from "convex/values";
import { platformAdminQuery } from "./lib/authz";

export const organizationSummary = platformAdminQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.null(),
    v.object({ _id: v.id("organizations"), name: v.string(), status: v.string() }),
  ),
  handler: async (ctx, { organizationId }) => {
    const organization = await ctx.db.get(organizationId);
    return organization === null
      ? null
      : { _id: organization._id, name: organization.name, status: organization.status };
  },
});
