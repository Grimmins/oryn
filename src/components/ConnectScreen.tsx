import { C, btn } from "../styles"

type Props = {
  loading: boolean
  status: string | null
  onConnect: () => void
}

export function ConnectScreen({ loading, status, onConnect }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "8px 0 16px" }}>
      {/* Icon */}
      <div style={{ width: 80, height: 80, borderRadius: 24, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>
        🔐
      </div>

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8, letterSpacing: "-0.3px" }}>
          Your hardware vault
        </div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
          Connect your Ledger to securely<br />access your on-chain passwords
        </div>
      </div>

      {/* Status badge */}
      {status && (
        <div style={{ background: C.accentLight, borderRadius: 10, padding: "8px 16px", fontSize: 12, color: C.accent, fontWeight: 600, textAlign: "center" }}>
          {status}
        </div>
      )}

      {/* CTA */}
      <button onClick={onConnect} disabled={loading} style={btn({ background: C.accent, color: "#fff", opacity: loading ? 0.65 : 1, boxShadow: "0 4px 16px rgba(97,82,232,0.3)" })}>
        {loading ? "Searching…" : "Connect Ledger"}
      </button>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
        Make sure your Ledger is unlocked<br />and plugged in via USB
      </div>
    </div>
  )
}
