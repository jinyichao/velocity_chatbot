import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";
import InputBar from "./components/InputBar";
import LoginPage from "./pages/LoginPage";
import { getToken, getUsername, clearSession } from "./api/auth";
import { QUICK_REPLIES, MULTI_INTENT_3_REPLIES, HALLUCINATION_REPLIES, OUT_OF_SCOPE_REPLIES, MULTILINGUAL_REPLIES } from "./data/quickReplies";
import { detectId, detectPhone, COUNTRY_META, COUNTRIES } from "./utils/piiDetection";

const SESSION_A = uuidv4();
const SESSION_B = uuidv4();
const SESSION_C = uuidv4();
const SESSION_JOURNEY = uuidv4();

const WIDGETS = [
  { sessionId: SESSION_A, title: "NLU-Based Engine",         label: "V1", color: "#0057a8", darkColor: "#2a5a8b", version: 1 },
  { sessionId: SESSION_B, title: "Gen-AI Powered Engine",    label: "V2", color: "#c8102e", darkColor: "#8b2a3a", version: 2 },
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

function AddUserForm({ selectedRoles, onClose, formData, onFormChange, onConfirm, dark = false, idCountry = "SG", onIdCountryChange, phoneCountry = "SG", onPhoneCountryChange }) {
  const hasSignatory = selectedRoles.some(r => r.toLowerCase().includes("signator"));
  const hasBanking   = selectedRoles.some(r => r.toLowerCase().includes("business online banking") && !r.toLowerCase().includes("administrator"));
  const hasFX        = selectedRoles.some(r => r.toLowerCase().includes("fx contract"));
  const hasContact   = selectedRoles.some(r => r.toLowerCase().includes("contact person"));

  const [learnOpen, setLearnOpen] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [idGlow, setIdGlow] = useState(false);
  const [phoneGlow, setPhoneGlow] = useState(false);
  const prevIdCountryRef = React.useRef(idCountry);
  const prevPhoneCountryRef = React.useRef(phoneCountry);
  const name   = formData?.name   ?? "";
  const nric   = formData?.nric   ?? "";
  const mobile = formData?.mobile ?? "";
  const email  = formData?.email  ?? "";
  const userId = formData?.userId ?? "";
  const setName   = v => onFormChange({ ...formData, name: v });
  const setNric   = v => onFormChange({ ...formData, nric: v });
  const setMobile = v => onFormChange({ ...formData, mobile: v });
  const setEmail  = v => onFormChange({ ...formData, email: v });
  const setUserId = v => onFormChange({ ...formData, userId: v });

  const idMeta    = COUNTRY_META[idCountry];
  const phoneMeta = COUNTRY_META[phoneCountry];

  const nricValidator = {
    fn: v => {
      const r = detectId(v, idCountry);
      return r.country === idCountry && r.isValid;
    },
    msg: `Invalid ${idMeta.idLabel} (e.g. ${idMeta.idExample})`,
  };
  const mobileValidator = {
    fn: v => {
      const r = detectPhone(v, phoneCountry);
      return r.isValid && r.country === phoneCountry;
    },
    msg: `Invalid ${phoneMeta.name} mobile (e.g. ${phoneMeta.phoneExample})`,
  };
  const emailValidator = {
    fn: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    msg: "Invalid email address",
  };
  const VALIDATORS = { nric: nricValidator, mobile: mobileValidator, email: emailValidator };

  const validateField = (field, value) => {
    if (!VALIDATORS[field] || !value) return;
    const { fn, msg } = VALIDATORS[field];
    setFieldErrors(prev => ({ ...prev, [field]: fn(value) ? null : msg }));
  };

  // When user types in the ID field and blurs, auto-detect the country and update idCountry
  // so the label switches accordingly (e.g., "NRIC no." → "MyKad no.").
  const onNricBlur = () => {
    if (nric && onIdCountryChange) {
      const r = detectId(nric, idCountry);
      if (r.country && r.country !== idCountry) {
        onIdCountryChange(r.country);
        // The country change useEffect will re-validate.
        return;
      }
    }
    validateField("nric", nric);
  };

  // Re-validate nric when ID country changes; trigger glow
  useEffect(() => {
    if (prevIdCountryRef.current !== idCountry) {
      prevIdCountryRef.current = idCountry;
      setIdGlow(true);
      const tid = setTimeout(() => setIdGlow(false), 1500);
      if (nric) {
        setFieldErrors(prev => ({ ...prev, nric: nricValidator.fn(nric) ? null : nricValidator.msg }));
      }
      return () => clearTimeout(tid);
    }
  }, [idCountry]);

  // Re-validate mobile when phone country changes; trigger glow
  useEffect(() => {
    if (prevPhoneCountryRef.current !== phoneCountry) {
      prevPhoneCountryRef.current = phoneCountry;
      setPhoneGlow(true);
      const tid = setTimeout(() => setPhoneGlow(false), 1500);
      if (mobile) {
        setFieldErrors(prev => ({ ...prev, mobile: mobileValidator.fn(mobile) ? null : mobileValidator.msg }));
      }
      return () => clearTimeout(tid);
    }
  }, [phoneCountry]);

  const hasErrors = Object.values(fieldErrors).some(Boolean);

  const ft = {
    bg:      dark ? "#1e1e1e" : "#fff",
    text:    dark ? "#f0f0f0" : "#111",
    subtext: dark ? "#aaa"    : "#555",
    muted:   dark ? "#666"    : "#888",
    border:  dark ? "#3a3a3a" : "#e8e8e8",
    fieldBg: dark ? "#2a2a2a" : "#fafafa",
    inputBorderBottom: dark ? "#555" : "#ddd",
    checkBg: dark ? "#ED1C24" : "#ED1C24",
  };
  const inputStyle = {
    width: "100%", border: "none", borderBottom: `1px solid ${ft.inputBorderBottom}`,
    outline: "none", fontSize: 14, padding: "8px 0", fontFamily: "inherit",
    background: "transparent", color: ft.text, boxSizing: "border-box",
  };
  const fieldWrap = (field) => ({
    background: ft.fieldBg,
    border: `1px solid ${fieldErrors[field] ? "#e53e3e" : ft.border}`,
    borderRadius: 8, padding: "12px 16px", flex: 1,
  });

  if (confirmed) return (
    <div style={{ background: ft.bg, borderRadius: 12, border: `1px solid ${ft.border}`, padding: "48px 32px", maxWidth: 860, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: dark ? "#1a3a1a" : "#e6f4ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: ft.text }}>User Added Successfully</div>
      <div style={{ fontSize: 15, color: ft.subtext }}>New user <strong>"{name || "Unknown"}"</strong> has been added.</div>
      <button onClick={onClose} style={{ marginTop: 8, padding: "9px 28px", background: ft.checkBg, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
    </div>
  );

  return (
    <div style={{ background: ft.bg, borderRadius: 12, border: `1px solid ${ft.border}`, padding: "28px 32px", maxWidth: 860, boxSizing: "border-box", color: ft.text }}>
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Add user</div>
        <div style={{
          background: "linear-gradient(90deg, #FB5C39, #ED1C24)",
          borderRadius: 20, padding: "3px 12px",
          fontSize: 12, fontWeight: 600, color: "#fff",
          display: "flex", alignItems: "center", gap: 5,
        }}>✦ AI Suggested</div>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ background: dark ? "#333" : "#f0f0f0", color: ft.text, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>

      {/* Fields row 1 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={fieldWrap("name")}><input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name (as shown in ID)" style={inputStyle} /></div>
        <div style={{ flex: 1 }}>
          <div style={{
            ...fieldWrap("nric"),
            boxShadow: idGlow ? "0 0 0 3px rgba(99, 102, 241, 0.4)" : "none",
            transition: "box-shadow 0.3s",
          }}><input value={nric} onChange={e => setNric(e.target.value)} onBlur={onNricBlur} placeholder={`${idMeta.idLabel} (e.g. ${idMeta.idExample})`} style={inputStyle} /></div>
          {fieldErrors.nric && <div style={{ fontSize: 11, color: "#e53e3e", marginTop: 4 }}>{fieldErrors.nric}</div>}
        </div>
      </div>
      {/* Fields row 2 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            ...fieldWrap("mobile"),
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: phoneGlow ? "0 0 0 3px rgba(99, 102, 241, 0.4)" : "none",
            transition: "box-shadow 0.3s",
          }}>
            <span style={{ fontSize: 13, color: ft.subtext, whiteSpace: "nowrap" }}>Mobile no.</span>
            <div
              onClick={() => setCountryDropdownOpen(o => !o)}
              style={{ position: "relative", fontSize: 13, color: ft.text, borderRight: `1px solid ${ft.inputBorderBottom}`, paddingRight: 8, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
            >
              <span>{phoneMeta.flag} {phoneMeta.code}</span>
              <span style={{ fontSize: 10 }}>▾</span>
              {countryDropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30,
                  background: ft.bg, border: `1px solid ${ft.border}`, borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 180,
                }}>
                  {COUNTRIES.map((c, i) => {
                    const m = COUNTRY_META[c];
                    const active = c === phoneCountry;
                    return (
                      <div
                        key={c}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCountryDropdownOpen(false);
                          if (c !== phoneCountry && onPhoneCountryChange) onPhoneCountryChange(c);
                        }}
                        style={{
                          padding: "10px 14px", fontSize: 13, color: ft.text,
                          borderBottom: i < COUNTRIES.length - 1 ? `1px solid ${ft.border}` : "none",
                          background: active ? (dark ? "#2a2a2a" : "#f0f0f0") : "transparent",
                          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = dark ? "#333" : "#f6f6f6"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{m.flag}</span>
                        <span style={{ flex: 1 }}>{m.name}</span>
                        <span style={{ color: ft.muted, fontSize: 12 }}>{m.code}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <input value={mobile} onChange={e => setMobile(e.target.value)} onBlur={() => validateField("mobile", mobile)} placeholder={phoneMeta.phoneExample} style={{ ...inputStyle, flex: 1 }} />
          </div>
          {fieldErrors.mobile && <div style={{ fontSize: 11, color: "#e53e3e", marginTop: 4 }}>{fieldErrors.mobile}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={fieldWrap("email")}><input value={email} onChange={e => setEmail(e.target.value)} onBlur={() => validateField("email", email)} placeholder="Email" style={inputStyle} /></div>
          {fieldErrors.email && <div style={{ fontSize: 11, color: "#e53e3e", marginTop: 4 }}>{fieldErrors.email}</div>}
        </div>
      </div>

      {/* Roles */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Roles</div>

      {/* Sign to authorise */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: hasSignatory ? ft.checkBg : "transparent", border: `2px solid ${hasSignatory ? ft.checkBg : ft.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          {hasSignatory && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Sign to authorise transactions</div>
          <div style={{ fontSize: 13, color: ft.subtext, lineHeight: 1.5 }}>Authorised Signatory who can sign or accept documents (e.g. payment instructions, bills of exchange) on behalf of the account holder. Automatically acts as entity's contact person.</div>
        </div>
      </div>

      {/* View create authorise */}
      <div style={{ display: "flex", gap: 14, marginBottom: hasBanking ? 12 : 20 }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: hasBanking ? ft.checkBg : "transparent", border: `2px solid ${hasBanking ? ft.checkBg : ft.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          {hasBanking && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>View, create and authorise online transactions</div>
          <div style={{ fontSize: 13, color: ft.subtext, marginBottom: 10 }}>Business online banking user (Maker and Authoriser)</div>
          {hasBanking && (
            <>
              <div style={{ background: ft.fieldBg, border: `1px solid ${ft.border}`, borderRadius: 8, padding: "10px 14px", maxWidth: 320, marginBottom: 6 }}>
                <input value={userId} onChange={e => setUserId(e.target.value)} style={{ ...inputStyle, background: "transparent" }} placeholder="User ID" />
              </div>
              <div style={{ fontSize: 12, color: ft.muted, marginBottom: 12 }}>Create a User ID that the user can use to log in to business online banking. Only numbers or letters can be used.</div>
              {/* Learn what user can do */}
              <div style={{ border: `1px solid ${ft.border}`, borderRadius: 8, overflow: "hidden", maxWidth: 480, background: ft.bg }}>
                <div onClick={() => setLearnOpen(v => !v)} style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  <span>Learn what the user can do</span>
                  <span style={{ fontSize: 12, color: ft.muted }}>{learnOpen ? "Hide ∧" : "Show ∨"}</span>
                </div>
                {learnOpen && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: ft.fieldBg, borderTop: `1px solid ${ft.border}`, color: ft.text }}>
                        <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 600, borderRight: `1px solid ${ft.border}` }}>Role</th>
                        <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 600 }}>What the user can do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Viewer",        "View accounts, transaction history, and reports. Cannot initiate or approve any transactions."],
                        ["Maker",         "Create transactions (e.g. Telegraphic Transfers) that will be sent to the Authoriser(s) for review."],
                        ["Authoriser",    "Authorise transactions that have been requested by a Maker. Depending on your entity's setup, transactions will require the approval of one or more Authorisers."],
                        ["Administrator", "Manage users, roles, and permissions. Cannot initiate or authorise financial transactions."],
                      ].filter(([role]) => selectedRoles.some(r => r.toLowerCase().includes(role.toLowerCase())))
                       .map(([role, desc]) => (
                        <tr key={role} style={{ borderTop: `1px solid ${ft.border}`, color: ft.text }}>
                          <td style={{ padding: "10px 16px", fontWeight: 600, borderRight: `1px solid ${ft.border}`, verticalAlign: "top", whiteSpace: "nowrap" }}>{role}</td>
                          <td style={{ padding: "10px 16px", color: ft.subtext, lineHeight: 1.5 }}>{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Other roles */}
      <div style={{ fontWeight: 700, fontSize: 16, margin: "24px 0 16px" }}>Other roles</div>
      {[
        { label: "Book FX Contract (only for business online banking users)", checked: hasFX },
        { label: "Act as entity's contact person", checked: hasContact },
      ].map(({ label, checked }) => (
        <div key={label} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: checked ? ft.checkBg : "transparent", border: `2px solid ${checked ? ft.checkBg : ft.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            {checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
          </div>
          <div style={{ fontSize: 14, color: ft.text }}>{label}</div>
        </div>
      ))}

      {/* Confirm */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
        <button
          onClick={() => {
            const errors = {};
            if (nric) { const { fn, msg } = VALIDATORS.nric; if (!fn(nric)) errors.nric = msg; }
            if (mobile) { const { fn, msg } = VALIDATORS.mobile; if (!fn(mobile)) errors.mobile = msg; }
            if (email) { const { fn, msg } = VALIDATORS.email; if (!fn(email)) errors.email = msg; }
            if (Object.values(errors).some(Boolean)) { setFieldErrors(errors); return; }
            setConfirmed(true);
            if (onConfirm) onConfirm(name || "Unknown");
          }}
          style={{ padding: "10px 32px", background: ft.checkBg, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >Confirm</button>
      </div>
    </div>
  );
}
const INITIAL_JOURNEY_USERS = [
  { name: "Peter Poh Wen Xiang", sub: "", ap: true,  as: false, role: "Maker and Authoriser" },
  { name: "Alex Loh", sub: "Entity's contact person\nBusiness online banking contact person", ap: true, as: true, role: "Maker and Authoriser" },
  { name: "Mabel Teoh", sub: "Entity's contact person", ap: true, as: true, role: "Viewer" },
];

function buildUserEntry(name, roles) {
  const BOB_LABEL_MAP = {
    "viewer": "Viewer",
    "maker": "Maker",
    "authoriser": "Authoriser",
    "administrator": "Administrator",
  };
  const bankingRoles = roles
    .filter(r => r.toLowerCase().startsWith("business online banking - "))
    .map(r => {
      const suffix = r.replace(/business online banking - /i, "").toLowerCase();
      return BOB_LABEL_MAP[suffix] || suffix;
    });
  const roleStr = bankingRoles.join(" and ");
  const ap = roles.some(r => r.toLowerCase() === "authorised person");
  const as_ = roles.some(r => r.toLowerCase().includes("signator"));
  return { name, sub: "", ap, as: as_, role: roleStr, pending: true };
}

function getUserPermissions(u) {
  const perms = [];
  if (u.as) perms.push("Sign to authorise transactions");
  if (u.role) perms.push("View, and/or manage online transactions");
  if (u.ap) perms.push("Open and close accounts, apply for banking facilities");
  if (u.sub && u.sub.toLowerCase().includes("contact")) perms.push("Act as entity's contact person");
  return perms;
}

function JourneyPage({ dark, navbarOffset = 60 }) {
  const [activeSubTab, setActiveSubTab] = useState("Roles");
  const [aiInput, setAiInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [chipsOpen, setChipsOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [addUserRoles, setAddUserRoles] = useState(null);
  const [addUserData, setAddUserData] = useState({});
  const [addUserIdCountry, setAddUserIdCountry] = useState("SG");
  const [addUserPhoneCountry, setAddUserPhoneCountry] = useState("SG");
  const [journeyUsers, setJourneyUsers] = useState(INITIAL_JOURNEY_USERS);
  const [assistantNotification, setAssistantNotification] = useState(null);
  const [lastIntents, setLastIntents] = useState([]);
  const [activeIntent, setActiveIntent] = useState(null);
  const [deleteTabOpen, setDeleteTabOpen] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [selectedDeleteUsers, setSelectedDeleteUsers] = useState([]);
  const [deleteDropdownOpen, setDeleteDropdownOpen] = useState(false);
  const [completedIntents, setCompletedIntents] = useState([]);
  const [closeTaskSignal, setCloseTaskSignal] = useState(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const chatWidth = viewportWidth < 1024 ? 360 : 420;

  // Derive per-task progress for the open-tasks strip. Keyed by raw intent
  // string (e.g. "add_user") and also by title-case label (e.g. "Add User")
  // so the strip can look up either form.
  const taskProgress = React.useMemo(() => {
    const map = {};
    const ADD_BASE_FIELDS = ["name", "nric", "mobile", "email"];
    const hasBankingRole = (addUserRoles || []).some(r => /business online banking/i.test(r));
    const addTotal = 1 /* roles step */ + ADD_BASE_FIELDS.length + (hasBankingRole ? 1 : 0);
    const requiredFields = hasBankingRole ? [...ADD_BASE_FIELDS, "userId"] : ADD_BASE_FIELDS;
    const addCompletedFields = requiredFields.filter(f => (addUserData?.[f] ?? "").toString().trim().length > 0).length;
    const addCompleted = (addUserRoles ? 1 : 0) + addCompletedFields;
    const deleteTotal = 2;
    const deleteSelectStep = selectedDeleteUsers.length > 0 ? 1 : 0;
    const deleteCompleted = deleteSelectStep + (deleteConfirmed ? 1 : 0);

    const completedLower = completedIntents.map(s => s.toLowerCase());
    const statusFor = (intentKey, completed, total) => {
      const isCompleted = completedLower.includes(intentKey.toLowerCase()) || (total > 0 && completed >= total);
      if (isCompleted) return "done";
      if (activeIntent && activeIntent.toLowerCase().replace(/\s+/g, "_") === intentKey) return "in_progress";
      if (completed > 0) return "in_progress";
      return "pending";
    };

    const writeBoth = (intentKey, label, entry) => {
      map[intentKey] = entry;
      map[label] = entry;
    };

    writeBoth("add_user", "Add User", {
      completed: Math.min(addCompleted, addTotal),
      total: addTotal,
      status: statusFor("add_user", addCompleted, addTotal),
    });
    writeBoth("delete_user", "Delete User", {
      completed: Math.min(deleteCompleted, deleteTotal),
      total: deleteTotal,
      status: statusFor("delete_user", deleteCompleted, deleteTotal),
    });
    return map;
  }, [addUserRoles, addUserData, selectedDeleteUsers, deleteConfirmed, completedIntents, activeIntent]);

  const handleIntentDismiss = (label) => {
    setLastIntents(prev => prev.filter(i => i.toLowerCase() !== label.toLowerCase()));
  };

  const handleTaskClosed = (intent) => {
    if (intent === "add_user") {
      setAddUserRoles(null);
      setAddUserData({});
      setAddUserIdCountry("SG");
      setAddUserPhoneCountry("SG");
      setActiveSubTab(prev => (prev === "Add User" ? "Roles" : prev));
    } else if (intent === "delete_user") {
      setDeleteTabOpen(false);
      setSelectedDeleteUsers([]);
      setDeleteConfirmIdx(null);
      setDeleteConfirmed(false);
      setActiveSubTab(prev => (prev === "Delete Users" ? "Roles" : prev));
    }
  };

  // Shared by the side-panel Confirm button and the in-chat Confirm bubble.
  const submitAddUser = (userName) => {
    setJourneyUsers(prev => [...prev, buildUserEntry(userName, addUserRoles || [])]);
    setAddUserRoles(null);
    setAddUserData({});
    setAddUserIdCountry("SG");
    setAddUserPhoneCountry("SG");
    setActiveSubTab("Roles");
    setAssistantNotification({
      text: `Your request to add "${userName}" as a user has been submitted. You will receive an email and push notification after the request has been authorised.`,
      key: Date.now(),
    });
    setCloseTaskSignal({ intent: "add_user", key: Date.now() });
    const norm = (s) => s.toLowerCase().replace(/\s+/g, "_");
    const toTitle = (s) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const nowCompleted = [...completedIntents, activeIntent].filter(Boolean).map(norm);
    setCompletedIntents(nowCompleted);
    const remaining = lastIntents.filter(i => !nowCompleted.includes(norm(i)));
    setTimeout(() => {
      if (remaining.length === 0 && lastIntents.length > 0) {
        setAssistantNotification({ text: "All your requests have been fulfilled. ✓", key: Date.now() });
      } else if (remaining.length > 0) {
        setAssistantNotification({
          text: `Next up: **${toTitle(remaining[0])}**.`,
          key: Date.now(),
          meta: "intent_intro",
        });
      }
    }, 600);
  };

  const handleInChatConfirm = () => {
    submitAddUser(addUserData.name || "Unknown");
  };

  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setPendingMessage({ text, key: Date.now() });
  };

  const handleAiSubmit = () => {
    const text = aiInput.trim();
    if (!text) return;
    setAiInput("");
    setChatOpen(true);
    setPendingMessage({ text, key: Date.now() });
  };

  const t = {
    bg:            dark ? "#141414" : "#fff",
    text:          dark ? "#f0f0f0" : "#111",
    subtext:       dark ? "#aaa"    : "#666",
    muted:         dark ? "#666"    : "#888",
    border:        dark ? "#2a2a2a" : "#e0e0e0",
    border2:       dark ? "#333"    : "#e8e8e8",
    panelBg:       dark ? "#1e1e1e" : "#fff",
    tableHeaderBg: dark ? "#252525" : "#fafafa",
    inputText:     dark ? "#ccc"    : "#333",
    accentLink:    dark ? "#FB5C39" : "#ED1C24",
    chipBorder:    dark ? "#FB5C39" : "#ED1C24",
    chipText:      dark ? "#FB5C39" : "#ED1C24",
  };

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: t.bg,
      fontFamily: "'Helvetica Neue', Arial, sans-serif", color: t.text,
      transition: "background 0.2s, padding-right 0.2s ease",
      paddingRight: chatOpen ? chatWidth + 32 : 0,
      boxSizing: "border-box",
    }}>

      {/* Main content */}
      <div style={{
        display: "flex", padding: "36px 32px",
        gap: chatOpen ? 0 : 40,
        maxWidth: 1200, margin: "0 auto",
        flexDirection: chatOpen ? "column" : "row",
      }}>

        {/* Heading — left sidebar when chat closed, top header when chat open */}
        {chatOpen ? (
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 40, height: 4, background: "#c8102e", marginBottom: 12 }} />
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.4, color: t.text }}>
              Manage Roles and Authorisation
            </div>
          </div>
        ) : (
          <div style={{ width: 280, flexShrink: 0, paddingTop: 4 }}>
            <div style={{ width: 40, height: 4, background: "#c8102e", marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.7, color: t.text }}>
              Manage Roles<br />and Authorisation
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* AI input */}
          <div style={{
            border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px 0 18px",
            marginBottom: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            background: t.panelBg,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiSubmit()}
                placeholder="Simply describe what you want to do, and our AI will help you complete the task."
                style={{
                  flex: 1, border: "none", outline: "none", fontSize: 14, color: t.inputText,
                  background: "transparent", fontFamily: "inherit", padding: "4px 0 12px",
                }}
              />
              <div onClick={handleAiSubmit} style={{
                width: 42, height: 42, borderRadius: "50%", background: "#ED1C24",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, marginBottom: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}>
                <span style={{ color: "#fff", fontSize: 18 }}>✦</span>
              </div>
            </div>
            {/* Gradient border bottom */}
            <div style={{ height: 3, borderRadius: "0 0 10px 10px", background: "linear-gradient(90deg, #FB5C39, #ED1C24, #D6271C)", margin: "0 -14px" }} />
          </div>

          {/* Expandable suggestion chips */}
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setChipsOpen(v => !v)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, color: t.chipText, fontWeight: 600, padding: 0,
              display: "flex", alignItems: "center", gap: 5, marginBottom: chipsOpen ? 12 : 0,
            }}>
              <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: chipsOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              {chipsOpen ? "Hide suggestions" : "Show suggestions"}
            </button>
            {chipsOpen && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "➕ Add User", query: "How do I add a new user to Velocity and assign them a role?" },
                  { label: "🗑 Delete User", query: "How do I deactivate or delete a user from Velocity?" },
                  { label: "➕🗑 Add & Delete User", query: "How do I add a new user and also remove an existing user from Velocity?" },
                  { label: "🌐 Add & Delete User (multi-lingual)", query: "個同事走咗喇，佢account同加個新人頂喺Velocity點整㗎？" },
                ].map(({ label, query }) => (
                  <button key={label} onClick={() => { setChatOpen(true); setPendingMessage({ text: query, key: Date.now() }); }} style={{
                    padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${t.chipBorder}`,
                    background: t.panelBg, color: t.chipText, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.chipBorder; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = t.panelBg; e.currentTarget.style.color = t.chipText; }}
                  >{label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div style={{ borderBottom: `1px solid ${t.border2}`, marginBottom: 24, display: "flex" }}>
            {[
              "Roles",
              ...(addUserRoles ? ["Add User"] : []),
              ...(deleteTabOpen ? ["Delete Users"] : []),
            ].map(tab => {
              const active = activeSubTab === tab;
              return (
                <button key={tab} onClick={() => setActiveSubTab(tab)} style={{
                  background: "none", border: "none", padding: "10px 20px 10px 0",
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? "#c8102e" : t.muted,
                  borderBottom: active ? "2px solid #c8102e" : "2px solid transparent",
                  cursor: "pointer", fontFamily: "inherit", marginBottom: -1,
                }}>{tab}</button>
              );
            })}
          </div>

          {activeSubTab === "Add User" && addUserRoles ? (
            <AddUserForm dark={dark} selectedRoles={addUserRoles} onClose={() => { setAddUserRoles(null); setAddUserData({}); setAddUserIdCountry("SG"); setAddUserPhoneCountry("SG"); }} formData={addUserData} onFormChange={setAddUserData} idCountry={addUserIdCountry} onIdCountryChange={setAddUserIdCountry} phoneCountry={addUserPhoneCountry} onPhoneCountryChange={setAddUserPhoneCountry} onConfirm={submitAddUser} />
          ) : activeSubTab === "Delete Users" && deleteTabOpen ? (<>
          {/* Remove Users — new design */}
          <div style={{ maxWidth: 640 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: t.text }}>Remove user(s)</span>
              {selectedDeleteUsers.length > 0 && (
                <span style={{
                  background: "#ED1C24", color: "#fff", borderRadius: 12,
                  fontSize: 12, fontWeight: 700, padding: "1px 8px", minWidth: 20, textAlign: "center",
                }}>{selectedDeleteUsers.length}</span>
              )}
              <span style={{
                background: "linear-gradient(90deg,#FB5C39,#ED1C24)", color: "#fff",
                borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "3px 12px",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>✦ AI Suggested</span>
            </div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 24 }}>
              The user(s) will be removed from all roles.
            </div>

            {/* Dropdown */}
            <div style={{ position: "relative", marginBottom: 28 }}>
              <div
                onClick={() => setDeleteDropdownOpen(o => !o)}
                style={{
                  border: `1px solid ${t.border}`, borderRadius: 6, padding: "12px 16px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer", background: dark ? "#1e1e1e" : "#f7f7f7", color: t.muted, fontSize: 14,
                }}
              >
                <span>Select user(s)</span>
                <span style={{ fontSize: 12, transform: deleteDropdownOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
              </div>
              {deleteDropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                  background: dark ? "#252525" : "#fff", border: `1px solid ${t.border}`,
                  borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden",
                }}>
                  {journeyUsers.filter(u => !selectedDeleteUsers.includes(u.name)).map((u, i, arr) => (
                    <div
                      key={u.name}
                      onClick={() => { setSelectedDeleteUsers(prev => [...prev, u.name]); setDeleteDropdownOpen(false); }}
                      style={{
                        padding: "11px 16px", fontSize: 14, cursor: "pointer", color: t.text,
                        borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none",
                        background: "transparent",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? "#333" : "#f0f0f0"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {u.name}
                    </div>
                  ))}
                  {journeyUsers.filter(u => !selectedDeleteUsers.includes(u.name)).length === 0 && (
                    <div style={{ padding: "11px 16px", fontSize: 13, color: t.muted }}>No more users to select</div>
                  )}
                </div>
              )}
            </div>

            {/* Selected user cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {selectedDeleteUsers.map(name => {
                const u = journeyUsers.find(x => x.name === name);
                if (!u) return null;
                const perms = getUserPermissions(u);
                return (
                  <div key={name} style={{
                    border: `1px solid ${t.border}`, borderRadius: 10,
                    padding: "18px 20px", background: dark ? "#1e1e1e" : "#fff",
                    position: "relative", maxWidth: 360,
                  }}>
                    <button
                      onClick={() => setSelectedDeleteUsers(prev => prev.filter(n => n !== name))}
                      style={{
                        position: "absolute", top: 14, right: 14,
                        background: "none", border: "none", cursor: "pointer",
                        color: t.muted, fontSize: 18, lineHeight: 1, padding: 2,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#c8102e"}
                      onMouseLeave={e => e.currentTarget.style.color = t.muted}
                    >×</button>
                    <div style={{ fontWeight: 700, fontSize: 15, color: t.text, marginBottom: 2 }}>{u.name}</div>
                    {u.sub && <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>{u.sub.split("\n")[0]}</div>}
                    <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc", fontSize: 13, color: t.text, lineHeight: 1.7 }}>
                      {perms.map(p => <li key={p}>{p}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Confirm button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
              <button
                disabled={selectedDeleteUsers.length === 0}
                onClick={() => {
                  const names = selectedDeleteUsers;
                  setJourneyUsers(prev => prev.filter(u => !names.includes(u.name)));
                  setDeleteConfirmed(true);
                  const msg = `User${names.length > 1 ? "s" : ""} ${names.map(n => `"${n}"`).join(", ")} ${names.length > 1 ? "have" : "has"} been successfully removed. ✓`;
                  setAssistantNotification({ text: msg, key: Date.now() });
                  setCloseTaskSignal({ intent: "delete_user", key: Date.now() });
                  const norm = (s) => s.toLowerCase().replace(/\s+/g, "_");
                  const toTitle = (s) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  const nowCompleted = [...completedIntents, activeIntent].filter(Boolean).map(norm);
                  setCompletedIntents(nowCompleted);
                  const remaining = lastIntents.filter(i => !nowCompleted.includes(norm(i)));
                  setTimeout(() => {
                    if (remaining.length === 0 && lastIntents.length > 0) {
                      setAssistantNotification({ text: "All your requests have been fulfilled. ✓", key: Date.now() });
                    } else if (remaining.length > 0) {
                      setAssistantNotification({
                        text: `Next up: **${toTitle(remaining[0])}**.`,
                        key: Date.now(),
                        meta: "intent_intro",
                      });
                    }
                  }, 600);
                  setDeleteTabOpen(false);
                  setSelectedDeleteUsers([]);
                  setDeleteConfirmIdx(null);
                  setActiveSubTab("Roles");
                }}
                style={{
                  padding: "10px 32px", background: selectedDeleteUsers.length > 0 ? "#ED1C24" : (dark ? "#333" : "#ccc"),
                  color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: selectedDeleteUsers.length > 0 ? "pointer" : "default", fontFamily: "inherit",
                }}
              >Confirm</button>
            </div>
          </div>
          </>) : (<>
          {/* Account dropdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer", minWidth: 280, background: t.panelBg, color: t.text, display: "inline-flex" }}>
              <span>612873120012SGD - PURE DELIVERY P...</span>
              <span style={{ fontSize: 11 }}>▾</span>
            </div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>Last updated 24 Dec 2022</div>
          </div>

          {/* Table */}
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden", fontSize: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr", background: t.tableHeaderBg, borderBottom: `1px solid ${t.border}`, color: t.text }}>
              <div style={{ padding: "16px 20px", fontWeight: 600 }}>Users and roles</div>
              <div style={{ padding: "16px 20px", borderLeft: `1px solid ${t.border}` }}>
                <div style={{ color: t.muted, fontSize: 12, marginBottom: 4 }}>Authorised Person</div>
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>Open and close accounts, and apply for banking facilities</div>
                <div style={{ color: t.accentLink, fontSize: 12, marginTop: 4, cursor: "pointer" }}>What else they can do</div>
              </div>
              <div style={{ padding: "16px 20px", borderLeft: `1px solid ${t.border}` }}>
                <div style={{ color: t.muted, fontSize: 12, marginBottom: 4 }}>Authorised Signatory</div>
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>Sign to authorise transactions</div>
                <div style={{ color: t.accentLink, fontSize: 12, marginTop: 4, cursor: "pointer" }}>What else they can do</div>
              </div>
              <div style={{ padding: "16px 20px", borderLeft: `1px solid ${t.border}` }}>
                <div style={{ color: t.muted, fontSize: 12, marginBottom: 4 }}>Business online banking user</div>
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>View and/or manage online transactions</div>
                <div style={{ color: t.accentLink, fontSize: 12, marginTop: 4, cursor: "pointer" }}>What else they can do</div>
              </div>
            </div>
            {journeyUsers.map((u, i) => (
              <div key={u.name + i} style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr", borderBottom: i < journeyUsers.length - 1 ? `1px solid ${t.border}` : "none", background: t.panelBg, color: t.text }}>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  {u.sub && <div style={{ color: t.muted, fontSize: 12, marginTop: 2, whiteSpace: "pre-line" }}>{u.sub}</div>}
                  {u.pending && <div style={{ color: "#b07d00", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>Pending authorization</div>}
                </div>
                <div style={{ padding: "16px 20px", borderLeft: `1px solid ${t.border}`, display: "flex", alignItems: "center" }}>
                  {u.ap && <span style={{ fontSize: 18 }}>✓</span>}
                </div>
                <div style={{ padding: "16px 20px", borderLeft: `1px solid ${t.border}`, display: "flex", alignItems: "center" }}>
                  {u.as && <span style={{ fontSize: 18 }}>✓</span>}
                </div>
                <div style={{ padding: "16px 20px", borderLeft: `1px solid ${t.border}`, display: "flex", alignItems: "center" }}>
                  {u.role}
                </div>
              </div>
            ))}
          </div>
          </>)}

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 20, borderTop: `1px solid ${t.border2}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: t.muted }}>
            <span>© OCBC. All Rights Reserved.</span>
            <span>Conditions of Access &nbsp;|&nbsp; Security &amp; Privacy</span>
          </div>
        </div>
      </div>

      {/* Docked V2 chat panel — floating overlay style, content reflows around it */}
      {chatOpen && (
        <div style={{
          position: "fixed",
          top: navbarOffset + 16, bottom: 16, right: 16, zIndex: 2000,
          width: chatWidth, borderRadius: 16,
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: `1px solid ${t.border}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          background: t.panelBg,
        }}>
          {/* Chat header */}
          <div style={{
            background: "#D6271C", color: "#fff",
            padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>✦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Manage with AI</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Our chatbot will assist with your enquiries.</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{
              background: "none", border: "none", color: "#fff", fontSize: 20,
              cursor: "pointer", lineHeight: 1, padding: 0, opacity: 0.7, marginTop: 2,
            }}>×</button>
          </div>

          {/* ChatWidget body */}
          <ChatWidget
            sessionId={SESSION_JOURNEY}
            title="Gen-AI Powered Engine"
            label="V2"
            color="#ED1C24"
            pendingMessage={pendingMessage}
            version={2}
            mobile={true}
            dark={dark}
            showHeader={false}
            taskProgress={taskProgress}
            naturalIntentCopy={true}
            assistantBg={dark ? "#2a2a2a" : "#ebebeb"}
            intentResponses={{
              "add user":    { type: "role_selector" },
              "add_user":    { type: "role_selector" },
              "delete user": "Sure! Please select the user(s) you'd like to remove from the **Delete Users** tab on the left. Once you've made your selection, click **Confirm** to proceed.",
              "delete_user": "Sure! Please select the user(s) you'd like to remove from the **Delete Users** tab on the left. Once you've made your selection, click **Confirm** to proceed.",
            }}
            idCountry={addUserIdCountry}
            onIdCountryChange={setAddUserIdCountry}
            phoneCountry={addUserPhoneCountry}
            onPhoneCountryChange={setAddUserPhoneCountry}
            onRoleConfirm={(roles) => { setAddUserRoles(roles); setAddUserData({}); setActiveSubTab("Add User"); }}
            onFieldCollected={(field, value) => setAddUserData(prev => ({ ...prev, [field]: value }))}
            assistantMessage={assistantNotification}
            closeTaskSignal={closeTaskSignal}
            onTaskClosed={handleTaskClosed}
            onChatConfirm={handleInChatConfirm}
            onIntentsDetected={(intents) => { setLastIntents(intents); setCompletedIntents([]); }}
            onIntentDismiss={handleIntentDismiss}
            onIntentStarted={(label) => {
              setActiveIntent(label);
              if (label.toLowerCase().includes("delete")) {
                setDeleteTabOpen(true);
                setActiveSubTab("Delete Users");
                setDeleteConfirmed(false);
              }
            }}
          />

          {/* Input bar */}
          <div style={{ flexShrink: 0, padding: "10px 16px 0", background: t.panelBg }}>
            <div style={{
              border: `1px solid ${t.border2}`, borderRadius: 10,
              display: "flex", alignItems: "center", padding: "10px 14px", gap: 10,
            }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChatSend()}
                placeholder="Type your question"
                style={{
                  flex: 1, border: "none", outline: "none",
                  fontSize: 14, color: t.inputText, fontFamily: "inherit",
                  background: "transparent",
                }}
              />
              <button onClick={handleChatSend} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#ED1C24", fontSize: 18, padding: 0, lineHeight: 1,
                display: "flex", alignItems: "center",
              }}>➤</button>
            </div>
            {/* Gradient bottom bar */}
            <div style={{ height: 3, borderRadius: "0 0 4px 4px", background: "linear-gradient(90deg, #FB5C39, #ED1C24, #D6271C)", margin: "0 0 10px" }} />
          </div>
        </div>
      )}
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
            pendingMessage={pendingMessages[i]} version={w.version} mobile={true} dark={dark}
            showIntentHint={false} compactIntents={true} />
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
                    showIntentHint={false}
                    compactIntents={true}
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
          <JourneyPage dark={dark} navbarOffset={topOffset} />
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
