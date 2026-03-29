"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import Link from "next/link";
import { useFinancialProfile } from "@/components/ProfileProvider";
import {
  formatInr,
  getInvestmentLabel,
  getNetWorth,
  getPortfolioValue,
} from "@/lib/financial-profile";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{prefix}{display.toLocaleString("en-IN")}{suffix}</>;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="score-ring-container">
      <div className="score-ring">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle className="score-ring-bg" cx="70" cy="70" r={radius} />
          <circle
            className="score-ring-fill"
            cx="70" cy="70" r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="score-ring-value">
          <div className="score-number"><AnimatedNumber value={score} /></div>
          <div className="score-label">Health Score</div>
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Start AI Meeting", href: "/mentor" },
  { label: "FIRE Calculator", href: "/fire-planner" },
  { label: "Health Check", href: "/health-score" },
  { label: "Tax Optimizer", href: "/tax-wizard" },
  { label: "MF X-Ray", href: "/mf-xray" },
  { label: "Life Event Help", href: "/life-events" },
];

export default function Dashboard() {
  const { profile } = useFinancialProfile();
  const portfolioValue = getPortfolioValue(profile);
  const netWorth = getNetWorth(profile);
  const savingsRate = profile.monthly_take_home
    ? Math.round((profile.monthly_savings / profile.monthly_take_home) * 100)
    : 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header animate-in stagger-1">
          <h1>Your Financial Command Center</h1>
          <p>AI-powered insights across your entire financial life</p>
        </div>

        <div className="dashboard-grid animate-in stagger-2">
          <div className="glass-card stat-card">
            <div className="stat-label">Net Worth</div>
            <div className="stat-value"><AnimatedNumber value={netWorth} prefix="₹" /></div>
            <div className="stat-change positive">Setu-linked cash included</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value"><AnimatedNumber value={profile.monthly_take_home} prefix="₹" /></div>
            <div className="stat-change positive">Savings rate: {savingsRate}%</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Monthly Savings</div>
            <div className="stat-value"><AnimatedNumber value={profile.monthly_savings} prefix="₹" /></div>
            <div className="stat-change positive">Cash balance: {formatInr(profile.cash_balance)}</div>
          </div>
        </div>

        <div className="dashboard-grid-wide animate-in stagger-3" style={{ marginTop: 24 }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>
              Financial Goals
            </h3>
            {profile.goals.map((goal) => {
              const pct = Math.min(100, (goal.current_savings / goal.target) * 100);
              return (
                <div className="goal-item" key={goal.name}>
                  <div className="goal-header">
                    <span className="goal-name">{goal.name}</span>
                    <span className="goal-amount">
                      Rs {(goal.current_savings / 100000).toFixed(1)}L / Rs {(goal.target / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="goal-bar">
                    <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>
              Money Health Score
            </h3>
            <ScoreRing score={profile.health_score} />
            <Link href="/health-score" className="btn-gradient" style={{ marginTop: 20, fontSize: 13, padding: "8px 20px" }}>
              View Detailed Report
            </Link>
          </div>
        </div>

        <div className="glass-card animate-in stagger-4" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>
            Investment Portfolio — Rs {(portfolioValue / 100000).toFixed(1)}L
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(profile.investments).map(([name, value]) => {
              const total = Object.values(profile.investments).reduce((a, b) => a + b, 0);
              const pct = ((value / total) * 100).toFixed(0);
              return (
                <div key={name} style={{
                  flex: "1 1 150px", padding: "14px 16px",
                  borderRadius: "var(--radius-md)", background: "var(--bg-glass-strong)",
                  border: "1px solid var(--border-subtle)",
                }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{getInvestmentLabel(name)}</div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                    Rs {(value / 1000).toFixed(0)}K
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {profile.linked_accounts.length > 0 && (
          <div className="glass-card animate-in stagger-4" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: "var(--text-primary)" }}>
              Linked via Setu AA
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Last synced {profile.last_synced_at ? new Date(profile.last_synced_at).toLocaleString("en-IN") : "recently"}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {profile.linked_accounts.map((account) => (
                <div
                  key={`${account.provider}-${account.number}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-glass-strong)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{account.type}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {account.provider} — {account.number}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, color: "var(--text-primary)" }}>
                    {account.balance}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>Quick Actions</h3>
          <div className="quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="quick-action-btn">
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
