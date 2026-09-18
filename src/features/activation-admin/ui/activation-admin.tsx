"use client";

import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Clock3, Eye, Loader2, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/ui";

export function ActivationAdmin() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const identity = useQuery(api.identity.current, isAuthenticated ? {} : "skip");
  const isPlatformAdmin = identity?.platformRole === "platform_admin";
  const queue = useQuery(api.activationAdmin.activationQueue, isPlatformAdmin ? {} : "skip");
  const managedOrganizations = useQuery(api.activationAdmin.managedOrganizations, isPlatformAdmin ? {} : "skip");
  const decide = useMutation(api.activationAdmin.decideActivation);
  const suspend = useMutation(api.activationAdmin.suspendOrganization);
  const restore = useMutation(api.activationAdmin.restoreOrganization);
  const [pendingId, setPendingId] = useState<string>();
  const [message, setMessage] = useState<string>();

  if (isLoading || (isAuthenticated && identity === undefined) || (isPlatformAdmin && queue === undefined)) return <div className="grid min-h-screen place-items-center bg-[#191918]"><Loader2 className="size-7 animate-spin text-[#ef6a5b]" /></div>;
  if (!isAuthenticated) return <div className="grid min-h-screen place-items-center bg-[#191918] text-white"><div className="text-center"><ShieldCheck className="mx-auto size-10 text-[#ef6a5b]" /><h1 className="mt-4 text-3xl font-semibold">Platform access required</h1><Link className="mt-5 inline-block text-[#ff8c7e]" href="/sign-in">Sign in</Link></div></div>;
  if (!isPlatformAdmin) return <div className="grid min-h-screen place-items-center bg-[#191918] px-5 text-white"><div className="max-w-md text-center"><ShieldCheck className="mx-auto size-10 text-[#ef6a5b]" /><h1 className="mt-4 text-3xl font-semibold">Platform access required</h1><p className="mt-3 text-white/55">This signed-in account is not a SlotPay platform administrator.</p><Link className="mt-5 inline-block text-[#ff8c7e]" href="/dashboard/onboarding">Return to business setup</Link></div></div>;

  async function makeDecision(verificationId: string, decision: "approve" | "reject", reason: string) {
    setPendingId(verificationId); setMessage(undefined);
    try { await decide({ verificationId: verificationId as Id<"merchantVerifications">, decision, reason }); setMessage(decision === "approve" ? "Organization activated." : "Changes requested."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Decision failed."); }
    finally { setPendingId(undefined); }
  }

  return (
    <div className="min-h-screen bg-[#191918] text-[#f8f5ee]">
      <header className="border-b border-white/10"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><p className="font-semibold">SlotPay <span className="text-[#ef6a5b]">Operations</span></p><Link href="/" className="text-sm text-white/60">Public site</Link></div></header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff8c7e]">Merchant activation</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">Review queue</h1><p className="mt-3 text-white/55">Approve only after business and payment-account evidence has been independently checked.</p></div><span className="rounded-full border border-white/10 px-4 py-2 text-sm">{queue?.length ?? 0} pending</span></div>
        {message && <p role="status" className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm">{message}</p>}
        <div className="mt-8 grid gap-4">
          {queue?.map((item) => <ReviewCard key={item.verificationId} item={item} pending={pendingId === item.verificationId} onDecision={makeDecision} />)}
          {queue?.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[.03] py-20 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-400" /><p className="mt-4 text-lg font-medium">Queue is clear</p><p className="mt-2 text-sm text-white/45">New activation submissions will appear here in realtime.</p></div>}
        </div>
        <section className="mt-14 border-t border-white/10 pt-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff8c7e]">Published merchants</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Access controls</h2><div className="mt-6 grid gap-3">{managedOrganizations?.map((organization) => <ManagedOrganization key={organization.organizationId} organization={organization} onChange={async (reason) => { setMessage(undefined); try { if (organization.status === "active") await suspend({ organizationId: organization.organizationId, reason }); else await restore({ organizationId: organization.organizationId, reason }); setMessage(organization.status === "active" ? "Organization suspended." : "Organization restored."); } catch (error) { setMessage(error instanceof Error ? error.message : "Status change failed."); } }} />)}{managedOrganizations?.length === 0 && <p className="text-sm text-white/45">No active or suspended Organizations.</p>}</div></section>
      </main>
    </div>
  );
}

function ManagedOrganization({ organization, onChange }: { organization: { organizationId: Id<"organizations">; name: string; slug: string; status: "active" | "suspended" }; onChange: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  return <article className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex items-center gap-3"><h3 className="font-semibold">{organization.name}</h3><span className={`rounded-full px-2 py-1 text-xs ${organization.status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-200"}`}>{organization.status}</span></div><p className="mt-1 text-sm text-white/40">/book/{organization.slug}</p></div><div className="flex flex-1 flex-col gap-3 md:max-w-xl md:flex-row"><input aria-label={`Reason for ${organization.name}`} className="h-10 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 text-sm outline-none focus:border-[#ef6a5b]" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required operational reason"/><Button variant="outline" disabled={pending || reason.trim().length < 10} className={organization.status === "active" ? "border-red-400/40 text-red-200" : "border-emerald-400/40 text-emerald-200"} onClick={() => { setPending(true); void onChange(reason).finally(() => setPending(false)); }}>{organization.status === "active" ? "Suspend" : "Restore"}</Button></div></div></article>;
}

function ReviewCard({ item, pending, onDecision }: { item: { verificationId: string; organizationName: string; slug: string; submittedAt: number; evidenceCount: number }; pending: boolean; onDecision: (id: string, decision: "approve" | "reject", reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const openEvidence = useMutation(api.activationAdmin.openEvidence);
  const [review, setReview] = useState<{ accountName: string; accountIdentifier: string; provider: string; evidenceUrls: string[] }>();
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  async function loadEvidence() {
    setLoadingEvidence(true);
    try { setReview(await openEvidence({ verificationId: item.verificationId as Id<"merchantVerifications"> })); }
    finally { setLoadingEvidence(false); }
  }

  return <article className="rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h2 className="text-xl font-semibold">{item.organizationName}</h2><p className="mt-1 text-sm text-white/45">slotpay.ph/book/{item.slug}</p><div className="mt-4 flex flex-wrap gap-4 text-sm text-white/65"><span className="flex items-center gap-2"><Clock3 className="size-4" />{new Date(item.submittedAt).toLocaleString("en-PH")}</span><span>{item.evidenceCount} evidence file(s)</span></div></div><button className="flex h-fit items-center gap-2 text-sm font-semibold text-[#ff8c7e]" disabled={loadingEvidence} onClick={() => void loadEvidence()}><Eye className="size-4" />{loadingEvidence ? "Opening…" : "Review evidence"}</button></div>{review && <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-sm text-white/65">{review.provider.toUpperCase()} · {review.accountName} · {review.accountIdentifier}</p><div className="mt-3 flex flex-wrap gap-3">{review.evidenceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-3 py-2 text-sm text-[#ff8c7e]">Evidence {index + 1}</a>)}</div></div>}<label className="mt-5 block text-sm font-medium">Decision reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-[#ef6a5b]" placeholder="Record what was reviewed and why this decision is appropriate." /></label><div className="mt-4 flex flex-wrap gap-3"><Button disabled={pending || reason.trim().length < 10 || !review} onClick={() => void onDecision(item.verificationId, "approve", reason)} className="bg-emerald-500 text-emerald-950"><CheckCircle2 /> Approve</Button><Button disabled={pending || reason.trim().length < 10} onClick={() => void onDecision(item.verificationId, "reject", reason)} variant="outline" className="border-red-400/40 text-red-200"><XCircle /> Request changes</Button></div></article>;
}
