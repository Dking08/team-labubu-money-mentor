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

function buildFireForm(profile: FinancialProfile) {
  return {
    age: profile.age,
    retire_age: Math.max(45, profile.age + 15),
    income: profile.annual_income,
    expenses: profile.monthly_expenses * 12,
    savings: getNetWorth(profile),
    monthly_invest: profile.monthly_savings,
  };
}

function buildFireUserData(profile: FinancialProfile, form: {
  age: number;
  retire_age: number;
  income: number;
  expenses: number;
  savings: number;
  monthly_invest: number;
}) {
  const monthlyExpenses = Math.round(form.expenses / 12);
  const totalEmi = (profile.loans || []).reduce((sum, loan) => sum + (loan.emi || 0), 0);
  return {
    ...profile,
    age: form.age,
    annual_income: form.income,
    monthly_expenses: monthlyExpenses,
    monthly_take_home: monthlyExpenses + totalEmi + form.monthly_invest,
    monthly_savings: form.monthly_invest,
    investments: { fire_corpus: form.savings },
  };
}

function buildLocalFireResult(form: {
  age: number;
  retire_age: number;
  income: number;
  expenses: number;
  savings: number;
  monthly_invest: number;
}) {
  const fn = form.expenses * 25;
  const r = 0.12 / 12;
  let months = 0;
  let corpus = form.savings;
  while (corpus < fn && months < 1200) {
    corpus = corpus * (1 + r) + form.monthly_invest;
    months++;
  }
  return {
    roadmap: {
      fire_number: fn,
      lean_fire: fn * 0.7,
      fat_fire: fn * 1.5,
      years_to_fire: (months / 12).toFixed(1),
      fire_age: form.age + months / 12,
      savings_rate: ((form.income - form.expenses) / Math.max(form.income, 1) * 100).toFixed(1),
      milestones: Array.from({ length: Math.min(Math.ceil(months / 12), 20) }, (_, i) => ({
        year: i + 1,
        age: form.age + i + 1,
        corpus: Math.round(
          form.savings * Math.pow(1.12, i + 1) +
            form.monthly_invest *
              12 *
              ((Math.pow(1 + 0.12 / 12, (i + 1) * 12) - 1) / (0.12 / 12))
        ),
        progress_pct: Math.min(100, (form.savings * Math.pow(1.12, i + 1)) / fn * 100).toFixed(1),
      })),
    },
  };
}

export default function FirePlannerPage() {
  const { profile } = useFinancialProfile();
  const [result, setResult] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [form, setForm] = useState(buildFireForm(profile));
  const hydratedKeyRef = useRef("");

  const profileDerivedForm = buildFireForm(profile);

  const runPlan = async (activeForm = form, auto = false) => {
    setLoading(true);
    try {
      const res = await callAgent(
        "fire",
        `FIRE plan: age ${activeForm.age}, retire ${activeForm.retire_age}, income Rs ${activeForm.income}, expenses Rs ${activeForm.expenses}, savings Rs ${activeForm.savings}`,
        buildFireUserData(profile, activeForm)
      );
      setResult(res.data);
      setAdvice(res.response_text);
    } catch {
      setResult(buildLocalFireResult(activeForm));
      setAdvice(
        auto
          ? "This plan was precomputed from your saved profile. Backend AI can refine the narrative once connected."
          : "Updated your FIRE roadmap using the assumptions you edited."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextKey = JSON.stringify(profileDerivedForm);
    if (hydratedKeyRef.current === nextKey) return;
    hydratedKeyRef.current = nextKey;
    setForm(profileDerivedForm);
    void runPlan(profileDerivedForm, true);
  }, [profile.name, profile.age, profile.annual_income, profile.monthly_expenses, profile.monthly_savings, profile.cash_balance]);

  const formatLakh = (n: number) => n >= 10000000 ? `Rs ${(n / 10000000).toFixed(1)}Cr` : `Rs ${(n / 100000).toFixed(1)}L`;

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>FIRE Path Planner</h1>
          <p>Your roadmap to Financial Independence, Retire Early</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Profile-Driven Assumptions</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Preloaded from {profile.name}&apos;s saved profile so the planner feels instant.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {[
                ["Current Age", form.age],
                ["Annual Income", `Rs ${form.income.toLocaleString("en-IN")}`],
                ["Annual Expenses", `Rs ${form.expenses.toLocaleString("en-IN")}`],
                ["Current Corpus", `Rs ${form.savings.toLocaleString("en-IN")}`],
                ["Monthly Investment", `Rs ${form.monthly_invest.toLocaleString("en-IN")}`],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => setShowInputs((prev) => !prev)} style={{ width: "100%", marginBottom: showInputs ? 16 : 0 }}>
              {showInputs ? "Hide Manual Adjustments" : "Adjust Assumptions"}
            </button>
            {showInputs && (
              <>
                {[
                  { label: "Current Age", key: "age", min: 18, max: 65 },
                  { label: "Target Retirement Age", key: "retire_age", min: 30, max: 70 },
                  { label: "Annual Income (Rs)", key: "income" },
                  { label: "Annual Expenses (Rs)", key: "expenses" },
                  { label: "Current Savings (Rs)", key: "savings" },
                  { label: "Monthly Investment (Rs)", key: "monthly_invest" },
                ].map(({ label, key, min, max }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" type="number" value={(form as any)[key]}
                      min={min} max={max}
                      onChange={(e) => setForm({ ...form, [key]: +e.target.value })} />
                  </div>
                ))}
                <button className="btn-gradient" onClick={() => runPlan()} disabled={loading} style={{ width: "100%" }}>
                  {loading ? "Calculating..." : "Recalculate With AI"}
                </button>
              </>
            )}
          </div>

          <div>
            {result && (
              <>
                <div className="dashboard-grid" style={{ marginTop: 0 }}>
                  {[
                    { label: "FIRE Number", value: result.roadmap?.fire_number },
                    { label: "Lean FIRE", value: result.roadmap?.lean_fire },
                    { label: "Fat FIRE", value: result.roadmap?.fat_fire },
                  ].map((s) => (
                    <div className="glass-card stat-card" key={s.label}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{formatLakh(s.value || 0)}</div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-grid" style={{ marginTop: 16 }}>
                  <div className="glass-card stat-card">
                    <div className="stat-label">Years to FIRE</div>
                    <div className="stat-value">{result.roadmap?.years_to_fire} yrs</div>
                    <div className="stat-change positive">FIRE Age: {Math.round(result.roadmap?.fire_age || 0)}</div>
                  </div>
                  <div className="glass-card stat-card">
                    <div className="stat-label">Savings Rate</div>
                    <div className="stat-value">{result.roadmap?.savings_rate}%</div>
                    <div className="stat-change positive">Excellent</div>
                  </div>
                </div>

                {result.roadmap?.milestones && (
                  <div className="glass-card" style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>FIRE Timeline</h3>
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

                {advice && (
                  <div className="glass-card" style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>AI Roadmap Analysis</h3>
                    <AIResponse text={advice} />
                  </div>
                )}

                <div className="glass-card" style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Upload Financial Documents</h3>
                  <FileUpload agentHint="fire" compact />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
