"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import { callAgent } from "@/lib/api";

export default function FirePlannerPage() {
  const [result, setResult] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    age: 28, retire_age: 45, income: 1500000,
    expenses: 540000, savings: 1250000, monthly_invest: 51000,
  });

  const runPlan = async () => {
    setLoading(true);
    try {
      const res = await callAgent("fire", `FIRE plan: age ${form.age}, retire ${form.retire_age}, income ₹${form.income}, expenses ₹${form.expenses}, savings ₹${form.savings}`);
      setResult(res.data);
      setAdvice(res.response_text);
    } catch {
      // Fallback with local calc
      const fn = form.expenses * 25;
      const r = 0.12 / 12;
      let months = 0;
      let corpus = form.savings;
      while (corpus < fn && months < 1200) {
        corpus = corpus * (1 + r) + form.monthly_invest;
        months++;
      }
      setResult({
        roadmap: {
          fire_number: fn, lean_fire: fn * 0.7, fat_fire: fn * 1.5,
          years_to_fire: (months / 12).toFixed(1), fire_age: form.age + months / 12,
          savings_rate: ((form.income - form.expenses) / form.income * 100).toFixed(1),
          milestones: Array.from({ length: Math.min(Math.ceil(months / 12), 20) }, (_, i) => ({
            year: i + 1, age: form.age + i + 1,
            corpus: Math.round(form.savings * Math.pow(1.12, i + 1) + form.monthly_invest * 12 * ((Math.pow(1 + 0.12 / 12, (i + 1) * 12) - 1) / (0.12 / 12))),
            progress_pct: Math.min(100, (form.savings * Math.pow(1.12, i + 1)) / fn * 100).toFixed(1),
          })),
        },
      });
      setAdvice("Connect backend on port 8000 for personalized AI advice.");
    } finally {
      setLoading(false);
    }
  };

  const formatLakh = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : `₹${(n / 100000).toFixed(1)}L`;

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>🔥 FIRE Path Planner</h1>
          <p>Your roadmap to Financial Independence, Retire Early</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          {/* Form */}
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>Your Details</h3>
            {[
              { label: "Current Age", key: "age", min: 18, max: 65 },
              { label: "Target Retirement Age", key: "retire_age", min: 30, max: 70 },
              { label: "Annual Income (₹)", key: "income" },
              { label: "Annual Expenses (₹)", key: "expenses" },
              { label: "Current Savings (₹)", key: "savings" },
              { label: "Monthly Investment (₹)", key: "monthly_invest" },
            ].map(({ label, key, min, max }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" value={(form as any)[key]}
                  min={min} max={max}
                  onChange={(e) => setForm({ ...form, [key]: +e.target.value })} />
              </div>
            ))}
            <button className="btn-gradient" onClick={runPlan} disabled={loading} style={{ width: "100%" }}>
              {loading ? "🧠 Calculating..." : "Generate FIRE Plan →"}
            </button>
          </div>

          {/* Results */}
          <div>
            {result && (
              <>
                {/* FIRE Numbers */}
                <div className="dashboard-grid" style={{ marginTop: 0 }}>
                  {[
                    { label: "🔥 FIRE Number", value: result.roadmap?.fire_number },
                    { label: "🏖️ Lean FIRE", value: result.roadmap?.lean_fire },
                    { label: "💎 Fat FIRE", value: result.roadmap?.fat_fire },
                  ].map((s) => (
                    <div className="glass-card stat-card" key={s.label}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{formatLakh(s.value || 0)}</div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-grid" style={{ marginTop: 16 }}>
                  <div className="glass-card stat-card">
                    <div className="stat-label">⏱️ Years to FIRE</div>
                    <div className="stat-value">{result.roadmap?.years_to_fire} yrs</div>
                    <div className="stat-change positive">FIRE Age: {Math.round(result.roadmap?.fire_age || 0)}</div>
                  </div>
                  <div className="glass-card stat-card">
                    <div className="stat-label">💰 Savings Rate</div>
                    <div className="stat-value">{result.roadmap?.savings_rate}%</div>
                    <div className="stat-change positive">Excellent!</div>
                  </div>
                </div>

                {/* Timeline */}
                {result.roadmap?.milestones && (
                  <div className="glass-card" style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>📅 FIRE Timeline</h3>
                    <div style={{ maxHeight: 300, overflowY: "auto" }}>
                      {result.roadmap.milestones.slice(0, 15).map((m: any) => (
                        <div key={m.year} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                          <div style={{ width: 40, textAlign: "center", fontWeight: 700, color: "var(--text-accent)", fontFamily: "'Space Grotesk'" }}>
                            {m.age}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="goal-bar">
                              <div className="goal-bar-fill" style={{ width: `${Math.min(100, m.progress_pct)}%` }} />
                            </div>
                          </div>
                          <div style={{ minWidth: 80, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {formatLakh(m.corpus)}
                          </div>
                          <div style={{ width: 50, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                            {Math.round(m.progress_pct)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Advice */}
                {advice && (
                  <div className="glass-card" style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>🤖 AI Roadmap Analysis</h3>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{advice}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
