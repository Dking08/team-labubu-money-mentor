"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { transcribeAudio, sendWhatsAppSummary } from "@/lib/api";

interface TranscriptEntry {
  id: string;
  speaker: "user" | "ai";
  text: string;
  agentName?: string;
}

export default function MentorPage() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const monitorAudio = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(avg / 128);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      monitorAudio(stream);

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return;

        setStatus("processing");
        try {
          const result = await transcribeAudio(blob);
          if (result.transcript) {
            setTranscript((prev) => [...prev, {
              id: Date.now().toString(),
              speaker: "user",
              text: result.transcript,
            }]);
          }
          if (result.response?.response_text) {
            setStatus("speaking");
            setTranscript((prev) => [...prev, {
              id: (Date.now() + 1).toString(),
              speaker: "ai",
              text: result.response.response_text,
              agentName: result.response.agent_name,
            }]);
            const utterance = new SpeechSynthesisUtterance(
              result.response.response_text.slice(0, 500)
            );
            utterance.rate = 1.1;
            utterance.onend = () => setStatus("listening");
            speechSynthesis.speak(utterance);
          } else {
            setStatus("listening");
          }
        } catch {
          setStatus("listening");
        }
      };

      recorder.start();
      setIsActive(true);
      setStatus("listening");

      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 8000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, [monitorAudio]);

  const stopRecording = useCallback(() => {
    setIsActive(false);
    setStatus("idle");
    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    speechSynthesis.cancel();
  }, []);

  const handleWhatsAppSummary = useCallback(async () => {
    const summary = transcript
      .map((t) => `${t.speaker === "user" ? "You" : "AI"}: ${t.text}`)
      .join("\n\n");
    await sendWhatsAppSummary(summary);
    alert("Summary sent to WhatsApp.");
  }, [transcript]);

  const orbScale = 1 + audioLevel * 0.3;

  const statusLabels = {
    idle: "Tap the orb to start your AI meeting",
    listening: "Listening — speak naturally",
    processing: "Processing your query...",
    speaking: "AI Mentor is responding...",
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="voice-meeting-page">
          <div className="page-header" style={{ textAlign: "center" }}>
            <h1>AI Mentor Meeting</h1>
            <p>Your personal finance mentor, powered by voice AI</p>
          </div>

          <div className="voice-orb-container">
            <div className="voice-orb-ring" />
            <div className="voice-orb-ring" />
            <div className="voice-orb-ring" />
            <div
              className={`voice-orb ${isActive ? "active" : ""}`}
              onClick={isActive ? stopRecording : startRecording}
              style={{ transform: `scale(${orbScale})` }}
              id="voice-orb"
            >
              <span className="voice-orb-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {status === "idle" || status === "listening" ? (
                    <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
                  ) : status === "processing" ? (
                    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
                  ) : (
                    <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                  )}
                </svg>
              </span>
            </div>
          </div>

          <div className={`voice-status ${status}`} id="voice-status">
            {statusLabels[status]}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {isActive && (
              <button className="btn-ghost" onClick={stopRecording} style={{ color: "#f87171" }}>
                End Meeting
              </button>
            )}
            {transcript.length > 0 && (
              <button className="btn-gradient" onClick={handleWhatsAppSummary}>
                Send to WhatsApp
              </button>
            )}
          </div>

          {transcript.length > 0 && (
            <div className="glass-card transcript-panel" id="transcript-panel">
              <h3 style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
                Live Transcript
              </h3>
              {transcript.map((entry) => (
                <div className="transcript-item" key={entry.id}>
                  <div className={`transcript-speaker ${entry.speaker}`}>
                    {entry.speaker === "user" ? "You" : (entry.agentName || "AI Mentor")}
                  </div>
                  <div className="transcript-text">{entry.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
