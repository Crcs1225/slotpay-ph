import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { authenticatedMutation, authenticatedQuery, assertOrganizationScope, organizationMutation, organizationQuery } from "./lib/authz";

const DAY = 24 * 60 * 60 * 1000;

const organizationView = v.object({
  _id: v.id("organizations"),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("active"), v.literal("rejected"), v.literal("suspended")),
  addressLine1: v.optional(v.string()),
  locality: v.optional(v.string()),
  region: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactMobile: v.optional(v.string()),
  trialEndsAt: v.optional(v.number()),
});

const serviceView = v.object({
  _id: v.id("services"),
  name: v.string(),
  description: v.optional(v.string()),
  priceCentavos: v.number(),
  depositCentavos: v.number(),
  durationMinutes: v.number(),
  active: v.boolean(),
});

const providerView = v.object({ _id: v.id("providers"), displayName: v.string(), active: v.boolean() });
const availabilityView = v.object({
  _id: v.id("availabilityRules"),
  providerId: v.id("providers"),
  weekday: v.number(),
  startLocalTime: v.string(),
  endLocalTime: v.string(),
  active: v.boolean(),
});
const availabilityExceptionView = v.object({
  _id: v.id("availabilityExceptions"),
  providerId: v.id("providers"),
  localDate: v.string(),
  kind: v.union(v.literal("unavailable"), v.literal("custom_hours")),
  startLocalTime: v.optional(v.string()),
  endLocalTime: v.optional(v.string()),
  note: v.optional(v.string()),
});
const paymentDestinationView = v.object({
  _id: v.id("paymentDestinations"),
  provider: v.union(v.literal("gcash"), v.literal("maya"), v.literal("bank")),
  accountName: v.string(),
  accountIdentifier: v.string(),
  instructions: v.optional(v.string()),
  active: v.boolean(),
});

export const myOrganization = authenticatedQuery({
  args: {},
  returns: v.union(v.null(), organizationView),
  handler: async (ctx) => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .first();
    if (membership === null || membership.status !== "active") return null;
    const organization = await ctx.db.get(membership.organizationId);
    return organization === null ? null : toOrganizationView(organization);
  },
});

export const createOrganization = authenticatedMutation({
  args: { name: v.string(), slug: v.string() },
  returns: v.id("organizations"),
  handler: async (ctx, { name, slug }) => {
    const normalizedName = requiredText(name, "Business name", 2, 80);
    const normalizedSlug = normalizeSlug(slug);
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .first();
    if (existingMembership !== null) fail("ALREADY_HAS_ORGANIZATION", "Your account already belongs to an Organization.");
    const existingSlug = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", normalizedSlug)).unique();
    if (existingSlug !== null) fail("SLUG_TAKEN", "That booking-page address is already in use.");

    const now = Date.now();
    const trialEndsAt = now + 14 * DAY;
    const organizationId = await ctx.db.insert("organizations", {
      name: normalizedName,
      slug: normalizedSlug,
      timezone: "Asia/Manila",
      currency: "PHP",
      bookingIntervalMinutes: 15,
      status: "draft",
      trialEndsAt,
      createdBy: ctx.userId,
      updatedAt: now,
    });
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: ctx.userId,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("subscriptions", {
      organizationId,
      planKey: "launch",
      status: "trialing",
      trialStartedAt: now,
      trialEndsAt,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId,
      actorUserId: ctx.userId,
      action: "organization.created",
      entityType: "organization",
      entityId: organizationId,
      metadata: { trialEndsAt },
      occurredAt: now,
    });
    return organizationId;
  },
});

export const setupState = organizationQuery("organization.manage")({
  args: {},
  returns: v.object({
    organization: organizationView,
    services: v.array(serviceView),
    providers: v.array(providerView),
    availabilityRules: v.array(availabilityView),
    availabilityExceptions: v.array(availabilityExceptionView),
    paymentDestinations: v.array(paymentDestinationView),
    verification: v.union(v.null(), v.object({
      _id: v.id("merchantVerifications"),
      status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("rejected")),
      evidenceCount: v.number(),
      decisionReason: v.optional(v.string()),
    })),
  }),
  handler: async (ctx) => {
    const [organization, services, providers, availabilityRules, availabilityExceptions, paymentDestinations, verification] = await Promise.all([
      ctx.db.get(ctx.organizationId),
      ctx.db.query("services").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
      ctx.db.query("providers").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
      ctx.db.query("availabilityRules").withIndex("by_organization_and_provider_and_weekday", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
      ctx.db.query("availabilityExceptions").withIndex("by_organization_and_provider_and_date", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
      ctx.db.query("paymentDestinations").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).take(20),
      ctx.db.query("merchantVerifications").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).order("desc").first(),
    ]);
    if (organization === null) fail("NOT_FOUND", "Organization not found.");
    return {
      organization: toOrganizationView(organization),
      services: services.map(({ _id, name, description, priceCentavos, depositCentavos, durationMinutes, active }) => ({ _id, name, description, priceCentavos, depositCentavos, durationMinutes, active })),
      providers: providers.map(({ _id, displayName, active }) => ({ _id, displayName, active })),
      availabilityRules: availabilityRules.map(({ _id, providerId, weekday, startLocalTime, endLocalTime, active }) => ({ _id, providerId, weekday, startLocalTime, endLocalTime, active })),
      availabilityExceptions: availabilityExceptions.map(({ _id, providerId, localDate, kind, startLocalTime, endLocalTime, note }) => ({ _id, providerId, localDate, kind, startLocalTime, endLocalTime, note })),
      paymentDestinations: paymentDestinations.map(({ _id, provider, accountName, accountIdentifier, instructions, active }) => ({ _id, provider, accountName, accountIdentifier, instructions, active })),
      verification: verification === null ? null : { _id: verification._id, status: verification.status, evidenceCount: verification.evidenceStorageIds.length, decisionReason: verification.decisionReason },
    };
  },
});

export const updateProfile = organizationMutation("organization.manage")({
  args: {
    name: v.string(), description: v.string(), addressLine1: v.string(), locality: v.string(), region: v.string(), postalCode: v.string(), contactEmail: v.string(), contactMobile: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    const now = Date.now();
    await ctx.db.patch(ctx.organizationId, {
      name: requiredText(args.name, "Business name", 2, 80),
      description: requiredText(args.description, "Description", 10, 500),
      addressLine1: requiredText(args.addressLine1, "Address", 3, 120),
      locality: requiredText(args.locality, "City or municipality", 2, 80),
      region: requiredText(args.region, "Region", 2, 80),
      postalCode: requiredText(args.postalCode, "Postal code", 4, 10),
      contactEmail: validateEmail(args.contactEmail),
      contactMobile: validatePhilippineMobile(args.contactMobile),
      updatedAt: now,
    });
    await audit(ctx, "organization.profile_updated", "organization", ctx.organizationId, now);
    return null;
  },
});

export const addService = organizationMutation("organization.manage")({
  args: { name: v.string(), description: v.string(), priceCentavos: v.number(), depositCentavos: v.number(), durationMinutes: v.number() },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    validateService(args.priceCentavos, args.depositCentavos, args.durationMinutes);
    const now = Date.now();
    const id = await ctx.db.insert("services", { organizationId: ctx.organizationId, name: requiredText(args.name, "Service name", 2, 80), description: optionalText(args.description, 300), priceCentavos: args.priceCentavos, depositCentavos: args.depositCentavos, durationMinutes: args.durationMinutes, active: true, createdAt: now, updatedAt: now });
    await audit(ctx, "service.created", "service", id, now);
    return id;
  },
});

export const addProvider = organizationMutation("organization.manage")({
  args: { displayName: v.string() },
  returns: v.id("providers"),
  handler: async (ctx, { displayName }) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    const now = Date.now();
    const id = await ctx.db.insert("providers", { organizationId: ctx.organizationId, displayName: requiredText(displayName, "Provider name", 2, 80), active: true, createdAt: now, updatedAt: now });
    await audit(ctx, "provider.created", "provider", id, now);
    return id;
  },
});

export const assignProvider = organizationMutation("organization.manage")({
  args: { serviceId: v.id("services"), providerId: v.id("providers") },
  returns: v.null(),
  handler: async (ctx, { serviceId, providerId }) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    assertOrganizationScope(ctx.organizationId, await ctx.db.get(serviceId));
    assertOrganizationScope(ctx.organizationId, await ctx.db.get(providerId));
    const existing = await ctx.db.query("serviceProviders").withIndex("by_service_and_provider", (q) => q.eq("serviceId", serviceId).eq("providerId", providerId)).unique();
    if (existing === null) await ctx.db.insert("serviceProviders", { organizationId: ctx.organizationId, serviceId, providerId, createdAt: Date.now() });
    return null;
  },
});

export const addAvailabilityRule = organizationMutation("organization.manage")({
  args: { providerId: v.id("providers"), weekday: v.number(), startLocalTime: v.string(), endLocalTime: v.string() },
  returns: v.id("availabilityRules"),
  handler: async (ctx, args) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    assertOrganizationScope(ctx.organizationId, await ctx.db.get(args.providerId));
    if (!Number.isInteger(args.weekday) || args.weekday < 0 || args.weekday > 6) fail("INVALID_WEEKDAY", "Weekday must be from 0 to 6.");
    validateTimeRange(args.startLocalTime, args.endLocalTime);
    const now = Date.now();
    return await ctx.db.insert("availabilityRules", { organizationId: ctx.organizationId, providerId: args.providerId, weekday: args.weekday, startLocalTime: args.startLocalTime, endLocalTime: args.endLocalTime, active: true, createdAt: now, updatedAt: now });
  },
});

export const addAvailabilityException = organizationMutation("organization.manage")({
  args: {
    providerId: v.id("providers"),
    localDate: v.string(),
    kind: v.union(v.literal("unavailable"), v.literal("custom_hours")),
    startLocalTime: v.optional(v.string()),
    endLocalTime: v.optional(v.string()),
    note: v.string(),
  },
  returns: v.id("availabilityExceptions"),
  handler: async (ctx, args) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    assertOrganizationScope(ctx.organizationId, await ctx.db.get(args.providerId));
    if (!isValidLocalDate(args.localDate)) fail("INVALID_DATE", "Use a valid local date.");
    if (args.kind === "custom_hours") {
      if (args.startLocalTime === undefined || args.endLocalTime === undefined) fail("INVALID_TIME_RANGE", "Custom hours require a start and end time.");
      validateTimeRange(args.startLocalTime, args.endLocalTime);
    }
    const now = Date.now();
    const id = await ctx.db.insert("availabilityExceptions", {
      organizationId: ctx.organizationId,
      providerId: args.providerId,
      localDate: args.localDate,
      kind: args.kind,
      startLocalTime: args.kind === "custom_hours" ? args.startLocalTime : undefined,
      endLocalTime: args.kind === "custom_hours" ? args.endLocalTime : undefined,
      note: optionalText(args.note, 200),
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, "availability_exception.created", "availabilityException", id, now);
    return id;
  },
});

export const addPaymentDestination = organizationMutation("organization.manage")({
  args: { provider: v.union(v.literal("gcash"), v.literal("maya"), v.literal("bank")), accountName: v.string(), accountIdentifier: v.string(), instructions: v.string(), ownershipAttested: v.boolean() },
  returns: v.id("paymentDestinations"),
  handler: async (ctx, args) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    if (!args.ownershipAttested) fail("ATTESTATION_REQUIRED", "Confirm that the Organization controls this payment account.");
    const now = Date.now();
    const id = await ctx.db.insert("paymentDestinations", { organizationId: ctx.organizationId, provider: args.provider, accountName: requiredText(args.accountName, "Account name", 2, 100), accountIdentifier: requiredText(args.accountIdentifier, "Account number", 5, 80), instructions: optionalText(args.instructions, 300), ownershipAttestedAt: now, active: true, createdAt: now, updatedAt: now });
    await audit(ctx, "payment_destination.created", "paymentDestination", id, now);
    return id;
  },
});

export const generateEvidenceUploadUrl = organizationMutation("organization.manage")({
  args: {}, returns: v.string(), handler: async (ctx) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachEvidence = organizationMutation("organization.manage")({
  args: { storageId: v.id("_storage") }, returns: v.null(), handler: async (ctx, { storageId }) => {
    await ensureEditable(ctx.db, ctx.organizationId);
    const metadata = await ctx.db.system.get(storageId);
    if (metadata === null || !metadata.contentType?.startsWith("image/") || metadata.size > 8 * 1024 * 1024) fail("INVALID_EVIDENCE", "Evidence must be an image no larger than 8 MB.");
    const now = Date.now();
    const verification = await ctx.db.query("merchantVerifications").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).order("desc").first();
    if (verification === null || verification.status !== "draft") {
      await ctx.db.insert("merchantVerifications", { organizationId: ctx.organizationId, status: "draft", submittedByUserId: ctx.userId, evidenceStorageIds: [storageId], updatedAt: now });
    } else {
      if (verification.evidenceStorageIds.length >= 5) fail("EVIDENCE_LIMIT", "Up to five evidence files are allowed.");
      await ctx.db.patch(verification._id, { evidenceStorageIds: [...verification.evidenceStorageIds, storageId], updatedAt: now });
    }
    return null;
  },
});

export const openMyEvidence = organizationMutation("organization.manage")({
  args: { verificationId: v.id("merchantVerifications") },
  returns: v.array(v.string()),
  handler: async (ctx, { verificationId }) => {
    const verification = await ctx.db.get(verificationId);
    if (verification === null || verification.organizationId !== ctx.organizationId) fail("NOT_FOUND", "Evidence not found.");
    if (verification.submittedByUserId !== ctx.userId) fail("FORBIDDEN", "Only the submitting Owner can access this evidence.");
    const urls = await Promise.all(verification.evidenceStorageIds.map((storageId) => ctx.storage.getUrl(storageId)));
    await audit(ctx, "merchant_activation.evidence_accessed", "merchantVerification", verificationId, Date.now());
    return urls.filter((url): url is string => url !== null);
  },
});

export const submitActivation = organizationMutation("organization.manage")({
  args: {}, returns: v.null(), handler: async (ctx) => {
    const organization = await ensureEditable(ctx.db, ctx.organizationId);
    const [services, providers, assignments, availabilityRules, destination, verification] = await Promise.all([
      ctx.db.query("services").withIndex("by_organization_and_active", (q) => q.eq("organizationId", ctx.organizationId).eq("active", true)).take(100),
      ctx.db.query("providers").withIndex("by_organization_and_active", (q) => q.eq("organizationId", ctx.organizationId).eq("active", true)).take(100),
      ctx.db.query("serviceProviders").withIndex("by_organization_and_service", (q) => q.eq("organizationId", ctx.organizationId)).take(500),
      ctx.db.query("availabilityRules").withIndex("by_organization_and_provider_and_weekday", (q) => q.eq("organizationId", ctx.organizationId)).take(100),
      ctx.db.query("paymentDestinations").withIndex("by_organization_and_active", (q) => q.eq("organizationId", ctx.organizationId).eq("active", true)).first(),
      ctx.db.query("merchantVerifications").withIndex("by_organization", (q) => q.eq("organizationId", ctx.organizationId)).order("desc").first(),
    ]);
    const profileComplete = Boolean(organization.description && organization.addressLine1 && organization.locality && organization.region && organization.postalCode && organization.contactEmail && organization.contactMobile);
    if (!profileComplete || services.length === 0 || providers.length === 0 || availabilityRules.length === 0 || destination === null) fail("SETUP_INCOMPLETE", "Complete the business profile, service, provider, availability, and payment destination first.");
    const activeServiceIds = new Set(services.map((service) => service._id));
    const activeProviderIds = new Set(providers.map((provider) => provider._id));
    const availableProviderIds = new Set(availabilityRules.map((rule) => rule.providerId));
    const hasUsableAssignment = assignments.some((assignment) => activeServiceIds.has(assignment.serviceId) && activeProviderIds.has(assignment.providerId) && availableProviderIds.has(assignment.providerId));
    if (!hasUsableAssignment) fail("SETUP_INCOMPLETE", "Assign an available active Provider to an active Service before submitting.");
    if (verification === null || verification.evidenceStorageIds.length === 0) fail("EVIDENCE_REQUIRED", "Upload business evidence before submitting.");
    const now = Date.now();
    await ctx.db.patch(verification._id, {
      status: "submitted",
      submittedByUserId: ctx.userId,
      submittedAt: now,
      reviewedByUserId: undefined,
      decisionReason: undefined,
      decidedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(ctx.organizationId, { status: "submitted", updatedAt: now });
    await audit(ctx, "merchant_activation.submitted", "merchantVerification", verification._id, now);
    return null;
  },
});

export const publicPreview = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), v.object({ name: v.string(), slug: v.string(), description: v.optional(v.string()), locality: v.optional(v.string()), region: v.optional(v.string()), status: v.string(), bookingEnabled: v.literal(false) })),
  handler: async (ctx, { slug }) => {
    const normalizedSlug = normalizePublicSlug(slug);
    if (normalizedSlug === null) return null;
    const organization = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", normalizedSlug)).unique();
    if (organization === null || organization.status !== "active") return null;
    return { name: organization.name, slug: organization.slug, description: organization.description, locality: organization.locality, region: organization.region, status: organization.status, bookingEnabled: false as const };
  },
});

function toOrganizationView(organization: { _id: Id<"organizations">; name: string; slug: string; description?: string; status: "draft" | "submitted" | "active" | "rejected" | "suspended"; addressLine1?: string; locality?: string; region?: string; postalCode?: string; contactEmail?: string; contactMobile?: string; trialEndsAt?: number }) {
  return { _id: organization._id, name: organization.name, slug: organization.slug, description: organization.description, status: organization.status, addressLine1: organization.addressLine1, locality: organization.locality, region: organization.region, postalCode: organization.postalCode, contactEmail: organization.contactEmail, contactMobile: organization.contactMobile, trialEndsAt: organization.trialEndsAt };
}

function requiredText(value: string, label: string, min: number, max: number) { const text = value.trim(); if (text.length < min || text.length > max) fail("INVALID_INPUT", `${label} must contain ${min} to ${max} characters.`); return text; }
function optionalText(value: string, max: number) { const text = value.trim(); if (text.length > max) fail("INVALID_INPUT", `Text cannot exceed ${max} characters.`); return text || undefined; }
function normalizeSlug(value: string) { const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); if (slug.length < 3 || slug.length > 50) fail("INVALID_SLUG", "The booking-page address must contain 3 to 50 letters, numbers, or hyphens."); return slug; }
function normalizePublicSlug(value: string) { if (value.length > 100) return null; const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return slug.length >= 3 && slug.length <= 50 ? slug : null; }
function validateEmail(value: string) { const email = value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("INVALID_EMAIL", "Enter a valid email address."); return email; }
function validatePhilippineMobile(value: string) { const mobile = value.replace(/[\s()-]/g, ""); const normalized = mobile.startsWith("09") ? `+63${mobile.slice(1)}` : mobile; if (!/^\+639\d{9}$/.test(normalized)) fail("INVALID_MOBILE", "Enter a valid Philippine mobile number."); return normalized; }
function validateService(price: number, deposit: number, duration: number) { if (![price, deposit, duration].every(Number.isInteger) || price < 0 || deposit < 0 || deposit > price || duration <= 0 || duration > 720 || duration % 15 !== 0) fail("INVALID_SERVICE", "Use whole centavos, a deposit not above price, and a 15-minute-aligned duration."); }
function validateTimeRange(start: string, end: string) { const format = /^([01]\d|2[0-3]):[0-5]\d$/; if (!format.test(start) || !format.test(end) || start >= end) fail("INVALID_TIME_RANGE", "Enter a valid opening and closing time."); }
function isValidLocalDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year!, month! - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day; }
function fail(code: string, message: string): never { throw new ConvexError({ code, message }); }
async function ensureEditable(db: MutationCtx["db"], organizationId: Id<"organizations">) { const organization = await db.get(organizationId); if (organization === null) fail("NOT_FOUND", "Organization not found."); if (organization.status === "submitted" || organization.status === "active" || organization.status === "suspended") fail("SETUP_LOCKED", "This setup cannot be edited in its current state."); return organization; }
async function audit(ctx: Pick<MutationCtx, "db"> & { organizationId: Id<"organizations">; userId: Id<"users"> }, action: string, entityType: string, entityId: string, occurredAt: number) { await ctx.db.insert("auditEvents", { organizationId: ctx.organizationId, actorUserId: ctx.userId, action, entityType, entityId, occurredAt }); }
