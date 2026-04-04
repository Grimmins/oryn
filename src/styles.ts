export const lightTheme = {
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

export const darkTheme = {
  bg: "#16132a",
  card: "#1f1c35",
  border: "#2e2a4e",
  accent: "#8b7ff7",
  accentHover: "#7a6ee6",
  accentLight: "#26224a",
  text: "#ede9ff",
  muted: "#7c789e",
  green: "#34d399",
  greenLight: "#0d3d2e",
  red: "#f87171",
  redLight: "#3f1515",
}

export type Colors = typeof lightTheme

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

export const inputStyle = (C: Colors): React.CSSProperties => ({
  width: "100%",
  background: C.card,
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  padding: "10px 14px",
  color: C.text,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
})

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
}
