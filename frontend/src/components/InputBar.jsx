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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#fff" />
          <path d="M19 16L19.75 18.25L22 19L19.75 19.75L19 22L18.25 19.75L16 19L18.25 18.25L19 16Z" fill="#fff" />
          <path d="M6 3L6.5 4.5L8 5L6.5 5.5L6 7L5.5 5.5L4 5L5.5 4.5L6 3Z" fill="#fff" />
        </svg>
      </button>
    </div>
  );
}
