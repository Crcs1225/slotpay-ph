"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "signIn" | "signUp" | "reset" | "resetVerification";

export function AuthForm({ initialMode = "signIn" }: { initialMode?: "signIn" | "signUp" }) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    formData.set("flow", mode === "resetVerification" ? "reset-verification" : mode);
    if (mode === "resetVerification") formData.set("email", resetEmail);
    try {
      await signIn("password", formData);
      if (mode === "reset") {
        setResetEmail(String(formData.get("email") ?? ""));
        setMode("resetVerification");
        setMessage("Enter the password reset code sent to your email.");
      } else {
        router.push("/dashboard/onboarding");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-7 space-y-4">
      {mode !== "resetVerification" && (
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-stone-950 px-4 py-3 outline-none focus:border-amber-400" />
        </label>
      )}
      {mode === "resetVerification" && (
        <>
          <p className="text-sm text-stone-400">Resetting the password for {resetEmail}</p>
          <label className="block text-sm font-medium">
            Reset code
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required className="mt-2 w-full rounded-xl border border-white/10 bg-stone-950 px-4 py-3 outline-none focus:border-amber-400" />
          </label>
          <label className="block text-sm font-medium">
            New password
            <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-xl border border-white/10 bg-stone-950 px-4 py-3 outline-none focus:border-amber-400" />
          </label>
        </>
      )}
      {mode !== "reset" && mode !== "resetVerification" && (
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" autoComplete={mode === "signUp" ? "new-password" : "current-password"} minLength={8} required className="mt-2 w-full rounded-xl border border-white/10 bg-stone-950 px-4 py-3 outline-none focus:border-amber-400" />
        </label>
      )}
      <button disabled={pending} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-stone-950 disabled:opacity-60">
        {pending ? "Please wait…" : mode === "signIn" ? "Sign in" : mode === "signUp" ? "Create account" : mode === "reset" ? "Send reset code" : "Set new password"}
      </button>
      {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
      <div className="flex flex-wrap gap-3 text-sm text-stone-400">
        {mode !== "signIn" && <button type="button" onClick={() => setMode("signIn")}>Sign in</button>}
        {mode !== "signUp" && <button type="button" onClick={() => setMode("signUp")}>Create account</button>}
        {mode !== "reset" && mode !== "resetVerification" && <button type="button" onClick={() => setMode("reset")}>Forgot password?</button>}
      </div>
    </form>
  );
}
