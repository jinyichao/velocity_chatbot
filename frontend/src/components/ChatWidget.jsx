import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { sendMessage } from "../api/chat";

const buildStyles = (color, offset, mobile, dark) => ({
  window: mobile ? {
    position: "relative",
    width: "100%",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: dark ? "#1a1a1a" : "#f7f8fa",
  } : {
    position: "fixed",
    bottom: 12,
    left: offset,
    width: 360,
    height: 460,
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: dark ? "#1a1a1a" : "#f7f8fa",
    border: dark ? "1px solid #3a3a3a" : "none",
    zIndex: 999,
  },
  header: {
    background: color,
    color: "#fff",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
});

const baseStyles = {
  headerInfo: { flex: 1 },
  headerName: { fontWeight: 600, fontSize: 14 },
  headerStatus: {
    fontSize: 11, opacity: 0.85, display: "flex", alignItems: "center", gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: "50%", background: "#4cff91" },
  messages: (dark) => ({
    flex: 1, overflowY: "auto", padding: "16px 12px",
    display: "flex", flexDirection: "column",
    background: dark ? "#141414" : "#f7f8fa",
  }),
  typing: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  typingDots: (dark) => ({
    display: "flex", gap: 4, padding: "10px 14px", background: dark ? "#2a2a2a" : "#fff",
    borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  }),
  dot: (delay) => ({
    width: 6, height: 6, borderRadius: "50%", background: "#999",
    animation: "bounce 1.2s infinite", animationDelay: delay,
  }),
};

function TypingIndicator({ color, dark }) {
  return (
    <div style={baseStyles.typing}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "#fff", fontWeight: 600, flexShrink: 0,
      }}>V</div>
      <div style={baseStyles.typingDots(dark)}>
        {["0s", "0.2s", "0.4s"].map((d, i) => (
          <div key={i} style={baseStyles.dot(d)} />
        ))}
      </div>
    </div>
  );
}



export default function ChatWidget({
  sessionId,
  title = "Velocity Assistant",
  label = "V",
  color = "#c8102e",
  offset = 24,
  pendingMessage = null,
  version = 2,
  mobile = false,
  dark = false,
  showHeader = true,
  assistantBg,
  intentResponses = {},
}) {
  const s = buildStyles(color, offset, mobile, dark);
  const welcome = `Hello! I'm ${title}, your OCBC business banking helper. How can I assist you today?`;

  const [messages, setMessages] = useState([{ role: "assistant", content: welcome }]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const prevKeyRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!pendingMessage || pendingMessage.key === prevKeyRef.current) return;
    prevKeyRef.current = pendingMessage.key;
    handleSend(pendingMessage.text);
  }, [pendingMessage]);

  const handleIntentClick = (intentLabel) => {
    const key = intentLabel.toLowerCase().replace(/\s+/g, "_");
    const response = intentResponses[intentLabel] || intentResponses[key];
    if (response) {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } else {
      handleSend(intentLabel);
    }
  };

  const handleSend = async (text) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await sendMessage({ message: text, sessionId, history: messages, version });
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
      <div style={s.window} role="dialog" aria-label={title}>
        {showHeader && (
          <div style={s.header}>
            <div style={s.headerAvatar}>{label}</div>
            <div style={baseStyles.headerInfo}>
              <div style={baseStyles.headerName}>{title}</div>
              <div style={baseStyles.headerStatus}>
                <span style={baseStyles.statusDot} />
                Online
              </div>
            </div>
          </div>
        )}

        <div style={baseStyles.messages(dark)}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} accentColor={color} dark={dark} assistantBg={assistantBg} onIntentClick={handleIntentClick} />
          ))}
          {loading && <TypingIndicator color={color} dark={dark} />}
          <div ref={bottomRef} />
        </div>

      </div>
    </>
  );
}
