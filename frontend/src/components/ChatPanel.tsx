"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { chatWithMentor } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  agentName?: string;
  data?: any;
  uiAction?: any;
}

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hey Rahul! 👋 I'm your AI Money Mentor. Ask me anything about your finances — taxes, investments, goals, or that bonus you just got!",
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

      // Handle UI action from agent
      if (result.ui_action?.action === "navigate" && result.ui_action?.page) {
        // Could trigger navigation here
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "Sorry, I encountered an error. Please make sure the backend is running on port 8000.",
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
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="chat-panel" id="chat-panel">
          <div className="chat-header">
            <h3>🧠 AI Money Mentor</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}
            >
              ✕
            </button>
          </div>

          <div className="chat-messages" id="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.role === "ai" && msg.agentName && (
                  <div className="agent-tag">
                    {agentEmoji(msg.agentName)} {msg.agentName.replace("_", " ")}
                  </div>
                )}
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
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
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function agentEmoji(name: string): string {
  const map: Record<string, string> = {
    fire_planner: "🔥",
    money_health: "💯",
    tax_wizard: "🧾",
    life_event: "💍",
    mf_xray: "📊",
    couple_planner: "👫",
    mentor: "🧠",
    system: "⚠️",
  };
  return map[name] || "🤖";
}
