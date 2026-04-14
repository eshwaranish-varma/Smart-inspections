"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, ShieldCheck, Waypoints } from "lucide-react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const verified = searchParams.get("verified") === "1";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.needsVerification) {
        router.push(`/verify-email?userId=${data.userId}&email=${email}`);
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen bg-[#F7F9FC] dark:bg-slate-950">

      {/* ── Left panel ── */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#282e63] px-12 py-12 lg:flex">
        {/* subtle grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(99,102,241,0.15),transparent)]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
            SI
          </div>
          <span className="text-sm font-semibold text-white">Smart Inspections</span>
        </div>

        {/* Middle copy */}
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            FDA Inspection Platform
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-white">
            Evidence-first drafting.<br />Human-reviewed outputs.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            From raw inspection notes and scanned records to review-ready FDA 483 and EIR drafts — with OCR extraction, AI drafting, and regulatory grounding baked in.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: ShieldCheck, label: "Human-reviewed before any output is finalized" },
              { icon: FileCheck2, label: "FDA 483 and EIR draft support" },
              { icon: Waypoints, label: "Full evidence-to-citation traceability" },
              { icon: CheckCircle2, label: "CFR and IOM regulatory grounding" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-slate-300">
                <Icon className="h-4 w-4 shrink-0 text-indigo-300" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-6 text-slate-300">
            "Investigators retain full control — every AI draft goes through edit, review, and approval before it becomes part of a final document."
          </p>
          <p className="mt-3 text-xs font-semibold text-indigo-300">Smart Inspections · Capstone Project</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Back to home */}
        <div className="absolute left-6 top-6 lg:left-[calc(42%+24px)]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D9E1EC] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5565] transition-colors hover:border-[#282e63] hover:text-[#282e63] dark:border-white/10 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>

        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#282e63] text-xs font-bold text-white">SI</div>
          <span className="text-sm font-semibold text-[#282e63] dark:text-white">Smart Inspections</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#282e63] dark:text-white">Welcome back</h1>
            <p className="mt-1.5 text-sm text-[#4B5565] dark:text-slate-400">Sign in to your account to continue</p>
          </div>

          {/* Verified banner */}
          {verified && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Email verified successfully. Please sign in.
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-[#282e63] dark:text-slate-200">Password</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#D9E1EC] bg-white px-4 py-2.5 text-sm text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#282e63] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <p className="text-xs font-semibold text-[#282e63] dark:text-indigo-300">Demo accounts — password: FDAInspector2026!</p>
            <p className="mt-1 text-xs text-[#4B5565] dark:text-slate-400">
              james.mitchell@fda.hhs.gov · sandra.chen@fda.hhs.gov
            </p>
            <p className="mt-1 text-xs text-[#4B5565] dark:text-slate-500">
              Investigators: sign up for a Field Client Investigator account.
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-[#4B5565] dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#282e63] underline-offset-2 hover:underline dark:text-indigo-300">
              Create account
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950" />}>
      <LoginPageContent />
    </Suspense>
  );
}
