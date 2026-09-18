import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function signedInUser(email = "owner@example.com") {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { email }));
  return { t, userId, client: t.withIdentity({ subject: `${userId}|session` }) };
}

async function createOrganization(client: Awaited<ReturnType<typeof signedInUser>>["client"]) {
  return await client.mutation(api.onboarding.createOrganization, { name: "Glow Studio", slug: "glow-studio" });
}

async function completeSetup(t: Awaited<ReturnType<typeof signedInUser>>["t"], userId: Id<"users">, organizationId: Id<"organizations">) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(organizationId, {
      description: "A focused nail and beauty studio.", addressLine1: "123 Luna Street", locality: "Quezon City", region: "Metro Manila", postalCode: "1100", contactEmail: "hello@glow.test", contactMobile: "+639171234567",
    });
    const serviceId = await ctx.db.insert("services", { organizationId, name: "Gel manicure", priceCentavos: 120000, depositCentavos: 50000, durationMinutes: 60, active: true, createdAt: now, updatedAt: now });
    const providerId = await ctx.db.insert("providers", { organizationId, displayName: "Maria", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("serviceProviders", { organizationId, serviceId, providerId, createdAt: now });
    await ctx.db.insert("availabilityRules", { organizationId, providerId, weekday: 1, startLocalTime: "09:00", endLocalTime: "17:00", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("paymentDestinations", { organizationId, provider: "gcash", accountName: "Glow Studio", accountIdentifier: "09171234567", ownershipAttestedAt: now, active: true, createdAt: now, updatedAt: now });
    const storageId = await ctx.storage.store(new Blob(["evidence"], { type: "image/png" }));
    const verificationId = await ctx.db.insert("merchantVerifications", { organizationId, status: "draft", submittedByUserId: userId, evidenceStorageIds: [storageId], updatedAt: now });
    return { verificationId };
  });
}

describe("Phase 2 onboarding and activation", () => {
  it("creates one Organization, owner membership, and 14-day Trial atomically", async () => {
    const { t, client, userId } = await signedInUser();
    const organizationId = await createOrganization(client);
    const state = await t.run(async (ctx) => ({
      organization: await ctx.db.get(organizationId),
      membership: await ctx.db.query("organizationMembers").withIndex("by_organization_and_user", (q) => q.eq("organizationId", organizationId).eq("userId", userId)).unique(),
      subscription: await ctx.db.query("subscriptions").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).unique(),
    }));
    expect(state.membership?.role).toBe("owner");
    expect(state.subscription?.status).toBe("trialing");
    expect(state.subscription!.trialEndsAt - state.subscription!.trialStartedAt).toBe(14 * 24 * 60 * 60 * 1000);
    expect(state.organization?.status).toBe("draft");
  });

  it("rejects a second Organization and duplicate slug", async () => {
    const first = await signedInUser();
    await createOrganization(first.client);
    await expect(first.client.mutation(api.onboarding.createOrganization, { name: "Second Studio", slug: "second-studio" })).rejects.toThrow("already belongs");

    const secondUserId = await first.t.run((ctx) => ctx.db.insert("users", { email: "second@example.com" }));
    const secondClient = first.t.withIdentity({ subject: `${secondUserId}|session` });
    await expect(secondClient.mutation(api.onboarding.createOrganization, { name: "Another Glow", slug: "glow-studio" })).rejects.toThrow("already in use");
  });

  it("validates service money and duration invariants", async () => {
    const { client } = await signedInUser();
    const organizationId = await createOrganization(client);
    await expect(client.mutation(api.onboarding.addService, { organizationId, name: "Invalid", description: "", priceCentavos: 30000, depositCentavos: 50000, durationMinutes: 50 })).rejects.toThrow("deposit not above price");
  });

  it("blocks incomplete activation and unauthorized Provider setup changes", async () => {
    const { t, client, userId } = await signedInUser();
    const organizationId = await createOrganization(client);
    await expect(client.mutation(api.onboarding.submitActivation, { organizationId })).rejects.toThrow("Complete the business profile");
    const providerUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "provider@example.com" });
      await ctx.db.insert("organizationMembers", { organizationId, userId: id, role: "provider", status: "active", createdAt: Date.now(), updatedAt: Date.now() });
      return id;
    });
    await expect(t.withIdentity({ subject: `${providerUserId}|session` }).mutation(api.onboarding.updateProfile, { organizationId, name: "Glow", description: "A complete description", addressLine1: "123 Street", locality: "Manila", region: "Metro Manila", postalCode: "1000", contactEmail: "x@y.test", contactMobile: "+639171234567" })).rejects.toThrow("role cannot perform");
    await expect(t.withIdentity({ subject: `${providerUserId}|session` }).query(api.onboarding.setupState, { organizationId })).rejects.toThrow("role cannot perform");
    expect(userId).toBeTruthy();
  });

  it("rejects impossible availability dates and requires a usable service assignment", async () => {
    const { t, client, userId } = await signedInUser();
    const organizationId = await createOrganization(client);
    await completeSetup(t, userId, organizationId);
    const state = await client.query(api.onboarding.setupState, { organizationId });
    const providerId = state.providers[0]!._id;
    await expect(client.mutation(api.onboarding.addAvailabilityException, { organizationId, providerId, localDate: "2026-02-31", kind: "unavailable", note: "Invalid" })).rejects.toThrow("valid local date");
    await t.run(async (ctx) => {
      const assignments = await ctx.db.query("serviceProviders").withIndex("by_organization_and_service", (q) => q.eq("organizationId", organizationId)).take(10);
      await Promise.all(assignments.map((assignment) => ctx.db.delete(assignment._id)));
    });
    await expect(client.mutation(api.onboarding.submitActivation, { organizationId })).rejects.toThrow("Assign an available active Provider");
  });

  it("keeps the public page private until approval, then publishes a non-bookable preview", async () => {
    const { t, client, userId } = await signedInUser();
    const organizationId = await createOrganization(client);
    const { verificationId } = await completeSetup(t, userId, organizationId);
    expect(await t.query(api.onboarding.publicPreview, { slug: "glow-studio" })).toBeNull();
    expect(await t.query(api.onboarding.publicPreview, { slug: "x" })).toBeNull();
    expect(await t.query(api.onboarding.publicPreview, { slug: "x".repeat(101) })).toBeNull();
    await client.mutation(api.onboarding.submitActivation, { organizationId });
    const setup = await client.query(api.onboarding.setupState, { organizationId });
    await expect(client.mutation(api.onboarding.addAvailabilityRule, { organizationId, providerId: setup.providers[0]!._id, weekday: 2, startLocalTime: "09:00", endLocalTime: "17:00" })).rejects.toThrow("cannot be edited");
    await expect(client.mutation(api.onboarding.assignProvider, { organizationId, providerId: setup.providers[0]!._id, serviceId: setup.services[0]!._id })).rejects.toThrow("cannot be edited");
    const ownerUrls = await client.mutation(api.onboarding.openMyEvidence, { organizationId, verificationId });
    expect(ownerUrls).toHaveLength(1);

    const adminUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "admin@slotpay.test" });
      await ctx.db.insert("userProfiles", { userId: id, platformRole: "platform_admin" });
      return id;
    });
    const admin = t.withIdentity({ subject: `${adminUserId}|session` });
    await expect(client.mutation(api.activationAdmin.openEvidence, { verificationId })).rejects.toThrow("administrator access");
    const review = await admin.mutation(api.activationAdmin.openEvidence, { verificationId });
    expect(review).toMatchObject({ accountIdentifier: "09171234567", provider: "gcash" });
    await admin.mutation(api.activationAdmin.decideActivation, { verificationId, decision: "approve", reason: "Business evidence and payment ownership were reviewed." });
    const preview = await t.query(api.onboarding.publicPreview, { slug: "glow-studio" });
    expect(preview).toMatchObject({ name: "Glow Studio", bookingEnabled: false, status: "active" });
    expect(preview).not.toHaveProperty("accountIdentifier");
    await admin.mutation(api.activationAdmin.suspendOrganization, { organizationId, reason: "Temporary suspension for a merchant compliance review." });
    expect(await t.query(api.onboarding.publicPreview, { slug: "glow-studio" })).toBeNull();
    await admin.mutation(api.activationAdmin.restoreOrganization, { organizationId, reason: "Compliance review completed with acceptable evidence." });
    expect(await t.query(api.onboarding.publicPreview, { slug: "glow-studio" })).toMatchObject({ status: "active" });
    const evidenceAudit = await t.run(async (ctx) => ctx.db.query("auditEvents").withIndex("by_organization_and_time", (q) => q.eq("organizationId", organizationId)).collect());
    expect(evidenceAudit.some((event) => event.action === "merchant_activation.evidence_accessed")).toBe(true);
    expect(evidenceAudit.some((event) => event.action === "organization.suspended")).toBe(true);
    expect(evidenceAudit.some((event) => event.action === "organization.restored")).toBe(true);
  });

  it("requires a reason, records rejection, and appends the audit event", async () => {
    const { t, client, userId } = await signedInUser();
    const organizationId = await createOrganization(client);
    const { verificationId } = await completeSetup(t, userId, organizationId);
    await client.mutation(api.onboarding.submitActivation, { organizationId });
    const adminUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "admin@slotpay.test" });
      await ctx.db.insert("userProfiles", { userId: id, platformRole: "platform_admin" });
      return id;
    });
    const admin = t.withIdentity({ subject: `${adminUserId}|session` });
    await expect(admin.mutation(api.activationAdmin.decideActivation, { verificationId, decision: "reject", reason: "short" })).rejects.toThrow("10 to 500");
    await admin.mutation(api.activationAdmin.decideActivation, { verificationId, decision: "reject", reason: "The submitted ownership evidence is not readable." });
    const state = await t.run(async (ctx) => ({
      organization: await ctx.db.get(organizationId),
      verification: await ctx.db.get(verificationId),
      events: await ctx.db.query("auditEvents").withIndex("by_organization_and_time", (q) => q.eq("organizationId", organizationId)).collect(),
    }));
    expect(state.organization?.status).toBe("rejected");
    expect(state.verification?.decisionReason).toContain("not readable");
    expect(state.events.some((event) => event.action === "merchant_activation.rejected")).toBe(true);
    await client.mutation(api.onboarding.submitActivation, { organizationId });
    const resubmitted = await t.run((ctx) => ctx.db.get(verificationId));
    expect(resubmitted).toMatchObject({ status: "submitted", submittedByUserId: userId });
    expect(resubmitted?.reviewedByUserId).toBeUndefined();
    expect(resubmitted?.decidedAt).toBeUndefined();
    expect(resubmitted?.decisionReason).toBeUndefined();
  });
});
