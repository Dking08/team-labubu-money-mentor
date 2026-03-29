"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import Link from "next/link";

// Animated number component
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

// Score Ring SVG
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

// Mock data
const USER_DATA = {
  name: "Rahul Sharma",
  netWorth: 950000,
  monthlyIncome: 104000,
  monthlySavings: 51000,
  healthScore: 62,
  investments: { PPF: 300000, ELSS: 200000, "Equity MF": 150000, FD: 100000, EPF: 450000, Stocks: 50000 },
  goals: [
    { name: "Emergency Fund", target: 540000, current: 200000 },
    { name: "Marriage", target: 2000000, current: 0 },
    { name: "House Down Payment", target: 3000000, current: 0 },
    { name: "Retirement", target: 50000000, current: 450000 },
  ],
};

const QUICK_ACTIONS = [
  { icon: "🎙️", label: "Start AI Meeting", href: "/mentor" },
  { icon: "🔥", label: "FIRE Calculator", href: "/fire-planner" },
  { icon: "💯", label: "Health Check", href: "/health-score" },
  { icon: "🧾", label: "Tax Optimizer", href: "/tax-wizard" },
  { icon: "📊", label: "MF X-Ray", href: "/mf-xray" },
  { icon: "💍", label: "Life Event Help", href: "/life-events" },
];

export default function Dashboard() {
  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header animate-in stagger-1">
          <h1>Your Financial Command Center</h1>
          <p>AI-powered insights across your entire financial life</p>
        </div>

        {/* Stats Row */}
        <div className="dashboard-grid animate-in stagger-2">
          <div className="glass-card stat-card">
            <div className="stat-label">Net Worth</div>
            <div className="stat-value"><AnimatedNumber value={USER_DATA.netWorth} prefix="₹" /></div>
            <div className="stat-change positive">↑ 12.4% from last year</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value"><AnimatedNumber value={USER_DATA.monthlyIncome} prefix="₹" /></div>
            <div className="stat-change positive">Savings rate: 49%</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-label">Monthly Savings</div>
            <div className="stat-value"><AnimatedNumber value={USER_DATA.monthlySavings} prefix="₹" /></div>
            <div className="stat-change positive">₹8K EMI deducted</div>
          </div>
        </div>

        {/* Health Score + Goals */}
        <div className="dashboard-grid-wide animate-in stagger-3" style={{ marginTop: 24 }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>
              💰 Financial Goals
            </h3>
            {USER_DATA.goals.map((goal) => {
              const pct = Math.min(100, (goal.current / goal.target) * 100);
              return (
                <div className="goal-item" key={goal.name}>
                  <div className="goal-header">
                    <span className="goal-name">{goal.name}</span>
                    <span className="goal-amount">
                      ₹{(goal.current / 100000).toFixed(1)}L / ₹{(goal.target / 100000).toFixed(1)}L
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
            <ScoreRing score={USER_DATA.healthScore} />
            <Link href="/health-score" className="btn-gradient" style={{ marginTop: 20, fontSize: 13, padding: "8px 20px" }}>
              View Detailed Report →
            </Link>
          </div>
        </div>

        {/* Investment Breakdown */}
        <div className="glass-card animate-in stagger-4" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 20, color: "var(--text-primary)" }}>
            📈 Investment Portfolio — ₹{(Object.values(USER_DATA.investments).reduce((a, b) => a + b, 0) / 100000).toFixed(1)}L
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(USER_DATA.investments).map(([name, value]) => {
              const total = Object.values(USER_DATA.investments).reduce((a, b) => a + b, 0);
              const pct = ((value / total) * 100).toFixed(0);
              const colors = ["var(--gradient-cyan)", "var(--gradient-violet)", "var(--gradient-pink)", "var(--gradient-green)", "var(--gradient-orange)", "linear-gradient(135deg, #6366f1, #818cf8)"];
              const idx = Object.keys(USER_DATA.investments).indexOf(name);
              return (
                <div key={name} style={{
                  flex: "1 1 150px", padding: "14px 16px",
                  borderRadius: "var(--radius-md)", background: "var(--bg-glass-strong)",
                  border: "1px solid var(--border-subtle)",
                }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{name}</div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                    ₹{(value / 1000).toFixed(0)}K
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>⚡ Quick Actions</h3>
          <div className="quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="quick-action-btn">
                <span className="quick-action-icon">{action.icon}</span>
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
