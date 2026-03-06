import React from "react";

const styles = {
  row: (role) => ({
    display: "flex",
    justifyContent: role === "user" ? "flex-end" : "flex-start",
    marginBottom: 8,
    alignItems: "flex-end",
    gap: 8,
  }),
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#c8102e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 12,
    color: "#fff",
    fontWeight: 600,
  },
  bubble: (role, color) => ({
    maxWidth: "72%",
    padding: "10px 14px",
    borderRadius: role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    background: role === "user" ? color : "#fff",
    color: role === "user" ? "#fff" : "#1a1a1a",
    fontSize: 14,
    lineHeight: 1.5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }),
};

function renderContent(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

export default function MessageBubble({ message, accentColor = "#c8102e" }) {
  const { role, content } = message;
  return (
    <div style={styles.row(role)}>
      {role === "assistant" && (
        <div style={{ ...styles.avatar, background: accentColor }}>V</div>
      )}
      <div style={styles.bubble(role, accentColor)}>{renderContent(content)}</div>
    </div>
  );
}
