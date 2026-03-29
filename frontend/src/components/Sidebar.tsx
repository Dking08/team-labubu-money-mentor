"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { section: "Overview", items: [
    { label: "Dashboard", icon: "📊", href: "/" },
    { label: "AI Mentor Meeting", icon: "🎙️", href: "/mentor" },
  ]},
  { section: "Planning Tools", items: [
    { label: "FIRE Planner", icon: "🔥", href: "/fire-planner" },
    { label: "Health Score", icon: "💯", href: "/health-score" },
    { label: "Tax Wizard", icon: "🧾", href: "/tax-wizard" },
  ]},
  { section: "Analysis", items: [
    { label: "MF X-Ray", icon: "🔬", href: "/mf-xray" },
    { label: "Life Events", icon: "💍", href: "/life-events" },
    { label: "Couple Planner", icon: "👫", href: "/couple-planner" },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">₹</div>
        <span className="sidebar-logo-text">Money Mentor</span>
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
              <span className="sidebar-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div style={{ marginTop: "auto", padding: "12px" }}>
        <div className="glass-card" style={{ padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏆</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
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
