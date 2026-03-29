"use client";

export default function TopBar() {
  return (
    <header className="topbar" id="topbar">
      <div className="topbar-left">
        <div className="topbar-greeting">
          Good evening, <strong>Rahul</strong> 👋
        </div>
      </div>
      <div className="topbar-right">
        <div className="health-badge" id="health-badge">
          <span>💚</span>
          <span>Health: 62</span>
        </div>
        <button
          className="btn-ghost"
          style={{ padding: "6px 12px", fontSize: "13px" }}
          id="whatsapp-btn"
        >
          📱 WhatsApp Alerts
        </button>
      </div>
    </header>
  );
}
