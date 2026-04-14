'use client';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") || "";
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Verification failed.");
      return;
    }

    setSuccess(true);
    const target = data.autoLogin ? "/dashboard" : "/login?verified=1";
    setTimeout(() => router.replace(target), 1800);
  }

  async function handleResend() {
    setResending(true);
    setResendMsg("");
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not resend code.");
      } else {
        setCode("");
        setResendMsg("A new verification code has been sent to your email.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          paddingTop: 80,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            overflow: "hidden",
            width: "100%",
            maxWidth: 420,
          }}
        >
          <div style={{ background: "#0D1B3E", padding: "24px 32px" }}>
            <h2
              style={{ color: "#fff", margin: 0, fontSize: 20 }}
            >
              Verify Your Email
            </h2>
            <p
              style={{ color: "#02A8BD", fontSize: 13, margin: "4px 0 0" }}
            >
              Check your inbox for a 6-digit code
            </p>
          </div>

          <div style={{ padding: "32px" }}>
            {success ? (
              <div
                style={{
                  textAlign: "center",
                  border: "1px solid #a7f3d0",
                  background: "linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: "#0f766e", marginBottom: 8 }}>Email Verified Successfully</h3>
                <p style={{ color: "#475569", marginBottom: 16 }}>
                  Your account is now active. Signing you in and redirecting to the dashboard...
                </p>
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #ccfbf1",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 16,
                    textAlign: "left",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                    Verified account
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>
                    Email: <strong>{email}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.replace("/dashboard")}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "#028090",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 15,
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  Go to Dashboard →
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: 20,
                    border: "1px solid #dbeafe",
                    background: "#f8fbff",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      color: "#475569",
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    We sent a 6-digit verification code to <strong style={{ color: "#0f172a" }}>{email}</strong>.
                    Enter it below to activate your account and continue to login.
                  </p>
                </div>

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

                <form onSubmit={handleVerify}>
                  <div style={{ marginBottom: 24 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                        setResendMsg("");
                      }}
                      required
                      maxLength={6}
                      placeholder="000000"
                      style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: 28,
                        letterSpacing: 12,
                        textAlign: "center",
                        border: "2px solid #0D1B3E",
                        borderRadius: 8,
                        outline: "none",
                        fontFamily: "monospace",
                        color: "#0f172a",
                        background: "#f8fafc",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    style={{
                      width: "100%",
                      padding: 12,
                      background: code.length === 6 ? "#028090" : "#9ca3af",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 15,
                      border: "none",
                      borderRadius: 8,
                      cursor: code.length === 6 ? "pointer" : "not-allowed",
                    }}
                  >
                    {loading ? "Verifying…" : "Verify & Activate Account"}
                  </button>
                </form>

                {resendMsg && (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: 8,
                      padding: "12px 16px",
                      marginTop: 16,
                      color: "#047857",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {resendMsg}
                  </div>
                )}

                <div
                  style={{
                    textAlign: "center",
                    marginTop: 16,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Didn&apos;t receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#028090",
                        fontWeight: 600,
                        cursor: resending ? "not-allowed" : "pointer",
                        fontSize: 13,
                        padding: 0,
                        textDecoration: "underline",
                      }}
                    >
                      {resending ? "Sending…" : "Resend verification code"}
                    </button>
                  </p>
                  <p style={{ marginTop: 8 }}>
                    Wrong email?{" "}
                    <Link href="/signup" style={{ color: "#028090" }}>
                      Sign up again
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

