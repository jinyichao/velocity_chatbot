import React, { useState, useEffect } from "react";
import { login, saveSession } from "../api/auth";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      const { token, username: user } = await login(username.trim(), password);
      saveSession(token, user);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !username.trim() || !password;

  // Theme tokens
  const t = {
    bg:          dark ? "#141414" : "#fff",
    border:      dark ? "#2a2a2a" : "#f0f0f0",
    heading:     dark ? "#fff"    : "#111",
    sub:         dark ? "#888"    : "#999",
    label:       dark ? "#ccc"    : "#333",
    inputBg:     dark ? "#1e1e1e" : "#fafafa",
    inputBorder: dark ? "#333"    : "#e0e0e0",
    inputColor:  dark ? "#fff"    : "#111",
    encryptTxt:  dark ? "#444"    : "#ccc",
  };

  const inputStyle = (focused) => ({
    width: "100%",
    padding: "13px 14px 13px 42px",
    borderRadius: 6,
    border: `1.5px solid ${focused ? "#e30513" : t.inputBorder}`,
    background: t.inputBg,
    color: t.inputColor,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    fontFamily: "inherit",
  });

  // Sun/moon toggle button
  const ThemeToggle = () => (
    <button
      onClick={() => setDark(v => !v)}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "absolute", top: 20, right: 24,
        background: dark ? "#2a2a2a" : "#f0f0f0",
        border: "none", borderRadius: 20,
        width: 44, height: 24,
        cursor: "pointer", display: "flex", alignItems: "center",
        padding: "0 3px", transition: "background 0.2s",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: dark ? "#fff" : "#333",
        transform: dark ? "translateX(20px)" : "translateX(0)",
        transition: "transform 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11,
      }}>
        {dark ? "☀" : "🌙"}
      </div>
    </button>
  );

  const form = (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.label, marginBottom: 8 }}>Username</div>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <input
          style={inputStyle(focusedField === "username")}
          type="text" value={username}
          onChange={(e) => setUsername(e.target.value)}
          onFocus={() => setFocusedField("username")}
          onBlur={() => setFocusedField(null)}
          placeholder="Enter username"
          autoComplete="username" autoFocus
        />
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: t.label, marginBottom: 8 }}>Password</div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <input
          style={{ ...inputStyle(focusedField === "password"), paddingRight: 44 }}
          type={showPassword ? "text" : "password"} value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          placeholder="Enter password"
          autoComplete="current-password"
        />
        <button type="button" onClick={() => setShowPassword((v) => !v)}
          style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2">
            {showPassword
              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
          </svg>
        </button>
      </div>

      {error && <div style={{ color: "#e30513", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button type="submit" disabled={isDisabled} style={{
        width: "100%", padding: "14px", borderRadius: 6, border: "none",
        background: isDisabled ? (dark ? "#5a0a12" : "#f0c0c7") : "#e30513",
        color: isDisabled && !dark ? "#fff" : "#fff",
        fontSize: 15, fontWeight: 600,
        cursor: isDisabled ? "not-allowed" : "pointer",
        marginTop: 24, marginBottom: 28,
        transition: "background 0.15s", letterSpacing: "0.02em",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: "inherit",
        opacity: isDisabled ? 0.5 : 1,
      }}>
        {loading ? "Signing in…" : <>Sign in →</>}
      </button>
    </>
  );

  const footnote = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <span style={{ color: "#e30513", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 }}>
        Internal Demo Only · Not for Production Use
      </span>
      <span style={{ fontSize: 11, color: t.encryptTxt }}>© 2026 OCBC Bank. All rights reserved.</span>
    </div>
  );

  const leftOverlay = dark
    ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 100%)"
    : "linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 40%, rgba(255,255,255,0.20) 100%)";

  const leftTextColor   = dark ? "#fff" : "#111";
  const leftSubColor    = dark ? "#bbb" : "#555";
  const leftBulletColor = dark ? "#ccc" : "#333";

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", fontFamily: "'Helvetica Neue', Arial, sans-serif", transition: "background 0.2s" }}>
        <div style={{ position: "relative", height: 180, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/ocbc-building.jpg')", backgroundSize: "cover", backgroundPosition: "center top" }} />
          <div style={{ position: "absolute", inset: 0, background: dark
            ? "linear-gradient(to top, rgba(20,20,20,0.92) 0%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.15) 100%)" }} />
          <div style={{ position: "relative", padding: "24px 28px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
            <img src="/ocbc-logo-color.svg" alt="OCBC" style={{ height: 24, marginBottom: "auto" }} />
            <div style={{ fontSize: 26, fontWeight: 800, color: leftTextColor, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
              Banking made <span style={{ color: "#e30513" }}>smarter</span> for you.
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "32px 28px 24px", display: "flex", flexDirection: "column", position: "relative" }}>
          <ThemeToggle />
          <div style={{ fontSize: 24, fontWeight: 700, color: t.heading, marginBottom: 6, letterSpacing: "-0.5px" }}>Welcome back</div>
          <div style={{ fontSize: 14, color: t.sub, marginBottom: 28 }}>Sign in to your OCBC Velocity account.</div>
          <form onSubmit={handleSubmit} style={{ flex: 1 }}>{form}</form>
          <div style={{ textAlign: "center", fontSize: 12, color: t.encryptTxt, marginBottom: 16 }}>🔒 Secured with 256-bit encryption</div>
          {footnote}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {/* Left panel */}
      <div style={{ width: "45%", position: "relative", display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/ocbc-building.jpg')", backgroundSize: "cover", backgroundPosition: "center top" }} />
        <div style={{ position: "absolute", inset: 0, background: leftOverlay, transition: "background 0.3s" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", padding: "36px 52px" }}>
          <div>
            <img src="/ocbc-logo-color.svg" alt="OCBC" style={{ height: 32 }} />
          </div>
          <div style={{ marginTop: "auto", marginBottom: "auto", paddingTop: 40 }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: leftTextColor, lineHeight: 1.15, marginBottom: 20, letterSpacing: "-1px", transition: "color 0.2s" }}>
              Banking made<br /><span style={{ color: "#e30513" }}>smarter</span> for you.
            </div>
            <div style={{ fontSize: 17, color: leftSubColor, lineHeight: 1.7, marginBottom: 40, maxWidth: 320, transition: "color 0.2s" }}>
              Your AI-powered OCBC assistant is ready to help you with all your banking needs, anytime, anywhere.
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {["Instant account inquiries", "Secure, end-to-end encrypted sessions", "24/7 AI-powered support", "Seamless personalized guidances"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: 12, color: leftBulletColor, fontSize: 16, transition: "color 0.2s" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e30513", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, background: t.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-between",
        padding: "48px 72px", borderLeft: `1px solid ${t.border}`,
        position: "relative", transition: "background 0.2s",
      }}>
        <ThemeToggle />
        <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%", maxWidth: 380 }}>
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: t.heading, marginBottom: 8, letterSpacing: "-0.5px", transition: "color 0.2s" }}>Welcome back</div>
            <div style={{ fontSize: 14, color: t.sub, marginBottom: 36, transition: "color 0.2s" }}>Sign in to your OCBC Velocity account to continue.</div>
            <form onSubmit={handleSubmit}>{form}</form>
            <div style={{ textAlign: "center", fontSize: 12, color: t.encryptTxt, transition: "color 0.2s" }}>🔒 Secured with 256-bit encryption</div>
          </div>
        </div>
        {footnote}
      </div>
    </div>
  );
}
