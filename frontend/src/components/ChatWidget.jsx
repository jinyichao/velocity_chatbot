import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { sendMessage } from "../api/chat";
import { detectId, detectPhone, parseCountryChoice, COUNTRY_META, COUNTRIES } from "../utils/piiDetection";

const ROLES = [
  "Business Online Banking - Viewer",
  "Business Online Banking - Maker",
  "Business Online Banking - Authoriser",
  "Business Online Banking - Administrator",
  "Authorised Person",
  "Authorised Signatories",
  "Book FX Contract",
  "Entity's Contact Person",
];

function RoleSelectorBubble({ onConfirm, onCancel, accentColor, assistantBg }) {
  const [selected, setSelected] = useState([]);
  const toggle = (role) =>
    setSelected((prev) => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        background: assistantBg || "#fff",
        borderRadius: 12, padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: 10, fontSize: 14, lineHeight: 1.5, color: "#1a1a1a",
      }}>
        Which role(s) are you looking to add? You may select more than 1 role and select 'confirm' once ready.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {ROLES.map((role) => {
          const active = selected.includes(role);
          return (
            <button key={role} onClick={() => toggle(role)} style={{
              padding: "7px 14px", borderRadius: 20,
              border: `1.5px solid ${active ? accentColor : "#ccc"}`,
              background: "#fff",
              color: active ? accentColor : "#555",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s",
            }}>
              {active && <span style={{ fontSize: 12 }}>✓</span>}
              {role}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{
          padding: "8px 20px", borderRadius: 6, border: "1.5px solid #ccc",
          background: "#fff", color: "#333", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
        <button onClick={() => onConfirm(selected)} style={{
          padding: "8px 20px", borderRadius: 6, border: "none",
          background: "#3d5166", color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>Confirm</button>
      </div>
    </div>
  );
}

function CountryClarificationBubble({
  detectedCountry,
  currentCountry,
  fieldType,
  value,
  accentColor,
  assistantBg,
  onPick,
}) {
  const detected = COUNTRY_META[detectedCountry];
  const current = COUNTRY_META[currentCountry];
  const fieldLabel = fieldType === "nric" ? "ID" : "mobile number";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        background: assistantBg || "#fff",
        borderRadius: 12, padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: 10, fontSize: 14, lineHeight: 1.5, color: "#1a1a1a",
      }}>
        {detected.flag} That looks like a <strong>{detected.name} {fieldType === "nric" ? detected.idLabel.replace(/\s*no\.\s*$/, "") : "mobile"}</strong> ({value}).
        <div style={{ marginTop: 8 }}>
          Are you registering this user under your <strong>{current.name}</strong> or <strong>{detected.name}</strong> entity?
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onPick(currentCountry)} style={{
          padding: "8px 16px", borderRadius: 20, border: "1.5px solid #ccc",
          background: "#fff", color: "#333", fontSize: 13, cursor: "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}>{current.flag} {current.name}</button>
        <button onClick={() => onPick(detectedCountry)} style={{
          padding: "8px 16px", borderRadius: 20, border: "none",
          background: accentColor, color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 6,
        }}>{detected.flag} {detected.name}</button>
      </div>
    </div>
  );
}

const buildStyles = (color, offset, mobile, dark) => ({
  window: mobile ? {
    position: "relative",
    width: "100%",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: dark ? "#1a1a1a" : "#f7f8fa",
  } : {
    position: "fixed",
    bottom: 12,
    left: offset,
    width: 360,
    height: 460,
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: dark ? "#1a1a1a" : "#f7f8fa",
    border: dark ? "1px solid #3a3a3a" : "none",
    zIndex: 999,
  },
  header: {
    background: color,
    color: "#fff",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
});

const baseStyles = {
  headerInfo: { flex: 1 },
  headerName: { fontWeight: 600, fontSize: 14 },
  headerStatus: {
    fontSize: 11, opacity: 0.85, display: "flex", alignItems: "center", gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: "50%", background: "#4cff91" },
  messages: (dark) => ({
    flex: 1, overflowY: "auto", padding: "16px 12px",
    display: "flex", flexDirection: "column",
    background: dark ? "#141414" : "#f7f8fa",
  }),
  typing: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  typingDots: (dark) => ({
    display: "flex", gap: 4, padding: "10px 14px", background: dark ? "#2a2a2a" : "#fff",
    borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  }),
  dot: (delay) => ({
    width: 6, height: 6, borderRadius: "50%", background: "#999",
    animation: "bounce 1.2s infinite", animationDelay: delay,
  }),
};

function TypingIndicator({ color, dark }) {
  return (
    <div style={baseStyles.typing}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "#fff", fontWeight: 600, flexShrink: 0,
      }}>V</div>
      <div style={baseStyles.typingDots(dark)}>
        {["0s", "0.2s", "0.4s"].map((d, i) => (
          <div key={i} style={baseStyles.dot(d)} />
        ))}
      </div>
    </div>
  );
}

export default function ChatWidget({
  sessionId,
  title = "Velocity Assistant",
  label = "V",
  color = "#c8102e",
  offset = 24,
  pendingMessage = null,
  version = 2,
  mobile = false,
  dark = false,
  showHeader = true,
  assistantBg,
  intentResponses = {},
  onRoleConfirm,
  onFieldCollected,
  assistantMessage = null,
  onIntentsDetected,
  onIntentStarted,
  onIntentDismiss,
  showIntentHint = true,
  compactIntents = false,
  idCountry = "SG",
  onIdCountryChange,
  phoneCountry = "SG",
  onPhoneCountryChange,
}) {
  const s = buildStyles(color, offset, mobile, dark);
  const welcome = `Hello! I'm ${title}, your OCBC business banking helper. How can I assist you today?`;

  const FIELD_KEYS = ["name", "nric", "mobile", "email", "userId"];
  const buildFieldQuestions = (idC, phoneC) => [
    "Please provide the **Full Name** (as shown in ID).",
    `What is the **${COUNTRY_META[idC].idLabel}**? (e.g. ${COUNTRY_META[idC].idExample})`,
    `What is the **Mobile no.**? (e.g. ${COUNTRY_META[phoneC].phoneExample})`,
    "What is the **Email** address?",
    "Create a **UserID** for this user. Only numbers or letters can be used.",
  ];
  const FIELD_QUESTIONS = buildFieldQuestions(idCountry, phoneCountry);

  const [messages, setMessages] = useState([{ role: "assistant", content: welcome }]);
  const [loading, setLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [fieldIndex, setFieldIndex] = useState(-1);
  // { field: 'nric'|'mobile', value: string, suggestedCountry: 'MY'|'CN'|'HK' } | null
  const [pendingClarification, setPendingClarification] = useState(null);
  const bottomRef = useRef(null);
  const prevKeyRef = useRef(null);
  const prevAssistantKeyRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showRoleSelector]);

  useEffect(() => {
    if (!pendingMessage || pendingMessage.key === prevKeyRef.current) return;
    prevKeyRef.current = pendingMessage.key;
    handleSend(pendingMessage.text);
  }, [pendingMessage]);

  useEffect(() => {
    if (!assistantMessage || assistantMessage.key === prevAssistantKeyRef.current) return;
    prevAssistantKeyRef.current = assistantMessage.key;
    setMessages(prev => [...prev, { role: "assistant", content: assistantMessage.text }]);
  }, [assistantMessage]);

  const handleIntentDismiss = (label) => {
    setMessages(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const m = prev[i];
        if (m.role === "assistant" && m.content.startsWith("Intent identified:")) {
          const lines = m.content.split("\n").slice(1);
          const filtered = lines.filter(l => {
            const match = l.match(/^[•\-]\s*\*?\*?(.+?)\*?\*?$/);
            return !match || match[1].trim().toLowerCase() !== label.toLowerCase();
          });
          if (filtered.length === 0) return prev.filter((_, j) => j !== i);
          return prev.map((m2, j) => j === i ? { ...m2, content: "Intent identified:\n" + filtered.join("\n") } : m2);
        }
      }
      return prev;
    });
    if (onIntentDismiss) onIntentDismiss(label);
  };

  const handleIntentClick = (intentLabel) => {
    if (onIntentStarted) onIntentStarted(intentLabel);
    const key = intentLabel.toLowerCase().replace(/\s+/g, "_");
    const response = intentResponses[intentLabel] || intentResponses[key];
    if (response && typeof response === "object" && response.type === "role_selector") {
      setShowRoleSelector(true);
    } else if (response && typeof response === "object" && response.type === "silent") {
      return; // handled externally, no chat message
    } else if (response) {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } else {
      handleSend(intentLabel);
    }
  };

  const handleRoleConfirm = (selectedRoles) => {
    setShowRoleSelector(false);
    const roleList = selectedRoles.length > 0 ? selectedRoles.join(", ") : "no specific role";
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Selected roles: ${roleList}` },
      { role: "assistant", content: "Got it! Let's collect the user's details one by one.\n\n" + FIELD_QUESTIONS[0] },
    ]);
    setFieldIndex(0);
    if (onRoleConfirm) onRoleConfirm(selectedRoles);
  };

  const handleRoleCancel = () => setShowRoleSelector(false);

  const EMAIL_VALIDATOR = {
    fn: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    msg: "That doesn't look like a valid email address. Please try again.",
  };

  // Advance the field collector to the next question (or finish).
  // The country overrides let the caller use freshly-chosen countries whose
  // state updates have not yet flushed into props (right after a switch).
  const advanceField = (key, value, idOverride = null, phoneOverride = null) => {
    if (onFieldCollected) onFieldCollected(key, value);
    const next = fieldIndex + 1;
    const questions = (idOverride || phoneOverride)
      ? buildFieldQuestions(idOverride || idCountry, phoneOverride || phoneCountry)
      : FIELD_QUESTIONS;
    if (next < questions.length) {
      setMessages(prev => [...prev, { role: "assistant", content: questions[next] }]);
      setFieldIndex(next);
    } else {
      setMessages(prev => [...prev, { role: "assistant", content: "Thank you! All details have been captured. Please review and confirm on the form." }]);
      setFieldIndex(-1);
    }
  };

  // Handle the user's pick from the country clarification bubble.
  // Updates only the relevant country state (idCountry for nric, phoneCountry
  // for mobile) — keeping ID country and phone country independent.
  const handleCountryPick = (chosenCountry) => {
    if (!pendingClarification) return;
    const { field, value, suggestedCountry } = pendingClarification;
    setMessages(prev => [...prev, {
      role: "user",
      content: `${COUNTRY_META[chosenCountry].flag} ${COUNTRY_META[chosenCountry].name}`,
    }]);
    setPendingClarification(null);

    const currentForField = field === "nric" ? idCountry : phoneCountry;

    if (chosenCountry === suggestedCountry) {
      // Switch the relevant country state
      if (field === "nric" && onIdCountryChange) onIdCountryChange(chosenCountry);
      if (field === "mobile" && onPhoneCountryChange) onPhoneCountryChange(chosenCountry);

      // For ID, re-check checksum under the chosen country before accepting.
      if (field === "nric") {
        const r = detectId(value, chosenCountry);
        if (!r.isValid) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Got it — using ${COUNTRY_META[chosenCountry].name} for this ID. However "${value}" doesn't pass the ${COUNTRY_META[chosenCountry].idLabel} check digit. Please re-enter (e.g. ${COUNTRY_META[chosenCountry].idExample}).`,
          }]);
          // Stay on the same field — country has been switched, user can retry
          return;
        }
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Got it — using ${COUNTRY_META[chosenCountry].name} for this ${field === "nric" ? "ID" : "mobile number"}. Continuing...`,
      }]);
      let storedValue = value;
      if (field === "mobile") {
        const r = detectPhone(value, chosenCountry);
        if (r.isValid && r.nationalNumber) storedValue = r.nationalNumber;
      }
      const idOverride = field === "nric" ? chosenCountry : null;
      const phoneOverride = field === "mobile" ? chosenCountry : null;
      advanceField(field, storedValue, idOverride, phoneOverride);
    } else {
      // User stuck with current country — reject the value, re-ask same field
      const meta = COUNTRY_META[chosenCountry];
      const example = field === "nric" ? meta.idExample : meta.phoneExample;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `OK, sticking with ${meta.name}. Please enter a ${meta.name} ${field === "nric" ? meta.idLabel : "mobile number"} (e.g. ${example}).`,
      }]);
      // Stay on the same fieldIndex
    }
  };

  const handleSend = async (text) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Country clarification mode takes precedence — user reply is a country choice.
    if (pendingClarification) {
      const { field, suggestedCountry } = pendingClarification;
      const activeForField = field === "nric" ? idCountry : phoneCountry;
      const choice = parseCountryChoice(text);
      if (choice && (choice === activeForField || choice === suggestedCountry)) {
        handleCountryPick(choice);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Please tap one of the buttons above, or reply with **${COUNTRY_META[activeForField].name}** or **${COUNTRY_META[suggestedCountry].name}**.`,
        }]);
      }
      return;
    }

    // Sequential field collection mode
    if (fieldIndex >= 0 && fieldIndex < FIELD_KEYS.length) {
      const currentKey = FIELD_KEYS[fieldIndex];

      if (currentKey === "nric") {
        const idMeta = COUNTRY_META[idCountry];
        const result = detectId(text, idCountry);
        if (!result.country) {
          setMessages(prev => [...prev, { role: "assistant", content: `That doesn't look like a valid ${idMeta.idLabel} (e.g. ${idMeta.idExample}). Please try again.` }]);
          return;
        }
        if (result.country === idCountry) {
          if (result.isValid) {
            advanceField(currentKey, text);
          } else {
            setMessages(prev => [...prev, { role: "assistant", content: `That looks like a ${idMeta.idLabel} but the check digit doesn't match (e.g. ${idMeta.idExample}). Please double-check the last character.` }]);
          }
          return;
        }
        // Foreign country detected — clarification gate (ID side). We open
        // the gate even when checksum fails so user can confirm country first,
        // then we report the checksum problem post-switch if needed.
        setPendingClarification({ field: currentKey, value: text, suggestedCountry: result.country });
        return;
      }

      if (currentKey === "mobile") {
        const phoneMeta = COUNTRY_META[phoneCountry];
        const result = detectPhone(text, phoneCountry);
        if (!result.country || !result.isValid) {
          setMessages(prev => [...prev, { role: "assistant", content: `That doesn't look like a valid ${phoneMeta.name} mobile (e.g. ${phoneMeta.phoneExample}). Please try again.` }]);
          return;
        }
        if (result.country === phoneCountry) {
          advanceField(currentKey, result.nationalNumber || text);
          return;
        }
        // Foreign country match — clarification gate (phone side, independent of ID)
        setPendingClarification({ field: currentKey, value: text, suggestedCountry: result.country });
        return;
      }

      if (currentKey === "email") {
        if (!EMAIL_VALIDATOR.fn(text)) {
          setMessages(prev => [...prev, { role: "assistant", content: EMAIL_VALIDATOR.msg }]);
          return;
        }
      }

      // name and userId have no validation
      advanceField(currentKey, text);
      return;
    }

    setLoading(true);
    try {
      const data = await sendMessage({ message: text, sessionId, history: messages, version });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (onIntentsDetected && data.reply.startsWith("Intent identified:")) {
        const lines = data.reply.split("\n").slice(1);
        const intents = lines.map(l => l.match(/^[•\-]\s*\*?\*?(.+?)\*?\*?$/)).filter(Boolean).map(m => m[1].trim());
        if (intents.length > 0) onIntentsDetected(intents);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
      <div style={s.window} role="dialog" aria-label={title}>
        {showHeader && (
          <div style={s.header}>
            <div style={s.headerAvatar}>{label}</div>
            <div style={baseStyles.headerInfo}>
              <div style={baseStyles.headerName}>{title}</div>
              <div style={baseStyles.headerStatus}>
                <span style={baseStyles.statusDot} />
                Online
              </div>
            </div>
          </div>
        )}

        <div style={baseStyles.messages(dark)}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} accentColor={color} dark={dark} assistantBg={assistantBg} onIntentClick={handleIntentClick} onIntentDismiss={compactIntents ? null : handleIntentDismiss} showIntentHint={showIntentHint} compactIntents={compactIntents} />
          ))}
          {loading && <TypingIndicator color={color} dark={dark} />}
          {showRoleSelector && (
            <RoleSelectorBubble
              onConfirm={handleRoleConfirm}
              onCancel={handleRoleCancel}
              accentColor={color}
              assistantBg={assistantBg}
            />
          )}
          {pendingClarification && (
            <CountryClarificationBubble
              detectedCountry={pendingClarification.suggestedCountry}
              currentCountry={pendingClarification.field === "nric" ? idCountry : phoneCountry}
              fieldType={pendingClarification.field}
              value={pendingClarification.value}
              accentColor={color}
              assistantBg={assistantBg}
              onPick={handleCountryPick}
            />
          )}
          <div ref={bottomRef} />
        </div>

      </div>
    </>
  );
}
