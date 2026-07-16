import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from "./components/ChatWidget";
import InputBar from "./components/InputBar";
import LoginPage from "./pages/LoginPage";
import { getToken, getUsername, clearSession } from "./api/auth";
import { QUICK_REPLIES, MULTI_INTENT_3_REPLIES, HALLUCINATION_REPLIES, OUT_OF_SCOPE_REPLIES, MULTILINGUAL_REPLIES } from "./data/quickReplies";
import { detectId, detectPhone, COUNTRY_META, COUNTRIES } from "./utils/piiDetection";
import { VelocityHeader, Stepper, VELOCITY_HEADER_HEIGHT } from "./components/VelocityChrome";

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

const SLATE = "#4a5560";

function AddUserForm({ selectedRoles = [], formData, onFormChange, onRolesChange, onConfirm, onNext, onBack = null, idCountry = "SG", onIdCountryChange, phoneCountry = "SG", onPhoneCountryChange, activeField = null, mobileView = false }) {
  const rl = selectedRoles.map(r => r.toLowerCase());
  const hasSignatory  = rl.some(r => r.includes("signator"));
  const hasBanking    = rl.some(r => r.includes("business online banking") && !r.includes("administrator"));
  const hasMaker      = rl.some(r => r.includes("- maker"));
  const hasAuthoriser = rl.some(r => r.includes("- authoriser"));
  const hasAdmin      = rl.some(r => r.includes("administrator"));
  const hasFX         = rl.some(r => r.includes("fx contract"));
  const hasContact    = rl.some(r => r.includes("contact person"));

  const setRoles = (roles) => onRolesChange && onRolesChange(roles);
  const addRole = (role) => setRoles([...selectedRoles, role]);
  const removeWhere = (pred) => setRoles(selectedRoles.filter(r => !pred(r.toLowerCase())));
  const toggleSignatory  = () => hasSignatory ? removeWhere(r => r.includes("signator")) : addRole("Authorised Signatories");
  const toggleBanking    = () => hasBanking ? removeWhere(r => r.includes("business online banking") && !r.includes("administrator")) : addRole("Business Online Banking - Viewer");
  const toggleMaker      = () => hasMaker ? removeWhere(r => r.includes("- maker")) : addRole("Business Online Banking - Maker");
  const toggleAuthoriser = () => hasAuthoriser ? removeWhere(r => r.includes("- authoriser")) : addRole("Business Online Banking - Authoriser");
  const toggleAdmin      = () => hasAdmin ? removeWhere(r => r.includes("administrator")) : addRole("Business Online Banking - Administrator");
  const toggleFX         = () => hasFX ? removeWhere(r => r.includes("fx contract")) : addRole("Book FX Contract");
  const toggleContact    = () => hasContact ? removeWhere(r => r.includes("contact person")) : addRole("Entity's Contact Person");

  const [followExisting, setFollowExisting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [idGlow, setIdGlow] = useState(false);
  const [phoneGlow, setPhoneGlow] = useState(false);
  const prevIdCountryRef = React.useRef(idCountry);
  const prevPhoneCountryRef = React.useRef(phoneCountry);
  const fieldRefs = React.useRef({});

  React.useEffect(() => {
    if (activeField && fieldRefs.current[activeField]) {
      fieldRefs.current[activeField].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeField]);
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

  const inputStyle = {
    width: "100%", border: "none", outline: "none", fontSize: 14.5,
    fontFamily: "inherit", background: "transparent", color: "#1a1a1a",
    padding: 0, boxSizing: "border-box",
  };
  const fieldBox = (field, extra = {}) => ({
    background: "#f6f7f8",
    border: `1px solid ${fieldErrors[field] ? "#e53e3e" : "#eceff1"}`,
    borderBottom: `1px solid ${fieldErrors[field] ? "#e53e3e" : "#c5ccd2"}`,
    borderRadius: "6px 6px 0 0", padding: "9px 14px 10px",
    boxShadow: activeField === field ? "0 0 0 3px rgba(227,6,19,0.15)" : undefined,
    transition: "box-shadow 0.3s, border-color 0.3s",
    ...extra,
  });
  const labelStyle = { fontSize: 11.5, color: "#8a9299", marginBottom: 3 };
  const helperStyle = { fontSize: 11.5, color: "#8a9299", marginTop: 6, lineHeight: 1.5 };
  const errStyle = { fontSize: 11.5, color: "#e53e3e", marginTop: 6 };
  const sectionTitle = { fontSize: 15, fontWeight: 700, color: "#222", marginBottom: 18 };
  const divider = { height: 1, background: "#ececec", margin: "26px 0" };

  const checkbox = (checked, onClick, { disabled = false, round = false } = {}) => (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 20, height: 20, borderRadius: round ? "50%" : 4, flexShrink: 0, marginTop: 1,
        background: checked ? (disabled ? "#c8cdd2" : SLATE) : "#fff",
        border: `2px solid ${checked ? (disabled ? "#c8cdd2" : SLATE) : disabled ? "#d8dcdf" : "#9aa2a9"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer", boxSizing: "border-box",
      }}
    >
      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4"><path d="M4.5 12.5l5 5L19.5 7" /></svg>}
    </div>
  );

  const validateAll = () => {
    const errors = {};
    if (nric)   { const { fn, msg } = VALIDATORS.nric;   if (!fn(nric))   errors.nric = msg; }
    if (mobile) { const { fn, msg } = VALIDATORS.mobile; if (!fn(mobile)) errors.mobile = msg; }
    if (email)  { const { fn, msg } = VALIDATORS.email;  if (!fn(email))  errors.email = msg; }
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };
  const commitUser = () => {
    if (!validateAll()) return false;
    if ((name || "").trim() && onConfirm) onConfirm(name.trim());
    return true;
  };

  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: mobileView ? "20px 16px" : "26px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", boxSizing: "border-box" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#222", marginBottom: 22 }}>User 1</div>

        {/* Fields grid */}
        <div style={{ display: "grid", gridTemplateColumns: mobileView ? "1fr" : "1fr 1fr", gap: mobileView ? 14 : "18px 24px" }}>
          <div ref={el => fieldRefs.current["name"] = el}>
            <div style={fieldBox("name")}>
              <div style={labelStyle}>Name as shown in ID</div>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <div ref={el => fieldRefs.current["nric"] = el} style={fieldBox("nric", {
              boxShadow: idGlow ? "0 0 0 3px rgba(99, 102, 241, 0.4)" : activeField === "nric" ? "0 0 0 3px rgba(227,6,19,0.15)" : undefined,
            })}>
              <div style={labelStyle}>{idMeta.idLabel}</div>
              <input value={nric} onChange={e => setNric(e.target.value)} onBlur={onNricBlur} style={inputStyle} />
            </div>
            {fieldErrors.nric
              ? <div style={errStyle}>{fieldErrors.nric}</div>
              : <div style={helperStyle}>{idCountry === "SG" ? "Enter in either format: S1234567A or T1234567A" : `e.g. ${idMeta.idExample}`}</div>}
          </div>
          <div>
            <div ref={el => fieldRefs.current["mobile"] = el} style={fieldBox("mobile", {
              boxShadow: phoneGlow ? "0 0 0 3px rgba(99, 102, 241, 0.4)" : activeField === "mobile" ? "0 0 0 3px rgba(227,6,19,0.15)" : undefined,
            })}>
              <div style={labelStyle}>Mobile no.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  onClick={() => setCountryDropdownOpen(o => !o)}
                  style={{ position: "relative", fontSize: 14.5, color: "#1a1a1a", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
                >
                  <span>{phoneMeta.code}</span>
                  <span style={{ fontSize: 9, color: "#888" }}>▾</span>
                  {countryDropdownOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 30,
                      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8,
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
                              padding: "10px 14px", fontSize: 13, color: "#1a1a1a",
                              borderBottom: i < COUNTRIES.length - 1 ? "1px solid #eee" : "none",
                              background: active ? "#f0f0f0" : "transparent",
                              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f6f6f6"; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                          >
                            <span>{m.flag}</span>
                            <span style={{ flex: 1 }}>{m.name}</span>
                            <span style={{ color: "#888", fontSize: 12 }}>{m.code}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ width: 1, height: 16, background: "#d5d9dd", flexShrink: 0 }} />
                <input value={mobile} onChange={e => setMobile(e.target.value)} onBlur={() => validateField("mobile", mobile)} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            {fieldErrors.mobile && <div style={errStyle}>{fieldErrors.mobile}</div>}
          </div>
          <div>
            <div ref={el => fieldRefs.current["email"] = el} style={fieldBox("email")}>
              <div style={labelStyle}>Email address</div>
              <input value={email} onChange={e => setEmail(e.target.value)} onBlur={() => validateField("email", email)} style={inputStyle} />
            </div>
            {fieldErrors.email && <div style={errStyle}>{fieldErrors.email}</div>}
          </div>
        </div>

        {/* Roles */}
        <div style={divider} />
        <div style={sectionTitle}>Roles</div>

        <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
          {checkbox(hasSignatory, toggleSignatory)}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#222", marginBottom: 4 }}>Sign to authorise transactions</div>
            <div style={{ fontSize: 13, color: "#777", lineHeight: 1.55 }}><strong style={{ color: "#555" }}>Authorised Signatory</strong> who can sign or accept documents (e.g. payment instructions, bills of exchange) on behalf of the account holder. Automatically acts as entity's contact person.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {checkbox(hasBanking || hasAdmin, toggleBanking)}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#222", marginBottom: 4 }}>View and/or manage online transactions</div>
            <div style={{ fontSize: 13, color: "#777" }}>Business online banking user</div>
          </div>
        </div>

        {/* Business online banking setup */}
        <div style={divider} />
        <div style={sectionTitle}>Business online banking setup</div>

        <div style={{ maxWidth: mobileView ? "100%" : 340 }}>
          <div ref={el => fieldRefs.current["userId"] = el} style={fieldBox("userId")}>
            <div style={labelStyle}>User ID</div>
            <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} />
          </div>
          <div style={helperStyle}>Create a User ID that the user can use to log in to business online banking. Only numbers or letters can be used.</div>
        </div>

        <div style={{ display: "flex", gap: 14, margin: "22px 0 26px" }}>
          {checkbox(followExisting, () => setFollowExisting(v => !v))}
          <div style={{ fontSize: 14, color: "#222", marginTop: 1 }}>Follow existing user setup and account access (recommended)</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {checkbox(hasMaker, toggleMaker, { round: true })}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#222", marginBottom: 3 }}>Create transactions</div>
              <div style={{ fontSize: 13, color: "#777" }}><strong style={{ color: "#555" }}>Maker</strong> who prepares and submits transactions for authorisation.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {checkbox(hasAuthoriser, toggleAuthoriser, { round: true })}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#222", marginBottom: 3 }}>Authorise transactions</div>
              <div style={{ fontSize: 13, color: "#777" }}><strong style={{ color: "#555" }}>Authoriser</strong> who reviews and authorises transactions submitted by Maker(s).</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {checkbox(true, undefined, { round: true, disabled: true })}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#8a9299", marginBottom: 3 }}>View account balances and statements only</div>
              <div style={{ fontSize: 13, color: "#9aa2a9" }}><strong>Viewer</strong> access is included for all users by default.</div>
            </div>
          </div>
        </div>

        {/* Other roles */}
        <div style={divider} />
        <div style={sectionTitle}>Other roles</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {checkbox(hasFX, toggleFX)}
            <div style={{ fontSize: 14, color: "#222", marginTop: 1 }}>Book FX Contract (only for business online banking users)</div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {checkbox(hasContact, toggleContact)}
            <div style={{ fontSize: 14, color: "#222", marginTop: 1 }}>Act as entity's contact person <span style={{ color: "#9aa2a9", fontSize: 12 }}>ⓘ</span></div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {checkbox(hasAdmin, toggleAdmin)}
            <div style={{ fontSize: 14, color: "#222", marginTop: 1 }}>Business online banking Administrator <span style={{ color: "#9aa2a9", fontSize: 12 }}>ⓘ</span></div>
          </div>
        </div>
      </div>

      {/* + Add user */}
      <button
        onClick={() => commitUser()}
        style={{
          marginTop: 22, padding: "10px 18px", borderRadius: 6,
          border: "1px solid #c8cdd2", background: "#fff", color: "#333",
          fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >＋ Add user</button>

      <div style={{ height: 1, background: "#ececec", margin: "30px 0 24px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {onBack ? (
          <button onClick={onBack} style={{ padding: "12px 30px", borderRadius: 6, border: "1px solid #c8cdd2", background: "#fff", color: "#333", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
        ) : <div />}
        <button
          onClick={() => { if (commitUser()) onNext && onNext(); }}
          style={{
            padding: "13px 36px", borderRadius: 6, border: "none",
            background: SLATE, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >Next</button>
      </div>
    </div>
  );
}
const INITIAL_JOURNEY_USERS = [
  { name: "Peter Poh Wen Xiang", userId: "peter456", nricMasked: "NRIC •••••321A", sub: "", ap: true,  as: false, role: "Maker and Authoriser" },
  { name: "Alex Loh", userId: "alexloh88", nricMasked: "NRIC •••••654B", sub: "Entity's contact person\nBusiness online banking contact person", ap: true, as: true, role: "Maker and Authoriser" },
  { name: "Mabel Teoh", userId: "mabelteoh1", nricMasked: "NRIC •••••887C", sub: "Entity's contact person", ap: true, as: true, role: "Viewer" },
  { name: "Gabriel Tan", userId: "Gabrieltan234", nricMasked: "NRIC •••••567F", sub: "", ap: false, as: true, role: "Authoriser" },
  { name: "Angeline Chow", userId: "angeline22", nricMasked: "NRIC •••••210D", sub: "", ap: true, as: false, role: "Viewer" },
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

function roleDisplay(r) {
  const l = r.toLowerCase();
  if (l.includes("signator")) return "Sign to authorise transactions";
  if (l.includes("authorised person")) return "Open and close accounts, apply for banking facilities";
  if (l.includes("fx contract")) return "Book FX Contract";
  if (l.includes("contact person")) return "Act as entity's contact person";
  return r;
}

function getUserPermissions(u) {
  const perms = [];
  if (u.as) perms.push("Sign to authorise transactions");
  if (u.role) perms.push("View, and/or manage online transactions");
  if (u.ap) perms.push("Open and close accounts, apply for banking facilities");
  if (u.sub && u.sub.toLowerCase().includes("contact")) perms.push("Act as entity's contact person");
  return perms;
}

function JourneyPage({ headerOffset = VELOCITY_HEADER_HEIGHT, isMobileView = false, username = "Patrick Tan" }) {
  // step: 0 = landing / entry, 1 = add user(s), 2 = remove user(s), 3 = review, 4 = submitted
  const [step, setStep] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [reviewBanner, setReviewBanner] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [consented, setConsented] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingChatText, setPendingChatText] = useState(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [mobileRoleTab, setMobileRoleTab] = useState("AP");
  const [aiInput, setAiInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [manageDropdownOpen, setManageDropdownOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [addUserRoles, setAddUserRoles] = useState(null);
  const [addUserData, setAddUserData] = useState({});
  const [addUserIdCountry, setAddUserIdCountry] = useState("SG");
  const [addUserPhoneCountry, setAddUserPhoneCountry] = useState("SG");
  const [addUserActiveField, setAddUserActiveField] = useState(null);
  const [chatFocusSignal, setChatFocusSignal] = useState(null);
  const [journeyUsers, setJourneyUsers] = useState(INITIAL_JOURNEY_USERS);
  const [assistantNotification, setAssistantNotification] = useState(null);
  const [lastIntents, setLastIntents] = useState([]);
  const [activeIntent, setActiveIntent] = useState(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);
  const [selectedDeleteUsers, setSelectedDeleteUsers] = useState([]);
  const [deleteDropdownOpen, setDeleteDropdownOpen] = useState(false);
  const [completedIntents, setCompletedIntents] = useState([]);
  const [closeTaskSignal, setCloseTaskSignal] = useState(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [reviewAdds, setReviewAdds] = useState([]);
  const [reviewDeletes, setReviewDeletes] = useState([]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const chatW = viewportWidth < 1200 ? 300 : 330;

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
    } else if (intent === "delete_user") {
      setSelectedDeleteUsers([]);
      setDeleteConfirmIdx(null);
      setDeleteConfirmed(false);
    }
  };

  // Shared by the side-panel Confirm button and the in-chat Confirm bubble.
  const submitAddUser = (userName) => {
    setJourneyUsers(prev => [...prev, buildUserEntry(userName, addUserRoles || [])]);
    setReviewAdds(prev => [...prev, { name: userName, nric: addUserData.nric || "", mobile: addUserData.mobile || "", email: addUserData.email || "", userId: addUserData.userId || "", roles: addUserRoles || [] }]);
    setAddUserRoles(null);
    setAddUserData({});
    setAddUserIdCountry("SG");
    setAddUserPhoneCountry("SG");
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
        if (isMobileView) setTimeout(() => setShowExitModal(true), 1400);
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
    setChatStarted(true);
    setPendingMessage({ text, key: Date.now() });
  };

  // Opens chat (with optional first message); on mobile, gates behind the consent sheet once.
  const openChat = (text = null) => {
    if (isMobileView && !consented) {
      setPendingChatText(text);
      setConsentOpen(true);
      return;
    }
    setChatOpen(true);
    if (text) {
      setChatStarted(true);
      setPendingMessage({ text, key: Date.now() });
    }
  };

  const handleConsentProceed = () => {
    setConsented(true);
    setConsentOpen(false);
    setChatOpen(true);
    if (pendingChatText) {
      setChatStarted(true);
      setPendingMessage({ text: pendingChatText, key: Date.now() });
      setPendingChatText(null);
    }
  };

  const handleAiSubmit = () => {
    const text = aiInput.trim();
    if (!text) return;
    setAiInput("");
    openChat(text);
  };

  const confirmDeletes = () => {
    const names = selectedDeleteUsers;
    if (names.length === 0) return;
    const deletedEntries = journeyUsers.filter(u => names.includes(u.name));
    setReviewDeletes(prev => [...prev, ...deletedEntries.map(u => ({ name: u.name, userId: u.userId || "", nricMasked: u.nricMasked || "", roles: getUserPermissions(u) }))]);
    setJourneyUsers(prev => prev.filter(u => !names.includes(u.name)));
    setDeleteConfirmed(true);
    setCloseTaskSignal({ intent: "delete_user", key: Date.now() });
    const norm = (s) => s.toLowerCase().replace(/\s+/g, "_");
    const nowCompleted = [...completedIntents, activeIntent].filter(Boolean).map(norm);
    setCompletedIntents(nowCompleted);
    setSelectedDeleteUsers([]);
    setDeleteDropdownOpen(false);
  };

  const proceedToReview = () => {
    setShowExitModal(false);
    confirmDeletes();
    setChatOpen(false);
    setStep(3);
  };

  const handleRemoveNext = () => {
    if (chatOpen) setShowExitModal(true);
    else proceedToReview();
  };

  const resetAll = () => {
    setReviewAdds([]); setReviewDeletes([]);
    setJourneyUsers(INITIAL_JOURNEY_USERS);
    setAddUserRoles(null); setAddUserData({}); setAddUserIdCountry("SG"); setAddUserPhoneCountry("SG"); setAddUserActiveField(null);
    setSelectedDeleteUsers([]); setDeleteDropdownOpen(false); setDeleteConfirmed(false); setDeleteConfirmIdx(null);
    setCompletedIntents([]); setLastIntents([]); setActiveIntent(null);
    setAssistantNotification(null); setReviewBanner(true); setDetailsOpen(true);
    setChatStarted(false);
    setChatOpen(false);
    setStep(0);
  };

  const outlineBtn = { padding: "12px 30px", borderRadius: 6, border: "1px solid #c8cdd2", background: "#fff", color: "#333", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };
  const slateBtn = { padding: "13px 36px", borderRadius: 6, border: "none", background: SLATE, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#fff",
      fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#222",
      transition: "padding-right 0.2s ease",
      paddingRight: !isMobileView && chatOpen ? chatW : 0,
      boxSizing: "border-box",
    }}>

      {/* Mobile top bar (entry + form steps) */}
      {isMobileView && step <= 2 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          borderBottom: "1px solid #eee", background: "#fff",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          {step === 0 ? (
            <span style={{ fontSize: 18, color: "#333", lineHeight: 1 }}>☰</span>
          ) : (
            <button onClick={() => setStep(s => Math.max(0, s - 1))} style={{ background: "none", border: "none", fontSize: 20, color: "#333", cursor: "pointer", padding: 0, lineHeight: 1, fontFamily: "inherit" }}>‹</button>
          )}
          <span style={{ flex: 1, textAlign: "center", fontSize: 15.5, fontWeight: 700, color: "#222" }}>
            {step === 0 ? "Roles and authorisation" : step === 1 ? "Add user(s)" : "Remove user(s)"}
          </span>
          <button onClick={() => openChat()} style={{ background: "none", border: "none", fontSize: 14, color: "#2f80c3", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Manage</button>
        </div>
      )}

      {/* Mobile entry page */}
      {isMobileView && step === 0 && (
        <div style={{ padding: "18px 16px 90px", position: "relative", minHeight: "70vh" }}>
          {/* AI input */}
          <div style={{
            border: "1px solid #eee", borderRadius: 10, padding: "10px 12px 0 16px",
            marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", background: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiSubmit()}
                placeholder="Simply describe what you want to do"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#333", background: "transparent", fontFamily: "inherit", padding: "4px 0 12px" }}
              />
              <div onClick={handleAiSubmit} style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #FB8C39, #ED1C24)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, marginBottom: 8,
              }}>
                <span style={{ color: "#fff", fontSize: 15 }}>✦</span>
              </div>
            </div>
            <div style={{ height: 3, borderRadius: "0 0 10px 10px", background: "linear-gradient(90deg, #FB5C39, #ED1C24, #D6271C)", margin: "0 -12px" }} />
          </div>

          {/* Role pill tabs */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[["AP", "AUTHORISED PERSONS"], ["AS", "AUTHORISED SIGNATORIES"]].map(([key, label]) => {
              const active = mobileRoleTab === key;
              return (
                <button key={key} onClick={() => setMobileRoleTab(key)} style={{
                  padding: "8px 16px", borderRadius: 20,
                  border: active ? "none" : "1px solid #d5d9dd",
                  background: active ? "#dfe4ea" : "#fff",
                  color: active ? "#333" : "#8a9299",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                  cursor: "pointer", fontFamily: "inherit",
                }}>{label}</button>
              );
            })}
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#222", marginBottom: 4 }}>
            {mobileRoleTab === "AP" ? "Open and close accounts, and apply for banking facilities" : "Sign to authorise transactions"}
          </div>
          <div style={{ fontSize: 12.5, color: "#8a9299", lineHeight: 1.55, marginBottom: 8 }}>
            {mobileRoleTab === "AP" ? "Any Authorised Person can act for or on behalf of the entity. " : "Authorised Signatories can sign or accept documents on behalf of the account holder. "}
            <span style={{ color: "#2f80c3", cursor: "pointer" }}>Learn more about roles</span>
          </div>

          {journeyUsers.filter(u => (mobileRoleTab === "AP" ? u.ap : u.as)).map(u => (
            <div key={u.name} style={{ padding: "16px 2px", borderBottom: "1px solid #eee", fontSize: 15, fontWeight: 600, color: "#222" }}>
              {u.name}
            </div>
          ))}

          {/* Need help pill */}
          <div style={{ position: "fixed", bottom: 22, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 90 }}>
            <button onClick={() => openChat()} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 22px", borderRadius: 24, border: "1px solid #f3d9c8",
              background: "linear-gradient(90deg, #fdf3ec, #fbe3d2)",
              color: "#333", fontSize: 13.5, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
            }}>
              <span style={{ color: "#ED1C24" }}>❋</span> Need help?
            </button>
          </div>
        </div>
      )}

      {/* Step 0 — Desktop landing page (Roles & Authorisation) */}
      {!isMobileView && step === 0 && (
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 40px 24px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 52, alignItems: "flex-start" }}>

            {/* Left sidebar — title */}
            <div style={{ flexShrink: 0, width: 176, paddingTop: 6 }}>
              <div style={{ width: 34, height: 3, background: "#E30613", marginBottom: 10 }} />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#222", letterSpacing: "0.12em", lineHeight: 1.6, textTransform: "uppercase" }}>
                Manage Roles<br />and Authorisation
              </div>
            </div>

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* AI input + star button */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <div style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: 8, padding: "14px 18px 0", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAiSubmit()}
                    placeholder="Simply describe what you want to do, and our AI will help you complete the task."
                    style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#333", background: "transparent", fontFamily: "inherit", padding: "0 0 14px", boxSizing: "border-box" }}
                  />
                  <div style={{ height: 3, borderRadius: "0 0 8px 8px", background: "linear-gradient(90deg, #FB5C39, #ED1C24, #f7a04b)", margin: "0 -18px" }} />
                </div>
                {/* Star — open chat (with or without typed text) */}
                <div
                  onClick={() => { if (aiInput.trim()) handleAiSubmit(); else setChatOpen(true); }}
                  style={{ width: 40, height: 40, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #ffd84d, #f5a623)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 10px rgba(245,166,35,0.45)" }}
                >✦</div>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #e8e8e8", marginBottom: 22 }}>
                {["Roles", "Authorisation"].map(tab => (
                  <button key={tab} style={{ padding: "10px 20px 11px", border: "none", background: "none", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", color: tab === "Roles" ? "#222" : "#8a9299", fontWeight: tab === "Roles" ? 700 : 400, borderBottom: tab === "Roles" ? "2px solid #333" : "2px solid transparent", marginBottom: -1 }}>{tab}</button>
                ))}
              </div>

              {/* Controls row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  <div style={{ border: "1px solid #d8dcdf", borderRadius: 4, padding: "8px 14px", fontSize: 13.5, color: "#333", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, minWidth: 240 }}>
                    <span style={{ flex: 1 }}>612873120012SGD - PURE DELIVERY P...</span>
                    <span style={{ fontSize: 9, color: "#666" }}>▾</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8a9299", marginTop: 6 }}>Last updated 24 Dec 2022</div>
                </div>
                {/* Manage users button (outlined) + dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setManageDropdownOpen(o => !o)}
                    style={{ padding: "8px 18px", borderRadius: 4, border: "1px solid #c8cdd2", background: "#fff", color: "#222", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                    Manage users
                  </button>
                  {manageDropdownOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 170, overflow: "hidden" }}>
                      {[["Add user(s)", 1], ["Remove user(s)", 2]].map(([label, targetStep], idx) => (
                        <div
                          key={label}
                          onClick={() => { setManageDropdownOpen(false); setStep(targetStep); setChatOpen(true); }}
                          style={{ padding: "11px 16px", fontSize: 13.5, cursor: "pointer", color: "#222", borderTop: idx > 0 ? "1px solid #eee" : "none" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >{label}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search row */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <div style={{ border: "1px solid #d8dcdf", borderRadius: 4, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, background: "#fff", minWidth: 200 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a9299" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  <input placeholder="Search" style={{ border: "none", outline: "none", fontSize: 13.5, color: "#333", background: "transparent", fontFamily: "inherit", width: 160 }} />
                </div>
              </div>

              {/* Roles table */}
              <div style={{ border: "1px solid #e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.3fr 1.1fr 1.3fr", borderBottom: "1px solid #e0e0e0" }}>
                  <div style={{ padding: "16px 20px", background: "#f2f4f6" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#222" }}>Users and roles</div>
                  </div>
                  {[
                    { label: "Authorised Person", desc: "Open and close accounts, and apply for banking facilities" },
                    { label: "Authorised Signatory", desc: "Sign to authorise transactions" },
                    { label: "Business online banking user", desc: "View and/or manage online transactions" },
                  ].map((col, i) => (
                    <div key={col.label} style={{ padding: "12px 16px", background: "#fff", borderLeft: "1px solid #e8e8e8" }}>
                      <div style={{ fontSize: 11, color: "#8a9299", marginBottom: 4 }}>{col.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#222", lineHeight: 1.4, marginBottom: 6 }}>{col.desc}</div>
                      <div style={{ fontSize: 12.5, color: "#2f80c3", cursor: "pointer" }}>What else they can do</div>
                    </div>
                  ))}
                </div>
                {/* Data rows */}
                {journeyUsers.map((u, i) => (
                  <div key={u.name} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.3fr 1.1fr 1.3fr", borderBottom: i < journeyUsers.length - 1 ? "1px solid #f0f0f0" : "none", alignItems: "center" }}>
                    <div style={{ padding: "14px 20px", background: "#f2f4f6" }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "#222" }}>{u.name}</div>
                      {u.sub && u.sub.split("\n").filter(Boolean).map(s => (
                        <div key={s} style={{ fontSize: 12, color: "#8a9299", marginTop: 2 }}>{s}</div>
                      ))}
                      {u.pending && <span style={{ fontSize: 11, color: "#f5a623", fontWeight: 600 }}>Pending</span>}
                    </div>
                    <div style={{ padding: "14px 20px", background: "#fff", borderLeft: "1px solid #f0f0f0" }}>
                      {u.ap && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div style={{ padding: "14px 20px", background: "#fff", borderLeft: "1px solid #f0f0f0" }}>
                      {u.as && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div style={{ padding: "14px 16px", background: "#fff", borderLeft: "1px solid #f0f0f0", fontSize: 13.5, color: "#555" }}>{u.role || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps 1 & 2 */}
      {step >= 1 && step <= 2 && (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: isMobileView ? "20px 16px 50px" : "30px 40px 60px", boxSizing: "border-box" }}>
          {!isMobileView && <Stepper current={step} />}
          <div style={{ marginTop: isMobileView ? 4 : 28 }}>

            {step === 1 && (<>
              {!isMobileView && <div style={{ fontSize: 22, fontWeight: 700, color: "#222", marginBottom: 22 }}>Add user(s)</div>}
              <AddUserForm
                selectedRoles={addUserRoles || []}
                onRolesChange={(roles) => setAddUserRoles(roles)}
                formData={addUserData}
                onFormChange={setAddUserData}
                idCountry={addUserIdCountry}
                onIdCountryChange={setAddUserIdCountry}
                phoneCountry={addUserPhoneCountry}
                onPhoneCountryChange={setAddUserPhoneCountry}
                onConfirm={submitAddUser}
                onNext={() => setStep(2)}
                onBack={!isMobileView ? () => setStep(0) : null}
                activeField={addUserActiveField}
                mobileView={isMobileView}
              />
            </>)}

            {step === 2 && (<>
              {!isMobileView && <div style={{ fontSize: 22, fontWeight: 700, color: "#222", marginBottom: 6 }}>Remove user(s)</div>}
              <div style={{ fontSize: 13, color: "#8a9299", marginBottom: 26 }}>The user(s) will be removed from all roles, other than the role of business online banking contact person.</div>

              {/* Select user(s) dropdown */}
              <div style={{ position: "relative", maxWidth: isMobileView ? "100%" : 320, marginBottom: 28 }}>
                <div
                  onClick={() => setDeleteDropdownOpen(o => !o)}
                  style={{
                    background: "#f6f7f8", border: "1px solid #eceff1", borderBottom: "1px solid #c5ccd2",
                    borderRadius: "6px 6px 0 0", padding: "9px 14px 10px", cursor: "pointer", userSelect: "none",
                  }}
                >
                  {selectedDeleteUsers.length > 0 ? (<>
                    <div style={{ fontSize: 11.5, color: "#8a9299", marginBottom: 3 }}>Select user(s)</div>
                    <div style={{ fontSize: 14.5, color: "#1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{selectedDeleteUsers.length} Selected</span>
                      <span style={{ fontSize: 11, color: "#666", transform: deleteDropdownOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
                    </div>
                  </>) : (
                    <div style={{ fontSize: 14, color: "#8a9299", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0 6px" }}>
                      <span>Select user(s)</span>
                      <span style={{ fontSize: 11, color: "#666", transform: deleteDropdownOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
                    </div>
                  )}
                </div>
                {deleteDropdownOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                    background: "#fff", border: "1px solid #e8e8e8",
                    borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden",
                  }}>
                    {journeyUsers.filter(u => !selectedDeleteUsers.includes(u.name)).map((u, i, arr) => (
                      <div
                        key={u.name}
                        onClick={() => { setSelectedDeleteUsers(prev => [...prev, u.name]); setDeleteDropdownOpen(false); }}
                        style={{
                          padding: "11px 16px", fontSize: 14, cursor: "pointer", color: "#222",
                          borderBottom: i < arr.length - 1 ? "1px solid #eee" : "none",
                          background: "transparent",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {u.name}
                      </div>
                    ))}
                    {journeyUsers.filter(u => !selectedDeleteUsers.includes(u.name)).length === 0 && (
                      <div style={{ padding: "11px 16px", fontSize: 13, color: "#8a9299" }}>No more users to select</div>
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
                      border: "1px solid #e8e8e8", borderRadius: 8,
                      padding: "18px 20px", background: "#fff",
                      position: "relative", maxWidth: isMobileView ? "100%" : 300,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)", boxSizing: "border-box",
                    }}>
                      <button
                        onClick={() => setSelectedDeleteUsers(prev => prev.filter(n => n !== name))}
                        style={{
                          position: "absolute", top: 14, right: 14,
                          background: "none", border: "none", cursor: "pointer",
                          color: "#8a9299", fontSize: 18, lineHeight: 1, padding: 2,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "#c8102e"}
                        onMouseLeave={e => e.currentTarget.style.color = "#8a9299"}
                      >×</button>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#222", marginBottom: 2 }}>{u.name}</div>
                      {u.userId && <div style={{ fontSize: 12.5, color: "#8a9299", marginBottom: 10 }}>{u.userId}</div>}
                      <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc", fontSize: 13, color: "#555", lineHeight: 1.8 }}>
                        {perms.map(p => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div style={{ height: 1, background: "#ececec", margin: "42px 0 24px" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep(1)} style={outlineBtn}>Back</button>
                <button onClick={handleRemoveNext} style={slateBtn}>Next</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div style={{ display: "flex", maxWidth: 1160, margin: "0 auto", padding: isMobileView ? 0 : "44px 40px 50px", gap: 44, boxSizing: "border-box" }}>
          {!isMobileView && (
            <div style={{ width: 150, flexShrink: 0, paddingTop: 10 }}>
              <div style={{ width: 34, height: 3, background: "#E30613", marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.18em", color: "#222" }}>REVIEW</div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isMobileView && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #eee", marginBottom: 18, position: "sticky", top: 0, background: "#fff", zIndex: 100 }}>
                <button onClick={() => setStep(2)} style={{ background: "none", border: "none", fontSize: 20, color: "#333", cursor: "pointer", padding: 0, lineHeight: 1, fontFamily: "inherit" }}>‹</button>
                <span style={{ flex: 1, textAlign: "center", fontSize: 15.5, fontWeight: 700, color: "#222" }}>Review</span>
                <span style={{ color: "#8a9299", fontSize: 15 }}>ⓘ</span>
              </div>
            )}
            <div style={{ padding: isMobileView ? "0 16px 40px" : 0 }}>

              {reviewBanner && (
                <div style={{ background: "#eef3f9", border: "1px solid #d9e4f0", borderRadius: 4, padding: "12px 16px", display: "flex", gap: 10, marginBottom: 26 }}>
                  <span style={{ color: "#2f6fad", fontSize: 14, lineHeight: 1.4 }}>ⓘ</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#222", marginBottom: 3 }}>Review required</div>
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.55 }}>Information below is generated by AI. Please verify all details for accuracy before submission. To edit, tap the 'back' button to make changes.</div>
                  </div>
                  <button onClick={() => setReviewBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 15, lineHeight: 1, padding: 2, fontFamily: "inherit" }}>×</button>
                </div>
              )}

              {/* Details of request */}
              <div style={{ border: "1px solid #e5e5e5", borderRadius: 4, overflow: "hidden", fontSize: 13, marginBottom: 26, background: "#fff" }}>
                <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: detailsOpen ? "1px solid #e5e5e5" : "none" }}>
                  <div>
                    <div style={{ fontSize: 12.5, color: "#666", marginBottom: 3 }}>Details of request:</div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: "#222" }}>
                      {reviewAdds.length > 0 && reviewDeletes.length > 0 ? "Add and remove user(s)" : reviewAdds.length > 0 ? "Add user(s)" : reviewDeletes.length > 0 ? "Remove user(s)" : "No changes requested"}
                    </div>
                  </div>
                  <button onClick={() => setDetailsOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#444", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                    {detailsOpen ? "Hide" : "Show"} <span style={{ fontSize: 9 }}>{detailsOpen ? "▲" : "▼"}</span>
                  </button>
                </div>

                {detailsOpen && <>
                  {reviewAdds.length > 0 && (<>
                    <div style={{ padding: "11px 18px", fontWeight: 700, fontSize: 13.5, color: "#333", background: "#eceef0" }}>Add user(s)</div>
                    {!isMobileView && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", borderBottom: "1px solid #eee", padding: "10px 18px" }}>
                        {["NAME/USER ID", "DETAILS", "ROLES"].map(h => (
                          <div key={h} style={{ fontSize: 10.5, fontWeight: 700, color: "#8a9299", letterSpacing: "0.06em" }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {reviewAdds.map((u, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1.4fr", borderBottom: "1px solid #eee", padding: "15px 18px", gap: isMobileView ? 8 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#222" }}>{i + 1}.&nbsp; {u.name}</div>
                          {u.userId && <div style={{ color: "#8a9299", marginTop: 3, paddingLeft: 17 }}>{u.userId}</div>}
                        </div>
                        <div style={{ color: "#666", lineHeight: 1.7, paddingLeft: isMobileView ? 17 : 0 }}>
                          {u.nric   && <div>NRIC {u.nric}</div>}
                          {u.mobile && <div>{u.mobile}</div>}
                          {u.email  && <div>{u.email}</div>}
                        </div>
                        <div style={{ color: "#555", lineHeight: 1.7, paddingLeft: isMobileView ? 17 : 0 }}>
                          {isMobileView && <div style={{ fontWeight: 700, color: "#222", marginBottom: 2 }}>Roles</div>}
                          {u.roles.map(r => <div key={r}>{isMobileView ? "" : "•  "}{roleDisplay(r)}</div>)}
                        </div>
                      </div>
                    ))}
                  </>)}

                  {reviewDeletes.length > 0 && (<>
                    <div style={{ padding: "11px 18px", fontWeight: 700, fontSize: 13.5, color: "#333", background: "#eceef0" }}>Remove user(s)</div>
                    {!isMobileView && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", borderBottom: "1px solid #eee", padding: "10px 18px" }}>
                        {["NAME/USER ID", "DETAILS", "ROLES"].map(h => (
                          <div key={h} style={{ fontSize: 10.5, fontWeight: 700, color: "#8a9299", letterSpacing: "0.06em" }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {reviewDeletes.map((u, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1.4fr", borderBottom: i < reviewDeletes.length - 1 ? "1px solid #eee" : "none", padding: "15px 18px", gap: isMobileView ? 8 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#222" }}>{i + 1}.&nbsp; {u.name}</div>
                          {u.userId && <div style={{ color: "#8a9299", marginTop: 3, paddingLeft: 17 }}>{u.userId}</div>}
                        </div>
                        <div style={{ color: "#666", lineHeight: 1.7, paddingLeft: isMobileView ? 17 : 0 }}>
                          {u.nricMasked && <div>{u.nricMasked}</div>}
                        </div>
                        <div style={{ color: "#555", lineHeight: 1.7, paddingLeft: isMobileView ? 17 : 0 }}>
                          {isMobileView && <div style={{ fontWeight: 700, color: "#222", marginBottom: 2 }}>Roles</div>}
                          {u.roles.map(r => <div key={r}>{isMobileView ? "" : "•  "}{roleDisplay(r)}</div>)}
                        </div>
                      </div>
                    ))}
                  </>)}
                </>}
              </div>

              <div style={{ fontSize: 13.5, color: "#333", marginBottom: 4 }}>Learn more about <span style={{ color: "#2f80c3", cursor: "pointer" }}>roles</span></div>
              <div style={{ height: 1, background: "#ececec", margin: "26px 0" }} />
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.65, marginBottom: 32 }}>
                By clicking on 'Submit', you confirm that the information and content provided in this request is true, complete and accurate. You also confirm that you are authorised to act on behalf of your entity, and have read, understood and agree to be bound by <span style={{ color: "#2f80c3", cursor: "pointer" }}>OCBC's Business Account Terms and Conditions</span>.
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep(2)} style={outlineBtn}>Back</button>
                <button onClick={() => setStep(4)} style={slateBtn}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Request submitted */}
      {step === 4 && (
        <div style={{ background: "#f2f4f6", minHeight: isMobileView ? "100vh" : `calc(100vh - ${headerOffset}px)`, padding: "50px 16px 40px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: 620, margin: "0 auto", position: "relative" }}>
            <div style={{
              position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)",
              width: 52, height: 52, borderRadius: "50%", background: "#2f80c3", zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </div>
            <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", padding: isMobileView ? "44px 22px 26px" : "48px 44px 28px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, textAlign: "center", color: "#222", marginBottom: 18 }}>Request submitted</div>
              <div style={{ fontSize: 13, color: "#444", textAlign: "center", lineHeight: 1.65, marginBottom: 14 }}>
                We have received your request to add and remove users and will send you an email and push notification/SMS after each step below has been completed.
              </div>
              <div style={{ fontSize: 13, color: "#444", textAlign: "center", lineHeight: 1.65, marginBottom: 26 }}>
                If a user you remove is the business online banking contact person, we will continue to contact him/her until another person is appointed through our <span style={{ color: "#2f80c3", cursor: "pointer" }}>Apply and Manage OCBC Velocity form</span>.
              </div>
              <div style={{ height: 1, background: "#ececec", marginBottom: 26 }} />

              {[
                { label: "Request submitted", filled: true },
                { label: "Pending authorisation", bullets: ["Patrick Tan", "Jane Doe"] },
                { label: "Pending review", desc: "Appointed user(s) must verify their identity through the OCBC Business app. We will inform them via email and SMS to do so within 14 days of this request being authorised.\nYou will be notified after each user verifies his/her identity.", bullets: reviewAdds.length > 0 ? reviewAdds.map(u => u.name) : ["Newbie 1", "Newbie 2"] },
                { label: "In progress", items: [{ text: "Add user(s)" }, { text: "Remove user(s)", note: "The user(s) will be removed from all accounts and roles, other than the role of business online banking contact person, within 8 working days." }] },
                { label: "Successful" },
              ].map((it, i, arr) => (
                <div key={it.label} style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12, flexShrink: 0 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 4, background: it.filled ? "#222" : "#fff", border: `1.5px solid ${it.filled ? "#222" : "#9aa2a9"}`, boxSizing: "border-box", flexShrink: 0 }} />
                    {i < arr.length - 1 && <div style={{ flex: 1, width: 0, borderLeft: "1.5px dotted #c0c6cb", margin: "3px 0" }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 22 : 0, fontSize: 13, color: "#444" }}>
                    <div style={{ fontWeight: 700, color: "#222", marginBottom: it.desc || it.bullets || it.items ? 6 : 0 }}>{it.label}</div>
                    {it.desc && <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, marginBottom: 6 }}>{it.desc}</div>}
                    {it.bullets && <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>{it.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
                    {it.items && <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{it.items.map(x => <li key={x.text} style={{ marginBottom: 4 }}>{x.text}{x.note && <div style={{ color: "#666", fontSize: 12.5, lineHeight: 1.6 }}>{x.note}</div>}</li>)}</ul>}
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 13, color: "#444", marginTop: 8 }}>Track the status of your request by going to <span style={{ color: "#2f80c3", cursor: "pointer" }}>tasks and statuses</span>.</div>
              <div style={{ textAlign: "center", marginTop: 20, color: "#666", fontSize: 14 }}>⌄</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={resetAll} style={slateBtn}>Back to Home</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!isMobileView && step <= 3 && (
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 40px 26px", boxSizing: "border-box" }}>
          <div style={{ paddingTop: 20, borderTop: "1px solid #ececec", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a9299" }}>
            <span>© OCBC. All Rights Reserved.</span>
            <span>Conditions of Access &nbsp;|&nbsp; Security &amp; Privacy</span>
          </div>
        </div>
      )}

      {/* X Chat panel — docked right on desktop, fullscreen overlay on mobile */}
      {chatOpen && (
        <div style={isMobileView ? {
          position: "fixed", top: 0, bottom: 0, left: 0, right: 0, zIndex: 2000,
          display: "flex", flexDirection: "column", overflow: "hidden",
          backgroundImage: "url(/chatbackground.jpg)",
          backgroundSize: "cover", backgroundPosition: "bottom center",
        } : {
          position: "fixed", top: headerOffset, bottom: 0, right: 0, zIndex: 1500,
          width: chatW, display: "flex", flexDirection: "column", overflow: "hidden",
          backgroundImage: "url(/chatbackground.jpg)",
          backgroundSize: "cover", backgroundPosition: "bottom center",
          borderLeft: "1px solid #e5e5e5", boxSizing: "border-box",
        }}>
          {/* Chat header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "15px 18px", flexShrink: 0,
            background: "rgba(255,255,255,0.92)", borderBottom: "1px solid #e8e8e8",
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>X Chat</span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: "#666", letterSpacing: "0.08em", marginTop: 2 }}>BETA</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setChatOpen(false)} style={{
              background: "none", border: "none", color: "#333", fontSize: isMobileView ? 19 : 18,
              cursor: "pointer", lineHeight: 1, padding: "0 2px", fontFamily: "inherit",
            }}>{isMobileView ? "✕" : "—"}</button>
          </div>

          {/* Welcome state (before first message) or chat body */}
          {!chatStarted ? (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 30px", textAlign: "center" }}>
              <div style={{
                width: 220, height: 220, marginTop: 30, flexShrink: 0,
                backgroundImage: "url(/initialchatbg.jpg)",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                mixBlendMode: "multiply",
              }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: "#222", marginTop: 26, marginBottom: 10 }}>How may I help today, {(username || "there").split(" ")[0]}?</div>
              <div style={{ fontSize: 13.5, color: "#666", lineHeight: 1.6, marginBottom: 26 }}>I can currently add and remove online banking users, with more features being introduced over time.</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {[["Add user", "I want to add a new user"], ["Remove user", "I want to remove an existing user"]].map(([label, query]) => (
                  <button key={label} onClick={() => { setChatStarted(true); setPendingMessage({ text: query, key: Date.now() }); }} style={{
                    padding: "10px 22px", borderRadius: 22, border: "1.5px solid #b8bfc5",
                    background: "#fff", color: "#333", fontSize: 13.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>{label}</button>
                ))}
              </div>
            </div>
          ) : (
            <ChatWidget
              sessionId={SESSION_JOURNEY}
              title="X Chat"
              label="X"
              color="#ED1C24"
              pendingMessage={pendingMessage}
              version={2}
              mobile={true}
              dark={false}
              showHeader={false}
              taskProgress={taskProgress}
              naturalIntentCopy={true}
              assistantBg={isMobileView ? "#f0eeec" : "#ececec"}
              transparentBg={true}
              intentResponses={{
                "add user":    { type: "role_selector" },
                "add_user":    { type: "role_selector" },
                "delete user": "Sure! Please select the user(s) you'd like to remove in the **Remove user(s)** step. Once you've made your selection, click **Next** to proceed.",
                "delete_user": "Sure! Please select the user(s) you'd like to remove in the **Remove user(s)** step. Once you've made your selection, click **Next** to proceed.",
              }}
              idCountry={addUserIdCountry}
              onIdCountryChange={setAddUserIdCountry}
              phoneCountry={addUserPhoneCountry}
              onPhoneCountryChange={setAddUserPhoneCountry}
              onRoleConfirm={(roles) => { setAddUserRoles(roles); setAddUserData({}); setStep(1); }}
              formData={addUserData}
              chatFocusSignal={chatFocusSignal}
              onFieldCollected={(field, value) => setAddUserData(prev => ({ ...prev, [field]: value }))}
              onActiveFieldChange={setAddUserActiveField}
              assistantMessage={assistantNotification}
              closeTaskSignal={closeTaskSignal}
              onTaskClosed={handleTaskClosed}
              onChatConfirm={handleInChatConfirm}
              onIntentsDetected={(intents) => { setLastIntents(intents); setCompletedIntents([]); }}
              onIntentDismiss={handleIntentDismiss}
              onIntentStarted={(label) => {
                setActiveIntent(label);
                if (label.toLowerCase().includes("delete")) {
                  setStep(2);
                  setDeleteConfirmed(false);
                }
              }}
            />
          )}

          {/* Input bar with warm gradient */}
          <div style={{ flexShrink: 0, background: "linear-gradient(180deg, rgba(246,246,246,0) 0%, rgba(247,178,120,0.55) 165%)", paddingTop: 20 }}>
            <div style={{
              background: "#fff", borderRadius: isMobileView ? 0 : "14px 14px 0 0",
              boxShadow: "0 -3px 12px rgba(0,0,0,0.08)",
              display: "flex", alignItems: "center", padding: "13px 14px", gap: 10,
            }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChatSend()}
                onFocus={() => setChatFocusSignal({ key: Date.now() })}
                placeholder="Tell me what you need to do"
                style={{
                  flex: 1, border: "none", outline: "none",
                  fontSize: 14, color: "#333", fontFamily: "inherit",
                  background: "transparent",
                }}
              />
              <button onClick={handleChatSend} style={{
                width: 30, height: 30, borderRadius: "50%", border: "none",
                background: "#ED1C24", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, padding: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
              </button>
            </div>
            {isMobileView && <div style={{ height: 3, background: "linear-gradient(90deg, #FB5C39, #ED1C24, #f7a04b)" }} />}
          </div>
        </div>
      )}

      {/* Reopen chat pill (desktop) */}
      {!isMobileView && !chatOpen && step <= 2 && (
        <button onClick={() => setChatOpen(true)} style={{
          position: "fixed", right: 22, bottom: 22, zIndex: 1500,
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 20px", borderRadius: 26, border: "none",
          background: "#ED1C24", color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}>✦ X Chat</button>
      )}

      {/* Exit chat modal */}
      {showExitModal && (
        <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, zIndex: 3000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "relative", background: "#fff", borderRadius: 6, maxWidth: 470, width: "100%", padding: "52px 36px 34px", textAlign: "center", boxShadow: "0 12px 48px rgba(0,0,0,0.3)", boxSizing: "border-box" }}>
            <div style={{
              position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
              width: 56, height: 56, borderRadius: "50%", background: "#f5a623",
              color: "#fff", fontSize: 26, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>!</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#222", marginBottom: 14 }}>Exit chat to review your request?</div>
            <div style={{ fontSize: 13.5, color: "#666", lineHeight: 1.65, marginBottom: 28 }}>
              You are about to leave this chat and continue on the review page.<br />
              Please review your request before submitting it.
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              <button onClick={() => setShowExitModal(false)} style={outlineBtn}>Go back</button>
              <button onClick={proceedToReview} style={slateBtn}>Proceed</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile consent sheet */}
      {isMobileView && consentOpen && (
        <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, zIndex: 2500, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#fff", borderRadius: "18px 18px 0 0", overflow: "hidden", textAlign: "center" }}>
            <div style={{ background: "linear-gradient(180deg, #fbe0cf 0%, rgba(255,255,255,0) 90%)", padding: "34px 28px 4px" }}>
              <div style={{ fontSize: 30, color: "#ED1C24", marginBottom: 14, lineHeight: 1 }}>❋</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#222", marginBottom: 18 }}>Start OCBC Chat (Beta)</div>
            </div>
            <div style={{ padding: "0 30px 28px" }}>
              <div style={{ fontSize: 13.5, color: "#555", lineHeight: 1.65, marginBottom: 16 }}>OCBC Chat (Beta) helps you prepare user management requests. It does not authorise, decide, or submit requests on your behalf.</div>
              <div style={{ fontSize: 13.5, color: "#555", lineHeight: 1.65, marginBottom: 26 }}>By proceeding, you have read and accept OCBC's <span style={{ color: "#2f80c3" }}>Chat Policy</span>.</div>
              <button onClick={handleConsentProceed} style={{ ...slateBtn, width: "100%", padding: "15px 0" }}>Proceed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WarningBanner({ onDismiss }) {
  return (
    <div style={{
      position: "fixed", top: VELOCITY_HEADER_HEIGHT, left: 0, right: 0, zIndex: 1050,
      background: "#fffbeb",
      borderBottom: "1px solid #fde68a",
      padding: "9px 28px", display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, color: "#92400e", boxSizing: "border-box", height: 40,
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

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [username, setUsername] = useState(getUsername() || "");
  const [pendingMessage, setPendingMessage] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChips, setShowChips] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState([true, true, true]);
  const [showBanner, setShowBanner] = useState(true);
  const [activeNav, setActiveNav] = useState("Administration");
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
  if (isMobile) return <JourneyPage isMobileView={true} username="Patrick Tan" />;

  const bannerH = showBanner ? 40 : 0;
  const topOffset = VELOCITY_HEADER_HEIGHT + bannerH;
  const showBenchmark = activeNav === "Tools";

  return (
    <div style={{ minHeight: "100vh", background: showBenchmark ? "#f0f0f0" : "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <VelocityHeader
        username="Patrick Tan"
        activeNav={activeNav}
        onNavChange={(tab) => { if (tab === "Tools" || tab === "Administration") setActiveNav(tab); }}
        onLogout={handleLogout}
      />
      {showBanner && <WarningBanner onDismiss={() => setShowBanner(false)} />}

      {showBenchmark ? (
        <div style={{ paddingTop: topOffset + 36, paddingBottom: 110, display: "flex", justifyContent: "center", minHeight: "100vh", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
            {WIDGETS.map((w, i) => (
              <div key={w.sessionId} style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                <PhoneFrame dark={false} visible={visibleWidgets[i]}>
                  <ChatWidget
                    sessionId={w.sessionId}
                    title={w.title}
                    label={w.label}
                    color={w.color}
                    pendingMessage={visibleWidgets[i] ? pendingMessage : null}
                    version={w.version}
                    mobile={true}
                    dark={false}
                    showHeader={false}
                    showIntentHint={false}
                    compactIntents={true}
                  />
                </PhoneFrame>
                <InfoCard
                  widget={w}
                  info={WIDGET_INFO[i]}
                  dark={false}
                  visible={visibleWidgets[i]}
                  onToggle={() => toggleWidget(i)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ paddingTop: topOffset }}>
          <JourneyPage headerOffset={topOffset} username="Patrick Tan" />
        </div>
      )}

      {/* Fixed bottom input bar — only on benchmark (Tools) view */}
      {showBenchmark && <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", borderTop: "1px solid #e8e8e8",
        zIndex: 1001,
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ padding: "6px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#999", letterSpacing: "0.05em", textTransform: "uppercase" }}>{username}</span>
            <button onClick={() => setShowChips(v => !v)} style={{ background: "none", border: "none", fontSize: 11, color: "#999", cursor: "pointer", padding: 0, letterSpacing: "0.05em" }}>
              {showChips ? "▲ Hide chips" : "▼ Show chips"}
            </button>
          </div>
          <InputBar onSend={handleSharedSend} dark={false} />
          {showChips && (
            <div style={{ padding: "6px 16px 14px", borderTop: "1px solid #e8e8e8", display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
              {[
                { groupLabel: "Single",       items: QUICK_REPLIES },
                { groupLabel: "Multi ×3+",    items: MULTI_INTENT_3_REPLIES },
                { groupLabel: "Tricks",        items: [...OUT_OF_SCOPE_REPLIES, ...HALLUCINATION_REPLIES] },
                { groupLabel: "Multilingual",  items: MULTILINGUAL_REPLIES },
              ].map(({ groupLabel, items }) => (
                <div key={groupLabel} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2, whiteSpace: "nowrap" }}>{groupLabel}</span>
                  {items.map(({ label, query }) => (
                    <Chip key={label} label={label} onClick={() => handleSharedSend(query)} dark={false} />
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
