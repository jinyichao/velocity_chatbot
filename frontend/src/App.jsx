import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";

// Generate a session ID once per page load
const SESSION_ID = uuidv4();

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    textAlign: "center",
    color: "#888",
  },
  logo: {
    fontWeight: 700,
    fontSize: 28,
    color: "#c8102e",
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: "#666",
  },
};

export default function App() {
  return (
    <div style={styles.page}>
      <div style={styles.placeholder}>
        <div style={styles.logo}>OCBC Velocity</div>
        <div style={styles.sub}>Business Banking Platform</div>
      </div>
      <ChatWidget sessionId={SESSION_ID} />
    </div>
  );
}
