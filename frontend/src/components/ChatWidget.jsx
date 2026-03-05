import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { sendMessage } from "../api/chat";

const WELCOME = "Hello! I'm Velocity Assistant, your OCBC business banking helper. How can I assist you today?";

const styles = {
  fab: (open) => ({
    position: "fixed",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#c8102e",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(200,16,46,0.4)",
    zIndex: 1000,
    transition: "transform 0.2s",
    transform: open ? "scale(0.9)" : "scale(1)",
  }),
  window: (open) => ({
    position: "fixed",
    bottom: 90,
    right: 24,
    width: 360,
    height: 520,
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#f7f8fa",
    zIndex: 999,
    opacity: open ? 1 : 0,
    pointerEvents: open ? "all" : "none",
    transform: open ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
    transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
  }),
  header: {
    background: "#c8102e",
    color: "#fff",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontWeight: 600,
    fontSize: 15,
  },
  headerStatus: {
    fontSize: 11,
    opacity: 0.85,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#4cff91",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    padding: 4,
    borderRadius: "50%",
    display: "flex",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
  },
  typing: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  typingDots: {
    display: "flex",
    gap: 4,
    padding: "10px 14px",
    background: "#fff",
    borderRadius: "18px 18px 18px 4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  dot: (delay) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#999",
    animation: "bounce 1.2s infinite",
    animationDelay: delay,
  }),
};

function TypingIndicator() {
  return (
    <div style={styles.typing}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#c8102e",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "#fff", fontWeight: 600, flexShrink: 0 }}>V</div>
      <div style={styles.typingDots}>
        {["0s", "0.2s", "0.4s"].map((d, i) => (
          <div key={i} style={styles.dot(d)} />
        ))}
      </div>
    </div>
  );
}

export default function ChatWidget({ sessionId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendMessage({
        message: text,
        sessionId,
        history: messages,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Floating Action Button */}
      <button style={styles.fab(open)} onClick={() => setOpen((v) => !v)} aria-label="Chat">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              fill="#fff" fillOpacity="0.9" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      <div style={styles.window(open)} role="dialog" aria-label="Velocity Assistant">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerAvatar}>V</div>
          <div style={styles.headerInfo}>
            <div style={styles.headerName}>Velocity Assistant</div>
            <div style={styles.headerStatus}>
              <span style={styles.statusDot} />
              Online
            </div>
          </div>
          <button style={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <InputBar onSend={handleSend} disabled={loading} />
      </div>
    </>
  );
}
