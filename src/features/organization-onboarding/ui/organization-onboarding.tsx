"use client";

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Building2, CalendarClock, Check, CreditCard, ExternalLink, FileCheck2, Loader2, LogOut, Scissors, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/ui";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-black/12 bg-white px-3 text-sm outline-none focus:border-[#e96555] focus:ring-2 focus:ring-[#e96555]/15";
const panelClass = "rounded-2xl border border-black/8 bg-white p-5 shadow-[0_10px_40px_rgba(49,39,34,.04)] sm:p-6";

export function OrganizationOnboarding() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const organization = useQuery(api.onboarding.myOrganization, isAuthenticated ? {} : "skip");
  const setup = useQuery(api.onboarding.setupState, organization ? { organizationId: organization._id } : "skip");
  const createOrganization = useMutation(api.onboarding.createOrganization);
  const updateProfile = useMutation(api.onboarding.updateProfile);
  const addService = useMutation(api.onboarding.addService);
  const addProvider = useMutation(api.onboarding.addProvider);
  const assignProvider = useMutation(api.onboarding.assignProvider);
  const addAvailability = useMutation(api.onboarding.addAvailabilityRule);
  const addAvailabilityException = useMutation(api.onboarding.addAvailabilityException);
  const addPayment = useMutation(api.onboarding.addPaymentDestination);
  const generateUploadUrl = useMutation(api.onboarding.generateEvidenceUploadUrl);
  const attachEvidence = useMutation(api.onboarding.attachEvidence);
  const openMyEvidence = useMutation(api.onboarding.openMyEvidence);
  const submitActivation = useMutation(api.onboarding.submitActivation);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  if (isLoading || (isAuthenticated && organization === undefined)) return <LoadingScreen />;
  if (!isAuthenticated) return <AccessRequired />;
  if (organization === undefined) return <LoadingScreen />;

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true); setMessage(undefined);
    try { await action(); setMessage(success); } catch (error) { setMessage(readError(error)); } finally { setPending(false); }
  }

  if (organization === null) {
    return (
      <Shell onSignOut={() => void signOut()}>
        <div className="mx-auto max-w-2xl py-12 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c64f43]">Your 14-day trial starts here</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Create your SlotPay workspace.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">One business, one location, and one focused setup path. You can preview everything before asking us to activate payment instructions.</p>
          <form className={`${panelClass} mt-10 grid gap-5`} action={(data) => void run(() => createOrganization({ name: String(data.get("name")), slug: String(data.get("slug")) }), "Workspace created.") }>
            <Field label="Business name" name="name" placeholder="Glow Studio" required />
            <Field label="Booking-page address" name="slug" placeholder="glow-studio" required prefix="slotpay.ph/" />
            <Button size="lg" disabled={pending} className="w-fit bg-[#20201e] px-6 text-white">Create workspace <ArrowRight /></Button>
            <Message text={message} />
          </form>
        </div>
      </Shell>
    );
  }

  const currentOrganization = organization;
  const locked = currentOrganization.status === "submitted" || currentOrganization.status === "active" || currentOrganization.status === "suspended";
  const checklist = [
    ["Business profile", Boolean(setup?.organization.description && setup.organization.contactMobile)],
    ["Service", Boolean(setup?.services.length)],
    ["Provider", Boolean(setup?.providers.length)],
    ["Availability", Boolean(setup?.availabilityRules.length)],
    ["Payment destination", Boolean(setup?.paymentDestinations.length)],
    ["Business evidence", Boolean(setup?.verification?.evidenceCount)],
  ] as const;
  const complete = checklist.every(([, done]) => done);

  return (
    <Shell onSignOut={() => void signOut()}>
      <div className="grid gap-8 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-12">
        <aside>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Launch checklist</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{currentOrganization.name}</h1>
          <Status status={currentOrganization.status} />
          <div className="mt-7 grid gap-3">
            {checklist.map(([label, done]) => <div key={label} className="flex items-center gap-3 text-sm"><span className={`grid size-6 place-items-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>{done && <Check className="size-3.5" />}</span>{label}</div>)}
          </div>
          {currentOrganization.status === "active" && <Link className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#c64f43]" href={`/book/${currentOrganization.slug}`} target="_blank">Public preview <ExternalLink className="size-4" /></Link>}
        </aside>

        <main className="min-w-0 space-y-5">
          {currentOrganization.status === "rejected" && <Notice title="Changes requested" text={setup?.verification?.decisionReason ?? "Review the setup and submit again."} />}
          {currentOrganization.status === "submitted" && <Notice title="Activation review in progress" text="Your setup is locked while SlotPay reviews the submitted business and payment-account evidence." />}
          {currentOrganization.status === "active" && <Notice title="Business activated" text="Your public non-bookable preview is live. Booking functionality arrives in Phase 3 and Phase 4." success />}

          {!locked && <>
            <SetupSection icon={<Building2 />} number="01" title="Business profile" description="The public identity and contact details customers will recognize.">
              <form className="grid gap-4 sm:grid-cols-2" action={(data) => void run(() => updateProfile({ organizationId: currentOrganization._id, name: String(data.get("name")), description: String(data.get("description")), addressLine1: String(data.get("addressLine1")), locality: String(data.get("locality")), region: String(data.get("region")), postalCode: String(data.get("postalCode")), contactEmail: String(data.get("contactEmail")), contactMobile: String(data.get("contactMobile")) }), "Business profile saved.") }>
                <Field label="Business name" name="name" defaultValue={setup?.organization.name} required />
                <Field label="Contact email" name="contactEmail" type="email" defaultValue={setup?.organization.contactEmail} required />
                <div className="sm:col-span-2"><Field label="Short description" name="description" defaultValue={setup?.organization.description} required /></div>
                <Field label="Street address" name="addressLine1" defaultValue={setup?.organization.addressLine1} required />
                <Field label="City / municipality" name="locality" defaultValue={setup?.organization.locality} required />
                <Field label="Region" name="region" defaultValue={setup?.organization.region} required />
                <Field label="Postal code" name="postalCode" defaultValue={setup?.organization.postalCode} required />
                <Field label="Mobile number" name="contactMobile" defaultValue={setup?.organization.contactMobile} placeholder="0917 123 4567" required />
                <ActionButton pending={pending}>Save profile</ActionButton>
              </form>
            </SetupSection>

            <SetupSection icon={<Scissors />} number="02" title="Service" description="Start with one service that has a fixed duration, price, and reservation deposit.">
              {setup?.services.map((service) => <Summary key={service._id} title={service.name} detail={`${money(service.priceCentavos)} · ${service.durationMinutes} min · ${money(service.depositCentavos)} deposit`} />)}
              {!setup?.services.length && <form className="mt-4 grid gap-4 sm:grid-cols-2" action={(data) => void run(() => addService({ organizationId: currentOrganization._id, name: String(data.get("name")), description: String(data.get("description")), priceCentavos: pesos(data.get("price")), depositCentavos: pesos(data.get("deposit")), durationMinutes: Number(data.get("duration")) }), "Service added.") }>
                <Field label="Service name" name="name" placeholder="Gel manicure" required /><Field label="Duration (minutes)" name="duration" type="number" defaultValue="60" required />
                <Field label="Price (PHP)" name="price" type="number" defaultValue="1200" required /><Field label="Deposit (PHP)" name="deposit" type="number" defaultValue="500" required />
                <div className="sm:col-span-2"><Field label="Description (optional)" name="description" /></div><ActionButton pending={pending}>Add service</ActionButton>
              </form>}
            </SetupSection>

            <SetupSection icon={<UserRound />} number="03" title="Provider and availability" description="Add who performs appointments and one weekly working window.">
              {setup?.providers.map((provider) => <Summary key={provider._id} title={provider.displayName} detail={`${setup.availabilityRules.filter((rule) => rule.providerId === provider._id).length} availability rule(s)`} />)}
              {!setup?.providers.length && <form className="mt-4 flex items-end gap-3" action={(data) => void run(() => addProvider({ organizationId: currentOrganization._id, displayName: String(data.get("displayName")) }), "Provider added.") }><div className="flex-1"><Field label="Provider name" name="displayName" placeholder="Maria" required /></div><ActionButton pending={pending}>Add provider</ActionButton></form>}
              {setup?.providers[0] && setup.availabilityRules.length === 0 && <form className="mt-4 grid gap-4 sm:grid-cols-3" action={(data) => void run(async () => { const provider = setup.providers[0]; const service = setup.services[0]; if (!provider) return; if (service) await assignProvider({ organizationId: currentOrganization._id, serviceId: service._id, providerId: provider._id }); await addAvailability({ organizationId: currentOrganization._id, providerId: provider._id, weekday: Number(data.get("weekday")), startLocalTime: String(data.get("start")), endLocalTime: String(data.get("end")) }); }, "Availability added.") }>
                <label className="text-sm font-medium">Weekday<select className={fieldClass} name="weekday" defaultValue="1"><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>
                <Field label="Starts" name="start" type="time" defaultValue="09:00" required /><Field label="Ends" name="end" type="time" defaultValue="17:00" required /><ActionButton pending={pending}>Save availability</ActionButton>
              </form>}
              {setup?.providers[0] && setup.availabilityRules.length > 0 && <form className="mt-5 grid gap-4 border-t border-black/8 pt-5 sm:grid-cols-2" action={(data) => void run(() => addAvailabilityException({ organizationId: currentOrganization._id, providerId: setup.providers[0]!._id, localDate: String(data.get("localDate")), kind: "unavailable", note: String(data.get("note")) }), "Day-off exception added.") }><Field label="Day off / closure date" name="localDate" type="date" required /><Field label="Note (optional)" name="note" placeholder="Holiday or personal leave" /><ActionButton pending={pending}>Add exception</ActionButton>{setup.availabilityExceptions.length > 0 && <p className="self-center text-sm text-zinc-500">{setup.availabilityExceptions.length} exception(s) configured</p>}</form>}
            </SetupSection>

            {setup && <SetupSection icon={<ExternalLink />} number="PREVIEW" title="Booking-page preview" description="This is how your identity will appear after activation. Payment instructions remain private."><div className="rounded-2xl bg-[#20201e] p-6 text-white"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ff8c7e]">Preview</p><h3 className="mt-3 text-2xl font-semibold">{setup.organization.name}</h3><p className="mt-2 text-sm leading-6 text-white/60">{setup.organization.description || "Add a business description to complete this preview."}</p><p className="mt-4 text-xs text-white/45">{[setup.organization.locality, setup.organization.region].filter(Boolean).join(", ") || "Location not set"}</p></div></SetupSection>}

            <SetupSection icon={<CreditCard />} number="04" title="Payment destination" description="SlotPay never holds these funds. Customers pay this merchant-controlled account directly.">
              {setup?.paymentDestinations.map((item) => <Summary key={item._id} title={item.provider.toUpperCase()} detail={`${item.accountName} · ${item.accountIdentifier}`} />)}
              {!setup?.paymentDestinations.length && <form className="mt-4 grid gap-4 sm:grid-cols-2" action={(data) => void run(() => addPayment({ organizationId: currentOrganization._id, provider: data.get("provider") as "gcash" | "maya" | "bank", accountName: String(data.get("accountName")), accountIdentifier: String(data.get("accountIdentifier")), instructions: String(data.get("instructions")), ownershipAttested: data.get("attested") === "on" }), "Payment destination saved.") }>
                <label className="text-sm font-medium">Provider<select className={fieldClass} name="provider"><option value="gcash">GCash</option><option value="maya">Maya</option><option value="bank">Bank transfer</option></select></label><Field label="Account name" name="accountName" required />
                <Field label="Mobile / account number" name="accountIdentifier" required /><Field label="Instructions (optional)" name="instructions" />
                <label className="flex items-start gap-3 text-sm leading-6 sm:col-span-2"><input className="mt-1.5" type="checkbox" name="attested" required />I confirm this Organization controls the account and accepts responsibility for provider terms and limits.</label><ActionButton pending={pending}>Save payment account</ActionButton>
              </form>}
            </SetupSection>

            <SetupSection icon={<FileCheck2 />} number="05" title="Business evidence" description="Upload a private image showing your business identity or control of the configured payment account.">
              <p className="text-sm text-zinc-600">{setup?.verification?.evidenceCount ?? 0} file(s) uploaded. Images only, maximum 8 MB each.</p>
              {setup?.verification && setup.verification.evidenceCount > 0 && <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={pending} onClick={() => void run(async () => setEvidenceUrls(await openMyEvidence({ organizationId: currentOrganization._id, verificationId: setup.verification!._id })), "Evidence access recorded.")}>View uploaded evidence</Button>{evidenceUrls.map((url, index) => <a className="text-sm font-semibold text-[#c64f43]" href={url} target="_blank" rel="noreferrer" key={url}>File {index + 1}</a>)}</div>}
              <input className="mt-4 block w-full text-sm" type="file" accept="image/*" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void run(async () => { const url = await generateUploadUrl({ organizationId: currentOrganization._id }); const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file }); if (!response.ok) throw new Error("Upload failed."); const { storageId } = await response.json() as { storageId: Id<"_storage"> }; await attachEvidence({ organizationId: currentOrganization._id, storageId }); }, "Evidence uploaded."); }} />
            </SetupSection>
          </>}

          {!locked && <div className={`${panelClass} border-[#e96555]/30 bg-[#fff9f7]`}><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-[#c64f43]">Final review</p><h2 className="mt-1 text-xl font-semibold">Submit for merchant activation</h2><p className="mt-2 text-sm text-zinc-600">Payment instructions stay private until approval. Setup locks while under review.</p></div><Button size="lg" disabled={!complete || pending} onClick={() => void run(() => submitActivation({ organizationId: currentOrganization._id }), "Activation request submitted.")} className="bg-[#e96555] text-white">Submit setup <ArrowRight /></Button></div></div>}
          <Message text={message} />
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) { return <div className="min-h-screen bg-[#f5f3ee] text-[#22201e]"><header className="border-b border-black/8 bg-[#f5f3ee]/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><Link href="/" className="font-semibold tracking-tight">SlotPay <span className="text-[#e96555]">PH</span></Link><button className="flex items-center gap-2 text-sm text-zinc-600" onClick={onSignOut}><LogOut className="size-4" /> Sign out</button></div></header><div className="mx-auto max-w-6xl px-5">{children}</div></div>; }
function SetupSection({ icon, number, title, description, children }: { icon: React.ReactNode; number: string; title: string; description: string; children: React.ReactNode }) { return <section className={panelClass}><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0ec] text-[#c64f43] [&>svg]:size-5">{icon}</span><div><p className="text-xs font-semibold tracking-[0.14em] text-zinc-400">{number}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p></div></div><div className="mt-6">{children}</div></section>; }
function Field({ label, prefix, ...props }: { label: string; prefix?: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm font-medium">{label}<span className="flex items-center">{prefix && <span className="mt-2 rounded-l-xl border border-r-0 border-black/12 bg-zinc-50 px-3 py-[11px] text-sm text-zinc-500">{prefix}</span>}<input {...props} className={`${fieldClass} ${prefix ? "rounded-l-none" : ""}`} /></span></label>; }
function ActionButton({ children, pending }: { children: React.ReactNode; pending: boolean }) { return <Button disabled={pending} className="w-fit bg-[#20201e] text-white">{pending && <Loader2 className="animate-spin" />}{children}</Button>; }
function Summary({ title, detail }: { title: string; detail: string }) { return <div className="mb-3 flex items-center justify-between rounded-xl bg-[#f7f5f1] px-4 py-3"><div><p className="font-medium">{title}</p><p className="mt-0.5 text-sm text-zinc-500">{detail}</p></div><Check className="size-5 text-emerald-600" /></div>; }
function Status({ status }: { status: string }) { return <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize shadow-sm">{status}</span>; }
function Notice({ title, text, success }: { title: string; text: string; success?: boolean }) { return <div className={`rounded-2xl border p-5 ${success ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-zinc-600">{text}</p></div>; }
function Message({ text }: { text?: string }) { return text ? <p role="status" className="rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white">{text}</p> : null; }
function LoadingScreen() { return <div className="grid min-h-screen place-items-center bg-[#f5f3ee]"><Loader2 className="size-7 animate-spin text-[#e96555]" /></div>; }
function AccessRequired() { return <div className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5"><div className="text-center"><CalendarClock className="mx-auto size-10 text-[#e96555]" /><h1 className="mt-5 text-3xl font-semibold">Sign in to set up your business</h1><Button className="mt-6 bg-[#20201e] text-white" render={<Link href="/sign-in" />}>Continue to sign in</Button></div></div>; }
function pesos(value: FormDataEntryValue | null) { return Math.round(Number(value) * 100); }
function money(centavos: number) { return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(centavos / 100); }
function readError(error: unknown) { return error instanceof Error ? error.message.replace(/^\[CONVEX[^\]]*\]\s*/, "") : "Something went wrong."; }
