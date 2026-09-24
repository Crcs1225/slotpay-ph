import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const monday = new Date("2099-01-05T01:00:00.000Z").getTime();

async function fixture() {
  const t = convexTest(schema, modules);
  const data = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "owner@example.test" });
    const organizationId = await ctx.db.insert("organizations", { name: "Glow", slug: "glow", timezone: "Asia/Manila", currency: "PHP", bookingIntervalMinutes: 15, status: "active", createdBy: userId, updatedAt: Date.now() });
    await ctx.db.insert("organizationMembers", { organizationId, userId, role: "owner", status: "active", createdAt: Date.now(), updatedAt: Date.now() });
    const serviceId = await ctx.db.insert("services", { organizationId, name: "Cut", priceCentavos: 10000, depositCentavos: 3000, durationMinutes: 60, active: true, createdAt: Date.now(), updatedAt: Date.now() });
    const providerId = await ctx.db.insert("providers", { organizationId, displayName: "Ana", active: true, createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("serviceProviders", { organizationId, serviceId, providerId, createdAt: Date.now() });
    await ctx.db.insert("availabilityRules", { organizationId, providerId, weekday: 1, startLocalTime: "09:00", endLocalTime: "12:00", active: true, createdAt: Date.now(), updatedAt: Date.now() });
    return { userId, organizationId, serviceId, providerId };
  });
  return { t, client: t.withIdentity({ subject: `${data.userId}|session` }), ...data };
}

describe("Phase 3 booking calendar", () => {
  it("computes starts from weekly rules, service duration, and business timezone", async () => {
    const { client, organizationId, serviceId } = await fixture();
    const starts = await client.query(api.bookings.getAvailability, { organizationId, serviceId, localDate: "2099-01-05" });
    expect(starts.map((slot) => new Date(slot.startAt).toISOString())).toEqual([
      "2099-01-05T01:00:00.000Z", "2099-01-05T01:15:00.000Z", "2099-01-05T01:30:00.000Z", "2099-01-05T01:45:00.000Z",
      "2099-01-05T02:00:00.000Z", "2099-01-05T02:15:00.000Z", "2099-01-05T02:30:00.000Z", "2099-01-05T02:45:00.000Z", "2099-01-05T03:00:00.000Z",
    ]);
  });

  it("allows one overlapping claim, preserves snapshots, and audits creation", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    const args = { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "phone" as const, depositAlreadyVerified: false };
    const claims = await Promise.allSettled([
      client.mutation(api.bookings.create, args),
      client.mutation(api.bookings.create, { ...args, customerName: "Other Customer" }),
    ]);
    const successfulClaims = claims.filter((claim) => claim.status === "fulfilled");
    expect(successfulClaims).toHaveLength(1);
    const bookingId = successfulClaims[0]?.status === "fulfilled" ? successfulClaims[0].value : undefined;
    expect(bookingId).toBeDefined();
    await expect(client.mutation(api.bookings.create, { ...args, customerName: "Third Customer" })).rejects.toThrow("no longer available");
    await t.run(async (ctx) => { await ctx.db.patch(serviceId, { name: "New service", priceCentavos: 90000, durationMinutes: 90, depositCentavos: 0 }); });
    const booking = await t.run((ctx) => ctx.db.get(bookingId!));
    expect(booking).toMatchObject({ serviceName: "Cut", priceCentavos: 10000, durationMinutes: 60, depositCentavos: 3000, appointmentStatus: "pending" });
    const audit = await t.run((ctx) => ctx.db.query("auditEvents").withIndex("by_organization_and_time", (q) => q.eq("organizationId", organizationId)).take(10));
    expect(audit.some((event) => event.action === "booking.created")).toBe(true);
  });

  it("matches Customers by normalized mobile within an Organization", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false });
    const customer = await t.run((ctx) => ctx.db.query("customers").withIndex("by_organization_and_mobile", (q) => q.eq("organizationId", organizationId).eq("mobileE164", "+639171234567")).unique());
    expect(customer?.name).toBe("Jo Customer");
    expect(customer?.mobileE164).toBe("+639171234567");
  });

  it("requires Owner or Manager for booking decisions and a reason for external verification", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    const now = Date.now();
    const providerUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "provider@example.test" });
      await ctx.db.insert("organizationMembers", { organizationId, userId: id, role: "provider", status: "active", createdAt: now, updatedAt: now });
      return id;
    });
    const providerClient = t.withIdentity({ subject: `${providerUserId}|session` });
    await expect(providerClient.query(api.bookings.calendar, { organizationId, startAt: monday, endAt: monday + 60_000 })).rejects.toThrow("Only Owners and Managers");
    await expect(providerClient.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false })).rejects.toThrow("Only Owners and Managers");
    const bookingId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Manager Customer", customerMobile: "09171234568", startAt: monday + 60 * 60_000, providerId, source: "staff", depositAlreadyVerified: false });
    await expect(providerClient.mutation(api.bookings.setOutcome, { organizationId, bookingId, outcome: "cancelled", reason: "Not allowed.", depositDisposition: "not_paid" })).rejects.toThrow("Only Owners and Managers");
    await expect(client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: true })).rejects.toThrow("Verification reason");
  });

  it("rejects cross-Organization reads and booking mutations", async () => {
    const { t, client, userId, organizationId, serviceId, providerId } = await fixture();
    const otherOrganizationId = await t.run((ctx) => ctx.db.insert("organizations", { name: "Other", slug: "other", timezone: "Asia/Manila", currency: "PHP", status: "draft", createdBy: userId, updatedAt: Date.now() }));
    const bookingId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false });
    await expect(client.query(api.bookings.calendarSetup, { organizationId: otherOrganizationId })).rejects.toThrow("Active Organization membership is required");
    await expect(client.query(api.bookings.calendar, { organizationId: otherOrganizationId, startAt: monday, endAt: monday + 60_000 })).rejects.toThrow("Active Organization membership is required");
    await expect(client.query(api.bookings.getAvailability, { organizationId: otherOrganizationId, serviceId, localDate: "2099-01-05" })).rejects.toThrow("Active Organization membership is required");
    await expect(client.mutation(api.bookings.create, { organizationId: otherOrganizationId, serviceId, customerName: "Other Customer", customerMobile: "09171234568", startAt: monday + 60 * 60_000, providerId, source: "staff", depositAlreadyVerified: false })).rejects.toThrow("Active Organization membership is required");
    await expect(client.mutation(api.bookings.reschedule, { organizationId: otherOrganizationId, bookingId, startAt: monday + 60 * 60_000, providerId })).rejects.toThrow("Active Organization membership is required");
    await expect(client.mutation(api.bookings.setOutcome, { organizationId: otherOrganizationId, bookingId, outcome: "cancelled", reason: "Cross-tenant attempt.", depositDisposition: "not_paid" })).rejects.toThrow("Active Organization membership is required");
  });

  it("reschedules atomically and frees the previous time", async () => {
    const { client, organizationId, serviceId, providerId } = await fixture();
    const bookingId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false });
    await client.mutation(api.bookings.reschedule, { organizationId, bookingId, startAt: monday + 60 * 60_000, providerId });
    const [booking, starts] = await Promise.all([
      client.query(api.bookings.calendar, { organizationId, startAt: monday, endAt: monday + 4 * 60 * 60_000 }),
      client.query(api.bookings.getAvailability, { organizationId, serviceId, localDate: "2099-01-05" }),
    ]);
    expect(booking[0]?.startAt).toBe(monday + 60 * 60_000);
    expect(starts.some((slot) => slot.startAt === monday)).toBe(true);
  });

  it("rejects a conflicting reschedule without changing the original booking", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    const firstId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "First Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false });
    await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Second Customer", customerMobile: "09171234568", startAt: monday + 60 * 60_000, providerId, source: "staff", depositAlreadyVerified: false });
    await expect(client.mutation(api.bookings.reschedule, { organizationId, bookingId: firstId, startAt: monday + 60 * 60_000, providerId })).rejects.toThrow("no longer available");
    const first = await t.run((ctx) => ctx.db.get(firstId));
    expect(first?.startAt).toBe(monday);
  });

  it("assigns an Any Provider reschedule to the least-loaded eligible Provider", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    const secondProviderId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("providers", { organizationId, displayName: "Bea", active: true, createdAt: Date.now(), updatedAt: Date.now() });
      await ctx.db.insert("serviceProviders", { organizationId, serviceId, providerId: id, createdAt: Date.now() });
      await ctx.db.insert("availabilityRules", { organizationId, providerId: id, weekday: 1, startLocalTime: "09:00", endLocalTime: "12:00", active: true, createdAt: Date.now(), updatedAt: Date.now() });
      return id;
    });
    const firstId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "First Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false });
    await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Second Customer", customerMobile: "09171234568", startAt: monday + 60 * 60_000, providerId, source: "staff", depositAlreadyVerified: false });

    await client.mutation(api.bookings.reschedule, { organizationId, bookingId: firstId, startAt: monday + 2 * 60 * 60_000 });

    expect(await t.run((ctx) => ctx.db.get(firstId))).toMatchObject({ startAt: monday + 2 * 60 * 60_000, providerId: secondProviderId });
  });

  it("rejects reschedule timestamps with seconds and preserves the current schedule", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    const bookingId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: false });
    await expect(client.mutation(api.bookings.reschedule, { organizationId, bookingId, startAt: monday + 60 * 60_000 + 30_000, providerId })).rejects.toThrow("whole minute");
    expect((await t.run((ctx) => ctx.db.get(bookingId)))?.startAt).toBe(monday);
  });

  it("applies unavailable exceptions and active holds to Availability", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.insert("bookingHolds", { organizationId, providerId, startAt: monday, endAt: monday + 60 * 60_000, expiresAt: Date.now() + 60_000 });
    });
    const afterHold = await client.query(api.bookings.getAvailability, { organizationId, serviceId, localDate: "2099-01-05" });
    expect(afterHold.some((slot) => slot.startAt === monday)).toBe(false);
    await t.run(async (ctx) => {
      await ctx.db.insert("availabilityExceptions", { organizationId, providerId, localDate: "2099-01-05", kind: "unavailable", note: "Closed", createdAt: Date.now(), updatedAt: Date.now() });
    });
    expect(await client.query(api.bookings.getAvailability, { organizationId, serviceId, localDate: "2099-01-05" })).toEqual([]);
  });

  it("requires and records an allowed disposition when cancelling an accepted Deposit", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    const bookingId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: true, verificationReason: "Transfer confirmed in the merchant account." });
    await expect(client.mutation(api.bookings.setOutcome, { organizationId, bookingId, outcome: "cancelled", reason: "Customer cancelled." })).rejects.toThrow("Deposit before cancelling");
    await expect(client.mutation(api.bookings.setOutcome, { organizationId, bookingId, outcome: "cancelled", reason: "Customer cancelled.", depositDisposition: "not_paid" })).rejects.toThrow("cannot be recorded as not paid");
    await client.mutation(api.bookings.setOutcome, { organizationId, bookingId, outcome: "cancelled", reason: "Customer cancelled.", depositDisposition: "retained" });
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({ appointmentStatus: "cancelled", depositStatus: "retained", depositDisposition: "retained" });
  });

  it("does not mark a zero-deposit Booking as payment verified", async () => {
    const { t, client, organizationId, serviceId, providerId } = await fixture();
    await t.run((ctx) => ctx.db.patch(serviceId, { depositCentavos: 0 }));
    const bookingId = await client.mutation(api.bookings.create, { organizationId, serviceId, customerName: "Jo Customer", customerMobile: "09171234567", startAt: monday, providerId, source: "staff", depositAlreadyVerified: true });
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({ appointmentStatus: "confirmed", depositStatus: "not_required" });
    const events = await t.run((ctx) => ctx.db.query("auditEvents").withIndex("by_organization_and_time", (q) => q.eq("organizationId", organizationId)).take(10));
    expect(events.some((event) => event.action === "booking.created_and_verified")).toBe(false);
  });
});
