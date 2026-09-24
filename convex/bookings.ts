import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { organizationMutation, organizationQuery } from "./lib/authz";

const sourceValidator = v.union(v.literal("staff"), v.literal("walk_in"), v.literal("phone"), v.literal("messenger"));
const bookingCard = v.object({
  _id: v.id("bookings"), publicCode: v.string(), customerName: v.string(), customerMobile: v.string(),
  serviceId: v.id("services"), serviceName: v.string(), providerId: v.id("providers"), providerName: v.string(),
  startAt: v.number(), endAt: v.number(), priceCentavos: v.number(), depositCentavos: v.number(), durationMinutes: v.number(),
  appointmentStatus: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"), v.literal("expired")),
  depositStatus: v.union(v.literal("not_required"), v.literal("awaiting_payment"), v.literal("processing"), v.literal("needs_review"), v.literal("suspicious"), v.literal("verified"), v.literal("rejected"), v.literal("refund_due"), v.literal("refunded_external"), v.literal("retained")),
  source: v.union(v.literal("staff"), v.literal("walk_in"), v.literal("phone"), v.literal("messenger"), v.literal("public")),
});

export const calendarSetup = organizationQuery("bookings.manage")({
  args: {},
  returns: v.object({
    bookingIntervalMinutes: v.number(),
    services: v.array(v.object({ _id: v.id("services"), name: v.string(), durationMinutes: v.number(), priceCentavos: v.number(), depositCentavos: v.number(), active: v.boolean() })),
    providers: v.array(v.object({ _id: v.id("providers"), displayName: v.string(), active: v.boolean() })),
  }),
  handler: async (ctx) => {
    assertOwnerOrManager(ctx.membership?.role ?? "");
    const [organization, services, providers] = await Promise.all([
      ctx.db.get(ctx.organizationId),
      ctx.db.query("services").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
      ctx.db.query("providers").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
    ]);
    return { bookingIntervalMinutes: organization?.bookingIntervalMinutes ?? 15, services: services.map(({ _id, name, durationMinutes, priceCentavos, depositCentavos, active }) => ({ _id, name, durationMinutes, priceCentavos, depositCentavos, active })), providers: providers.map(({ _id, displayName, active }) => ({ _id, displayName, active })) };
  },
});

export const calendar = organizationQuery("bookings.manage")({
  args: { startAt: v.number(), endAt: v.number(), providerId: v.optional(v.id("providers")) },
  returns: v.array(bookingCard),
  handler: async (ctx, { startAt, endAt, providerId }) => {
    assertOwnerOrManager(ctx.membership?.role ?? "");
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt || endAt - startAt > 8 * 24 * 60 * 60 * 1000) fail("INVALID_RANGE", "Choose a date range of up to seven days.");
    if (providerId !== undefined) await scopedProvider(ctx, ctx.organizationId, providerId);
    const rows = providerId === undefined
      ? await ctx.db.query("bookings").withIndex("by_organization_and_start", (q) => q.eq("organizationId", ctx.organizationId).gte("startAt", startAt).lt("startAt", endAt)).take(500)
      : await ctx.db.query("bookings").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", providerId).gte("startAt", startAt).lt("startAt", endAt)).take(500);
    const providers = await ctx.db.query("providers").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).take(100);
    const providerNames = new Map(providers.map((provider) => [provider._id, provider.displayName]));
    return (await Promise.all(rows.map(async (booking) => {
      const [customer, provider] = await Promise.all([ctx.db.get(booking.customerId), ctx.db.get(booking.providerId)]);
      if (customer === null || provider === null || providerNames.get(provider._id) === undefined) return null;
      return { _id: booking._id, publicCode: booking.publicCode, customerName: customer.name, customerMobile: customer.mobileE164, serviceId: booking.serviceId, serviceName: booking.serviceName, providerId: booking.providerId, providerName: provider.displayName, startAt: booking.startAt, endAt: booking.endAt, priceCentavos: booking.priceCentavos, depositCentavos: booking.depositCentavos, durationMinutes: booking.durationMinutes, appointmentStatus: booking.appointmentStatus, depositStatus: booking.depositStatus, source: booking.source };
    }))).filter((booking): booking is NonNullable<typeof booking> => booking !== null);
  },
});

export const getAvailability = organizationQuery("bookings.manage")({
  args: { serviceId: v.id("services"), localDate: v.string(), providerId: v.optional(v.id("providers")) },
  returns: v.array(v.object({ startAt: v.number(), providerId: v.id("providers"), providerName: v.string() })),
  handler: async (ctx, { serviceId, localDate, providerId }) => {
    assertOwnerOrManager(ctx.membership?.role ?? "");
    const service = await scopedService(ctx, ctx.organizationId, serviceId);
    if (!service.active) return [];
    const candidates = await ctx.db.query("serviceProviders").withIndex("by_organization_and_service", (q) => q.eq("organizationId", ctx.organizationId).eq("serviceId", serviceId)).take(100);
    const providerIds = [...new Set(candidates.map((item) => item.providerId))].filter((id) => providerId === undefined || id === providerId);
    const date = parseDate(localDate);
    if (date === null) fail("INVALID_DATE", "Choose a valid date.");
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
    const interval = (await ctx.db.get(ctx.organizationId))?.bookingIntervalMinutes ?? 15;
    const now = Date.now();
    const output: { startAt: number; providerId: Id<"providers">; providerName: string }[] = [];
    for (const providerId of providerIds) {
      const provider = await scopedProvider(ctx, ctx.organizationId, providerId);
      if (!provider.active) continue;
      const [rules, exceptions] = await Promise.all([
        ctx.db.query("availabilityRules").withIndex("by_organization_and_provider_and_weekday", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", providerId).eq("weekday", weekday)).take(30),
        ctx.db.query("availabilityExceptions").withIndex("by_organization_and_provider_and_date", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", providerId).eq("localDate", localDate)).take(30),
      ]);
      const windows = exceptionWindows(exceptions, rules);
      const dayStart = Date.UTC(date.year, date.month - 1, date.day) - 8 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const busyBookings = await ctx.db.query("bookings").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", providerId).gte("startAt", dayStart - 12 * 60 * 60 * 1000).lt("startAt", dayEnd)).take(500);
      const busyHolds = await ctx.db.query("bookingHolds").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", providerId).gte("startAt", dayStart - 12 * 60 * 60 * 1000).lt("startAt", dayEnd)).take(500);
      for (const window of windows) {
        const close = dayStart + timeMinutes(window.endLocalTime) * 60_000;
        for (let startAt = dayStart + Math.ceil(timeMinutes(window.startLocalTime) / interval) * interval * 60_000; startAt + service.durationMinutes * 60_000 <= close; startAt += interval * 60_000) {
          const endAt = startAt + service.durationMinutes * 60_000;
          const blocked = startAt <= now || busyBookings.some((b) => !terminal(b.appointmentStatus) && overlaps(startAt, endAt, b.startAt, b.endAt)) || busyHolds.some((h) => h.releasedAt === undefined && (h.expiresAt === undefined || h.expiresAt > now) && overlaps(startAt, endAt, h.startAt, h.endAt));
          if (!blocked) output.push({ startAt, providerId, providerName: provider.displayName });
        }
      }
    }
    const unique = new Map(output.map((slot) => [`${slot.startAt}:${slot.providerId}`, slot]));
    return [...unique.values()].sort((a, b) => a.startAt - b.startAt || String(a.providerId).localeCompare(String(b.providerId)));
  },
});

export const create = organizationMutation("bookings.manage")({
  args: {
    serviceId: v.id("services"), customerName: v.string(), customerMobile: v.string(), customerEmail: v.optional(v.string()),
    startAt: v.number(), providerId: v.optional(v.id("providers")), source: sourceValidator,
    depositAlreadyVerified: v.boolean(), verificationReason: v.optional(v.string()),
  },
  returns: v.id("bookings"),
  handler: async (ctx, args) => {
    assertOwnerOrManager(ctx.membership?.role ?? "");
    const service = await scopedService(ctx, ctx.organizationId, args.serviceId);
    if (!service.active) fail("SERVICE_INACTIVE", "This Service is not available.");
    const customerName = required(args.customerName, "Customer name", 2, 100);
    const customerMobile = normalizeMobile(args.customerMobile);
    const customerEmail = args.customerEmail?.trim().toLowerCase();
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) fail("INVALID_EMAIL", "Enter a valid email address.");
    if (!Number.isFinite(args.startAt) || args.startAt <= Date.now() || args.startAt % 60_000 !== 0) fail("INVALID_TIME", "Choose a future appointment time.");
    const organization = await ctx.db.get(ctx.organizationId);
    const interval = organization?.bookingIntervalMinutes ?? 15;
    const startDate = new Date(args.startAt + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const localMinute = new Date(args.startAt + 8 * 60 * 60 * 1000).getUTCHours() * 60 + new Date(args.startAt + 8 * 60 * 60 * 1000).getUTCMinutes();
    if (localMinute % interval !== 0) fail("INVALID_TIME", "Choose a start time aligned to the booking interval.");
    const eligible = await ctx.db.query("serviceProviders").withIndex("by_organization_and_service", (q) => q.eq("organizationId", ctx.organizationId).eq("serviceId", service._id)).take(100);
    const providerIds = [...new Set(eligible.map((item) => item.providerId))].filter((id) => args.providerId === undefined || id === args.providerId);
    if (!providerIds.length) fail("NO_PROVIDER", "No Provider is assigned to this Service.");
    const availability = await Promise.all(providerIds.map(async (providerId) => {
      const slots = await getAvailabilityForProvider(ctx, ctx.organizationId, service, providerId, startDate, args.startAt);
      return slots ? { providerId, provider: await ctx.db.get(providerId) } : null;
    }));
    const eligibleNow = availability.filter((item): item is { providerId: Id<"providers">; provider: Doc<"providers"> } => item !== null && item.provider !== null);
    if (!eligibleNow.length) fail("TIME_UNAVAILABLE", "That appointment time is no longer available.");
    const loads = await Promise.all(eligibleNow.map(async ({ providerId, provider }) => {
      const dayStart = Math.floor((args.startAt + 8 * 60 * 60 * 1000) / 86_400_000) * 86_400_000 - 8 * 60 * 60 * 1000;
      const bookings = await ctx.db.query("bookings").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", providerId).gte("startAt", dayStart).lt("startAt", dayStart + 86_400_000)).take(500);
      return { providerId, provider, count: bookings.filter((b) => !terminal(b.appointmentStatus)).length };
    }));
    loads.sort((a, b) => a.count - b.count || String(a.providerId).localeCompare(String(b.providerId)));
    const chosen = loads[0];
    if (!chosen) fail("NO_PROVIDER", "No Provider is available.");
    if (args.depositAlreadyVerified && service.depositCentavos > 0) {
      required(args.verificationReason ?? "", "Verification reason", 3, 300);
    }
    const now = Date.now();
    const customerExisting = await ctx.db.query("customers").withIndex("by_organization_and_mobile", (q) => q.eq("organizationId", ctx.organizationId).eq("mobileE164", customerMobile)).unique();
    const customerId = customerExisting
      ? (await ctx.db.patch(customerExisting._id, { name: customerName, email: customerEmail, lastBookingAt: now, updatedAt: now }), customerExisting._id)
      : await ctx.db.insert("customers", { organizationId: ctx.organizationId, name: customerName, mobileE164: customerMobile, email: customerEmail, lastBookingAt: now, createdAt: now, updatedAt: now });
    const paymentVerified = args.depositAlreadyVerified && service.depositCentavos > 0;
    const confirmed = paymentVerified || service.depositCentavos === 0;
    const bookingId = await ctx.db.insert("bookings", {
      organizationId: ctx.organizationId, publicCode: "PENDING", customerId, serviceId: service._id, providerId: chosen.providerId,
      source: args.source, startAt: args.startAt, endAt: args.startAt + service.durationMinutes * 60_000,
      serviceName: service.name, priceCentavos: service.priceCentavos, depositCentavos: service.depositCentavos, durationMinutes: service.durationMinutes,
      appointmentStatus: confirmed ? "confirmed" : "pending", depositStatus: service.depositCentavos === 0 ? "not_required" : paymentVerified ? "verified" : "awaiting_payment",
      createdByUserId: ctx.userId, decisionReason: paymentVerified ? args.verificationReason?.trim() : undefined, confirmedAt: confirmed ? now : undefined, createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(bookingId, { publicCode: `SP-${String(bookingId).slice(-8).toUpperCase()}` });
    await audit(ctx, paymentVerified ? "booking.created_and_verified" : "booking.created", bookingId, { source: args.source, providerId: chosen.providerId, startAt: args.startAt, customerId, reason: paymentVerified ? args.verificationReason?.trim() : undefined }, now);
    return bookingId;
  },
});

export const reschedule = organizationMutation("bookings.manage")({
  args: { bookingId: v.id("bookings"), startAt: v.number(), providerId: v.optional(v.id("providers")) }, returns: v.null(),
  handler: async (ctx, { bookingId, startAt, providerId }) => {
    assertOwnerOrManager(ctx.membership?.role ?? "");
    const booking = await scopedBooking(ctx, ctx.organizationId, bookingId);
    if (terminal(booking.appointmentStatus)) fail("BOOKING_TERMINAL", "A completed or cancelled Booking cannot be rescheduled.");
    const service = await scopedService(ctx, ctx.organizationId, booking.serviceId);
    if (!Number.isFinite(startAt) || startAt <= Date.now() || startAt % 60_000 !== 0) fail("INVALID_TIME", "Choose a future appointment time aligned to a whole minute.");
    const date = new Date(startAt + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const links = await ctx.db.query("serviceProviders").withIndex("by_organization_and_service", (q) => q.eq("organizationId", ctx.organizationId).eq("serviceId", service._id)).take(100);
    const providers = [...new Set(links.map((link) => link.providerId))].filter((id) => providerId === undefined || id === providerId);
    const valid: Id<"providers">[] = [];
    for (const id of providers) if (id === booking.providerId && startAt === booking.startAt || await getAvailabilityForProvider(ctx, ctx.organizationId, service, id, date, startAt, bookingId)) valid.push(id);
    if (!valid.length) fail("TIME_UNAVAILABLE", "That replacement time is no longer available.");
    const dayStart = Math.floor((startAt + 8 * 60 * 60 * 1000) / 86_400_000) * 86_400_000 - 8 * 60 * 60 * 1000;
    const loads = await Promise.all(valid.map(async (candidateId) => {
      const bookings = await ctx.db.query("bookings").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", ctx.organizationId).eq("providerId", candidateId).gte("startAt", dayStart).lt("startAt", dayStart + 86_400_000)).take(500);
      return { providerId: candidateId, count: bookings.filter((item) => item._id !== bookingId && !terminal(item.appointmentStatus)).length };
    }));
    loads.sort((a, b) => a.count - b.count || String(a.providerId).localeCompare(String(b.providerId)));
    const newProviderId = loads[0]?.providerId;
    if (!newProviderId) fail("TIME_UNAVAILABLE", "That replacement time is no longer available.");
    const now = Date.now();
    await ctx.db.patch(bookingId, { startAt, endAt: startAt + booking.durationMinutes * 60_000, providerId: newProviderId, updatedAt: now });
    await audit(ctx, "booking.rescheduled", bookingId, { oldStartAt: booking.startAt, oldEndAt: booking.endAt, oldProviderId: booking.providerId, startAt, endAt: startAt + booking.durationMinutes * 60_000, providerId: newProviderId }, now);
    return null;
  },
});

export const setOutcome = organizationMutation("bookings.manage")({
  args: {
    bookingId: v.id("bookings"),
    outcome: v.union(v.literal("completed"), v.literal("no_show"), v.literal("cancelled")),
    reason: v.optional(v.string()),
    depositDisposition: v.optional(v.union(v.literal("not_paid"), v.literal("retained"), v.literal("refund_due"), v.literal("refunded_external"))),
  },
  returns: v.null(),
  handler: async (ctx, { bookingId, outcome, reason, depositDisposition }) => {
    assertOwnerOrManager(ctx.membership?.role ?? "");
    const booking = await scopedBooking(ctx, ctx.organizationId, bookingId);
    if (terminal(booking.appointmentStatus)) fail("BOOKING_TERMINAL", "This Booking is already closed.");
    if (outcome !== "cancelled" && booking.appointmentStatus !== "confirmed") fail("INVALID_TRANSITION", "Only confirmed Bookings can be completed or marked no-show.");
    const cleanedReason = reason?.trim();
    if (outcome === "cancelled") {
      required(cleanedReason ?? "", "Cancellation reason", 3, 300);
      if (depositDisposition === undefined) fail("DISPOSITION_REQUIRED", "Record what happened to the Deposit before cancelling.");
      const hasAcceptedDeposit = booking.depositCentavos > 0 && booking.depositStatus === "verified";
      if (hasAcceptedDeposit && depositDisposition === "not_paid") fail("INVALID_DISPOSITION", "An accepted Deposit cannot be recorded as not paid.");
      if (!hasAcceptedDeposit && depositDisposition !== "not_paid") fail("INVALID_DISPOSITION", "Only an accepted Deposit can be retained or refunded.");
    }
    const now = Date.now();
    const depositStatus = outcome === "cancelled" && depositDisposition !== "not_paid" ? depositDisposition : booking.depositStatus;
    await ctx.db.patch(bookingId, { appointmentStatus: outcome, depositStatus, depositDisposition: outcome === "cancelled" ? depositDisposition : undefined, cancelledAt: outcome === "cancelled" ? now : undefined, completedAt: outcome === "completed" ? now : undefined, updatedAt: now });
    await audit(ctx, `booking.${outcome}`, bookingId, { reason: cleanedReason, depositDisposition: outcome === "cancelled" ? depositDisposition : undefined }, now);
    return null;
  },
});

async function getAvailabilityForProvider(ctx: QueryCtx | MutationCtx, organizationId: Id<"organizations">, service: Doc<"services">, providerId: Id<"providers">, localDate: string, startAt: number, excludingBookingId?: Id<"bookings">) {
  const date = parseDate(localDate);
  if (!date) return false;
  const provider = await ctx.db.get(providerId);
  if (!provider || provider.organizationId !== organizationId || !provider.active) return false;
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  const [rules, exceptions] = await Promise.all([
    ctx.db.query("availabilityRules").withIndex("by_organization_and_provider_and_weekday", (q) => q.eq("organizationId", organizationId).eq("providerId", providerId).eq("weekday", weekday)).take(30),
    ctx.db.query("availabilityExceptions").withIndex("by_organization_and_provider_and_date", (q) => q.eq("organizationId", organizationId).eq("providerId", providerId).eq("localDate", localDate)).take(30),
  ]);
  const windows = exceptionWindows(exceptions, rules);
  const interval = (await ctx.db.get(organizationId))?.bookingIntervalMinutes ?? 15;
  const localMinute = new Date(startAt + 8 * 60 * 60 * 1000).getUTCHours() * 60 + new Date(startAt + 8 * 60 * 60 * 1000).getUTCMinutes();
  const endAt = startAt + service.durationMinutes * 60_000;
  const dayStart = Date.UTC(date.year, date.month - 1, date.day) - 8 * 60 * 60 * 1000;
  const inWindow = windows.some((window) => localMinute >= timeMinutes(window.startLocalTime) && localMinute % interval === 0 && localMinute + service.durationMinutes <= timeMinutes(window.endLocalTime));
  if (!inWindow || localMinute % interval !== 0 || startAt <= Date.now()) return false;
  const bookings = await ctx.db.query("bookings").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", organizationId).eq("providerId", providerId).gte("startAt", dayStart - 12 * 60 * 60 * 1000).lt("startAt", dayStart + 24 * 60 * 60 * 1000)).take(500);
  if (bookings.some((b) => b._id !== excludingBookingId && !terminal(b.appointmentStatus) && overlaps(startAt, endAt, b.startAt, b.endAt))) return false;
  const holds = await ctx.db.query("bookingHolds").withIndex("by_organization_and_provider_and_start", (q) => q.eq("organizationId", organizationId).eq("providerId", providerId).gte("startAt", dayStart - 12 * 60 * 60 * 1000).lt("startAt", dayStart + 24 * 60 * 60 * 1000)).take(500);
  const now = Date.now();
  return !holds.some((hold) => hold.releasedAt === undefined && (hold.expiresAt === undefined || hold.expiresAt > now) && overlaps(startAt, endAt, hold.startAt, hold.endAt));
}

async function scopedService(ctx: QueryCtx | MutationCtx, organizationId: Id<"organizations">, id: Id<"services">): Promise<Doc<"services">> { const record = await ctx.db.get(id); if (!record || record.organizationId !== organizationId) fail("NOT_FOUND", "Record not found."); return record; }
async function scopedProvider(ctx: QueryCtx | MutationCtx, organizationId: Id<"organizations">, id: Id<"providers">): Promise<Doc<"providers">> { const record = await ctx.db.get(id); if (!record || record.organizationId !== organizationId) fail("NOT_FOUND", "Record not found."); return record; }
async function scopedBooking(ctx: QueryCtx | MutationCtx, organizationId: Id<"organizations">, id: Id<"bookings">): Promise<Doc<"bookings">> { const record = await ctx.db.get(id); if (!record || record.organizationId !== organizationId) fail("NOT_FOUND", "Record not found."); return record; }
async function audit(ctx: MutationCtx & { organizationId: Id<"organizations">; userId: Id<"users"> }, action: string, id: Id<"bookings">, metadata: unknown, occurredAt: number) {
  await ctx.db.insert("auditEvents", { organizationId: ctx.organizationId, actorUserId: ctx.userId, action, entityType: "booking", entityId: id, metadata, occurredAt });
}
function assertOwnerOrManager(role: string) { if (role !== "owner" && role !== "manager") fail("FORBIDDEN", "Only Owners and Managers can manage bookings."); }
function terminal(status: string) { return status === "completed" || status === "cancelled" || status === "no_show" || status === "expired"; }
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) { return aStart < bEnd && bStart < aEnd; }
function exceptionWindows(exceptions: Doc<"availabilityExceptions">[], rules: Doc<"availabilityRules">[]) {
  if (exceptions.some((item) => item.kind === "unavailable")) return [];
  const custom = exceptions.filter((item) => item.kind === "custom_hours").flatMap((item) => item.startLocalTime && item.endLocalTime ? [{ startLocalTime: item.startLocalTime, endLocalTime: item.endLocalTime }] : []);
  return custom.length ? custom : rules.filter((rule) => rule.active).map((rule) => ({ startLocalTime: rule.startLocalTime, endLocalTime: rule.endLocalTime }));
}
function timeMinutes(value: string) { const [hour, minute] = value.split(":").map(Number); return (hour ?? 0) * 60 + (minute ?? 0); }
function parseDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null; const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)); return date.getUTCFullYear() === year && date.getUTCMonth() === (month ?? 1) - 1 && date.getUTCDate() === day ? { year: year ?? 0, month: month ?? 1, day: day ?? 1 } : null; }
function normalizeMobile(value: string) { const mobile = value.replace(/[\s()-]/g, ""); const normalized = mobile.startsWith("09") ? `+63${mobile.slice(1)}` : mobile; if (!/^\+639\d{9}$/.test(normalized)) fail("INVALID_MOBILE", "Enter a valid Philippine mobile number."); return normalized; }
function required(value: string, label: string, min: number, max: number) { const clean = value.trim(); if (clean.length < min || clean.length > max) fail("INVALID_INPUT", `${label} must contain ${min} to ${max} characters.`); return clean; }
function fail(code: string, message: string): never { throw new ConvexError({ code, message }); }
