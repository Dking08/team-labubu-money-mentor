"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import { callAgent } from "@/lib/api";

export default function MfXrayPage() {
  const [result, setResult] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);

  const MOCK_HOLDINGS = [
    { name: "HDFC Mid-Cap Opportunities", cat: "Mid Cap", invested: 123442, current: 148200, xirr: 15.2, er: 1.68 },
    { name: "Parag Parikh Flexi Cap", cat: "Flexi Cap", invested: 120000, current: 142905, xirr: 18.5, er: 0.63 },
    { name: "SBI Small Cap", cat: "Small Cap", invested: 54000, current: 64035, xirr: 22.1, er: 1.72 },
    { name: "Axis Bluechip", cat: "Large Cap", invested: 9000, current: 9504, xirr: 8.3, er: 1.45 },
  ];

  const runXray = async () => {
    setLoading(true);
    try {
      const res = await callAgent("mf-xray", "Analyze my mutual fund portfolio");
      setResult(res.data);
      setAdvice(res.response_text);
    } catch {
      const total = MOCK_HOLDINGS.reduce((a, h) => a + h.current, 0);
      setResult({
        holdings: MOCK_HOLDINGS,
        overlap: { total_unique_stocks: 18, overlapping_stocks: 3, overlap_percentage: 16.7, risk_level: "MODERATE" },
        expense_ratio: { weighted_expense_ratio: 1.29, annual_cost: 4695, total_cost_over_years: 82546, years: 10 },
        allocation: { total_value: total },
      });
      setAdvice("Connect backend on port 8000 for AI-powered analysis.");
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const total = MOCK_HOLDINGS.reduce((a, h) => a + h.current, 0);
  const totalInvested = MOCK_HOLDINGS.reduce((a, h) => a + h.invested, 0);

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>🔬 MF Portfolio X-Ray</h1>
          <p>Complete portfolio analysis with overlap detection and rebalancing</p>
        </div>

        {!result ? (
          <div className="glass-card" style={{ maxWidth: 500, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: "var(--text-primary)" }}>Upload your CAMS/KFintech Statement</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>Or use mock data for demo</p>
            <button className="btn-gradient" onClick={runXray} disabled={loading} style={{ width: "100%" }}>
              {loading ? "🧠 Analyzing..." : "Analyze Mock Portfolio →"}
            </button>
          </div>
        ) : (
          <>
            {/* Portfolio Summary */}
            <div className="dashboard-grid">
              <div className="glass-card stat-card">
                <div className="stat-label">Total Value</div>
                <div className="stat-value">{formatINR(total)}</div>
                <div className="stat-change positive">+{formatINR(total - totalInvested)} ({((total-totalInvested)/totalInvested*100).toFixed(1)}%)</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-label">Stock Overlap</div>
                <div className="stat-value" style={{
                  background: result.overlap?.risk_level === "HIGH" ? "linear-gradient(135deg,#ef4444,#f87171)" :
                    result.overlap?.risk_level === "MODERATE" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "var(--gradient-green)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>{result.overlap?.overlap_percentage}%</div>
                <div className="stat-change" style={{ color: result.overlap?.risk_level === "LOW" ? "#34d399" : "#fbbf24" }}>
                  {result.overlap?.risk_level} risk
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-label">Expense Ratio Drag (10yr)</div>
                <div className="stat-value" style={{ background: "linear-gradient(135deg,#ef4444,#f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {formatINR(result.expense_ratio?.total_cost_over_years || 0)}
                </div>
                <div className="stat-change negative">Weighted ER: {result.expense_ratio?.weighted_expense_ratio}%</div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card" style={{ marginTop: 24, overflowX: "auto" }}>
              <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>📋 Holdings</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-medium)" }}>
                    {["Fund", "Category", "Invested", "Current", "XIRR", "Exp. Ratio"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HOLDINGS.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "12px", fontWeight: 500, color: "var(--text-primary)" }}>{h.name}</td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{h.cat}</td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{formatINR(h.invested)}</td>
                      <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{formatINR(h.current)}</td>
                      <td style={{ padding: "12px", color: h.xirr > 12 ? "#34d399" : "#fbbf24", fontWeight: 600 }}>{h.xirr}%</td>
                      <td style={{ padding: "12px", color: h.er > 1.5 ? "#f87171" : "#34d399" }}>{h.er}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {advice && (
              <div className="glass-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>🤖 AI Rebalancing Plan</h3>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{advice}</div>
              </div>
            )}
          </>
        )}
      </main>
      <ChatPanel />
    </div>
  );
}
