import React, { useState } from "react";
import { login, saveSession } from "../api/auth";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
    padding: "48px 40px 40px",
    width: 380,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    fontWeight: 700,
    fontSize: 26,
    color: "#c8102e",
    marginBottom: 4,
    letterSpacing: "-0.5px",
  },
  sub: {
    fontSize: 13,
    color: "#888",
    marginBottom: 36,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
    marginBottom: 6,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1.5px solid #ddd",
    fontSize: 15,
    marginBottom: 16,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  inputFocus: {
    borderColor: "#c8102e",
  },
  button: {
    width: "100%",
    padding: "13px",
    borderRadius: 8,
    border: "none",
    background: "#c8102e",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "background 0.15s",
  },
  buttonDisabled: {
    background: "#e8a0a9",
    cursor: "not-allowed",
  },
  error: {
    color: "#c8102e",
    fontSize: 13,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  divider: {
    width: "100%",
    height: 1,
    background: "#f0f0f0",
    margin: "28px 0 20px",
  },
  footer: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "center",
  },
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>OCBC Velocity</div>
        <div style={styles.sub}>Business Banking Platform · Demo Access</div>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div style={styles.label}>Username</div>
          <input
            style={{
              ...styles.input,
              ...(focusedField === "username" ? styles.inputFocus : {}),
            }}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={() => setFocusedField("username")}
            onBlur={() => setFocusedField(null)}
            placeholder="Enter username"
            autoComplete="username"
            autoFocus
          />

          <div style={styles.label}>Password</div>
          <input
            style={{
              ...styles.input,
              ...(focusedField === "password" ? styles.inputFocus : {}),
            }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            placeholder="Enter password"
            autoComplete="current-password"
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isDisabled ? styles.buttonDisabled : {}),
            }}
            disabled={isDisabled}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={styles.divider} />
        <div style={styles.footer}>
          Velocity Chatbot POC · For internal demo use only
        </div>
      </div>
    </div>
  );
}
