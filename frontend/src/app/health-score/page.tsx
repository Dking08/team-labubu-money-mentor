"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import { callAgent } from "@/lib/api";

export default function HealthScorePage() {
  const [scores, setScores] = useState<any>(null);
  const [aiAdvice, setAiAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0=form, 1=result

  const [formData, setFormData] = useState({
    age: 28, income: 1500000, expenses: 45000,
    emergency_fund: 200000, has_term_life: false,
    health_insurance: 500000, investments: 1250000,
    loans_emi: 8000, uses_80c: true, has_nps: false,
  });

  const runCheck = async () => {
    setLoading(true);
    try {
      const result = await callAgent("health-score", `Assess financial health for a ${formData.age} year old earning ₹${formData.income}`);
      setScores(result.data);
      setAiAdvice(result.response_text);
      setStep(1);
    } catch {
      setScores({
        overall_score: 62,
        dimensions: {
          emergency: { score: 37, status: "Needs Work" },
          insurance: { score: 25, status: "Critical" },
          investment: { score: 70, status: "Good" },
          debt: { score: 80, status: "Excellent" },
          tax: { score: 58, status: "Needs Work" },
          retirement: { score: 15, status: "Critical" },
        },
      });
      setAiAdvice("Connect the backend (port 8000) for personalized AI advice.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const dimensions = [
    { key: "emergency", icon: "🛡️", label: "Emergency Preparedness", color: "#f59e0b" },
    { key: "insurance", icon: "🏥", label: "Insurance Coverage", color: "#ef4444" },
    { key: "investment", icon: "📈", label: "Investment Diversification", color: "#06b6d4" },
    { key: "debt", icon: "💳", label: "Debt Health", color: "#10b981" },
    { key: "tax", icon: "🧾", label: "Tax Efficiency", color: "#8b5cf6" },
    { key: "retirement", icon: "🏖️", label: "Retirement Readiness", color: "#ec4899" },
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
              <stop offset="0%" stopColor="#06b6d4" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#sg)" strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: size*0.25, fontWeight: 700,
            background: "linear-gradient(135deg,#06b6d4,#8b5cf6,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{score}</span>
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
          <h1>💯 Money Health Score</h1>
          <p>5-minute financial wellness check across 6 dimensions</p>
        </div>

        {step === 0 ? (
          <div className="glass-card" style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 18, marginBottom: 24, color: "var(--text-primary)" }}>Quick Financial Check</h3>
            <div className="form-group"><label className="form-label">Age</label><input className="form-input" type="number" value={formData.age} onChange={e => setFormData({...formData, age: +e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Annual Income (₹)</label><input className="form-input" type="number" value={formData.income} onChange={e => setFormData({...formData, income: +e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Monthly Expenses (₹)</label><input className="form-input" type="number" value={formData.expenses} onChange={e => setFormData({...formData, expenses: +e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Emergency Fund (₹)</label><input className="form-input" type="number" value={formData.emergency_fund} onChange={e => setFormData({...formData, emergency_fund: +e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Total Investments (₹)</label><input className="form-input" type="number" value={formData.investments} onChange={e => setFormData({...formData, investments: +e.target.value})} /></div>
            <button className="btn-gradient" onClick={runCheck} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
              {loading ? "🧠 Analyzing..." : "Get My Health Score →"}
            </button>
          </div>
        ) : (
          <>
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
                    <div className="dimension-icon" style={{ background: `${dim.color}22`, color: dim.color }}>{dim.icon}</div>
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
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>🤖 AI Recommendations</h3>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{aiAdvice}</div>
              </div>
            )}
            <button className="btn-ghost" onClick={() => setStep(0)} style={{ marginTop: 16 }}>← Retake Assessment</button>
          </>
        )}
      </main>
      <ChatPanel />
    </div>
  );
}
