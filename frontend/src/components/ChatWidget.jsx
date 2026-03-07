import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { sendMessage } from "../api/chat";
import { QUICK_REPLIES, MULTI_INTENT_REPLIES, OUT_OF_SCOPE_REPLIES } from "../data/quickReplies";

const buildStyles = (color, offset) => ({
  window: {
    position: "fixed",
    bottom: 24,
    right: offset,
    width: 360,
    height: 520,
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#f7f8fa",
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
  messages: {
    flex: 1, overflowY: "auto", padding: "16px 12px",
    display: "flex", flexDirection: "column",
  },
  typing: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  typingDots: {
    display: "flex", gap: 4, padding: "10px 14px", background: "#fff",
    borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  dot: (delay) => ({
    width: 6, height: 6, borderRadius: "50%", background: "#999",
    animation: "bounce 1.2s infinite", animationDelay: delay,
  }),
};

function TypingIndicator({ color }) {
  return (
    <div style={baseStyles.typing}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "#fff", fontWeight: 600, flexShrink: 0,
      }}>V</div>
      <div style={baseStyles.typingDots}>
        {["0s", "0.2s", "0.4s"].map((d, i) => (
          <div key={i} style={baseStyles.dot(d)} />
        ))}
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange, color }) {
  return (
    <div style={{
      display: "flex",
      background: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      padding: 2,
      gap: 2,
    }}>
      {["chat", "interactive"].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "3px 10px",
            borderRadius: 16,
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.03em",
            background: mode === m ? "#fff" : "transparent",
            color: mode === m ? color : "rgba(255,255,255,0.8)",
            transition: "all 0.15s",
          }}
        >
          {m === "chat" ? "Chat" : "Interactive"}
        </button>
      ))}
    </div>
  );
}

function ChipGroup({ title, chips, onSend, loading, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#aaa",
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
      }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {chips.map(({ label, query }) => (
          <button
            key={label}
            onClick={() => onSend(query)}
            disabled={loading}
            style={{
              padding: "5px 12px",
              borderRadius: 16,
              border: `1.5px solid ${color}`,
              background: "#fff",
              color: color,
              fontSize: 12,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = color;
                e.target.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#fff";
              e.target.style.color = color;
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InteractivePanel({ onSend, loading, color }) {
  return (
    <div style={{
      borderTop: "1px solid #e8e8e8",
      background: "#fff",
      padding: "12px 14px",
      overflowY: "auto",
      maxHeight: 180,
    }}>
      <ChipGroup title="Single intent" chips={QUICK_REPLIES} onSend={onSend} loading={loading} color={color} />
      <ChipGroup title="Multi-intent" chips={MULTI_INTENT_REPLIES} onSend={onSend} loading={loading} color={color} />
      <ChipGroup title="Out of scope" chips={OUT_OF_SCOPE_REPLIES} onSend={onSend} loading={loading} color={color} />
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
}) {
  const s = buildStyles(color, offset);
  const welcome = `Hello! I'm ${title}, your OCBC business banking helper. How can I assist you today?`;

  const [messages, setMessages] = useState([{ role: "assistant", content: welcome }]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("chat");
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
        <div style={s.header}>
          <div style={s.headerAvatar}>{label}</div>
          <div style={baseStyles.headerInfo}>
            <div style={baseStyles.headerName}>{title}</div>
            <div style={baseStyles.headerStatus}>
              <span style={baseStyles.statusDot} />
              Online
            </div>
          </div>
          <ModeToggle mode={mode} onChange={setMode} color={color} />
        </div>

        <div style={baseStyles.messages}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} accentColor={color} />
          ))}
          {loading && <TypingIndicator color={color} />}
          <div ref={bottomRef} />
        </div>

        {mode === "interactive" && (
          <InteractivePanel onSend={handleSend} loading={loading} color={color} />
        )}
      </div>
    </>
  );
}
