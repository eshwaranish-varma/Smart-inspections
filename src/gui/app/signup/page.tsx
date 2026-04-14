"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileCheck2, ShieldCheck, Waypoints, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    fdaPosition: "",
    role: "investigator",
    address: "",
    city: "",
    state: "",
    country: "United States",
    zipCode: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        fdaPosition: form.fdaPosition,
        role: form.role,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        zipCode: form.zipCode,
        password: form.password,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Signup failed.");
      return;
    }
    router.push(`/verify-email?userId=${data.userId}&email=${form.email}`);
  }

  const positions = [
    "Senior Investigator - Office of Regulatory Affairs",
    "Compliance Officer - Center for Drug Evaluation and Research",
    "Division Director - Office of Pharmaceutical Quality Operations",
    "Investigator - Center for Biologics Evaluation and Research",
    "Program Manager - Office of Criminal Investigations",
    "Inspector - Center for Food Safety and Applied Nutrition",
    "Analyst - Center for Devices and Radiological Health",
    "Other FDA Position",
  ];

  const inputCls = "w-full rounded-xl border border-[#D9E1EC] bg-white px-4 py-2.5 text-sm text-[#282e63] placeholder-[#9ca3af] outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";
  const labelCls = "mb-1.5 block text-sm font-medium text-[#282e63] dark:text-slate-200";

  return (
    <div className="relative flex min-h-screen bg-[#F7F9FC] dark:bg-slate-950">

      {/* ── Left panel ── */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[#282e63] px-12 py-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(99,102,241,0.15),transparent)]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">SI</div>
          <span className="text-sm font-semibold text-white">Smart Inspections</span>
        </div>

        {/* Middle copy */}
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Join the Platform</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-white">
            Start your first inspection in minutes.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Create your account and get immediate access to OCR-powered evidence ingestion, AI-assisted drafting, and a human-in-the-loop review workflow built for FDA inspectors.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: ShieldCheck, label: "Designed for FDA investigators and reviewers" },
              { icon: FileCheck2, label: "Draft FDA 483 and EIR documents with AI" },
              { icon: Waypoints, label: "Every observation linked to its evidence source" },
              { icon: CheckCircle2, label: "You review and approve before any export" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-slate-300">
                <Icon className="h-4 w-4 shrink-0 text-indigo-300" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-6 text-slate-300">
            After creating your account you'll receive a verification email. Once verified, you'll have full access to the inspection workspace.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto px-6 py-12">

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

        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#282e63] dark:text-white">Create your account</h1>
            <p className="mt-1.5 text-sm text-[#4B5565] dark:text-slate-400">Fill in your details to get started</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name <span className="text-red-400">*</span></label>
                <input name="firstName" required value={form.firstName} onChange={handleChange} placeholder="James" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last name <span className="text-red-400">*</span></label>
                <input name="lastName" required value={form.lastName} onChange={handleChange} placeholder="Mitchell" className={inputCls} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email address <span className="text-red-400">*</span></label>
              <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@fda.hhs.gov" className={inputCls} />
            </div>

            {/* Phone */}
            <div>
              <label className={labelCls}>Phone number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+1 (301) 796-0000" className={inputCls} />
            </div>

            {/* Position + Role row */}
            <div>
              <label className={labelCls}>FDA position</label>
              <select name="fdaPosition" title="FDA position" value={form.fdaPosition} onChange={handleChange} className={inputCls}>
                <option value="">Select your position</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Role <span className="text-red-400">*</span></label>
              <select name="role" title="Role" value={form.role} onChange={handleChange} className={inputCls}>
                <option value="investigator">Field Client Investigator</option>
                <option value="supervisor">Supervisory Investigator</option>
              </select>
              <p className="mt-1.5 text-xs text-[#4B5565] dark:text-slate-500">
                Both roles can access CFR references and AI evaluation metrics.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[#D9E1EC] dark:bg-white/10" />
              <span className="text-xs text-[#4B5565] dark:text-slate-500">Address (optional)</span>
              <div className="h-px flex-1 bg-[#D9E1EC] dark:bg-white/10" />
            </div>

            {/* Address */}
            <div>
              <label className={labelCls}>Street address</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="123 FDA Plaza" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Silver Spring" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="Maryland" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Country</label>
                <input name="country" value={form.country} onChange={handleChange} placeholder="United States" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ZIP code</label>
                <input name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="20993" className={inputCls} />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[#D9E1EC] dark:bg-white/10" />
              <span className="text-xs text-[#4B5565] dark:text-slate-500">Security</span>
              <div className="h-px flex-1 bg-[#D9E1EC] dark:bg-white/10" />
            </div>

            {/* Passwords */}
            <div>
              <label className={labelCls}>Password <span className="text-red-400">*</span></label>
              <input name="password" type="password" required value={form.password} onChange={handleChange} placeholder="Min. 8 characters" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Confirm password <span className="text-red-400">*</span></label>
              <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter password" className={inputCls} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#282e63] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#4B5565] dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#282e63] underline-offset-2 hover:underline dark:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
