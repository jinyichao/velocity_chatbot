import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";
import InputBar from "./components/InputBar";
import LoginPage from "./pages/LoginPage";
import { getToken, getUsername, clearSession } from "./api/auth";
import { QUICK_REPLIES, MULTI_INTENT_REPLIES, MULTI_INTENT_3_REPLIES, HALLUCINATION_REPLIES, OUT_OF_SCOPE_REPLIES } from "./data/quickReplies";

const SESSION_A = uuidv4();
const SESSION_B = uuidv4();
const SESSION_C = uuidv4();

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    position: "fixed",
    top: "38%",
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    pointerEvents: "none",
  },
  logo: { fontWeight: 700, fontSize: 28, color: "#c8102e", marginBottom: 8 },
  sub: { fontSize: 15, color: "#666" },
  sharedInput: {
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    width: 820,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    zIndex: 1001,
    overflow: "hidden",
  },
  inputLabel: {
    padding: "6px 12px 6px 16px",
    fontSize: 11,
    color: "#999",
    borderBottom: "1px solid #f0f0f0",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    fontSize: 11,
    color: "#c8102e",
    cursor: "pointer",
    padding: 0,
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  chipsPanel: {
    padding: "10px 14px 12px",
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  chipGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  chipGroupLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#bbb",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginRight: 2,
    whiteSpace: "nowrap",
  },
};

function Chip({ label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 11px",
        borderRadius: 14,
        border: "1.5px solid #c8102e",
        background: hovered ? "#c8102e" : "#fff",
        color: hovered ? "#fff" : "#c8102e",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [username, setUsername] = useState(getUsername() || "");
  const [pendingMessage, setPendingMessage] = useState(null);

  const handleLogin = (user) => {
    setUsername(user);
    setAuthed(true);
  };

  const handleLogout = () => {
    clearSession();
    setAuthed(false);
    setUsername("");
  };

  const handleSharedSend = (text) => {
    setPendingMessage({ text, key: Date.now() });
  };

  if (!authed) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.placeholder}>
        <div style={styles.logo}>OCBC Velocity</div>
        <div style={styles.sub}>Business Banking Platform</div>
      </div>

      <ChatWidget
        sessionId={SESSION_A}
        title="V1 · Traditional NLP"
        label="V1"
        color="#c8102e"
        offset={784}
        pendingMessage={pendingMessage}
        version={1}
      />

      <ChatWidget
        sessionId={SESSION_B}
        title="V2 · GenAI Controlled Out"
        label="V2"
        color="#0057a8"
        offset={404}
        pendingMessage={pendingMessage}
        version={2}
      />

      <ChatWidget
        sessionId={SESSION_C}
        title="V3 · Free Text Out"
        label="V3"
        color="#00703c"
        offset={24}
        pendingMessage={pendingMessage}
        version={3}
      />

      {/* Shared input — sends to all three */}
      <div style={styles.sharedInput}>
        <div style={styles.inputLabel}>
          <span>Sends to all · {username}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
        <InputBar onSend={handleSharedSend} />
        <div style={styles.chipsPanel}>
          <div style={styles.chipGroup}>
            <span style={styles.chipGroupLabel}>Single</span>
            {QUICK_REPLIES.map(({ label, query }) => (
              <Chip key={label} label={label} onClick={() => handleSharedSend(query)} />
            ))}
          </div>
          <div style={styles.chipGroup}>
            <span style={styles.chipGroupLabel}>Multi ×2</span>
            {MULTI_INTENT_REPLIES.map(({ label, query }) => (
              <Chip key={label} label={label} onClick={() => handleSharedSend(query)} />
            ))}
          </div>
          <div style={styles.chipGroup}>
            <span style={styles.chipGroupLabel}>Multi ×3+</span>
            {MULTI_INTENT_3_REPLIES.map(({ label, query }) => (
              <Chip key={label} label={label} onClick={() => handleSharedSend(query)} />
            ))}
          </div>
          <div style={styles.chipGroup}>
            <span style={styles.chipGroupLabel}>OOS</span>
            {OUT_OF_SCOPE_REPLIES.map(({ label, query }) => (
              <Chip key={label} label={label} onClick={() => handleSharedSend(query)} />
            ))}
          </div>
          <div style={styles.chipGroup}>
            <span style={styles.chipGroupLabel}>Hallucination</span>
            {HALLUCINATION_REPLIES.map(({ label, query }) => (
              <Chip key={label} label={label} onClick={() => handleSharedSend(query)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
