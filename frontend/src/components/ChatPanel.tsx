"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { chatWithMentor } from "@/lib/api";
import AIResponse from "./AIResponse";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  agentName?: string;
  data?: any;
  uiAction?: any;
}

const AGENT_LABELS: Record<string, string> = {
  fire_planner: "FIRE Planner",
  money_health: "Health Score",
  tax_wizard: "Tax Wizard",
  life_event: "Life Event Advisor",
  mf_xray: "MF X-Ray",
  couple_planner: "Couple Planner",
  mentor: "Money Mentor",
  system: "System",
};

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hello Rahul. I am your ET Money Mentor. Ask me anything about your finances — taxes, investments, goals, or how to allocate that bonus.",
      agentName: "mentor",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatWithMentor(input.trim());
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: result.response_text || "I processed your request.",
        agentName: result.agent_name,
        data: result.data,
        uiAction: result.ui_action,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "Connection error. Please ensure the backend is running on port 8000.",
          agentName: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  return (
    <>
      <button
        className="chat-fab"
        onClick={() => setIsOpen(!isOpen)}
        id="chat-fab"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {isOpen && (
        <div className="chat-panel" id="chat-panel">
          <div className="chat-header">
            <h3>ET Money Mentor</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="chat-messages" id="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.role === "ai" && msg.agentName && (
                  <div className="agent-tag">
                    {AGENT_LABELS[msg.agentName] || msg.agentName.replace("_", " ")}
                  </div>
                )}
                {msg.role === "ai" ? (
                  <AIResponse text={msg.text} blocks={msg.data?.ui_blocks} />
                ) : (
                  <div>{msg.text}</div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              className="chat-input"
              id="chat-input"
              placeholder="Ask about your finances..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isLoading}
            />
            <button className="chat-send" onClick={sendMessage} disabled={isLoading} id="chat-send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
