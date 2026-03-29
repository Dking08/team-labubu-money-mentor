const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function chatWithMentor(message: string, userId = "demo_user") {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user_id: userId }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export async function callAgent(agent: string, query = "") {
  const res = await fetch(`${API_BASE}/api/agents/${agent}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Agent request failed");
  return res.json();
}

export async function getUserProfile() {
  const res = await fetch(`${API_BASE}/api/user/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function transcribeAudio(audioBlob: Blob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  const res = await fetch(`${API_BASE}/api/voice/process`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Voice processing failed");
  return res.json();
}

export async function sendWhatsAppSummary(summary: string) {
  const res = await fetch(`${API_BASE}/api/whatsapp/send-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });
  return res.json();
}

export async function uploadFile(file: File, agentHint?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (agentHint) formData.append("agent_hint", agentHint);
  const res = await fetch(`${API_BASE}/api/upload/`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function uploadAndAnalyze(file: File, agentHint?: string, query?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (agentHint) formData.append("agent_hint", agentHint);
  if (query) formData.append("query", query);
  const res = await fetch(`${API_BASE}/api/upload/parse-and-analyze`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload and analyze failed");
  return res.json();
}

export function getWebSocketUrl() {
  const wsBase = API_BASE.replace("http", "ws");
  return `${wsBase}/api/voice/ws`;
}
