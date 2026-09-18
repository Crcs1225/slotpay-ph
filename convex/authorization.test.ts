import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture(role: "owner" | "manager" | "provider" = "owner", status: "active" | "disabled" = "active") {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "owner@example.com" });
    const otherUserId = await ctx.db.insert("users", { email: "other@example.com" });
    const organizationId = await ctx.db.insert("organizations", {
      name: "Glow Studio", slug: "glow-studio", timezone: "Asia/Manila", currency: "PHP",
      status: "draft", createdBy: userId, updatedAt: Date.now(),
    });
    const otherOrganizationId = await ctx.db.insert("organizations", {
      name: "Other Studio", slug: "other-studio", timezone: "Asia/Manila", currency: "PHP",
      status: "draft", createdBy: otherUserId, updatedAt: Date.now(),
    });
    await ctx.db.insert("organizationMembers", {
      organizationId, userId, role, status, createdAt: Date.now(), updatedAt: Date.now(),
    });
    return { userId, otherUserId, organizationId, otherOrganizationId };
  });
  return { t, ...ids };
}

describe("authorization boundary", () => {
  it("rejects unauthenticated calls", async () => {
    const { t, organizationId } = await fixture();
    await expect(t.query(api.organizations.get, { organizationId })).rejects.toThrow("Sign in is required");
  });

  it("does not disclose cross-organization records", async () => {
    const { t, userId, otherOrganizationId } = await fixture();
    await expect(t.withIdentity({ subject: `${userId}|session` }).query(api.organizations.get, { organizationId: otherOrganizationId })).rejects.toThrow("Active Organization membership is required");
  });

  it("does not mutate cross-organization records", async () => {
    const { t, userId, otherOrganizationId } = await fixture();
    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.organizations.rename, {
        organizationId: otherOrganizationId,
        name: "Compromised Studio",
      }),
    ).rejects.toThrow("Active Organization membership is required");
    const organization = await t.run((ctx) => ctx.db.get(otherOrganizationId));
    expect(organization?.name).toBe("Other Studio");
  });

  it("rejects disabled members", async () => {
    const { t, userId, organizationId } = await fixture("owner", "disabled");
    await expect(t.withIdentity({ subject: `${userId}|session` }).query(api.organizations.get, { organizationId })).rejects.toThrow("Active Organization membership is required");
  });

  it("rejects a role without the required capability", async () => {
    const { t, userId, organizationId } = await fixture("provider");
    await expect(t.withIdentity({ subject: `${userId}|session` }).mutation(api.organizations.rename, { organizationId, name: "Renamed" })).rejects.toThrow("Your role cannot perform this action");
  });

  it("does not treat an organization owner as a platform administrator", async () => {
    const { t, userId, organizationId } = await fixture("owner");
    await expect(t.withIdentity({ subject: `${userId}|session` }).query(api.platform.organizationSummary, { organizationId })).rejects.toThrow("Platform administrator access is required");
  });

  it("allows platform administrators", async () => {
    const { t, userId, organizationId } = await fixture();
    await t.run(async (ctx) => { await ctx.db.insert("userProfiles", { userId, platformRole: "platform_admin" }); });
    const result = await t.withIdentity({ subject: `${userId}|session` }).query(api.platform.organizationSummary, { organizationId });
    expect(result?.name).toBe("Glow Studio");
  });

  it("writes the audit event atomically with a sensitive change", async () => {
    const { t, userId, organizationId } = await fixture("owner");
    await t.withIdentity({ subject: `${userId}|session` }).mutation(api.organizations.rename, { organizationId, name: "Glow Atelier" });
    const state = await t.run(async (ctx) => ({
      organization: await ctx.db.get(organizationId),
      events: await ctx.db.query("auditEvents").withIndex("by_organization_and_time", (q) => q.eq("organizationId", organizationId)).collect(),
    }));
    expect(state.organization?.name).toBe("Glow Atelier");
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.action).toBe("organization.renamed");
  });
});
