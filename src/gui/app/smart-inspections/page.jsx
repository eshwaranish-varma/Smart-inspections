"use client";

import { useEffect, useRef, useState } from "react";
import AuthView from "@/components/smart-inspections/AuthView";
import LandingView from "@/components/smart-inspections/LandingView";
import MainAppView from "@/components/smart-inspections/MainAppView";
import { defaultInspectionForm, mockDB } from "@/components/smart-inspections/constants";
import "@/components/smart-inspections/smart-inspections.css";

export default function SmartInspectionsPage() {
  const [view, setView] = useState("landing"); // landing | auth | app
  const [authMode, setAuthMode] = useState("login");
  const [appPage, setAppPage] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null);
  const [verifyStep, setVerifyStep] = useState(null); // null | email | phone | done
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [authError, setAuthError] = useState("");

  const [notifications, setNotifications] = useState(mockDB.notifications);
  const [inspections, setInspections] = useState(mockDB.inspections);
  const [notifOpen, setNotifOpen] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);

  const [newInspStep, setNewInspStep] = useState(1);
  const [newInspData, setNewInspData] = useState(defaultInspectionForm);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiText, setAiText] = useState("");
  const [generatedObs, setGeneratedObs] = useState([]);
  const [cfrSearch, setCfrSearch] = useState("");
  const [cfrCategory, setCfrCategory] = useState("All");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", phone: "", password: "", role: "" });
  const aiTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (aiTimerRef.current) {
        clearInterval(aiTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const events = [
      "User login detected: investigator@fda.gov",
      "New inspection submitted: INS-2025-0042",
      "Signature verified: INS-2025-0041",
      "CFR lookup: 21 CFR 211.113",
      "Document downloaded: FDA-483 INS-2025-0038",
    ];
    let index = 0;
    const intervalId = setInterval(() => {
      if (!currentUser) return;
      setRealTimeUpdates((prev) => [
        { id: Date.now(), msg: events[index % events.length], time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4),
      ]);
      index += 1;
    }, 8000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  const handleLogin = () => {
    setAuthError("");
    const normalizedEmail = loginForm.email.trim().toLowerCase();
    const user = mockDB.users.find((item) => item.email.toLowerCase() === normalizedEmail);

    // Security fix: avoid silent fallback login to first account.
    if (!user) {
      setAuthError("Account not found. Use a listed FDA demo email.");
      return;
    }

    if (!loginForm.password.trim()) {
      setAuthError("Password is required.");
      return;
    }

    setCurrentUser(user);
    setVerifyStep("email");
  };

  const handleSignup = () => {
    setAuthError("");
    if (!signupForm.email || !signupForm.password || !signupForm.name) {
      setAuthError("Complete required fields before continuing.");
      return;
    }
    setVerifyStep("phone");
  };

  const handleVerify = () => {
    if (otp.some((digit) => !digit)) {
      setAuthError("Please enter all 6 digits.");
      return;
    }
    setAuthError("");
    setVerifyStep("done");
    setTimeout(() => {
      setVerifyStep(null);
      setView("app");
    }, 600);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView("landing");
    setAppPage("dashboard");
    setNotifOpen(false);
    setOtp(["", "", "", "", "", ""]);
    setAuthError("");
  };

  const markNotifRead = (id) => {
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
  };

  const generateAI = () => {
    setLoadingAI(true);
    setAiText("");
    setGeneratedObs([]);

    const observations = [
      {
        id: 1,
        cfr: "21 CFR 211.113(b)",
        text: "Procedures designed to prevent microbiological contamination of sterile products were not established.",
        evidence: "EM Log #2025-001",
        status: "pending",
      },
      {
        id: 2,
        cfr: "21 CFR 211.192",
        text: "Production and control records were not reviewed and approved by the quality control unit.",
        evidence: "Batch Record BR-2025-018",
        status: "pending",
      },
    ];

    const fullText = [
      "Observation 1:",
      "",
      "Procedures designed to prevent microbiological contamination of sterile products were not established, as required by 21 CFR 211.113(b).",
      "",
      "Evidence: EM Log #2025-001",
      "",
      "CFR Validated | Evidence Traced",
    ].join("\n");

    let index = 0;
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
    }
    aiTimerRef.current = setInterval(() => {
      setAiText(fullText.slice(0, index));
      index += 3;
      if (index >= fullText.length) {
        clearInterval(aiTimerRef.current);
        aiTimerRef.current = null;
        setLoadingAI(false);
        setGeneratedObs(observations);
      }
    }, 30);
  };

  const submitInspection = () => {
    const id = `INS-2025-${String(inspections.length + 40).padStart(4, "0")}`;
    const record = {
      id,
      firm: newInspData.firm || "New Facility",
      fei: newInspData.fei || "0000000",
      address: newInspData.address || "",
      status: "in_progress",
      classification: "VAI",
      startDate: newInspData.startDate || new Date().toISOString().slice(0, 10),
      endDate: null,
      investigator: currentUser?.name || "Investigator",
      observations: generatedObs.length,
      hasSignature: false,
      archived: false,
      documents: [],
      observationList: generatedObs,
    };

    setInspections((prev) => [record, ...prev]);
    setAppPage("observations");
    setNewInspStep(1);
    setNewInspData(defaultInspectionForm);
    setAiText("");
    setGeneratedObs([]);
  };

  return (
    <div className="si-root">
      {view === "landing" ? <LandingView onLogin={() => { setAuthMode("login"); setView("auth"); }} onSignup={() => { setAuthMode("signup"); setView("auth"); }} /> : null}

      {view === "auth" ? (
        <AuthView
          authMode={authMode}
          setAuthMode={setAuthMode}
          verifyStep={verifyStep}
          otp={otp}
          setOtp={setOtp}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          signupForm={signupForm}
          setSignupForm={setSignupForm}
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          handleVerify={handleVerify}
          authError={authError}
        />
      ) : null}

      {view === "app" ? (
        <MainAppView
          currentUser={currentUser}
          inspections={inspections}
          setInspections={setInspections}
          appPage={appPage}
          setAppPage={setAppPage}
          notifications={notifications}
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          markNotifRead={markNotifRead}
          handleLogout={handleLogout}
          realTimeUpdates={realTimeUpdates}
          newInspStep={newInspStep}
          setNewInspStep={setNewInspStep}
          newInspData={newInspData}
          setNewInspData={setNewInspData}
          loadingAI={loadingAI}
          aiText={aiText}
          generatedObs={generatedObs}
          generateAI={generateAI}
          cfrSearch={cfrSearch}
          setCfrSearch={setCfrSearch}
          cfrCategory={cfrCategory}
          setCfrCategory={setCfrCategory}
          submitInspection={submitInspection}
        />
      ) : null}
    </div>
  );
}
