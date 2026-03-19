"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";

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
    <div
      style={{
        background: "#f4f7fa",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <PublicNavbar />
      <div className="flex items-center justify-center min-h-screen pt-20">
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            overflow: "hidden",
            width: "100%",
            maxWidth: 440,
          }}
        >
          <div style={{ background: "#0D1B3E", padding: "28px 32px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  background: "#028090",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                SI
              </div>
              <span
                style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}
              >
                Smart Inspections
              </span>
            </div>
            <p
              style={{
                color: "#02A8BD",
                fontSize: 13,
                margin: 0,
              }}
            >
              Sign in to your account
            </p>
          </div>

          <div style={{ padding: "32px" }}>
            {verified && (
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                  color: "#0f766e",
                  fontSize: 14,
                }}
              >
                Email verified successfully. Please sign in with your new account.
              </div>
            )}
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                  color: "#b91c1c",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@fda.hhs.gov"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    color: "#000",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    color: "#000",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading ? "#9ca3af" : "#028090",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 15,
                  border: "none",
                  borderRadius: 8,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#f0f9ff",
                borderRadius: 8,
                fontSize: 12,
                color: "#0369a1",
                border: "1px solid #bae6fd",
              }}
            >
              <strong>
                Demo Accounts (all use password: FDAInspector2026!)
              </strong>
              <br />
              james.mitchell@fda.hhs.gov | sandra.chen@fda.hhs.gov
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                style={{ color: "#028090", fontWeight: 600 }}
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f7fa]" />}>
      <LoginPageContent />
    </Suspense>
  );
}

