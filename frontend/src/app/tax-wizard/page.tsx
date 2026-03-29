"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import AIResponse from "@/components/AIResponse";
import FileUpload from "@/components/FileUpload";
import { useFinancialProfile } from "@/components/ProfileProvider";
import { callAgent } from "@/lib/api";
import { type FinancialProfile } from "@/lib/financial-profile";

function buildTaxForm(profile: FinancialProfile) {
  return {
    income: profile.annual_income,
    ppf: profile.investments?.ppf || 0,
    elss: profile.investments?.elss || 0,
    nps: profile.investments?.nps || 0,
    health_insurance: profile.insurance?.health ? Math.min(25000, profile.insurance.health / 20) : 25000,
    rent: profile.rent_paid * 12,
    home_loan: 0,
    epf: profile.investments?.epf || 0,
  };
}

function buildTaxUserData(profile: FinancialProfile, form: {
  income: number;
  ppf: number;
  elss: number;
  nps: number;
  health_insurance: number;
  rent: number;
  home_loan: number;
  epf: number;
}) {
  return {
    ...profile,
    annual_income: form.income,
    rent_paid: Math.round(form.rent / 12),
    investments: {
      ...profile.investments,
      ppf: form.ppf,
      elss: form.elss,
      nps: form.nps,
      epf: form.epf,
    },
    insurance: {
      ...profile.insurance,
      health: form.health_insurance,
    },
  };
}

function buildLocalTaxResult(form: {
  income: number;
  ppf: number;
  elss: number;
  nps: number;
  health_insurance: number;
  rent: number;
  home_loan: number;
  epf: number;
}) {
  const income = form.income;
  const newTaxable = income - 75000;
  let newTax = 0;
  const newSlabs: [number, number][] = [[300000,0],[700000,0.05],[1000000,0.10],[1200000,0.15],[1500000,0.20],[Infinity,0.30]];
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
  const oldSlabs: [number, number][] = [[250000,0],[500000,0.05],[1000000,0.20],[Infinity,0.30]];
  prev = 0;
  for (const [limit, rate] of oldSlabs) {
    const t = Math.min(oldTaxable, limit) - prev;
    if (t > 0) oldTax += t * rate;
    prev = limit;
    if (oldTaxable <= limit) break;
  }
  if (oldTaxable <= 500000) oldTax = Math.max(0, oldTax - 12500);
  oldTax *= 1.04;

  return {
    comparison: {
      old_regime: { tax: Math.round(oldTax), taxable_income: oldTaxable, total_deductions: oldDeductions },
      new_regime: { tax: Math.round(newTax), taxable_income: newTaxable, total_deductions: 75000 },
      recommended: oldTax < newTax ? "old" : "new",
      savings: Math.abs(Math.round(oldTax - newTax)),
    },
    missed_deductions: form.nps === 0
      ? [{ section: "80CCD(1B)", max_benefit: 50000, suggestion: "Invest Rs 50,000 in NPS for additional deduction under Old Regime." }]
      : [],
  };
}

export default function TaxWizardPage() {
  const { profile } = useFinancialProfile();
  const [result, setResult] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [form, setForm] = useState(buildTaxForm(profile));
  const hydratedKeyRef = useRef("");

  const profileDerivedForm = buildTaxForm(profile);

  const runTax = async (activeForm = form, auto = false) => {
    setLoading(true);
    try {
      const res = await callAgent(
        "tax-wizard",
        `Optimize taxes for income Rs ${activeForm.income} with PPF Rs ${activeForm.ppf}, ELSS Rs ${activeForm.elss}`,
        buildTaxUserData(profile, activeForm)
      );
      setResult(res.data);
      setAdvice(res.response_text);
    } catch {
      setResult(buildLocalTaxResult(activeForm));
      setAdvice(
        auto
          ? "Loaded a tax comparison from your saved deductions and profile. Backend AI can sharpen the strategy narrative when connected."
          : "Updated your tax comparison using the revised assumptions."
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
    void runTax(profileDerivedForm, true);
  }, [profile.name, profile.annual_income, profile.rent_paid, profile.investments?.ppf, profile.investments?.elss, profile.investments?.nps, profile.investments?.epf, profile.insurance?.health]);

  const formatINR = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>Tax Wizard</h1>
          <p>Old vs New regime comparison with missed deduction detection</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Known Salary and Deductions</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Preloaded from {profile.name}&apos;s profile so the tax page opens with a ready recommendation.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {[
                ["Gross Income", formatINR(form.income)],
                ["80C Bucket", formatINR(form.ppf + form.elss + form.epf)],
                ["NPS", formatINR(form.nps)],
                ["Health Insurance", formatINR(form.health_insurance)],
                ["Annual Rent", formatINR(form.rent)],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => setShowInputs((prev) => !prev)} style={{ width: "100%", marginBottom: showInputs ? 16 : 0 }}>
              {showInputs ? "Hide Manual Adjustments" : "Adjust Tax Inputs"}
            </button>
            {showInputs && (
              <>
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
                    <label className="form-label">{label} (Rs)</label>
                    <input className="form-input" type="number" value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: +e.target.value })} />
                  </div>
                ))}
                <button className="btn-gradient" onClick={() => runTax()} disabled={loading} style={{ width: "100%" }}>
                  {loading ? "Calculating..." : "Recalculate With AI"}
                </button>
              </>
            )}
          </div>

          {result && (
            <div>
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
                        }}>RECOMMENDED</div>
                      )}
                      <h3 style={{ fontSize: 18, marginBottom: 16, color: "var(--text-primary)", textTransform: "capitalize" }}>
                        {regime === "old" ? "Old" : "New"} Regime
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

              <div className="glass-card stat-card" style={{ marginTop: 16, textAlign: "center" }}>
                <div className="stat-label">Tax Savings by choosing {result.comparison?.recommended} regime</div>
                <div className="stat-value">{formatINR(result.comparison?.savings || 0)}</div>
              </div>

              {result.missed_deductions?.length > 0 && (
                <div className="glass-card" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: "#fbbf24" }}>Missed Deductions</h3>
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
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>AI Tax Strategy</h3>
                  <AIResponse text={advice} />
                </div>
              )}

              <div className="glass-card" style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Upload Tax Documents</h3>
                <FileUpload agentHint="tax-wizard" compact />
              </div>
            </div>
          )}
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
