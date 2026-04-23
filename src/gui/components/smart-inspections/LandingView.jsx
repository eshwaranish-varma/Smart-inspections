import Icon from "./Icon";

export default function LandingView({ onLogin, onSignup }) {
  const tractionSignals = [
    { label: "Workflow wedge", value: "FDA 483 + EIR" },
    { label: "AI moat", value: "CFR/IOM grounded" },
    { label: "Buyer pain", value: "Manual casework" },
  ];

  const workflowSteps = [
    { icon: "file", title: "Ingest evidence", text: "Notes, PDFs, photos, and scanned records enter one inspection workspace." },
    { icon: "ai", title: "Draft with context", text: "OCR, RAG, and CFR matching turn messy findings into review-ready language." },
    { icon: "shield", title: "Defend the record", text: "Every observation keeps citations, evidence links, signatures, and audit trail." },
  ];

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
          <div className="hero-kicker">
            <Icon name="shield" size={14} /> AI for government-adjacent markets
          </div>
          <div className="hero-title">
            Smart <span>Inspections</span>
          </div>
          <p className="hero-desc">
            A vertical AI system for FDA inspection teams: convert raw evidence into defensible FDA 483 and EIR drafts with CFR grounding,
            evidence traceability, supervisor review, signatures, and audit history.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onSignup}>
              Start Demo Inspection
            </button>
            <button type="button" className="btn btn-secondary" onClick={onLogin}>
              Open Investigator Login
            </button>
          </div>
          <div className="traction-strip" aria-label="Startup positioning">
            {tractionSignals.map((signal) => (
              <div key={signal.label} className="traction-item">
                <div className="traction-value">{signal.value}</div>
                <div className="text-muted">{signal.label}</div>
              </div>
            ))}
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

      <section className="landing-workflow" aria-label="Hackathon product thesis">
        {workflowSteps.map((step) => (
          <article key={step.title} className="workflow-card">
            <span className="workflow-icon">
              <Icon name={step.icon} size={18} />
            </span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
