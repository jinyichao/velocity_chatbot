import React, { useState } from "react";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderTop: "1px solid #e8e8e8",
    background: "#fff",
    gap: 8,
  },
  input: {
    flex: 1,
    border: "1px solid #d9d9d9",
    borderRadius: 20,
    padding: "8px 14px",
    fontSize: 14,
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    maxHeight: 100,
    lineHeight: 1.4,
  },
  sendBtn: (disabled) => ({
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: disabled ? "#e0e0e0" : "#c8102e",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.2s",
  }),
};

export default function InputBar({ onSend, disabled }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      <textarea
        style={styles.input}
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
      />
      <button
        style={styles.sendBtn(!text.trim() || disabled)}
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        aria-label="Send"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
