// VITE_API_URL is the backend base URL (no trailing slash, no /api suffix)
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export async function sendMessage({ message, sessionId, history, version = 2 }) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      version,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json(); // { reply, intents, session_id, open_tasks }
}

export async function validateName(name) {
  const response = await fetch(`${API_BASE}/validate/name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json(); // { valid: bool, reason: string }
}

export async function dismissTask({ sessionId, intent }) {
  const response = await fetch(`${API_BASE}/tasks/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, intent }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json(); // { closed, open_tasks }
}
