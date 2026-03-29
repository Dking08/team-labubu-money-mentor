"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import AIResponse from "@/components/AIResponse";
import FileUpload from "@/components/FileUpload";
import { callAgent } from "@/lib/api";

const EVENTS = [
  { label: "Got a Bonus", prompt: "I got a Rs 2 lakh bonus, what should I do?" },
  { label: "Getting Married", prompt: "I am getting married next year, help me plan financially" },
  { label: "New Baby", prompt: "We are expecting a baby, what financial changes should I make?" },
  { label: "Buying a House", prompt: "I want to buy a house worth Rs 80 lakhs" },
  { label: "Job Change", prompt: "I got a new job offer at Rs 22 LPA, should I switch?" },
  { label: "Inheritance", prompt: "I received Rs 15 lakh inheritance, how to invest it?" },
];

export default function LifeEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runEvent = async (prompt: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await callAgent("life-event", prompt);
      setResult(res);
    } catch {
      setResult({
        response_text: "Connect the backend (port 8000) for AI-powered life event advice. The AI will analyze your specific situation, calculate tax implications, and create a custom investment plan.",
        data: { event_type: "bonus", amount: 200000, allocation: {
          "Emergency Fund Top-up": { amount: 70000, vehicle: "Liquid Fund" },
          "ELSS (Tax Saving)": { amount: 50000, vehicle: "Parag Parikh ELSS" },
          "Goal Investment": { amount: 56000, vehicle: "Flexi Cap SIP" },
          "Discretionary": { amount: 24000, vehicle: "Personal use" },
        }},
      });
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="page-header">
          <h1>Life Event Advisor</h1>
          <p>AI-powered financial decisions for life&apos;s big moments</p>
        </div>

        <div className="quick-actions" style={{ marginBottom: 24 }}>
          {EVENTS.map((ev) => (
            <button
              key={ev.label}
              className="quick-action-btn"
              style={selectedEvent === ev.label ? { borderColor: "rgba(6,182,212,0.5)", background: "rgba(6,182,212,0.1)" } : {}}
              onClick={() => { setSelectedEvent(ev.label); runEvent(ev.prompt); }}
            >
              {ev.label}
            </button>
          ))}
        </div>

        <div className="glass-card" style={{ marginBottom: 24, display: "flex", gap: 8 }}>
          <input className="chat-input" placeholder="Or describe your life event..." value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && customQuery && runEvent(customQuery)} />
          <button className="btn-gradient" onClick={() => customQuery && runEvent(customQuery)} disabled={loading}>
            {loading ? "..." : "Ask"}
          </button>
        </div>

        {loading && (
          <div className="glass-card" style={{ textAlign: "center", padding: 40 }}>
            <div className="typing-indicator" style={{ justifyContent: "center" }}>
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
            <p style={{ color: "var(--text-secondary)", marginTop: 16 }}>AI is analyzing your situation...</p>
          </div>
        )}

        {result && !loading && (
          <>
            {result.data?.allocation && (
              <div className="glass-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)" }}>
                  Recommended Allocation — {formatINR(result.data.amount || 200000)}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {Object.entries(result.data.allocation).map(([key, val]: [string, any]) => (
                    <div key={key} style={{
                      padding: 16, borderRadius: "var(--radius-md)",
                      background: "var(--bg-glass-strong)", border: "1px solid var(--border-subtle)",
                    }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{key}</div>
                      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatINR(val.amount || 0)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{val.vehicle}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card">
              <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>AI Expert Advice</h3>
              <AIResponse text={result.response_text} />
            </div>

            <div className="glass-card" style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text-primary)" }}>Upload Related Documents</h3>
              <FileUpload agentHint="life-event" compact />
            </div>
          </>
        )}
      </main>
      <ChatPanel />
    </div>
  );
}
