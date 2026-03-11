import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";
import InputBar from "./components/InputBar";
import LoginPage from "./pages/LoginPage";
import { getToken, getUsername, clearSession } from "./api/auth";
import { QUICK_REPLIES, MULTI_INTENT_3_REPLIES, HALLUCINATION_REPLIES, OUT_OF_SCOPE_REPLIES, MULTILINGUAL_REPLIES } from "./data/quickReplies";

const SESSION_A = uuidv4();
const SESSION_B = uuidv4();
const SESSION_C = uuidv4();

const WIDGETS = [
  { sessionId: SESSION_A, title: "NLU-Based Engine",         label: "V1", color: "#c8102e", darkColor: "#8b2a3a", version: 1 },
  { sessionId: SESSION_B, title: "Gen-AI Powered Engine",    label: "V2", color: "#0057a8", darkColor: "#2a5a8b", version: 2 },
  { sessionId: SESSION_C, title: "Gen AI Knowledge Chatbot", label: "V3", color: "#00703c", darkColor: "#1a6b45", version: 3 },
];

const WIDGET_INFO = [
  {
    description: "TF-IDF vectorisation with cosine similarity.\nClassifies into 9 intents with confidence scoring.",
    tags: [
      { label: "Baseline", color: "#c8102e" },
      { label: "Low latency", color: "#00703c" },
      { label: "No API cost", color: "#0057a8" },
    ],
    pros: ["Fast, deterministic, no external dependency", "Full control over training data"],
    cons: ["Limited to trained intents only", "Struggles with ambiguous queries"],
  },
  {
    description: "LLM intent classification with structured output.\nReturns interactive buttons for matched intents.",
    tags: [
      { label: "Multi-language", color: "#00703c" },
      { label: "Multi-intent", color: "#0057a8" },
    ],
    pros: ["Handles unseen phrasings gracefully", "Well-controlled, structured output", "Fewer training data required"],
    cons: ["API latency & cost per request"],
  },
  {
    description: "LLM with ocbc.com knowledge base. Free-form answers with cited sources, scoped to 9 intents.",
    tags: [
      { label: "Knowledge-grounded", color: "#0057a8" },
      { label: "RAG-style", color: "#7c3aed" },
    ],
    pros: ["Better customer experience", "More intelligent, natural responses"],
    cons: ["Higher risk of hallucination", "Harder to audit & govern output"],
  },
];

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: dark ? "#333" : "#e8e8e8",
        border: "none", borderRadius: 20,
        width: 44, height: 24,
        cursor: "pointer", display: "flex", alignItems: "center",
        padding: "0 3px", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: dark ? "#fff" : "#555",
        transform: dark ? "translateX(20px)" : "translateX(0)",
        transition: "transform 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11,
      }}>
        {dark ? "☀" : "🌙"}
      </div>
    </button>
  );
}

function Chip({ label, onClick, dark }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 11px",
        borderRadius: 14,
        border: `1.5px solid ${dark ? "#555" : "#c8102e"}`,
        background: hovered ? (dark ? "#444" : "#c8102e") : (dark ? "#1e1e1e" : "#fff"),
        color: hovered ? "#fff" : (dark ? "#bbb" : "#c8102e"),
        fontSize: 12, fontWeight: 500,
        cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Navbar({ dark, onToggleDark, onLogout }) {
  const border = dark ? "#2a2a2a" : "#e8e8e8";
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1100,
      background: dark ? "#141414" : "#fff",
      borderBottom: `1px solid ${border}`,
      height: 60, display: "flex", alignItems: "center", padding: "0 28px", gap: 14,
      transition: "background 0.2s",
    }}>
      <img src="/ocbc-logo-color.svg" alt="OCBC" style={{ height: 28 }} />
      <div style={{ width: 1, height: 24, background: border }} />
      <span style={{ fontSize: 15, fontWeight: 500, color: dark ? "#888" : "#555", letterSpacing: "-0.2px" }}>
        Chatbot Technology Benchmark
      </span>
      <div style={{ flex: 1 }} />
      <ThemeToggle dark={dark} onToggle={onToggleDark} />
      <button
        onClick={onLogout}
        style={{ background: "none", border: "none", fontSize: 13, color: dark ? "#888" : "#555", cursor: "pointer", padding: "6px 0 6px 8px", fontFamily: "inherit" }}
      >
        Sign Out
      </button>
    </div>
  );
}

function WarningBanner({ onDismiss, dark }) {
  return (
    <div style={{
      position: "fixed", top: 60, left: 0, right: 0, zIndex: 1050,
      background: dark ? "#1c1500" : "#fffbeb",
      borderBottom: `1px solid ${dark ? "#4a3800" : "#fde68a"}`,
      padding: "9px 28px", display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, color: dark ? "#c8a000" : "#92400e",
    }}>
      <span>⚠</span>
      <span style={{ flex: 1 }}>
        This application is hosted outside of OCBC's environment and is intended for demonstration purposes only.
      </span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "inherit", padding: "0 4px", lineHeight: 1, opacity: 0.6 }}>×</button>
    </div>
  );
}

function PhoneFrame({ children, dark, visible }) {
  return (
    <div style={{
      width: 300, height: 550,
      borderRadius: 40,
      border: `3px solid ${dark ? (visible ? "#555" : "#2a2a2a") : (visible ? "#1a1a1a" : "#d0d0d0")}`,
      overflow: "hidden", position: "relative", flexShrink: 0,
      opacity: visible ? 1 : 0.3,
      transition: "opacity 0.2s, border-color 0.2s",
      background: dark ? "#141414" : "#f0f0f0",
    }}>
      {/* Notch */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        width: 72, height: 22,
        background: dark ? "#555" : "#1a1a1a",
        borderRadius: 11, zIndex: 10,
      }} />
      {/* Home indicator */}
      <div style={{
        position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
        width: 72, height: 4,
        background: dark ? "#555" : "#333",
        borderRadius: 2, zIndex: 10,
      }} />
      {/* Content area */}
      <div style={{
        paddingTop: 48, paddingBottom: 22,
        height: "100%", boxSizing: "border-box",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function InfoCard({ widget, info, dark, visible, onToggle }) {
  const color = dark ? widget.darkColor : widget.color;
  const t = {
    bg:     dark ? "#1a1a1a" : "#fff",
    border: dark ? "#2a2a2a" : "#e8e8e8",
    title:  dark ? "#f0f0f0" : "#111",
    desc:   dark ? "#888"    : "#666",
    pros:   dark ? "#5cb85c" : "#00703c",
    cons:   dark ? "#cc5555" : "#c8102e",
  };
  return (
    <div style={{
      width: 300, background: t.bg,
      border: `1px solid ${t.border}`, borderRadius: 12,
      padding: 16, boxSizing: "border-box", transition: "background 0.2s", flex: 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.title }}>{widget.title}</div>
        <button onClick={onToggle} style={{
          background: visible ? color : "transparent",
          border: `1.5px solid ${color}`,
          borderRadius: 8, padding: "2px 9px",
          fontSize: 10, fontWeight: 700,
          color: visible ? "#fff" : color,
          cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
        }}>{visible ? "Hide" : "Show"}</button>
      </div>
      <div style={{ fontSize: 12, color: t.desc, marginBottom: 12, lineHeight: 1.6, whiteSpace: "pre-line" }}>{info.description}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {info.tags.map(tag => (
          <span key={tag.label} style={{
            fontSize: 11, fontWeight: 600, padding: "2px 9px",
            borderRadius: 10, border: `1.5px solid ${tag.color}`, color: tag.color,
          }}>{tag.label}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {info.pros.map(p => <div key={p} style={{ fontSize: 12, color: t.pros }}>+ {p}</div>)}
        {info.cons.map(c => <div key={c} style={{ fontSize: 12, color: t.cons }}>− {c}</div>)}
      </div>
    </div>
  );
}

function MobileLayout({ username, onLogout, dark, onToggleDark }) {
  const [activeTab, setActiveTab] = useState(1);
  const [pendingMessages, setPendingMessages] = useState([null, null, null]);

  const handleSend = (text) => {
    const msg = { text, key: Date.now() };
    setPendingMessages([msg, msg, msg]);
  };

  const t = {
    bg:         dark ? "#141414" : "#f4f6f8",
    panelBg:    dark ? "#1e1e1e" : "#fff",
    border:     dark ? "#2a2a2a" : "#e8e8e8",
    labelColor: dark ? "#888"   : "#999",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: t.bg, transition: "background 0.2s" }}>
      <div style={{ position: "fixed", top: 8, right: 12, zIndex: 1100 }}>
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
      </div>
      <div style={{ display: "flex", background: t.panelBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0, paddingTop: 20, transition: "background 0.2s" }}>
        {WIDGETS.map((w, i) => (
          <button key={w.label} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: "12px 0", border: "none",
            borderBottom: activeTab === i ? `3px solid ${w.color}` : "3px solid transparent",
            background: "none",
            color: activeTab === i ? w.color : (dark ? "#666" : "#888"),
            fontWeight: activeTab === i ? 700 : 500,
            fontSize: 14, cursor: "pointer", transition: "all 0.15s",
          }}>
            {w.label}
          </button>
        ))}
      </div>
      {WIDGETS.map((w, i) => (
        <div key={w.sessionId} style={{ display: activeTab === i ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column" }}>
          <ChatWidget sessionId={w.sessionId} title={w.title} label={w.label} color={dark ? w.darkColor : w.color}
            pendingMessage={pendingMessages[i]} version={w.version} mobile={true} dark={dark} />
        </div>
      ))}
      <div style={{ background: t.panelBg, borderTop: `1px solid ${t.border}`, flexShrink: 0, transition: "background 0.2s" }}>
        <div style={{ padding: "6px 12px 6px 16px", fontSize: 11, color: t.labelColor, borderBottom: `1px solid ${t.border}`, letterSpacing: "0.05em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Sends to all · {username}</span>
          <button style={{ background: "none", border: "none", fontSize: 11, color: "#c8102e", cursor: "pointer", padding: 0, fontWeight: 600, letterSpacing: "0.05em" }} onClick={onLogout}>Sign Out</button>
        </div>
        <InputBar onSend={handleSend} dark={dark} />
        <div style={{ overflowX: "auto", padding: "6px 14px 12px", borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap", minWidth: "max-content" }}>
            {[...QUICK_REPLIES, ...MULTI_INTENT_3_REPLIES, ...OUT_OF_SCOPE_REPLIES, ...HALLUCINATION_REPLIES, ...MULTILINGUAL_REPLIES].map(({ label, query }) => (
              <Chip key={label} label={label} onClick={() => handleSend(query)} dark={dark} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [username, setUsername] = useState(getUsername() || "");
  const [pendingMessage, setPendingMessage] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [dark, setDark] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState([true, true, true]);
  const [showBanner, setShowBanner] = useState(true);
  const toggleWidget = (i) => setVisibleWidgets(v => v.map((val, idx) => idx === i ? !val : val));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogin = (user) => { setUsername(user); setAuthed(true); };
  const handleLogout = () => { clearSession(); setAuthed(false); setUsername(""); };
  const handleSharedSend = (text) => setPendingMessage({ text, key: Date.now() });

  if (!authed) return <LoginPage onLogin={handleLogin} />;
  if (isMobile) return <MobileLayout username={username} onLogout={handleLogout} dark={dark} onToggleDark={() => setDark(v => !v)} />;

  const t = {
    bg:                  dark ? "#0f0f0f" : "#f0f0f0",
    panelBg:             dark ? "#1a1a1a" : "#fff",
    border:              dark ? "#2a2a2a" : "#e8e8e8",
    labelColor:          dark ? "#888"   : "#999",
    chipGroupLabelColor: dark ? "#888"   : "#bbb",
  };

  const bannerH = showBanner ? 40 : 0;
  const topOffset = 60 + bannerH;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, transition: "background 0.2s", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <Navbar dark={dark} onToggleDark={() => setDark(v => !v)} onLogout={handleLogout} />
      {showBanner && <WarningBanner onDismiss={() => setShowBanner(false)} dark={dark} />}

      {/* Scrollable content */}
      <div style={{ paddingTop: topOffset + 36, paddingBottom: 110, display: "flex", justifyContent: "center", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
          {WIDGETS.map((w, i) => (
            <div key={w.sessionId} style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
              <PhoneFrame dark={dark} visible={visibleWidgets[i]}>
                <ChatWidget
                  sessionId={w.sessionId}
                  title={w.title}
                  label={w.label}
                  color={dark ? w.darkColor : w.color}
                  pendingMessage={visibleWidgets[i] ? pendingMessage : null}
                  version={w.version}
                  mobile={true}
                  dark={dark}
                  showHeader={false}
                />
              </PhoneFrame>
              <InfoCard
                widget={w}
                info={WIDGET_INFO[i]}
                dark={dark}
                visible={visibleWidgets[i]}
                onToggle={() => toggleWidget(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fixed bottom input bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: t.panelBg, borderTop: `1px solid ${t.border}`,
        zIndex: 1001, transition: "background 0.2s",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ padding: "6px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: t.labelColor, letterSpacing: "0.05em", textTransform: "uppercase" }}>{username}</span>
            <button onClick={() => setShowChips(v => !v)} style={{ background: "none", border: "none", fontSize: 11, color: t.labelColor, cursor: "pointer", padding: 0, letterSpacing: "0.05em" }}>
              {showChips ? "▲ Hide chips" : "▼ Show chips"}
            </button>
          </div>
          <InputBar onSend={handleSharedSend} dark={dark} />
          {showChips && (
            <div style={{ padding: "6px 16px 14px", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
              {[
                { groupLabel: "Single",       items: QUICK_REPLIES },
                { groupLabel: "Multi ×3+",    items: MULTI_INTENT_3_REPLIES },
                { groupLabel: "Tricks",        items: [...OUT_OF_SCOPE_REPLIES, ...HALLUCINATION_REPLIES] },
                { groupLabel: "Multilingual",  items: MULTILINGUAL_REPLIES },
              ].map(({ groupLabel, items }) => (
                <div key={groupLabel} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.chipGroupLabelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2, whiteSpace: "nowrap" }}>{groupLabel}</span>
                  {items.map(({ label, query }) => (
                    <Chip key={label} label={label} onClick={() => handleSharedSend(query)} dark={dark} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
