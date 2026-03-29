"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadFile } from "@/lib/api";

interface FileUploadProps {
  agentHint?: string;
  onResult?: (data: any) => void;
  compact?: boolean;
}

interface UploadHistoryItem {
  filename: string;
  agent: string;
  suggestedAgent?: string;
  uploadedAt: string;
}

const UPLOAD_HISTORY_KEY = "et-money-mentor.upload-history";

export default function FileUpload({ agentHint, onResult, compact }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(UPLOAD_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UploadHistoryItem[];
      const filtered = agentHint
        ? parsed.filter((item) => item.agent === agentHint).slice(0, 3)
        : parsed.slice(0, 3);
      setHistory(filtered);
    } catch {
      setHistory([]);
    }
  }, [agentHint]);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const data = await uploadFile(file, agentHint);
      setResult(data);
      if (typeof window !== "undefined") {
        const nextEntry: UploadHistoryItem = {
          filename: data?.filename || file.name,
          agent: agentHint || "general",
          suggestedAgent: data?.suggested_agent,
          uploadedAt: new Date().toISOString(),
        };
        const raw = window.localStorage.getItem(UPLOAD_HISTORY_KEY);
        const existing = raw ? (JSON.parse(raw) as UploadHistoryItem[]) : [];
        const next = [nextEntry, ...existing.filter((item) => !(item.filename === nextEntry.filename && item.agent === nextEntry.agent))].slice(0, 12);
        window.localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(next));
        setHistory(next.filter((item) => !agentHint || item.agent === agentHint).slice(0, 3));
      }
      onResult?.(data);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [agentHint, onResult]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div className={`file-upload ${compact ? "compact" : ""}`}>
      {history.length > 0 && (
        <div style={{ marginBottom: 12, padding: compact ? "10px 12px" : "14px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-glass-strong)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-accent)", marginBottom: 8 }}>
            Recent Parsed Documents
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((item) => (
              <div key={`${item.agent}-${item.filename}-${item.uploadedAt}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.filename}</div>
                <div style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {new Date(item.uploadedAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`file-upload-zone ${isDragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="file-upload-status">
            <div className="file-upload-spinner" />
            <span>Parsing with AI...</span>
          </div>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="file-upload-text">
              {compact
                ? "Drop file or click to upload"
                : "Drag and drop your financial document here"}
            </div>
            <div className="file-upload-hint">
              PDF, images, CSV, XLSX — CAMS, Form 16, statements
            </div>
          </>
        )}
      </div>

      {error && <div className="file-upload-error">{error}</div>}

      {result && result.status === "parsed" && (
        <div className="file-upload-result">
          <div className="file-upload-result-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Parsed: {result.filename}</span>
            <span className="file-upload-agent-tag">
              Agent: {result.suggested_agent}
            </span>
          </div>
          {result.parsed_data && (
            <pre className="file-upload-preview">
              {JSON.stringify(result.parsed_data, null, 2).slice(0, 500)}
              {JSON.stringify(result.parsed_data, null, 2).length > 500 ? "\n..." : ""}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
