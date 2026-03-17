import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { TITLE_21_CFR, navItems } from "./constants";

const pageTitles = {
  dashboard: "Dashboard",
  new_inspection: "New Inspection",
  observations: "FY2025 Observations",
  documents: "Document Library",
  cfr: "CFR Title 21 Browser",
  signatures: "Signature Management",
  archive: "Archived Files",
  settings: "Settings",
};

function badgeForClassification(classification) {
  return `badge badge-${String(classification || "").toLowerCase()}`;
}

function InspectionModal({ inspection, onClose, onArchive }) {
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!inspection) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Inspection ${inspection.id}`} onClick={(event) => event.stopPropagation()}>
        <div className="card-header" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3>{inspection.firm}</h3>
            <div className="text-muted">{inspection.id}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="tabs" role="tablist" aria-label="Inspection detail tabs">
          {["Overview", "Observations", "Documents", "Signature"].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" ? (
          <div className="form-grid form-grid-2">
            {[
              ["FEI Number", inspection.fei || "—"],
              ["Investigator", inspection.investigator || "—"],
              ["Start Date", inspection.startDate || "—"],
              ["End Date", inspection.endDate || "Ongoing"],
              ["Observations", inspection.observations || 0],
              ["Signature", inspection.hasSignature ? "Verified" : "Pending"],
            ].map(([key, value]) => (
              <div key={key}>
                <div className="text-muted">{key}</div>
                <div>{value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "Observations" ? (
          <div>
            {(inspection.observationList || []).length ? (
              inspection.observationList.map((obs) => (
                <article key={obs.id} className="card mb-4">
                  <div className="card-header" style={{ justifyContent: "space-between" }}>
                    <span>{obs.cfr}</span>
                    <span className={`badge badge-${obs.status}`}>{obs.status}</span>
                  </div>
                  <p>{obs.text}</p>
                  <div className="text-muted">Evidence: {obs.evidence}</div>
                </article>
              ))
            ) : (
              <p className="text-muted">No observations available.</p>
            )}
          </div>
        ) : null}

        {activeTab === "Documents" ? (
          <div>
            {(inspection.documents || []).length ? (
              inspection.documents.map((doc, index) => (
                <div key={`${doc.name}-${index}`} className="card mb-4">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div>{doc.name}</div>
                      <div className="text-muted">
                        {doc.size} • {doc.date}
                      </div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm">
                      <Icon name="download" size={12} /> Download
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No documents available.</p>
            )}
          </div>
        ) : null}

        {activeTab === "Signature" ? (
          <div className="card">
            <div className="text-muted">Current signature status</div>
            <div style={{ marginTop: 8 }}>
              {inspection.hasSignature ? (
                <span className="badge badge-verified">
                  <Icon name="check" size={12} /> Verified
                </span>
              ) : (
                <span className="badge badge-pending">Pending</span>
              )}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {!inspection.archived ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onArchive(inspection.id)}>
              <Icon name="archive" size={13} /> Archive
            </button>
          ) : null}
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchiveConfirmModal({ inspection, onCancel, onConfirm }) {
  if (!inspection) return null;
  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Archive inspection" onClick={(event) => event.stopPropagation()}>
        <h3>Archive Inspection?</h3>
        <p className="text-muted">
          This will move <strong>{inspection.id}</strong> ({inspection.firm}) to archive. You can restore it later.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onConfirm(inspection.id)}>
            <Icon name="archive" size={13} /> Archive
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MainAppView({
  currentUser,
  inspections,
  setInspections,
  appPage,
  setAppPage,
  notifications,
  notifOpen,
  setNotifOpen,
  markNotifRead,
  handleLogout,
  realTimeUpdates,
  newInspStep,
  setNewInspStep,
  newInspData,
  setNewInspData,
  loadingAI,
  aiText,
  generatedObs,
  generateAI,
  cfrSearch,
  setCfrSearch,
  cfrCategory,
  setCfrCategory,
  submitInspection,
}) {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [setNotifOpen]);

  const cfrCategories = useMemo(() => ["All", ...new Set(TITLE_21_CFR.parts.map((part) => part.category))], []);
  const filteredCFR = useMemo(
    () =>
      TITLE_21_CFR.parts.filter(
        (part) =>
          (cfrCategory === "All" || part.category === cfrCategory) &&
          (part.part.toLowerCase().includes(cfrSearch.toLowerCase()) || part.title.toLowerCase().includes(cfrSearch.toLowerCase()))
      ),
    [cfrCategory, cfrSearch]
  );

  const navWithBadge = useMemo(
    () =>
      navItems.map((item) =>
        item.id === "archive" ? { ...item, badge: inspections.filter((inspection) => inspection.archived).length } : item
      ),
    [inspections]
  );

  const openInspection = (inspection, modal = "inspection") => {
    setSelectedInspection(inspection);
    setActiveModal(modal);
  };

  const archiveInspection = (inspectionId) => {
    setInspections((prev) =>
      prev.map((inspection) =>
        inspection.id === inspectionId ? { ...inspection, archived: true, status: "archived" } : inspection
      )
    );
    setActiveModal(null);
  };

  const renderDashboard = () => (
    <div>
      <div className="stats-grid">
        {[
          { label: "Total Inspections", value: inspections.length, color: "var(--teal)", icon: "file" },
          { label: "In Progress", value: inspections.filter((item) => item.status === "in_progress").length, color: "var(--blue)", icon: "refresh" },
          { label: "OAI Classifications", value: inspections.filter((item) => item.classification === "OAI").length, color: "var(--gold)", icon: "warn" },
          { label: "Verified Signatures", value: inspections.filter((item) => item.hasSignature).length, color: "var(--green)", icon: "signature" },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-muted">{stat.label}</span>
              <span style={{ color: stat.color }}>
                <Icon name={stat.icon} />
              </span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h3>Recent Inspections</h3>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAppPage("new_inspection")}>
              <Icon name="plus" size={13} /> New
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Firm</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.filter((inspection) => !inspection.archived).map((inspection) => (
                  <tr key={inspection.id}>
                    <td>{inspection.id}</td>
                    <td>{inspection.firm}</td>
                    <td>
                      <span className={badgeForClassification(inspection.classification)}>{inspection.classification}</span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-xs btn-secondary" onClick={() => openInspection(inspection)}>
                        <Icon name="eye" size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4">Real-Time Activity</h3>
          {realTimeUpdates.length ? (
            realTimeUpdates.map((update) => (
              <div key={update.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 8 }}>
                <div>{update.msg}</div>
                <div className="text-muted">{update.time}</div>
              </div>
            ))
          ) : (
            <p className="text-muted">Waiting for activity...</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderNewInspection = () => {
    const steps = ["Inspection Metadata", "Input Notes", "AI Generation", "Review & Generate"];
    return (
      <div>
        <div className="tabs">
          {steps.map((step, index) => (
            <Fragment key={step}>
              <button
                type="button"
                className={`tab ${newInspStep === index + 1 ? "active" : ""}`}
                disabled={newInspStep < index + 1}
                onClick={() => setNewInspStep(index + 1)}
              >
                {index + 1}. {step}
              </button>
            </Fragment>
          ))}
        </div>
        <div className="card">
          {newInspStep === 1 ? (
            <>
              <h3 className="mb-4">Inspection Metadata</h3>
              <div className="form-grid form-grid-2 mb-4">
                <div className="form-group">
                  <label htmlFor="insp-firm">Firm Name</label>
                  <input id="insp-firm" value={newInspData.firm} onChange={(event) => setNewInspData((prev) => ({ ...prev, firm: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="insp-fei">FEI Number</label>
                  <input id="insp-fei" value={newInspData.fei} onChange={(event) => setNewInspData((prev) => ({ ...prev, fei: event.target.value }))} />
                </div>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setNewInspStep(2)}>
                Next
              </button>
            </>
          ) : null}

          {newInspStep === 2 ? (
            <>
              <h3 className="mb-4">Input Notes & Evidence</h3>
              <div className="form-group mb-4">
                <label htmlFor="insp-notes">Investigator Notes</label>
                <textarea
                  id="insp-notes"
                  value={newInspData.notes}
                  onChange={(event) => setNewInspData((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNewInspStep(1)}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setNewInspStep(3)}>
                  Next
                </button>
              </div>
            </>
          ) : null}

          {newInspStep === 3 ? (
            <>
              <h3 className="mb-4">AI Generation</h3>
              {!loadingAI && !aiText ? (
                <button type="button" className="btn btn-primary" onClick={generateAI}>
                  <Icon name="ai" size={14} /> Generate FDA 483 Observations
                </button>
              ) : (
                <div className="card mb-4" aria-live="polite">
                  {aiText}
                </div>
              )}
              {generatedObs.length ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setNewInspStep(2)}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setNewInspStep(4)}>
                    Review
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {newInspStep === 4 ? (
            <>
              <h3 className="mb-4">Review & Generate</h3>
              <div className="card mb-4">
                <p className="text-muted">Firm: {newInspData.firm || "—"}</p>
                <p className="text-muted">FEI: {newInspData.fei || "—"}</p>
                <p className="text-muted">Generated observations: {generatedObs.length}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNewInspStep(3)}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={submitInspection}>
                  Generate & Save Inspection
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const renderObservations = () => (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Inspection ID</th>
              <th>Firm</th>
              <th>Investigator</th>
              <th>Classification</th>
              <th>Observations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection) => (
              <tr key={inspection.id}>
                <td>{inspection.id}</td>
                <td>{inspection.firm}</td>
                <td>{inspection.investigator}</td>
                <td>
                  <span className={badgeForClassification(inspection.classification)}>{inspection.classification}</span>
                </td>
                <td>{inspection.observations}</td>
                <td>
                  <button type="button" className="btn btn-xs btn-secondary" onClick={() => openInspection(inspection)}>
                    View
                  </button>
                  {!inspection.archived ? (
                    <button type="button" className="btn btn-xs btn-danger" onClick={() => openInspection(inspection, "archive_confirm")}>
                      Archive
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="grid-2">
      {inspections.flatMap((inspection) => inspection.documents.map((doc) => ({ ...doc, inspectionId: inspection.id }))).map((doc, index) => (
        <article key={`${doc.name}-${index}`} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div>{doc.name}</div>
              <div className="text-muted">
                {doc.inspectionId} • {doc.size} • {doc.date}
              </div>
            </div>
            <button type="button" className="btn btn-xs btn-secondary">
              <Icon name="download" size={11} /> Download
            </button>
          </div>
        </article>
      ))}
    </div>
  );

  const renderCfr = () => (
    <div>
      <div className="card mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Icon name="info" size={14} />
          <span className="text-muted">
            Data source: {TITLE_21_CFR.metadata.source} • Updated {TITLE_21_CFR.metadata.updated}
          </span>
          <a className="btn btn-xs btn-secondary ml-auto" href={TITLE_21_CFR.metadata.url} target="_blank" rel="noopener noreferrer">
            <Icon name="link" size={11} /> eCFR
          </a>
        </div>
      </div>
      <div className="form-group mb-4">
        <label htmlFor="cfr-search">Search CFR parts</label>
        <input id="cfr-search" value={cfrSearch} onChange={(event) => setCfrSearch(event.target.value)} />
      </div>
      <div className="grid-2">
        <div className="card">
          <h3 className="mb-4">Categories</h3>
          {cfrCategories.map((category) => (
            <button
              type="button"
              key={category}
              className={`tab ${cfrCategory === category ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
              onClick={() => setCfrCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div>
          {filteredCFR.length ? (
            filteredCFR.map((part) => (
              <article key={part.part} className="card mb-4">
                <div>{part.part}</div>
                <div className="text-muted">{part.title}</div>
              </article>
            ))
          ) : (
            <p className="text-muted">No CFR parts found.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderSignatures = () => (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Inspection</th>
              <th>Signed By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection) => (
              <tr key={inspection.id}>
                <td>{inspection.id}</td>
                <td>{inspection.investigator}</td>
                <td>
                  {inspection.hasSignature ? (
                    <span className="badge badge-verified">
                      <Icon name="check" size={10} /> Verified
                    </span>
                  ) : (
                    <span className="badge badge-pending">Awaiting</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderArchive = () => {
    const archived = inspections.filter((inspection) => inspection.archived);
    return (
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Firm</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archived.length ? (
                archived.map((inspection) => (
                  <tr key={inspection.id}>
                    <td>{inspection.id}</td>
                    <td>{inspection.firm}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-xs btn-secondary"
                        onClick={() =>
                          setInspections((prev) =>
                            prev.map((item) => (item.id === inspection.id ? { ...item, archived: false, status: "completed" } : item))
                          )
                        }
                      >
                        <Icon name="refresh" size={11} /> Restore
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No archived inspections
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="grid-2">
      <div className="card">
        <h3 className="mb-4">Profile Settings</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="set-name">Full Name</label>
            <input id="set-name" defaultValue={currentUser?.name || ""} />
          </div>
          <div className="form-group">
            <label htmlFor="set-email">Email</label>
            <input id="set-email" defaultValue={currentUser?.email || ""} />
          </div>
        </div>
      </div>
      <div className="card">
        <h3 className="mb-4">Security</h3>
        <button type="button" className="btn btn-danger btn-sm w-full" onClick={handleLogout}>
          <Icon name="logout" size={13} /> Sign Out
        </button>
      </div>
    </div>
  );

  const renderPage = () => {
    if (appPage === "dashboard") return renderDashboard();
    if (appPage === "new_inspection") return renderNewInspection();
    if (appPage === "observations") return renderObservations();
    if (appPage === "documents") return renderDocuments();
    if (appPage === "cfr") return renderCfr();
    if (appPage === "signatures") return renderSignatures();
    if (appPage === "archive") return renderArchive();
    return renderSettings();
  };

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-logo">
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, var(--teal), var(--blue))", display: "grid", placeItems: "center", fontWeight: 700 }}>
            SI
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Smart Inspections</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              AI-Assisted FDA 483
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navWithBadge.map((item) => (
            <button key={item.id} type="button" className={`nav-item ${appPage === item.id ? "active" : ""}`} onClick={() => setAppPage(item.id)}>
              <Icon name={item.icon} size={16} />
              {item.label}
              {item.badge ? <span className="badge badge-pending ml-auto">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>{pageTitles[appPage]}</strong>
          </div>
          <div className="topbar-actions">
            <div style={{ position: "relative" }} ref={notifRef}>
              <button type="button" className="icon-btn" aria-label="Toggle notifications" onClick={() => setNotifOpen((prev) => !prev)}>
                <Icon name="bell" size={16} />
              </button>
              {notifOpen ? (
                <div className="notif-panel" role="region" aria-label="Notifications panel">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="notif-item"
                      style={{ width: "100%", textAlign: "left", background: notification.read ? "transparent" : "rgba(13,217,196,0.03)", border: "none" }}
                      onClick={() => markNotifRead(notification.id)}
                    >
                      <Icon name={notification.type === "alert" ? "warn" : notification.type === "success" ? "check" : "info"} size={14} />
                      <div>
                        <div>{notification.message}</div>
                        <div className="text-muted">{notification.time}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleLogout} aria-label="Sign out">
              <Icon name="logout" size={13} />
            </button>
          </div>
        </header>

        <section className="page">{renderPage()}</section>
      </main>

      {activeModal === "inspection" ? (
        <InspectionModal inspection={selectedInspection} onClose={() => setActiveModal(null)} onArchive={(id) => openInspection(inspections.find((item) => item.id === id), "archive_confirm")} />
      ) : null}
      {activeModal === "archive_confirm" ? (
        <ArchiveConfirmModal inspection={selectedInspection} onCancel={() => setActiveModal(null)} onConfirm={archiveInspection} />
      ) : null}
    </div>
  );
}
