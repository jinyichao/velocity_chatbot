import React, { useState } from "react";

export default function InputBar({ onSend, disabled, dark }) {
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

  const isEmpty = !text.trim() || disabled;

  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "10px 12px",
      borderTop: `1px solid ${dark ? "#2a2a2a" : "#e8e8e8"}`,
      background: dark ? "#1a1a1a" : "#fff", gap: 8, transition: "background 0.2s",
    }}>
      <textarea
        style={{
          flex: 1, border: `1px solid ${dark ? "#333" : "#d9d9d9"}`,
          borderRadius: 20, padding: "8px 14px", fontSize: 14, outline: "none",
          resize: "none", fontFamily: "inherit", maxHeight: 100, lineHeight: 1.4,
          background: dark ? "#252525" : "#fff", color: dark ? "#fff" : "#111",
          transition: "background 0.2s, border-color 0.2s",
        }}
        placeholder="Type a banking question..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
      />
      <button
        style={{
          width: 32, height: 32, borderRadius: "50%",
          background: isEmpty ? (dark ? "#333" : "#e0e0e0") : "#c8102e",
          border: "none", cursor: isEmpty ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "background 0.2s",
        }}
        onClick={handleSend}
        disabled={isEmpty}
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
