import React, { useState } from "react";

export const VELOCITY_NAV_TABS = [
  "Home", "Accounts", "Pay and Transfer", "FX and Treasury",
  "Invoices", "Trade Finance", "Tools", "Administration",
];

function OcbcLogo({ height = 34 }) {
  return (
    <img
      src="/ocbc-logo-color.svg"
      alt="OCBC"
      style={{ height: height + 4, width: "auto", flexShrink: 0, display: "block" }}
    />
  );
}

function IconButton({ children, title, onClick, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: 34, height: 34, borderRadius: "50%",
        border: "1px solid #e0e0e0",
        background: hover ? "#f5f5f5" : "#fff",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#555", flexShrink: 0, transition: "background 0.15s",
      }}
    >
      {children}
      {badge && <span style={{
        position: "absolute", top: 4, right: 5, width: 7, height: 7,
        borderRadius: "50%", background: "#E30613",
      }} />}
    </button>
  );
}

export function VelocityHeader({
  username = "Patrick Tan",
  company = "ESOLUTIONS ALPHA PTE LTD",
  lastLogin = "12 May 2025, 13:58:31",
  activeNav = "Administration",
  onNavChange,
  onLogout,
  compact = false,
}) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1100,
      background: "#fff", borderBottom: "1px solid #e0e0e0",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      {/* Red edge bar — full header height */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: 6, background: "#E30613",
      }} />

      <div style={{ display: "flex", alignItems: "stretch", paddingLeft: 6 }}>
        {/* Logo column — tall, left side */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: compact ? "0 14px 0 10px" : "0 20px 0 10px",
          flexShrink: 0,
          minHeight: compact ? 48 : undefined,
        }}>
          <OcbcLogo height={compact ? 18 : 28} />
        </div>

        {/* Right column: user info row + nav row */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Top row — user info + action buttons */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: compact ? "10px 20px" : "10px 20px 10px 80px",
            gap: 10,
            borderBottom: compact ? "none" : "1px solid #eee",
            minHeight: compact ? 48 : undefined,
          }}>
            {!compact && (
              <div style={{ fontSize: 12, color: "#333", lineHeight: 1.55, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{username}</div>
                <div style={{ color: "#999", fontSize: 11 }}>
                  {company} &nbsp;·&nbsp; Last login: {lastLogin}
                </div>
              </div>
            )}
            {compact && <div style={{ flex: 1 }} />}

            {/* EN selector */}
            <div style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 13,
              color: "#333", cursor: "pointer", userSelect: "none",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3 3.5 3 16.5 0 20M12 2c-3 3.5-3 16.5 0 20" />
              </svg>
              <span>EN</span>
              <span style={{ fontSize: 9, color: "#999" }}>▾</span>
            </div>

            {!compact && (
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                border: "1px solid #d8d8d8", borderRadius: 20, background: "#fff",
                padding: "6px 14px", fontSize: 12.5, color: "#333", cursor: "pointer",
                fontFamily: "inherit", position: "relative", whiteSpace: "nowrap",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                </svg>
                Tasks and Statuses
                <span style={{ position: "absolute", top: 4, left: 24, width: 6, height: 6, borderRadius: "50%", background: "#E30613" }} />
              </button>
            )}

            <IconButton title="Messages" badge>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" />
              </svg>
            </IconButton>
            <IconButton title="Sign out" onClick={onLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
              </svg>
            </IconButton>
          </div>

          {/* Nav tabs row */}
          {!compact && (
            <div style={{ display: "flex", alignItems: "flex-end", paddingLeft: 80 }}>
              {VELOCITY_NAV_TABS.map(tab => {
                const active = tab === activeNav;
                return (
                  <button
                    key={tab}
                    onClick={() => onNavChange && onNavChange(tab)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "10px 16px 12px", fontFamily: "inherit",
                      fontSize: 13, whiteSpace: "nowrap",
                      color: active ? "#111" : "#555",
                      fontWeight: active ? 600 : 400,
                      borderBottom: active ? "2px solid #333" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >{tab}</button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const VELOCITY_HEADER_HEIGHT = 100;
export const VELOCITY_HEADER_HEIGHT_COMPACT = 44;

export function Stepper({ current = 1, steps }) {
  const STEPS = steps || ["Add user(s)", "Remove user(s)", "Review"];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 8, width: "100%" }}>
      {STEPS.map((label, i) => {
        const stepNo = i + 1;
        const done = stepNo < current;
        const active = stepNo === current;
        const isLast = i === STEPS.length - 1;
        return (
          <React.Fragment key={label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: done || active ? "#4a5560" : "#c8cdd2",
                color: "#fff", fontSize: 12.5, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNo}
              </div>
              <div style={{
                fontSize: 12, marginTop: 8, whiteSpace: "nowrap",
                color: done || active ? "#333" : "#b0b5ba",
                fontWeight: active ? 700 : 500,
              }}>{label}</div>
            </div>
            {!isLast && (
              <div style={{
                flex: 1, height: 1.5, minWidth: 20,
                background: done ? "#4a5560" : "#d8dcdf",
                marginTop: 12, alignSelf: "flex-start",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
