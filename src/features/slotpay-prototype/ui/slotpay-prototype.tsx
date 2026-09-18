"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { Booking, DepositStatus } from "@/entities/booking";
import { Button } from "@/shared/ui";

import {
  initialBookings,
  organization,
  services,
  timeSlots,
} from "../model/mock-data";

type CustomerStep = "service" | "schedule" | "details" | "payment" | "confirmation";
type BusinessView = "overview" | "review" | "setup";

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const statusStyles: Record<DepositStatus, string> = {
  awaiting_payment: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  processing: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  needs_review: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  suspicious: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  verified: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  refund_due: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  refunded_external: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  retained: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

const statusLabels: Record<DepositStatus, string> = {
  awaiting_payment: "Awaiting deposit",
  processing: "Processing",
  needs_review: "Needs review",
  suspicious: "Suspicious",
  verified: "Deposit paid",
  rejected: "Rejected",
  refund_due: "Refund due",
  refunded_external: "Refunded",
  retained: "Retained",
};

function Mark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-[#ef6a5b] text-white shadow-[0_8px_24px_rgba(239,106,91,.24)]">
        <CalendarDays className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.03em]">SlotPay</span>
    </div>
  );
}

function StatusBadge({ status }: { status: DepositStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function CustomerFlow({
  onSwitch,
  onSubmit,
}: {
  onSwitch: () => void;
  onSubmit: (booking: Booking) => void;
}) {
  const [step, setStep] = useState<CustomerStep>("service");
  const [serviceId, setServiceId] = useState(services[0].id);
  const [time, setTime] = useState(timeSlots[2]);
  const [customerName, setCustomerName] = useState("Maria Santos");
  const [customerMobile, setCustomerMobile] = useState("0917 234 8801");
  const [receiptName, setReceiptName] = useState("");
  const service = services.find((item) => item.id === serviceId) ?? services[0];
  const steps: CustomerStep[] = ["service", "schedule", "details", "payment", "confirmation"];
  const currentIndex = steps.indexOf(step);
  const detailsComplete = customerName.trim().length > 1 && customerMobile.trim().length >= 10;

  const next = () => setStep(steps[Math.min(currentIndex + 1, steps.length - 1)]);
  const back = () => setStep(steps[Math.max(currentIndex - 1, 0)]);
  const submitReceipt = () => {
    if (!receiptName) return;

    onSubmit({
      id: "SP-1050",
      customerName,
      customerMobile,
      serviceId,
      providerId: serviceId === "lash" ? "camille" : "nicole",
      date: "Sep 24",
      time,
      appointmentStatus: "pending",
      depositStatus: "needs_review",
      receipt: {
        provider: "GCash",
        amount: service.deposit,
        reference: "6842 1950 3107",
        confidence: "high",
        signals: ["Amount matches", "Reference is unused", "Sent within hold period"],
      },
    });
    setStep("confirmation");
  };

  return (
    <div className="min-h-[100dvh] bg-[#f4f3ef] text-[#20201e] dark:bg-[#171716] dark:text-[#f7f5ef]">
      <header className="border-b border-black/8 bg-[#f4f3ef]/95 dark:border-white/10 dark:bg-[#171716]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Mark />
          <button className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white" onClick={onSwitch}>
            Business demo
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-[1fr_360px] md:px-6 md:py-10">
        <section className="order-2 min-w-0 md:order-1">
          {step !== "confirmation" && (
            <div className="mb-8 flex items-center gap-2" aria-label={`Step ${currentIndex + 1} of 4`}>
              {steps.slice(0, 4).map((item, index) => (
                <span key={item} className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? "bg-[#ef6a5b]" : "bg-black/10 dark:bg-white/10"}`} />
              ))}
            </div>
          )}

          {step === "service" && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#c64f43]">Book at Glow Studio</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">What would you like to book?</h1>
              <p className="mt-4 max-w-lg text-zinc-600 dark:text-zinc-400">Choose one service. Your reservation deposit goes directly to the studio.</p>
              <div className="mt-8 grid gap-3">
                {services.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setServiceId(item.id)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border p-5 text-left transition active:scale-[.99] ${serviceId === item.id ? "border-[#ef6a5b] bg-white shadow-[0_12px_35px_rgba(62,42,36,.08)] dark:bg-zinc-900" : "border-black/8 bg-white/55 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"}`}
                  >
                    <span>
                      <span className="block font-semibold">{item.name}</span>
                      <span className="mt-1 block text-sm text-zinc-500">{item.durationMinutes} min, {money.format(item.price)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="hidden text-right text-sm sm:block"><span className="block text-zinc-500">Deposit</span>{money.format(item.deposit)}</span>
                      <span className={`grid size-7 place-items-center rounded-full border ${serviceId === item.id ? "border-[#ef6a5b] bg-[#ef6a5b] text-white" : "border-black/15 dark:border-white/20"}`}>
                        {serviceId === item.id && <Check className="size-4" />}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "schedule" && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#c64f43]">Choose a schedule</p>
              <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Wednesday, September 24</h1>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {timeSlots.map((slot) => (
                  <button key={slot} onClick={() => setTime(slot)} className={`rounded-2xl border px-4 py-5 text-sm font-semibold transition active:scale-[.98] ${time === slot ? "border-[#ef6a5b] bg-[#ef6a5b] text-white" : "border-black/10 bg-white hover:border-black/25 dark:border-white/10 dark:bg-white/5"}`}>
                    {slot}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/65 p-4 text-sm dark:bg-white/5">
                <UserRound className="size-5 text-[#c64f43]" />
                Any available artist will be assigned automatically.
              </div>
            </div>
          )}

          {step === "details" && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#c64f43]">Your details</p>
              <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Where should we send your booking?</h1>
              <div className="mt-8 grid gap-5 rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 sm:p-7">
                <label className="grid gap-2 text-sm font-medium">Full name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="h-12 rounded-xl border border-black/12 bg-transparent px-4 text-base outline-none focus:border-[#ef6a5b] focus:ring-2 focus:ring-[#ef6a5b]/20 dark:border-white/15" /></label>
                <label className="grid gap-2 text-sm font-medium">Mobile number<input value={customerMobile} onChange={(event) => setCustomerMobile(event.target.value)} inputMode="tel" className="h-12 rounded-xl border border-black/12 bg-transparent px-4 text-base outline-none focus:border-[#ef6a5b] focus:ring-2 focus:ring-[#ef6a5b]/20 dark:border-white/15" /></label>
                <p className="text-sm leading-6 text-zinc-500">We will send a one-time code and your private booking link to this number.</p>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#c64f43]">Slot held for 27:42</p>
              <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Send your reservation deposit</h1>
              <div className="mt-8 rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-black/8 pb-5 dark:border-white/10">
                  <div><p className="text-sm text-zinc-500">Send exactly</p><p className="mt-1 text-3xl font-semibold tracking-tight">{money.format(service.deposit)}</p></div>
                  <CreditCard className="size-7 text-[#ef6a5b]" />
                </div>
                <div className="py-5"><p className="text-sm text-zinc-500">GCash account</p><p className="mt-1 font-semibold">0917 842 1160</p><p className="text-sm">Glow Studio</p></div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-[#f8f7f4] px-5 py-8 text-center hover:border-[#ef6a5b] dark:border-white/20 dark:bg-black/20">
                  <Upload className="mb-3 size-6 text-[#c64f43]" />
                  <span className="font-semibold">Upload payment receipt</span>
                  <span className="mt-1 text-sm text-zinc-500">JPG, PNG, or PDF up to 10 MB</span>
                  <input type="file" className="sr-only" accept="image/*,.pdf" onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? "")} />
                </label>
                {receiptName && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><FileCheck2 className="size-4" />{receiptName} selected</p>}
                <div className="mt-5 flex gap-3 text-sm leading-6 text-zinc-500"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p>A receipt helps the studio review your payment. It is not automatic proof of payment.</p></div>
              </div>
            </div>
          )}

          {step === "confirmation" && (
            <div className="flex min-h-[540px] flex-col justify-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="size-7" /></span>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Receipt sent for review</h1>
              <p className="mt-4 max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">Glow Studio will confirm your booking after checking the payment. We will text you when it is ready.</p>
              <div className="mt-8 max-w-lg rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
                <div className="flex justify-between gap-4"><span className="text-zinc-500">Booking</span><span className="font-medium">#SP-1050</span></div>
                <div className="mt-3 flex justify-between gap-4"><span className="text-zinc-500">Deposit submitted</span><span className="font-medium">{money.format(service.deposit)}</span></div>
              </div>
              <Button onClick={onSwitch} size="lg" className="mt-8 w-fit bg-[#20201e] px-6 text-white hover:bg-[#383733] dark:bg-[#f7f5ef] dark:text-[#20201e]">Open business review <ArrowRight /></Button>
            </div>
          )}

          {step !== "confirmation" && (
            <div className="mt-10 flex items-center justify-between">
              <Button variant="ghost" onClick={back} disabled={currentIndex === 0}><ArrowLeft /> Back</Button>
              <Button onClick={step === "payment" ? submitReceipt : next} disabled={(step === "details" && !detailsComplete) || (step === "payment" && !receiptName)} size="lg" className="bg-[#20201e] px-6 text-white hover:bg-[#383733] dark:bg-[#f7f5ef] dark:text-[#20201e]">
                {step === "payment" ? "Submit receipt" : "Continue"} <ArrowRight />
              </Button>
            </div>
          )}
        </section>

        <aside className="order-1 md:order-2">
          <div className="sticky top-6 rounded-2xl bg-[#20201e] p-5 text-[#f7f5ef] shadow-[0_18px_50px_rgba(32,32,30,.18)] dark:bg-zinc-900 sm:p-6">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-white/60">Your appointment</span><Sparkles className="size-5 text-[#ef6a5b]" /></div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">{service.name}</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/75">
              <p className="flex items-center gap-3"><CalendarDays className="size-4 text-[#ef6a5b]" /> Wednesday, September 24</p>
              <p className="flex items-center gap-3"><Clock3 className="size-4 text-[#ef6a5b]" /> {time}, {service.durationMinutes} minutes</p>
              <p className="flex items-center gap-3"><MapPin className="size-4 text-[#ef6a5b]" /> {organization.address}</p>
            </div>
            <div className="mt-6 border-t border-white/12 pt-5">
              <div className="flex justify-between text-sm"><span className="text-white/60">Service total</span><span>{money.format(service.price)}</span></div>
              <div className="mt-3 flex justify-between font-semibold"><span>Deposit due</span><span className="text-[#ff897c]">{money.format(service.deposit)}</span></div>
              <div className="mt-3 flex justify-between text-sm"><span className="text-white/60">Pay at appointment</span><span>{money.format(service.price - service.deposit)}</span></div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function BusinessApp({
  onSwitch,
  bookings,
  setBookings,
  initialSelectedId,
}: {
  onSwitch: () => void;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  initialSelectedId: string | null;
}) {
  const [view, setView] = useState<BusinessView>(initialSelectedId ? "review" : "overview");
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? "SP-1045");
  const [businessName, setBusinessName] = useState(organization.name);
  const [businessSlug, setBusinessSlug] = useState(organization.slug);
  const [businessAddress, setBusinessAddress] = useState(organization.address);
  const [setupServices, setSetupServices] = useState(services);
  const [saved, setSaved] = useState(false);
  const selected = bookings.find((booking) => booking.id === selectedId) ?? bookings[0];
  const service = services.find((item) => item.id === selected.serviceId) ?? services[0];
  const counts = useMemo(() => ({
    confirmed: bookings.filter((item) => item.appointmentStatus === "confirmed").length,
    waiting: bookings.filter((item) => item.depositStatus === "awaiting_payment" && item.appointmentStatus !== "expired").length,
    review: bookings.filter((item) => ["needs_review", "suspicious"].includes(item.depositStatus)).length,
  }), [bookings]);

  const decide = (accepted: boolean) => {
    if (!["needs_review", "suspicious"].includes(selected.depositStatus)) return;

    setBookings((current) => current.map((booking) => booking.id === selected.id ? {
      ...booking,
      appointmentStatus: accepted ? "confirmed" : "pending",
      depositStatus: accepted ? "verified" : "rejected",
    } : booking));
    setView("overview");
  };

  const addService = () => {
    if (setupServices.some((item) => item.id === "nail-art")) return;
    setSetupServices((current) => [...current, {
      id: "nail-art",
      name: "Express nail art",
      durationMinutes: 30,
      price: 450,
      deposit: 200,
    }]);
    setSaved(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#f4f3ef] text-[#20201e] dark:bg-[#171716] dark:text-[#f7f5ef]">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1440px] md:grid-cols-[230px_1fr]">
        <aside className="hidden border-r border-black/8 bg-white/45 p-5 dark:border-white/10 dark:bg-white/[.025] md:flex md:flex-col">
          <Mark />
          <nav className="mt-10 grid gap-1">
            {([
              ["overview", "Overview", LayoutDashboard],
              ["review", "Payment inbox", ReceiptText],
              ["setup", "Business setup", Settings2],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setView(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${view === id ? "bg-[#20201e] text-white dark:bg-[#f7f5ef] dark:text-[#20201e]" : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"}`}>
                <Icon className="size-[18px]" />{label}
              </button>
            ))}
          </nav>
          <button onClick={onSwitch} className="mt-auto flex items-center justify-between rounded-xl border border-black/10 p-3 text-left text-sm dark:border-white/10">
            <span><span className="block font-semibold">Glow Studio</span><span className="text-xs text-zinc-500">View booking page</span></span><ChevronRight className="size-4" />
          </button>
        </aside>

        <main className="min-w-0 pb-24 md:pb-8">
          <header className="flex h-16 items-center justify-between border-b border-black/8 px-4 dark:border-white/10 sm:px-7">
            <div className="md:hidden"><Mark /></div>
            <div className="hidden md:block"><p className="text-sm font-semibold">Glow Studio</p><p className="text-xs text-zinc-500">Wednesday, September 24</p></div>
            <button onClick={onSwitch} className="text-sm font-medium text-[#c64f43]">Customer demo</button>
          </header>

          <div className="px-4 py-7 sm:px-7 lg:px-10">
            {view === "overview" && (
              <div>
                <p className="text-sm font-medium text-[#c64f43]">Good morning, Anne</p>
                <h1 className="mt-1 text-4xl font-semibold tracking-[-0.055em]">Your day at a glance</h1>
                <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-black/8 bg-black/8 dark:border-white/10 dark:bg-white/10 sm:grid-cols-3">
                  {[["Confirmed", counts.confirmed], ["Awaiting deposit", counts.waiting], ["Needs review", counts.review]].map(([label, value]) => (
                    <div key={label} className="bg-white p-5 dark:bg-zinc-900"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p></div>
                  ))}
                </div>
                <div className="mt-10 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Today&apos;s appointments</h2><p className="mt-1 text-sm text-zinc-500">All times are Asia/Manila</p></div><button onClick={() => setView("review")} className="text-sm font-semibold text-[#c64f43]">Review payments</button></div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-black/8 bg-white dark:border-white/10 dark:bg-zinc-900">
                  {bookings.map((booking) => {
                    const itemService = services.find((item) => item.id === booking.serviceId);
                    return <button key={booking.id} onClick={() => { setSelectedId(booking.id); setView("review"); }} className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-3 border-b border-black/6 px-4 py-4 text-left last:border-0 hover:bg-black/[.025] dark:border-white/8 dark:hover:bg-white/[.025] sm:grid-cols-[95px_1fr_auto]">
                      <span className="font-mono text-sm font-medium">{booking.time}</span><span><span className="block font-semibold">{booking.customerName}</span><span className="text-sm text-zinc-500">{itemService?.name}</span></span><StatusBadge status={booking.depositStatus} />
                    </button>;
                  })}
                </div>
              </div>
            )}

            {view === "review" && (
              <div>
                <p className="text-sm font-medium text-[#c64f43]">Payment inbox</p>
                <h1 className="mt-1 text-4xl font-semibold tracking-[-0.055em]">Review with context</h1>
                <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">The receipt check is advisory. You make the final decision after confirming the payment in your own account.</p>
                <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
                  <div className="grid content-start gap-2">
                    {bookings.filter((item) => ["needs_review", "suspicious", "verified", "rejected"].includes(item.depositStatus)).map((booking) => (
                      <button key={booking.id} onClick={() => setSelectedId(booking.id)} className={`rounded-2xl border p-4 text-left ${selected.id === booking.id ? "border-[#ef6a5b] bg-white dark:bg-zinc-900" : "border-black/8 bg-white/50 dark:border-white/10 dark:bg-white/[.025]"}`}>
                        <div className="flex items-start justify-between gap-3"><span className="font-semibold">{booking.customerName}</span><StatusBadge status={booking.depositStatus} /></div><p className="mt-2 text-sm text-zinc-500">{booking.id}, {booking.time}</p>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-zinc-500">{selected.id}</p><h2 className="mt-1 text-2xl font-semibold">{selected.customerName}</h2><p className="mt-1 text-sm text-zinc-500">{service.name}, {selected.date} at {selected.time}</p></div><StatusBadge status={selected.depositStatus} /></div>
                    {selected.receipt ? <>
                      <div className="mt-7 grid gap-3 rounded-2xl bg-[#f4f3ef] p-5 dark:bg-black/25 sm:grid-cols-3"><div><p className="text-xs text-zinc-500">Detected amount</p><p className="mt-1 font-semibold">{money.format(selected.receipt.amount)}</p></div><div><p className="text-xs text-zinc-500">Expected</p><p className="mt-1 font-semibold">{money.format(service.deposit)}</p></div><div><p className="text-xs text-zinc-500">Provider</p><p className="mt-1 font-semibold">{selected.receipt.provider}</p></div></div>
                      <div className="mt-6"><p className="text-sm font-semibold">Reference number</p><p className="mt-1 font-mono text-lg">{selected.receipt.reference}</p></div>
                      <div className="mt-6"><p className="text-sm font-semibold">Signals</p><div className="mt-3 grid gap-2">{selected.receipt.signals.map((signal) => <p key={signal} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"><FileCheck2 className="size-4 text-[#c64f43]" />{signal}</p>)}</div></div>
                      {["needs_review", "suspicious"].includes(selected.depositStatus) ? <div className="mt-7 flex flex-col gap-3 border-t border-black/8 pt-6 dark:border-white/10 sm:flex-row"><Button onClick={() => decide(true)} size="lg" className="bg-[#20201e] text-white hover:bg-[#383733] dark:bg-[#f7f5ef] dark:text-[#20201e]"><Check /> Accept deposit</Button><Button onClick={() => decide(false)} variant="outline" size="lg">Reject receipt</Button></div> : <p className="mt-7 border-t border-black/8 pt-6 text-sm text-zinc-500 dark:border-white/10">This payment decision is complete.</p>}
                    </> : <div className="mt-8 rounded-2xl border border-dashed border-black/15 p-8 text-center dark:border-white/15"><ReceiptText className="mx-auto size-7 text-zinc-400" /><p className="mt-3 font-semibold">No receipt uploaded</p><p className="mt-1 text-sm text-zinc-500">The customer is still within their payment window.</p></div>}
                  </div>
                </div>
              </div>
            )}

            {view === "setup" && (
              <div>
                <p className="text-sm font-medium text-[#c64f43]">Business setup</p>
                <h1 className="mt-1 text-4xl font-semibold tracking-[-0.055em]">Ready to take bookings</h1>
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <section className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 sm:p-7"><h2 className="text-lg font-semibold">Studio profile</h2><div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-medium">Business name<input value={businessName} onChange={(event) => { setBusinessName(event.target.value); setSaved(false); }} className="h-11 rounded-xl border border-black/12 bg-transparent px-3 outline-none focus:border-[#ef6a5b] dark:border-white/15" /></label><label className="grid gap-2 text-sm font-medium">Booking link<div className="flex h-11 items-center rounded-xl border border-black/12 px-3 focus-within:border-[#ef6a5b] dark:border-white/15"><span className="text-sm text-zinc-500">slotpay.ph/</span><input value={businessSlug} onChange={(event) => { setBusinessSlug(event.target.value); setSaved(false); }} className="min-w-0 flex-1 bg-transparent outline-none" /></div></label><label className="grid gap-2 text-sm font-medium">Location<input value={businessAddress} onChange={(event) => { setBusinessAddress(event.target.value); setSaved(false); }} className="h-11 rounded-xl border border-black/12 bg-transparent px-3 outline-none focus:border-[#ef6a5b] dark:border-white/15" /></label></div></section>
                  <section className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 sm:p-7"><h2 className="text-lg font-semibold">Payment instructions</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Customers send deposits directly to your account.</p><div className="mt-5 rounded-2xl bg-[#f4f3ef] p-5 dark:bg-black/25"><p className="text-xs text-zinc-500">GCash</p><p className="mt-1 font-semibold">0917 842 1160</p><p className="text-sm">Glow Studio</p></div><Button onClick={() => setSaved(true)} className="mt-5 bg-[#20201e] text-white hover:bg-[#383733] dark:bg-[#f7f5ef] dark:text-[#20201e]">Save changes</Button>{saved && <p role="status" className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">Changes saved in this prototype.</p>}</section>
                  <section className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 sm:p-7 lg:col-span-2"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Services</h2><p className="mt-1 text-sm text-zinc-500">Fixed prices and deposits for the booking prototype.</p></div><Button onClick={addService} disabled={setupServices.some((item) => item.id === "nail-art")} variant="outline">{setupServices.some((item) => item.id === "nail-art") ? "Service added" : "Add service"}</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{setupServices.map((item) => <div key={item.id} className="rounded-2xl bg-[#f4f3ef] p-4 dark:bg-black/25"><p className="font-semibold">{item.name}</p><p className="mt-2 text-sm text-zinc-500">{item.durationMinutes} min, {money.format(item.price)}</p><p className="mt-1 text-sm">{money.format(item.deposit)} deposit</p></div>)}</div></section>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-black/10 bg-[#f4f3ef]/95 px-2 py-2 backdrop-blur dark:border-white/10 dark:bg-[#171716]/95 md:hidden">
        {([["overview", "Overview", LayoutDashboard], ["review", "Payments", ReceiptText], ["setup", "Setup", Settings2]] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setView(id)} className={`grid justify-items-center gap-1 rounded-xl py-2 text-xs font-medium ${view === id ? "text-[#c64f43]" : "text-zinc-500"}`}><Icon className="size-5" />{label}</button>)}
      </nav>
    </div>
  );
}

export function SlotPayPrototype() {
  const [mode, setMode] = useState<"customer" | "business">("customer");
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null);

  const submitBooking = (booking: Booking) => {
    setBookings((current) => [booking, ...current.filter((item) => item.id !== booking.id)]);
    setSubmittedBookingId(booking.id);
  };

  return mode === "customer" ? (
    <CustomerFlow onSubmit={submitBooking} onSwitch={() => setMode("business")} />
  ) : (
    <BusinessApp
      bookings={bookings}
      setBookings={setBookings}
      initialSelectedId={submittedBookingId}
      onSwitch={() => setMode("customer")}
    />
  );
}
