"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import { callAgent } from "@/lib/api";

export default function CouplePlannerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const partner1 = { name: "Rahul", income: 1500000, investments: 1250000 };
  const partner2 = { name: "Priya", income: 1200000, investments: 450000 };
  const combined = partner1.income + partner2.income;
  const combinedInv = partner1.investments + partner2.investments;

  const runPlan = async () => {
    setLoading(true);
    try {
      const res = await callAgent("couple-planner", "Joint financial plan for me and my partner");
      setResult(res);
    } catch {
      setResult({
        response_text: "Connect backend on port 8000 for AI couple planning. The AI will optimize HRA claims, NPS splits, SIP allocation, and insurance across both partners.",
        data: { combined_income: combined, combined_investments: combinedInv },
      });
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>👫 Couple&apos;s Money Planner</h1>
          <p>India&apos;s first AI-powered joint financial planning tool</p>
        </div>

        <div className="dashboard-grid" style={{ marginTop: 0 }}>
          {[
            { emoji: "👤", ...partner1 },
            { emoji: "👤", ...partner2 },
          ].map((p) => (
            <div className="glass-card" key={p.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{p.emoji}</div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Partner</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Income: <strong style={{ color: "var(--text-primary)" }}>{formatINR(p.income)}/yr</strong></div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Investments: <strong style={{ color: "var(--text-primary)" }}>{formatINR(p.investments)}</strong></div>
            </div>
          ))}
          <div className="glass-card stat-card" style={{ background: "var(--gradient-card)" }}>
            <div className="stat-label">Combined Net Worth</div>
            <div className="stat-value">{formatINR(combinedInv)}</div>
            <div className="stat-change positive">Combined Income: {formatINR(combined)}/yr</div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button className="btn-gradient" onClick={runPlan} disabled={loading} style={{ padding: "14px 40px", fontSize: 16 }}>
            {loading ? "🧠 Optimizing..." : "Generate Joint Plan →"}
          </button>
        </div>

        {result && (
          <div className="glass-card" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>🤖 AI Joint Optimization Plan</h3>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {result.response_text}
            </div>
          </div>
        )}
      </main>
      <ChatPanel />
    </div>
  );
}
