"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { section: "Overview", items: [
    { label: "Dashboard", href: "/" },
    { label: "AI Mentor Meeting", href: "/mentor" },
  ]},
  { section: "Planning Tools", items: [
    { label: "FIRE Planner", href: "/fire-planner" },
    { label: "Health Score", href: "/health-score" },
    { label: "Tax Wizard", href: "/tax-wizard" },
  ]},
  { section: "Analysis", items: [
    { label: "MF X-Ray", href: "/mf-xray" },
    { label: "Life Events", href: "/life-events" },
    { label: "Couple Planner", href: "/couple-planner" },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <span className="sidebar-logo-text">ET Money Mentor</span>
      </div>

      {NAV_ITEMS.map((section) => (
        <div className="sidebar-section" key={section.section}>
          <div className="sidebar-section-title">{section.section}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${pathname === item.href ? "active" : ""}`}
              id={`nav-${item.href.replace("/", "") || "home"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div style={{ marginTop: "auto", padding: "12px" }}>
        <div className="glass-card" style={{ padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text-accent)", marginBottom: "6px" }}>
            ET GenAI Hackathon
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Team Labubu
          </div>
        </div>
      </div>
    </aside>
  );
}
