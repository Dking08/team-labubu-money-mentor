"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useFinancialProfile } from "./ProfileProvider";
import { getFirstName } from "@/lib/financial-profile";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/onboarding": "Onboarding",
  "/mentor": "AI Mentor Meeting",
  "/fire-planner": "FIRE Planner",
  "/health-score": "Health Score",
  "/tax-wizard": "Tax Wizard",
  "/mf-xray": "MF X-Ray",
  "/life-events": "Life Events",
  "/couple-planner": "Couple Planner",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TopBar() {
  const pathname = usePathname();
  const { profile } = useFinancialProfile();
  const scoreColor = profile.health_score >= 70 ? "#34d399" : profile.health_score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <header className="topbar" id="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{getGreeting()},</span>
          <strong style={{ color: "var(--text-primary)", fontSize: 13, marginLeft: 4 }}>{getFirstName(profile)}</strong>
          {pathname !== "/" && (
            <>
              <span className="topbar-separator">/</span>
              <span style={{ color: "var(--text-accent)", fontSize: 13, fontWeight: 600 }}>
                {PAGE_TITLES[pathname] || ""}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="topbar-right">
        <Link href="/health-score" className="topbar-badge" id="health-badge">
          <div className="topbar-badge-dot" style={{ background: scoreColor }} />
          <span className="topbar-badge-label">Health</span>
          <span className="topbar-badge-value" style={{ color: scoreColor }}>{profile.health_score}</span>
        </Link>
        {profile.onboarding_completed && (
          <div className="topbar-badge" style={{ borderColor: "rgba(37,211,102,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span className="topbar-badge-label">Alerts</span>
          </div>
        )}
        <div className="topbar-avatar">
          {getFirstName(profile).charAt(0)}
        </div>
      </div>
    </header>
  );
}
