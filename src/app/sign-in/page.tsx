import { AuthForm } from "@/features/auth";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 px-5 py-12 text-stone-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-stone-900 p-7 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">SlotPay PH</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Business access</h1>
        <p className="mt-2 text-sm leading-6 text-stone-400">Sign in to manage your business setup and activation.</p>
        <AuthForm />
      </section>
    </main>
  );
}
