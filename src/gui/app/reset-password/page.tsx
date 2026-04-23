"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, RotateCcw } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not reset password.");
        return;
      }

      setMessage(data.message || "Password reset successfully.");
      setTimeout(() => router.replace("/dashboard"), 900);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not send a new reset code.");
        return;
      }

      setCode("");
      setMessage("A new reset code has been sent if the email matches an account.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen bg-[#F7F9FC] dark:bg-slate-950">
      <div className="hidden w-[42%] flex-col justify-between bg-[#282e63] px-12 py-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
            SI
          </div>
          <span className="text-sm font-semibold">Smart Inspections</span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Secure reset
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">
            Verify the code, then choose a new password.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Once the code is accepted, the new password is hashed and the user is sent straight to the dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-6 text-slate-300">
            If the code expires, request another one from this page using the same profile email.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="absolute left-6 top-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D9E1EC] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5565] transition-colors hover:border-[#282e63] hover:text-[#282e63] dark:border-white/10 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#282e63] dark:bg-indigo-950/40 dark:text-indigo-300">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#282e63] dark:text-white">Reset password</h1>
            <p className="mt-1.5 text-sm text-[#4B5565] dark:text-slate-400">
              Enter the email, reset code, and a new password.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#282e63] dark:text-slate-200">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@fda.hhs.gov"
                className="w-full rounded-xl border border-[#D9E1EC] bg-white px-4 py-2.5 text-sm text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#282e63] dark:text-slate-200">
                Reset code
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                placeholder="000000"
                className="w-full rounded-xl border border-[#D9E1EC] bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#282e63] dark:text-slate-200">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-[#D9E1EC] bg-white px-4 py-2.5 text-sm text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#282e63] dark:text-slate-200">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-[#D9E1EC] bg-white px-4 py-2.5 text-sm text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#282e63] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting password..." : "Reset password and open dashboard"}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-3 text-center text-sm text-[#4B5565] dark:text-slate-400">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email.trim()}
              className="inline-flex items-center gap-2 font-semibold text-[#282e63] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-indigo-300"
            >
              <RotateCcw className="h-4 w-4" />
              {resending ? "Sending new code..." : "Send another code"}
            </button>
            <Link href="/forgot-password" className="font-medium text-[#282e63] underline-offset-2 hover:underline dark:text-indigo-300">
              Use a different email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
