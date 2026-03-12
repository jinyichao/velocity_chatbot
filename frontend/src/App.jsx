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

const NAV_TABS = [
  { id: "benchmark",  label: "Chatbot Technology Benchmark" },
  { id: "journey",    label: "Service AI Chatbot Journey" },
];

function Navbar({ dark, onToggleDark, onLogout, activeTab, onTabChange }) {
  const border = dark ? "#2a2a2a" : "#e8e8e8";
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1100,
      background: dark ? "#141414" : "#fff",
      borderBottom: `1px solid ${border}`,
      height: 60, display: "flex", alignItems: "center", padding: "0 28px", gap: 0,
      transition: "background 0.2s",
    }}>
      <img src="/ocbc-logo-color.svg" alt="OCBC" style={{ height: 28, marginRight: 20 }} />
      {NAV_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: "none", border: "none",
              borderBottom: active ? "2px solid #c8102e" : "2px solid transparent",
              height: 60, padding: "0 18px",
              fontSize: 14, fontWeight: active ? 600 : 400,
              color: active ? (dark ? "#f0f0f0" : "#111") : (dark ? "#666" : "#888"),
              cursor: "pointer", transition: "all 0.15s",
              letterSpacing: "-0.2px", whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <ThemeToggle dark={dark} onToggle={onToggleDark} />
      <button
        onClick={onLogout}
        style={{ background: "none", border: "none", fontSize: 13, color: dark ? "#888" : "#555", cursor: "pointer", padding: "6px 0 6px 12px", fontFamily: "inherit" }}
      >
        Sign Out
      </button>
    </div>
  );
}

const VELOCITY_NAV = ["Home", "Accounts", "Pay and transfer", "FX and treasury", "Invoices", "Trade finance", "Tools", "Administration"];
const JOURNEY_USERS = [
  { name: "Peter Poh Wen Xiang", sub: "", ap: true,  as: false, role: "Maker and Authoriser" },
  { name: "Alex Loh", sub: "Entity's contact person\nBusiness online banking contact person", ap: true, as: true, role: "Maker and Authoriser" },
  { name: "Mabel Teoh", sub: "Entity's contact person", ap: true, as: true, role: "Viewer" },
];

function JourneyPage({ dark }) {
  const [activeSubTab, setActiveSubTab] = useState("Roles");
  const [aiInput, setAiInput] = useState("");

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#111" }}>

      {/* Main content */}
      <div style={{ display: "flex", padding: "36px 32px", gap: 40, maxWidth: 1200 }}>

        {/* Left label */}
        <div style={{ width: 200, flexShrink: 0, paddingTop: 4 }}>
          <div style={{ width: 32, height: 3, background: "#c8102e", marginBottom: 12 }} />
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.6, color: "#111" }}>
            Manage Roles<br />and Authorisation
          </div>
        </div>

        {/* Right content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* AI input */}
          <div style={{
            border: "1px solid #e0e0e0", borderRadius: 10, padding: "12px 14px 0 18px",
            marginBottom: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            background: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Simply describe what you want to do, and our AI will help you complete the task."
                style={{
                  flex: 1, border: "none", outline: "none", fontSize: 14, color: "#333",
                  background: "transparent", fontFamily: "inherit", padding: "4px 0 12px",
                }}
              />
              <div style={{
                width: 42, height: 42, borderRadius: "50%", background: "#1a1a2e",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, marginBottom: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}>
                <span style={{ color: "#fff", fontSize: 18 }}>✦</span>
              </div>
            </div>
            {/* Gradient border bottom */}
            <div style={{ height: 3, borderRadius: "0 0 10px 10px", background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)", margin: "0 -14px" }} />
          </div>

          {/* Sub-tab */}
          <div style={{ borderBottom: "1px solid #e8e8e8", marginBottom: 24 }}>
            <button style={{
              background: "none", border: "none", padding: "10px 20px 10px 0",
              fontSize: 14, fontWeight: 600, color: "#c8102e",
              borderBottom: "2px solid #c8102e",
              cursor: "default", fontFamily: "inherit", marginBottom: -1,
            }}>Roles</button>
          </div>

          {/* Account dropdown + Manage users */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #ccc", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer", minWidth: 280 }}>
                <span>612873120012SGD - PURE DELIVERY P...</span>
                <span style={{ fontSize: 11 }}>▾</span>
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Last updated 24 Dec 2022</div>
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 8,
              border: "1px solid #ccc", borderRadius: 6, padding: "8px 16px",
              background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
              👤 Manage users
            </button>
          </div>

          {/* Search */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #ccc", borderRadius: 6, padding: "7px 14px", width: 220, fontSize: 13, color: "#888" }}>
              🔍 <input placeholder="Search" style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", width: "100%", color: "#333" }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden", fontSize: 13 }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr", background: "#fafafa", borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ padding: "16px 20px", fontWeight: 600 }}>Users and roles</div>
              <div style={{ padding: "16px 20px", borderLeft: "1px solid #e0e0e0" }}>
                <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Authorised Person</div>
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>Open and close accounts, and apply for banking facilities</div>
                <div style={{ color: "#0057a8", fontSize: 12, marginTop: 4, cursor: "pointer" }}>What else they can do</div>
              </div>
              <div style={{ padding: "16px 20px", borderLeft: "1px solid #e0e0e0" }}>
                <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Authorised Signatory</div>
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>Sign to authorise transactions</div>
                <div style={{ color: "#0057a8", fontSize: 12, marginTop: 4, cursor: "pointer" }}>What else they can do</div>
              </div>
              <div style={{ padding: "16px 20px", borderLeft: "1px solid #e0e0e0" }}>
                <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Business online banking user</div>
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>View and/or manage online transactions</div>
                <div style={{ color: "#0057a8", fontSize: 12, marginTop: 4, cursor: "pointer" }}>What else they can do</div>
              </div>
            </div>
            {/* Data rows */}
            {JOURNEY_USERS.map((u, i) => (
              <div key={u.name} style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr", borderBottom: i < JOURNEY_USERS.length - 1 ? "1px solid #e0e0e0" : "none" }}>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  {u.sub && <div style={{ color: "#888", fontSize: 12, marginTop: 2, whiteSpace: "pre-line" }}>{u.sub}</div>}
                </div>
                <div style={{ padding: "16px 20px", borderLeft: "1px solid #e0e0e0", display: "flex", alignItems: "center" }}>
                  {u.ap && <span style={{ fontSize: 18 }}>✓</span>}
                </div>
                <div style={{ padding: "16px 20px", borderLeft: "1px solid #e0e0e0", display: "flex", alignItems: "center" }}>
                  {u.as && <span style={{ fontSize: 18 }}>✓</span>}
                </div>
                <div style={{ padding: "16px 20px", borderLeft: "1px solid #e0e0e0", display: "flex", alignItems: "center" }}>
                  {u.role}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
            <span>© OCBC. All Rights Reserved.</span>
            <span>Conditions of Access &nbsp;|&nbsp; Security &amp; Privacy</span>
          </div>
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState("benchmark");
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
      <Navbar dark={dark} onToggleDark={() => setDark(v => !v)} onLogout={handleLogout} activeTab={activeTab} onTabChange={setActiveTab} />
      {showBanner && <WarningBanner onDismiss={() => setShowBanner(false)} dark={dark} />}

      {/* Scrollable content */}
      <div style={{ paddingTop: topOffset + 36, paddingBottom: 110, display: "flex", justifyContent: "center", minHeight: "100vh", boxSizing: "border-box" }}>
        {activeTab === "benchmark" ? (
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
        ) : (
          <JourneyPage dark={dark} />
        )}
      </div>

      {/* Fixed bottom input bar — only on benchmark tab */}
      {activeTab !== "benchmark" ? null : <div style={{
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
      </div>}
    </div>
  );
}
