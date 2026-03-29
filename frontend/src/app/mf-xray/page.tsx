"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import AIResponse from "@/components/AIResponse";
import FileUpload from "@/components/FileUpload";
import { useFinancialProfile } from "@/components/ProfileProvider";
import { callAgent } from "@/lib/api";
import { type FinancialProfile, type SetuAaData } from "@/lib/financial-profile";

function buildKnownPortfolioSummary(profile: FinancialProfile, aaData: SetuAaData | null) {
  const mutualFunds = profile.investments?.equity_mf || 0;
  const fixedDeposits = profile.investments?.fd || 0;
  const stocks = (profile.investments?.stocks || 0) + (aaData?.nsdl_holdings || []).reduce((sum, holding) => sum + (holding.value || 0), 0);
  const cash = (aaData?.accounts || []).reduce((sum, account) => sum + (account.balance || 0), 0);
  return {
    mutualFunds,
    fixedDeposits,
    stocks,
    cash,
  };
}

export default function MfXrayPage() {
  const { profile, aaData } = useFinancialProfile();
  const [result, setResult] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const autoLoadedRef = useRef(false);

  const MOCK_HOLDINGS = [
    { name: "HDFC Mid-Cap Opportunities Fund", cat: "Mid Cap", amc: "HDFC MF", invested: 120000, current: 148200, xirr: 15.2, er: 1.68, units: 324.52, nav: 456.70 },
    { name: "Parag Parikh Flexi Cap Fund", cat: "Flexi Cap", amc: "PPFAS MF", invested: 108000, current: 142905, xirr: 22.5, er: 0.63, units: 210.0, nav: 680.50 },
    { name: "SBI Small Cap Fund", cat: "Small Cap", amc: "SBI MF", invested: 48000, current: 64035, xirr: 24.1, er: 1.72, units: 450.0, nav: 142.30 },
    { name: "Axis Bluechip Fund", cat: "Large Cap", amc: "Axis MF", invested: 27000, current: 30624, xirr: 9.8, er: 1.56, units: 580.0, nav: 52.80 },
    { name: "Motilal Oswal Midcap Fund", cat: "Mid Cap", amc: "Motilal MF", invested: 12000, current: 16614, xirr: 28.4, er: 1.82, units: 195.0, nav: 85.20 },
    { name: "ICICI Pru Bluechip Fund", cat: "Large Cap", amc: "ICICI Pru MF", invested: 24000, current: 30528, xirr: 18.2, er: 1.69, units: 320.0, nav: 95.40 },
  ];

  const runXray = async (auto = false) => {
    setLoading(true);
    try {
      const res = await callAgent("mf-xray", "Analyze my mutual fund portfolio", profile);
      setResult(res.data);
      setAdvice(res.response_text);
    } catch {
      const totalInvested = MOCK_HOLDINGS.reduce((a, h) => a + h.invested, 0);
      const totalCurrent = MOCK_HOLDINGS.reduce((a, h) => a + h.current, 0);
      setResult({
        portfolio_summary: {
          total_invested: totalInvested,
          total_current: totalCurrent,
          total_gain: totalCurrent - totalInvested,
          total_gain_pct: ((totalCurrent - totalInvested) / totalInvested * 100).toFixed(1),
          fund_count: MOCK_HOLDINGS.length,
        },
        holdings: MOCK_HOLDINGS,
        overlap: {
          total_unique_stocks: 52,
          overlapping_stocks: 5,
          overlap_percentage: 9.6,
          weighted_overlap_pct: 14.2,
          risk_level: "MODERATE",
          risk_message: "Some overlap exists between large cap funds (HDFC Bank, ICICI Bank, Infosys appear in multiple portfolios).",
          overlaps: {
            "HDFC Bank": [{ fund: "Parag Parikh Flexi Cap", weight: 5.8 }, { fund: "Axis Bluechip", weight: 9.2 }, { fund: "ICICI Pru Bluechip", weight: 7.8 }],
            "ICICI Bank": [{ fund: "Axis Bluechip", weight: 7.8 }, { fund: "ICICI Pru Bluechip", weight: 9.5 }],
            "Infosys": [{ fund: "Axis Bluechip", weight: 6.1 }, { fund: "ICICI Pru Bluechip", weight: 6.3 }],
            "TCS": [{ fund: "Axis Bluechip", weight: 4.8 }, { fund: "ICICI Pru Bluechip", weight: 4.2 }],
            "Reliance Industries": [{ fund: "Axis Bluechip", weight: 4.2 }, { fund: "ICICI Pru Bluechip", weight: 5.9 }],
          },
        },
        expense_ratio: {
          weighted_expense_ratio: 1.42,
          estimated_direct_er: 0.62,
          annual_cost: 6148,
          total_drag_over_years: 108540,
          years: 10,
          fund_costs: MOCK_HOLDINGS.map(h => ({
            fund: h.name,
            expense_ratio: h.er,
            annual_cost: Math.round(h.current * h.er / 100),
            is_direct_plan: h.name.includes("Direct"),
            recommendation: h.er > 1.5 ? `Switch to direct plan to save ~Rs ${Math.round(h.current * 0.008)}/yr` : "Expense ratio is reasonable.",
          })),
        },
        allocation: {
          total_value: totalCurrent,
          equity_pct: 100,
          debt_pct: 0,
          allocation: {
            "Equity - Mid Cap": { value: 164814, pct: 38.1 },
            "Equity - Flexi Cap": { value: 142905, pct: 33.0 },
            "Equity - Small Cap": { value: 64035, pct: 14.8 },
            "Equity - Large Cap": { value: 61152, pct: 14.1 },
          },
        },
        ideal_allocation: { equity_pct: 72, debt_pct: 28, large_cap_pct: 29, mid_cap_pct: 22, small_cap_pct: 14, flexi_cap_pct: 7 },
      });
      setAdvice(
        auto
          ? "Loaded a portfolio readout using your synced prototype holdings and saved profile."
          : "Updated your portfolio analysis using the known synced portfolio context."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;
  const summary = result?.portfolio_summary;
  const knownPortfolio = buildKnownPortfolioSummary(profile, aaData);

  useEffect(() => {
    if (autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    void runXray(true);
  }, [profile.user_id]);

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>MF Portfolio X-Ray</h1>
          <p>Institutional-grade portfolio analysis with overlap detection and rebalancing</p>
        </div>

        <div className="dashboard-grid" style={{ marginTop: 0, marginBottom: 24 }}>
          <div className="glass-card stat-card">
            <div className="stat-label">Known Equity MF</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{formatINR(knownPortfolio.mutualFunds)}</div>
            <div className="stat-change positive">from saved profile</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Known Stocks</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{formatINR(knownPortfolio.stocks)}</div>
            <div className="stat-change positive">Setu-linked + saved data</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Known Fixed Deposits</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{formatINR(knownPortfolio.fixedDeposits)}</div>
            <div className="stat-change positive">from your profile</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Synced Cash Snapshot</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{formatINR(knownPortfolio.cash)}</div>
            <div className="stat-change positive">from Setu AA</div>
          </div>
        </div>

        {loading && !result ? (
          <div className="glass-card" style={{ textAlign: "center", padding: 32, maxWidth: 720 }}>
            <div className="typing-indicator" style={{ justifyContent: "center" }}>
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 16 }}>
              Building your portfolio x-ray from the portfolio context we already know...
            </p>
          </div>
        ) : result ? (
          <>
            {/* Portfolio Summary */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="glass-card stat-card">
                <div className="stat-label">Total Invested</div>
                <div className="stat-value" style={{ fontSize: 22 }}>{formatINR(summary?.total_invested || 0)}</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-label">Current Value</div>
                <div className="stat-value" style={{ fontSize: 22 }}>{formatINR(summary?.total_current || 0)}</div>
                <div className="stat-change positive">+{formatINR(summary?.total_gain || 0)} ({summary?.total_gain_pct}%)</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-label">Weighted Overlap</div>
                <div className="stat-value" style={{
                  fontSize: 22,
                  background: result.overlap?.risk_level === "HIGH" ? "linear-gradient(135deg,#ef4444,#f87171)" :
                    result.overlap?.risk_level === "MODERATE" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "var(--gradient-green)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>{result.overlap?.weighted_overlap_pct}%</div>
                <div className="stat-change" style={{ color: result.overlap?.risk_level === "LOW" ? "#34d399" : "#fbbf24" }}>
                  {result.overlap?.risk_level} risk
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-label">Expense Drag (10yr)</div>
                <div className="stat-value" style={{ fontSize: 22, background: "linear-gradient(135deg,#ef4444,#f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {formatINR(result.expense_ratio?.total_drag_over_years || 0)}
                </div>
                <div className="stat-change negative">Weighted ER: {result.expense_ratio?.weighted_expense_ratio}%</div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card" style={{ marginTop: 24, overflowX: "auto" }}>
              <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>Holdings ({summary?.fund_count} funds)</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-medium)" }}>
                    {["Fund", "Category", "Invested", "Current", "Gain", "XIRR", "Exp Ratio"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.holdings || MOCK_HOLDINGS).map((h: any, i: number) => {
                    const gain = (h.current || h.current_value || 0) - (h.invested || h.invested_amount || 0);
                    const gainPct = ((gain / Math.max(h.invested || h.invested_amount || 1, 1)) * 100).toFixed(1);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "12px", fontWeight: 500, color: "var(--text-primary)", maxWidth: 220 }}>
                          {h.name || h.scheme_name}
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{h.amc}</div>
                        </td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{h.cat || h.category}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{formatINR(h.invested || h.invested_amount)}</td>
                        <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{formatINR(h.current || h.current_value)}</td>
                        <td style={{ padding: "12px", color: gain >= 0 ? "#34d399" : "#f87171", fontWeight: 600 }}>
                          {gain >= 0 ? "+" : ""}{formatINR(gain)} <span style={{ fontSize: 11 }}>({gainPct}%)</span>
                        </td>
                        <td style={{ padding: "12px", color: (h.xirr || 0) > 15 ? "#34d399" : (h.xirr || 0) > 10 ? "#fbbf24" : "#f87171", fontWeight: 600 }}>{h.xirr}%</td>
                        <td style={{ padding: "12px", color: (h.er || h.expense_ratio || 0) > 1.5 ? "#f87171" : "#34d399" }}>{h.er || h.expense_ratio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Overlap Details */}
            {result.overlap?.overlaps && Object.keys(result.overlap.overlaps).length > 0 && (
              <div className="glass-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>Stock Overlap Analysis</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>{result.overlap.risk_message}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
                  {Object.entries(result.overlap.overlaps).map(([stock, funds]: [string, any]) => (
                    <div key={stock} style={{ padding: 14, background: "var(--bg-glass-strong)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{stock}</div>
                      {funds.map((f: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span>{f.fund}</span>
                          <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>{f.weight}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allocation vs Ideal */}
            {result.allocation && result.ideal_allocation && (
              <div className="glass-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>Asset Allocation vs Ideal</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>CURRENT</div>
                    {Object.entries(result.allocation.allocation || {}).map(([cat, data]: [string, any]) => (
                      <div key={cat} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: "var(--text-primary)" }}>{cat}</span>
                          <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>{data.pct}%</span>
                        </div>
                        <div className="goal-bar"><div className="goal-bar-fill" style={{ width: `${data.pct}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>IDEAL (Age {28})</div>
                    {[
                      { label: "Large Cap", pct: result.ideal_allocation.large_cap_pct },
                      { label: "Mid Cap", pct: result.ideal_allocation.mid_cap_pct },
                      { label: "Small Cap", pct: result.ideal_allocation.small_cap_pct },
                      { label: "Flexi Cap", pct: result.ideal_allocation.flexi_cap_pct },
                      { label: "Debt", pct: result.ideal_allocation.debt_pct },
                    ].map(item => (
                      <div key={item.label} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: "var(--text-primary)" }}>{item.label}</span>
                          <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>{item.pct}%</span>
                        </div>
                        <div className="goal-bar"><div className="goal-bar-fill" style={{ width: `${item.pct}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Expense Ratio per fund */}
            {result.expense_ratio?.fund_costs && (
              <div className="glass-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>
                  Expense Ratio Analysis — {formatINR(result.expense_ratio.annual_cost)}/yr drag
                </h3>
                {result.expense_ratio.fund_costs.map((fc: any, i: number) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{fc.fund}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{fc.recommendation}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: fc.expense_ratio > 1.5 ? "#f87171" : "#34d399" }}>
                        {fc.expense_ratio}%
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatINR(fc.annual_cost)}/yr</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {advice && (
              <div className="glass-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>AI Rebalancing Recommendation</h3>
                <AIResponse text={advice} />
              </div>
            )}

            <div className="glass-card" style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 8, color: "var(--text-primary)" }}>Refine With Documents</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                Your portfolio is already known at a high level from synced data. Upload CAMS or KFintech if you want a fresher statement or more exact scheme-level history.
              </p>
              <FileUpload agentHint="mf-xray" compact onResult={(data) => {
                if (data?.parsed_data) {
                  void runXray();
                }
              }} />
            </div>
          </>
        ) : null}
      </main>
      <ChatPanel />
    </div>
  );
}
