import Icon from "./Icon";

export default function AuthView({
  authMode,
  setAuthMode,
  verifyStep,
  otp,
  setOtp,
  loginForm,
  setLoginForm,
  signupForm,
  setSignupForm,
  handleLogin,
  handleSignup,
  handleVerify,
  authError,
}) {
  if (verifyStep === "email" || verifyStep === "phone") {
    return (
      <div className="auth-container">
        <div className="auth-right" style={{ gridColumn: "1 / -1" }}>
          <div className="auth-form">
            <h2>Verification</h2>
            <p className="text-muted">We sent a 6-digit code to your {verifyStep === "email" ? "email" : "phone"}.</p>
            <div className="otp-inputs">
              {otp.map((value, index) => (
                <input
                  key={`otp-${index}`}
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`OTP digit ${index + 1}`}
                  value={value}
                  onChange={(event) => {
                    const next = [...otp];
                    next[index] = event.target.value.replace(/\D/g, "");
                    setOtp(next);
                  }}
                />
              ))}
            </div>
            <button type="button" className="btn btn-primary w-full mt-4" onClick={handleVerify}>
              Verify & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div style={{ maxWidth: 420 }}>
          <h2 style={{ marginBottom: 10 }}>Smart Inspections</h2>
          <p className="text-muted">The AI-assisted FDA inspection documentation platform trusted by investigators nationwide.</p>
        </div>
      </div>

      <div className="auth-right">
        {authMode === "login" ? (
          <div className="auth-form">
            <h2>Welcome back</h2>
            <p className="text-muted mb-4">Sign in to your account</p>
            {authError ? (
              <div role="alert" style={{ color: "var(--red)", marginBottom: 12 }}>
                {authError}
              </div>
            ) : null}
            <div className="form-grid mb-4">
              <div className="form-group">
                <label htmlFor="si-login-email">Email</label>
                <input
                  id="si-login-email"
                  type="email"
                  placeholder="investigator@fda.gov"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="si-login-password">Password</label>
                <input
                  id="si-login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>
            </div>
            <button type="button" className="btn btn-primary w-full" onClick={handleLogin}>
              Sign In with MFA
            </button>
            <p className="mt-4 text-muted">
              Need an account?{" "}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAuthMode("signup")}>
                Sign up
              </button>
            </p>
          </div>
        ) : (
          <div className="auth-form">
            <h2>Create account</h2>
            <p className="text-muted mb-4">Join the Smart Inspections platform</p>
            <div className="form-grid mb-4">
              {[
                ["Full Name", "name", "text", "Dr. Jane Smith"],
                ["Email Address", "email", "email", "jane@fda.gov"],
                ["Phone Number", "phone", "tel", "+1 (555) 000-0000"],
                ["Password", "password", "password", "••••••••"],
              ].map(([label, key, type, placeholder]) => (
                <div className="form-group" key={key}>
                  <label htmlFor={`si-signup-${key}`}>{label}</label>
                  <input
                    id={`si-signup-${key}`}
                    type={type}
                    placeholder={placeholder}
                    value={signupForm[key]}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="form-group">
                <label htmlFor="si-signup-role">Role</label>
                <select
                  id="si-signup-role"
                  value={signupForm.role}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="">Select role...</option>
                  <option>Senior Investigator</option>
                  <option>Investigator</option>
                  <option>Supervisory Investigator</option>
                </select>
              </div>
            </div>
            <button type="button" className="btn btn-primary w-full" onClick={handleSignup}>
              <Icon name="shield" size={14} /> Create Account & Verify
            </button>
            <p className="mt-4 text-muted">
              Already have an account?{" "}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAuthMode("login")}>
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
