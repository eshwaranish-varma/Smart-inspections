import Icon from "./Icon";

export default function LandingView({ onLogin, onSignup }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-mark">SI</div>
          <div>
            <div style={{ fontWeight: 700 }}>Smart Inspections</div>
            <div style={{ fontSize: 11, color: "var(--teal)" }}>AI-Assisted FDA 483 & EIR Documentation</div>
          </div>
        </div>
        <div className="landing-nav-links">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLogin}>
            Log In
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSignup}>
            Sign Up
          </button>
        </div>
      </nav>

      <div className="hero">
        <div>
          <div className="hero-title">
            Smart <span>Inspections</span>
          </div>
          <p className="hero-desc">
            Transforming FDA inspection documentation through AI-assisted, CFR-aware drafting with traceable evidence and investigator-first review.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={onSignup}>
              Get Started
            </button>
            <button type="button" className="btn btn-secondary" onClick={onLogin}>
              Learn More
            </button>
          </div>
        </div>

        <div className="hero-preview" aria-label="AI observation preview">
          <div className="preview-bar">
            <span className="text-muted">smart-inspections.precise-soft.com</span>
          </div>
          <div className="preview-code">
            <div className="text-muted">// AI-Generated Observation</div>
            <div style={{ color: "var(--teal)" }}>Observation 1:</div>
            <div>Procedures designed to prevent microbiological contamination</div>
            <div>of sterile drug products were not established as required by</div>
            <div style={{ color: "var(--gold)" }}>21 CFR 211.113(b)</div>
            <div className="mt-2">Evidence: EM Log #2024-047</div>
            <div className="mt-2" style={{ display: "flex", gap: 8 }}>
              <span className="badge badge-verified">
                <Icon name="check" size={12} /> CFR Validated
              </span>
              <span className="badge badge-progress">
                <Icon name="link" size={12} /> Evidence Traced
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
