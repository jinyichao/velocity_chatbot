import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";
import InputBar from "./components/InputBar";
import LoginPage from "./pages/LoginPage";
import { getToken, getUsername, clearSession } from "./api/auth";

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
  placeholder: { textAlign: "center" },
  logo: { fontWeight: 700, fontSize: 28, color: "#c8102e", marginBottom: 8 },
  sub: { fontSize: 15, color: "#666" },
  sharedInput: {
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    width: 480,
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
    gap: 8,
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
};


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
          <div style={styles.labelLeft}>
            <span>Sends to all · {username}</span>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
        <InputBar onSend={handleSharedSend} />
      </div>
    </div>
  );
}
