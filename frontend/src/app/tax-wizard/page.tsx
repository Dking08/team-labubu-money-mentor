"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import { callAgent } from "@/lib/api";

export default function TaxWizardPage() {
  const [result, setResult] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    income: 1500000, ppf: 300000, elss: 200000,
    nps: 0, health_insurance: 25000, rent: 240000,
    home_loan: 0, epf: 150000,
  });

  const runTax = async () => {
    setLoading(true);
    try {
      const res = await callAgent("tax-wizard", `Optimize taxes for income ₹${form.income} with PPF ₹${form.ppf}, ELSS ₹${form.elss}`);
      setResult(res.data);
      setAdvice(res.response_text);
    } catch {
      // Local fallback
      const income = form.income;
      const newTaxable = income - 75000;
      let newTax = 0;
      const newSlabs = [[300000,0],[700000,0.05],[1000000,0.10],[1200000,0.15],[1500000,0.20],[Infinity,0.30]];
      let prev = 0;
      for (const [limit, rate] of newSlabs) {
        const t = Math.min(newTaxable, limit) - prev;
        if (t > 0) newTax += t * rate;
        prev = limit;
        if (newTaxable <= limit) break;
      }
      if (newTaxable <= 700000) newTax = Math.max(0, newTax - 25000);
      newTax *= 1.04;

      const sec80c = Math.min(form.ppf + form.elss + form.epf, 150000);
      const oldDeductions = 50000 + sec80c + Math.min(form.nps, 50000) + Math.min(form.health_insurance, 25000);
      const oldTaxable = Math.max(0, income - oldDeductions);
      let oldTax = 0;
      const oldSlabs = [[250000,0],[500000,0.05],[1000000,0.20],[Infinity,0.30]];
      prev = 0;
      for (const [limit, rate] of oldSlabs) {
        const t = Math.min(oldTaxable, limit) - prev;
        if (t > 0) oldTax += t * rate;
        prev = limit;
        if (oldTaxable <= limit) break;
      }
      if (oldTaxable <= 500000) oldTax = Math.max(0, oldTax - 12500);
      oldTax *= 1.04;

      setResult({
        comparison: {
          old_regime: { tax: Math.round(oldTax), taxable_income: oldTaxable, total_deductions: oldDeductions },
          new_regime: { tax: Math.round(newTax), taxable_income: newTaxable, total_deductions: 75000 },
          recommended: oldTax < newTax ? "old" : "new",
          savings: Math.abs(Math.round(oldTax - newTax)),
        },
        missed_deductions: form.nps === 0
          ? [{ section: "80CCD(1B)", max_benefit: 50000, suggestion: "Invest ₹50,000 in NPS" }]
          : [],
      });
      setAdvice("Connect backend on port 8000 for personalized AI recommendations.");
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
          <h1>🧾 Tax Wizard</h1>
          <p>Old vs New regime comparison with missed deduction detection</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>Salary & Deductions</h3>
            {[
              { label: "Gross Annual Income", key: "income" },
              { label: "PPF Contribution", key: "ppf" },
              { label: "ELSS Investment", key: "elss" },
              { label: "EPF (Employer)", key: "epf" },
              { label: "NPS (80CCD)", key: "nps" },
              { label: "Health Insurance Premium", key: "health_insurance" },
              { label: "Annual Rent Paid", key: "rent" },
              { label: "Home Loan Interest", key: "home_loan" },
            ].map(({ label, key }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label} (₹)</label>
                <input className="form-input" type="number" value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: +e.target.value })} />
              </div>
            ))}
            <button className="btn-gradient" onClick={runTax} disabled={loading} style={{ width: "100%" }}>
              {loading ? "🧠 Calculating..." : "Compare Regimes →"}
            </button>
          </div>

          {result && (
            <div>
              {/* Regime Comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {["old", "new"].map((regime) => {
                  const data = result.comparison?.[`${regime}_regime`];
                  const isRecommended = result.comparison?.recommended === regime;
                  return (
                    <div className="glass-card" key={regime} style={{
                      border: isRecommended ? "1px solid rgba(16,185,129,0.4)" : undefined,
                      position: "relative",
                    }}>
                      {isRecommended && (
                        <div style={{
                          position: "absolute", top: -10, right: 16, padding: "2px 12px",
                          background: "var(--gradient-green)", borderRadius: "var(--radius-full)",
                          fontSize: 11, fontWeight: 700, color: "white",
                        }}>✓ RECOMMENDED</div>
                      )}
                      <h3 style={{ fontSize: 18, marginBottom: 16, color: "var(--text-primary)", textTransform: "capitalize" }}>
                        {regime === "old" ? "🏛️" : "🆕"} {regime} Regime
                      </h3>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tax Payable</div>
                        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 700, color: isRecommended ? "#34d399" : "#f87171" }}>
                          {formatINR(data?.tax || 0)}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        <div>Taxable Income: {formatINR(data?.taxable_income || 0)}</div>
                        <div>Total Deductions: {formatINR(data?.total_deductions || 0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Savings */}
              <div className="glass-card stat-card" style={{ marginTop: 16, textAlign: "center" }}>
                <div className="stat-label">💰 Your Tax Savings by choosing {result.comparison?.recommended} regime</div>
                <div className="stat-value">{formatINR(result.comparison?.savings || 0)}</div>
              </div>

              {/* Missed Deductions */}
              {result.missed_deductions?.length > 0 && (
                <div className="glass-card" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: "#fbbf24" }}>⚠️ Missed Deductions</h3>
                  {result.missed_deductions.map((d: any, i: number) => (
                    <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong style={{ color: "var(--text-primary)" }}>Section {d.section}</strong>
                        <span style={{ color: "#34d399", fontWeight: 600 }}>Save up to {formatINR(d.max_benefit)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{d.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}

              {advice && (
                <div className="glass-card" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>🤖 AI Tax Strategy</h3>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{advice}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
