import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";
import InputBar from "./components/InputBar";

const SESSION_A = uuidv4();
const SESSION_B = uuidv4();

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
    bottom: 24,
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
    padding: "6px 16px",
    fontSize: 11,
    color: "#999",
    borderBottom: "1px solid #f0f0f0",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
};

export default function App() {
  const [pendingMessage, setPendingMessage] = useState(null);

  const handleSharedSend = (text) => {
    setPendingMessage({ text, key: Date.now() });
  };

  return (
    <div style={styles.page}>
      <div style={styles.placeholder}>
        <div style={styles.logo}>OCBC Velocity</div>
        <div style={styles.sub}>Business Banking Platform</div>
      </div>

      <ChatWidget
        sessionId={SESSION_A}
        title="Velocity Assistant v1"
        label="V1"
        color="#c8102e"
        offset={404}
        pendingMessage={pendingMessage}
      />

      <ChatWidget
        sessionId={SESSION_B}
        title="Velocity Assistant v2"
        label="V2"
        color="#0057a8"
        offset={24}
        pendingMessage={pendingMessage}
      />

      {/* Shared input between the two windows */}
      <div style={styles.sharedInput}>
        <div style={styles.inputLabel}>Shared input — sends to both</div>
        <InputBar onSend={handleSharedSend} />
      </div>
    </div>
  );
}
