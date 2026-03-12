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
  bubble: (role, color, dark, assistantBg) => ({
    maxWidth: "72%",
    padding: "10px 14px",
    borderRadius: role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    background: role === "user" ? color : (dark ? "#252525" : (assistantBg || "#fff")),
    color: role === "user" ? "#fff" : (dark ? "#f0f0f0" : "#1a1a1a"),
    fontSize: 14,
    lineHeight: 1.5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }),
};

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
      : part
  );
}

function renderContent(text) {
  const lines = text.split("\n");
  const result = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    result.push(
      <ul key={`list-${result.length}`} style={{ listStyle: "none", padding: 0, margin: "4px 0" }}>
        {listItems}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const checkedMatch = line.match(/^- \[x\] (.+)/i);
    const uncheckedMatch = line.match(/^- \[ \] (.+)/);
    const labelMatch = line.match(/^> (.+)/);

    if (checkedMatch) {
      listItems.push(
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#00703c", fontSize: 16, lineHeight: "1.4", flexShrink: 0 }}>✅</span>
          <span style={{ lineHeight: "1.4" }}>{renderInline(checkedMatch[1], i)}</span>
        </li>
      );
    } else if (uncheckedMatch) {
      listItems.push(
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#aaa", fontSize: 16, lineHeight: "1.4", flexShrink: 0 }}>⬜</span>
          <span style={{ lineHeight: "1.4" }}>{renderInline(uncheckedMatch[1], i)}</span>
        </li>
      );
    } else {
      flushList();
      if (labelMatch) {
        result.push(
          <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "#aaa", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
            {labelMatch[1]}
          </div>
        );
      } else {
        result.push(<span key={i}>{renderInline(line, i)}{"\n"}</span>);
      }
    }
  });
  flushList();
  return result;
}

function parseIntents(content) {
  if (!content.startsWith("Intent identified:")) return null;
  const lines = content.split("\n").slice(1);
  const intents = lines
    .map(l => l.match(/^[•\-]\s*\*?\*?(.+?)\*?\*?$/))
    .filter(Boolean)
    .map(m => m[1].trim());
  return intents.length > 0 ? intents : null;
}

function IntentBubbles({ intents, accentColor, dark, onIntentClick }) {
  return (
    <div style={{
      background: dark ? "#252525" : "#fff",
      borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      maxWidth: "72%",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: dark ? "#888" : "#aaa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        Intent identified
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {intents.map((intent) => (
          <div key={intent} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: accentColor, fontSize: 16, lineHeight: 1 }}>•</span>
            <button style={{
              display: "inline-flex", alignItems: "center",
              padding: "6px 14px",
              borderRadius: 20,
              background: "transparent",
              border: `1.5px solid ${accentColor}`,
              color: accentColor,
              fontSize: 13, fontWeight: 600,
              letterSpacing: "0.01em",
              cursor: onIntentClick ? "pointer" : "default",
              fontFamily: "inherit",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accentColor; }}
            onClick={() => onIntentClick && onIntentClick(intent)}
            >
              {intent}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MessageBubble({ message, accentColor = "#c8102e", dark = false, assistantBg, onIntentClick }) {
  const { role, content } = message;
  const intents = role === "assistant" ? parseIntents(content) : null;
  return (
    <div style={styles.row(role)}>
      {role === "assistant" && (
        <div style={{ ...styles.avatar, background: accentColor }}>V</div>
      )}
      {intents
        ? <IntentBubbles intents={intents} accentColor={accentColor} dark={dark} onIntentClick={onIntentClick} />
        : <div style={styles.bubble(role, accentColor, dark, assistantBg)}>{renderContent(content)}</div>
      }
    </div>
  );
}
