"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import AIResponse from "@/components/AIResponse";
import FileUpload from "@/components/FileUpload";
import { useFinancialProfile } from "@/components/ProfileProvider";
import { callAgent } from "@/lib/api";
import { getNetWorth, type FinancialProfile } from "@/lib/financial-profile";

function buildHealthForm(profile: FinancialProfile) {
  return {
    age: profile.age,
    income: profile.annual_income,
    expenses: profile.monthly_expenses,
    emergency_fund: profile.emergency_fund,
    has_term_life: Boolean(profile.insurance?.term_life),
    health_insurance: profile.insurance?.health || 0,
    investments: getNetWorth(profile),
    loans_emi: (profile.loans || []).reduce((sum, loan) => sum + (loan.emi || 0), 0),
    uses_80c: Boolean((profile.investments?.ppf || 0) + (profile.investments?.elss || 0) + (profile.investments?.epf || 0)),
    has_nps: Boolean(profile.investments?.nps),
  };
}

function buildHealthUserData(profile: FinancialProfile, formData: {
  age: number;
  income: number;
  expenses: number;
  emergency_fund: number;
  has_term_life: boolean;
  health_insurance: number;
  investments: number;
  loans_emi: number;
  uses_80c: boolean;
  has_nps: boolean;
}) {
  return {
    ...profile,
    age: formData.age,
    annual_income: formData.income,
    monthly_expenses: formData.expenses,
    emergency_fund: formData.emergency_fund,
    investments: {
      total_portfolio: formData.investments,
      ppf: formData.uses_80c ? 150000 : 0,
      nps: formData.has_nps ? 50000 : 0,
    },
    insurance: {
      ...profile.insurance,
      term_life: formData.has_term_life ? Math.max(formData.income * 10, 10000000) : 0,
      health: formData.health_insurance,
    },
    loans: formData.loans_emi
      ? [{ loan_type: "existing", outstanding: 0, emi: formData.loans_emi, rate: 0, remaining_months: 0 }]
      : [],
  };
}

function getStatus(score: number) {
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

function buildLocalHealthResult(formData: {
  age: number;
  income: number;
  expenses: number;
  emergency_fund: number;
  has_term_life: boolean;
  health_insurance: number;
  investments: number;
  loans_emi: number;
  uses_80c: boolean;
  has_nps: boolean;
}) {
  const emergencyMonths = formData.expenses ? formData.emergency_fund / formData.expenses : 0;
  const emergency = Math.round(Math.min(100, (emergencyMonths / 6) * 100));
  const insurance = Math.round(
    Math.min(
      100,
      (formData.has_term_life ? 55 : 10) +
        Math.min(45, (formData.health_insurance / 500000) * 45)
    )
  );
  const investment = Math.round(Math.min(100, (formData.investments / Math.max(formData.income, 1)) * 55 + 25));
  const debt = Math.round(Math.max(0, 100 - (formData.loans_emi / Math.max(formData.income / 12, 1)) * 120));
  const tax = Math.round((formData.uses_80c ? 55 : 25) + (formData.has_nps ? 20 : 0));
  const retirement = Math.round(Math.min(100, (formData.investments / Math.max(formData.income * 5, 1)) * 100));
  const overall = Math.round((emergency + insurance + investment + debt + tax + retirement) / 6);

  return {
    overall_score: overall,
    dimensions: {
      emergency: { score: emergency, status: getStatus(emergency) },
      insurance: { score: insurance, status: getStatus(insurance) },
      investment: { score: investment, status: getStatus(investment) },
      debt: { score: debt, status: getStatus(debt) },
      tax: { score: tax, status: getStatus(tax) },
      retirement: { score: retirement, status: getStatus(retirement) },
    },
  };
}

export default function HealthScorePage() {
  const { profile } = useFinancialProfile();
  const [scores, setScores] = useState<any>(null);
  const [aiAdvice, setAiAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [formData, setFormData] = useState(buildHealthForm(profile));
  const hydratedKeyRef = useRef("");

  const profileDerivedForm = buildHealthForm(profile);

  const runCheck = async (activeForm = formData, auto = false) => {
    setLoading(true);
    try {
      const result = await callAgent(
        "health-score",
        `Assess financial health for a ${activeForm.age} year old earning Rs ${activeForm.income}`,
        buildHealthUserData(profile, activeForm)
      );
      setScores(result.data);
      setAiAdvice(result.response_text);
    } catch {
      setScores(buildLocalHealthResult(activeForm));
      setAiAdvice(
        auto
          ? "Loaded a health snapshot from your saved profile. Backend AI can deepen the recommendations when connected."
          : "Updated your health score using the values you edited."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextKey = JSON.stringify(profileDerivedForm);
    if (hydratedKeyRef.current === nextKey) return;
    hydratedKeyRef.current = nextKey;
    setFormData(profileDerivedForm);
    void runCheck(profileDerivedForm, true);
  }, [profile.name, profile.age, profile.annual_income, profile.monthly_expenses, profile.emergency_fund]);

  const dimensions = [
    { key: "emergency", label: "Emergency Preparedness", color: "#f59e0b" },
    { key: "insurance", label: "Insurance Coverage", color: "#ef4444" },
    { key: "investment", label: "Investment Diversification", color: "#3b82f6" },
    { key: "debt", label: "Debt Health", color: "#10b981" },
    { key: "tax", label: "Tax Efficiency", color: "#a855f7" },
    { key: "retirement", label: "Retirement Readiness", color: "#f97316" },
  ];

  const ScoreRing = ({ score, size = 180 }: { score: number; size?: number }) => {
    const r = (size - 16) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    return (
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#sg)" strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: size*0.25, fontWeight: 700,
            background: "linear-gradient(135deg,#fbbf24,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{score}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>out of 100</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>Money Health Score</h1>
          <p>5-minute financial wellness check across 6 dimensions</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Loaded From Your Profile</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              This check is already personalized using your saved financial data.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {[
                ["Age", formData.age],
                ["Annual Income", `Rs ${formData.income.toLocaleString("en-IN")}`],
                ["Monthly Expenses", `Rs ${formData.expenses.toLocaleString("en-IN")}`],
                ["Emergency Fund", `Rs ${formData.emergency_fund.toLocaleString("en-IN")}`],
                ["Total Assets", `Rs ${formData.investments.toLocaleString("en-IN")}`],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => setShowInputs((prev) => !prev)} style={{ width: "100%", marginBottom: showInputs ? 16 : 0 }}>
              {showInputs ? "Hide Manual Adjustments" : "Adjust Inputs"}
            </button>
            {showInputs && (
              <>
                <div className="form-group"><label className="form-label">Age</label><input className="form-input" type="number" value={formData.age} onChange={e => setFormData({...formData, age: +e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Annual Income (Rs)</label><input className="form-input" type="number" value={formData.income} onChange={e => setFormData({...formData, income: +e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Monthly Expenses (Rs)</label><input className="form-input" type="number" value={formData.expenses} onChange={e => setFormData({...formData, expenses: +e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Emergency Fund (Rs)</label><input className="form-input" type="number" value={formData.emergency_fund} onChange={e => setFormData({...formData, emergency_fund: +e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Total Investments (Rs)</label><input className="form-input" type="number" value={formData.investments} onChange={e => setFormData({...formData, investments: +e.target.value})} /></div>
                <button className="btn-gradient" onClick={() => runCheck()} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                  {loading ? "Analyzing..." : "Recalculate With AI"}
                </button>
              </>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div className="glass-card" style={{ textAlign: "center", padding: 40 }}>
                <h3 style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 16 }}>Your Overall Score</h3>
                <ScoreRing score={scores?.overall_score || 62} />
              </div>
            </div>
            <div className="dimension-grid">
              {dimensions.map((dim) => {
                const d = scores?.dimensions?.[dim.key] || { score: 50, status: "Good" };
                return (
                  <div className="glass-card dimension-card" key={dim.key}>
                    <div className="dimension-icon" style={{ background: `${dim.color}22`, color: dim.color }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div className="dimension-info">
                      <div className="dimension-name">{dim.label}</div>
                      <div className={`dimension-status ${d.status?.toLowerCase().replace(" ", "-")}`}>{d.status}</div>
                    </div>
                    <div className="dimension-score">{d.score}</div>
                  </div>
                );
              })}
            </div>
            {aiAdvice && (
              <div className="glass-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>AI Recommendations</h3>
                <AIResponse text={aiAdvice} />
              </div>
            )}
            <div className="glass-card" style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Upload Insurance / Health Documents</h3>
              <FileUpload agentHint="health-score" compact />
            </div>
          </div>
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
