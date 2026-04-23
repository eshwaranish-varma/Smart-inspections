"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not send reset code.");
        return;
      }

      setSuccess(data.message || "Reset code sent.");
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
      }, 900);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
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
            Account recovery
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">
            Reset access without exposing passwords.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            We will email a short verification code to the account address, then let the user choose a new password.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-6 text-slate-300">
            Passwords are never shown or recovered. Only a new hashed password is saved after code verification.
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
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#282e63] dark:text-white">Forgot password?</h1>
            <p className="mt-1.5 text-sm text-[#4B5565] dark:text-slate-400">
              Enter the email on the user profile. We will send a 6-digit reset code.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#282e63] dark:text-slate-200">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@fda.hhs.gov"
                  className="w-full rounded-xl border border-[#D9E1EC] bg-white py-2.5 pl-10 pr-4 text-sm text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#282e63] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending code..." : "Send reset code"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
