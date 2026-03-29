"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AIResponse from "@/components/AIResponse";
import { sendWhatsAppMessage, synthesizeMeetingSpeech } from "@/lib/api";

// ── SCRIPTED CONVERSATION ──────────────────────────────
interface ScriptEntry {
  id: string;
  speaker: "user" | "ai";
  text: string;
  speak?: boolean;
  table?: { headers: string[]; rows: string[][] };
  uiBlocks?: any[];
  delay?: number;
  triggerWhatsApp?: boolean;
  triggerNotification?: boolean;
}

const USER_QUERY_1 = "Hi, I'm planning to buy a car worth Rs 10 lakhs in the next 8 months. Is it a good idea?";
const USER_QUERY_2 = "So what should I do?";

const SCRIPT_PHASE_1: ScriptEntry[] = [
  {
    id: "ai-1",
    speaker: "ai",
    text: "Great goal! Let me quickly analyze your financial profile.",
    speak: true,
    delay: 1200,
  },
  {
    id: "ai-2",
    speaker: "ai",
    text: "Based on your data:",
    speak: true,
    delay: 1500,
    table: {
      headers: ["Parameter", "Value"],
      rows: [
        ["Monthly Income", "Rs 80,000"],
        ["Current Savings", "Rs 3.5 lakhs"],
        ["Existing SIPs", "Rs 15,000/month"],
        ["Emergency Fund", "Covers ~2 months of expenses"],
      ],
    },
  },
  {
    id: "ai-3",
    speaker: "ai",
    text: "**Car Affordability Insight**\n\nYou can afford the car, but it may slightly strain your finances right now.\n\n- Your emergency fund is below the recommended 6 months\n- Buying the car now may reduce your investment capacity",
    speak: true,
    delay: 2500,
  },
];

const SCRIPT_PHASE_2: ScriptEntry[] = [
  {
    id: "ai-4",
    speaker: "ai",
    text: "Here's a smarter plan:\n\n**Step 1: Strengthen your emergency fund**\nIncrease it to at least Rs 4.5 - 5 lakhs before purchasing.\n\n**Step 2: Adjust your timeline**\nDelay the purchase by 3 - 4 months for better financial stability.\n\n**Step 3: Smart funding strategy**\n- Use Rs 4 lakhs as down payment\n- Take a manageable loan for the rest\n- Keep your SIPs running (don't stop wealth creation)",
    speak: true,
    delay: 2000,
    uiBlocks: [
      {
        type: "action_card",
        title: "Recommended: Delay by 3 months",
        description: "Build emergency fund to Rs 5L, then buy with Rs 4L down + loan",
        cta: "/fire-planner",
      },
    ],
    triggerWhatsApp: true,
    triggerNotification: true,
  },
];

export default function MentorPage() {
  const [phase, setPhase] = useState<"idle" | "phase1" | "waiting" | "phase2" | "done">("idle");
  const [messages, setMessages] = useState<ScriptEntry[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [typingCaption, setTypingCaption] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingCaption]);

  const stopPlayback = useCallback(() => {
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setCurrentSpeech("");
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  const speakText = useCallback(async (text: string) => {
    const clean = text.replace(/\*\*/g, "").replace(/- /g, "").replace(/\n/g, ". ").slice(0, 500);
    stopPlayback();
    setCurrentSpeech(clean);
    try {
      const audioBlob = await synthesizeMeetingSpeech(clean);
      const objectUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = objectUrl;

      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setCurrentSpeech("");
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };
      await audio.play();
    } catch {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.onend = () => setCurrentSpeech("");
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  }, [stopPlayback]);

  const playPhase = useCallback((entries: ScriptEntry[], onComplete?: () => void) => {
    let delay = 0;
    entries.forEach((entry, i) => {
      delay += entry.delay || 1500;
      setTimeout(() => {
        setMessages((prev) => [...prev, entry]);
        if (entry.speak) speakText(entry.text);
        if (entry.triggerWhatsApp) {
          // Send WhatsApp summary
          setTimeout(async () => {
            try {
              const summary = `Meeting Summary for Car Purchase Plan:\n\n` +
                `- Monthly Income: Rs 80,000\n` +
                `- Current Savings: Rs 3.5 lakhs\n` +
                `- Recommendation: Delay car purchase by 3-4 months\n` +
                `- Build emergency fund to Rs 5L first\n` +
                `- Use Rs 4L down payment + manageable loan\n` +
                `- Keep SIPs running at Rs 15,000/month\n\n` +
                `Next steps: Open FIRE Planner to model the timeline.`;
              const result = await sendWhatsAppMessage(`*ET Money Mentor -- Meeting Summary*\n\n${summary}`);
              setWhatsappSent(result?.status === "sent");
            } catch (e) {
              console.log("WhatsApp send attempted:", e);
              setWhatsappSent(false);
            }
          }, 1500);
        }
        if (entry.triggerNotification) {
          setTimeout(() => setShowNotification(true), 2000);
        }
        if (i === entries.length - 1 && onComplete) {
          setTimeout(onComplete, 500);
        }
      }, delay);
    });
  }, [speakText]);

  // Phase 1: User asks about car, AI responds
  const startPhase1 = useCallback(() => {
    setTypingCaption("");
    const userMsg: ScriptEntry = { id: "user-1", speaker: "user", text: USER_QUERY_1 };
    setMessages((prev) => [...prev, userMsg]);
    setPhase("phase1");

    setTimeout(() => {
      playPhase(SCRIPT_PHASE_1, () => setPhase("waiting"));
    }, 800);
  }, [playPhase]);

  // Phase 2: User asks what to do, AI responds with plan
  const startPhase2 = useCallback(() => {
    setTypingCaption("");
    const userMsg: ScriptEntry = { id: "user-2", speaker: "user", text: USER_QUERY_2 };
    setMessages((prev) => [...prev, userMsg]);
    setPhase("phase2");

    setTimeout(() => {
      playPhase(SCRIPT_PHASE_2, () => setPhase("done"));
    }, 800);
  }, [playPhase]);

  // Space bar triggers the scripted input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (phase === "idle" && e.key === " ") {
      e.preventDefault();
      setTypingCaption(USER_QUERY_1);
      setTimeout(startPhase1, 600);
    } else if (phase === "waiting" && e.key === " ") {
      e.preventDefault();
      setTypingCaption(USER_QUERY_2);
      setTimeout(startPhase2, 600);
    }
  }, [phase, startPhase1, startPhase2]);

  const orbScale = currentSpeech ? 1.15 : 1;
  const statusLabels: Record<string, string> = {
    idle: "Press SPACE to start the conversation",
    phase1: "AI Mentor is analyzing...",
    waiting: "Press SPACE to ask follow-up",
    phase2: "AI Mentor is responding...",
    done: "Meeting complete",
  };

  return (
    <div className="app-shell" onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: "none" }}>
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="meeting-layout">
          {/* Left: Orb + Status */}
          <div className="meeting-orb-panel">
            <div className="page-header" style={{ textAlign: "center" }}>
              <h1>AI Mentor Meeting</h1>
              <p>Live financial consultation</p>
            </div>

            <div className="voice-orb-container">
              <div className="voice-orb-ring" />
              <div className="voice-orb-ring" />
              <div className="voice-orb-ring" />
              <div
                className={`voice-orb ${currentSpeech ? "active" : ""}`}
                style={{ transform: `scale(${orbScale})` }}
                id="voice-orb"
              >
                <span className="voice-orb-icon">
                  {currentSpeech ? (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  )}
                </span>
              </div>
            </div>

            <div className={`voice-status ${currentSpeech ? "speaking" : phase === "idle" || phase === "waiting" ? "listening" : "processing"}`}>
              {statusLabels[phase]}
            </div>

            {/* WhatsApp sent notification */}
            {whatsappSent && (
              <div className="meeting-notification animate-in" style={{ marginTop: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>Summary sent to WhatsApp</span>
              </div>
            )}
          </div>

          {/* Right: Conversation transcript */}
          <div className="meeting-transcript-panel">
            <h3 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px" }}>
              Live Transcript
            </h3>

            <div className="meeting-messages">
              {messages.map((msg) => (
                <div className={`meeting-msg ${msg.speaker}`} key={msg.id}>
                  <div className="meeting-msg-speaker">
                    {msg.speaker === "user" ? "You" : "AI Mentor"}
                  </div>

                  {msg.speaker === "ai" ? (
                    <AIResponse text={msg.text} blocks={msg.uiBlocks} />
                  ) : (
                    <div className="meeting-msg-text">{msg.text}</div>
                  )}

                  {msg.table && (
                    <div className="ai-md-table-wrapper" style={{ marginTop: 12 }}>
                      <table className="ai-md-table">
                        <thead className="ai-md-thead">
                          <tr>{msg.table.headers.map((h, i) => <th className="ai-md-th" key={i}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {msg.table.rows.map((row, ri) => (
                            <tr key={ri}>{row.map((cell, ci) => <td className="ai-md-td" key={ci}>{cell}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing caption preview */}
              {typingCaption && phase !== "done" && (
                <div className="meeting-msg user animate-in">
                  <div className="meeting-msg-speaker">You</div>
                  <div className="meeting-msg-text" style={{ opacity: 0.6 }}>{typingCaption}</div>
                </div>
              )}

              {/* Processing indicator */}
              {(phase === "phase1" || phase === "phase2") && (
                <div className="typing-indicator" style={{ padding: "8px 0" }}>
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </div>
        </div>

        {/* Portfolio notification toast */}
        {showNotification && (
          <div className="portfolio-toast animate-in">
            <div className="portfolio-toast-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Portfolio Alert</span>
              <button onClick={() => setShowNotification(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginLeft: "auto" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="portfolio-toast-body">
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Your portfolio is up <strong style={{ color: "#34d399" }}>+2.4%</strong> this week.
                <strong style={{ color: "var(--text-primary)" }}> Parag Parikh Flexi Cap</strong> hit a new NAV high of Rs 685.20.
                Consider increasing your SIP by Rs 2,000 to accelerate your car fund goal.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
