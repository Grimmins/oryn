export const C = {
  bg: "#f5f4ff",
  card: "#ffffff",
  border: "#e4e2ff",
  accent: "#6152e8",
  accentHover: "#4f40d4",
  accentLight: "#ede9ff",
  text: "#1a1535",
  muted: "#8b84b0",
  green: "#10b981",
  greenLight: "#d1fae5",
  red: "#ef4444",
  redLight: "#fee2e2",
}

export const btn = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: "100%",
  padding: "12px 0",
  borderRadius: 14,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.01em",
  transition: "opacity .15s",
  ...extra,
})

export const input: React.CSSProperties = {
  width: "100%",
  background: "#f5f4ff",
  border: "1.5px solid #e4e2ff",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#1a1535",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
}

export const label: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#8b84b0",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
}
