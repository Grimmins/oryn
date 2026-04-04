import { useState } from "react"
import { useTheme } from "../lib/ThemeContext"
import { btn, inputStyle, labelStyle } from "../styles"
import logoUrl from "url:../../assets/logo.png"
import type { TransportConfig } from "../lib/dmk"

type Props = {
  loading: boolean
  status: string | null
  onConnect: (transport: TransportConfig) => void
}

const HELP_STEPS = [
  {
    title: "Disable Chrome Password Manager",
    steps: [
      "Go to chrome://settings/autofill",
      'Click "Google Password Manager"',
      "Click the ⚙️ icon (Settings)",
      'Turn off "Offer to save passwords" and "Sign in automatically"',
    ],
  },
  {
    title: "Disable address autofill",
    steps: [
      "Go to chrome://settings/autofill",
      'Click "Addresses and more"',
      'Turn off "Save and fill addresses"',
    ],
  },
]

export function ConnectScreen({ loading, status, onConnect }: Props) {
  const { C } = useTheme()
  const [showHelp, setShowHelp] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [useSpeculos, setUseSpeculos] = useState(false)
  const [speculosPort, setSpeculosPort] = useState("5001")

  const handleConnect = () => {
    const transport: TransportConfig = useSpeculos
      ? { type: "speculos", port: parseInt(speculosPort) || 5001 }
      : { type: "webhid" }
    onConnect(transport)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "8px 0 16px" }}>
      {/* Icon */}
      <img src={logoUrl} alt="Oryn" style={{ width: 110, height: 110, borderRadius: 28, objectFit: "cover" }} />

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8, letterSpacing: "-0.3px" }}>
          Welcome to Oryn
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

      {/* Transport config */}
      {showConfig && (
        <div style={{ width: "100%", background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setUseSpeculos(false)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${!useSpeculos ? C.accent : C.border}`, background: !useSpeculos ? C.accentLight : "transparent", color: !useSpeculos ? C.accent : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Real device
            </button>
            <button
              onClick={() => setUseSpeculos(true)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${useSpeculos ? C.accent : C.border}`, background: useSpeculos ? C.accentLight : "transparent", color: useSpeculos ? C.accent : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Speculos
            </button>
          </div>
          {useSpeculos && (
            <div>
              <label style={{ ...labelStyle, color: C.muted }}>Speculos port</label>
              <input
                type="number"
                value={speculosPort}
                onChange={(e) => setSpeculosPort(e.target.value)}
                style={inputStyle(C)}
                placeholder="5001"
              />
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <button onClick={handleConnect} disabled={loading} style={btn({ background: C.accent, color: "#fff", opacity: loading ? 0.65 : 1, boxShadow: "0 4px 16px rgba(97,82,232,0.3)" })}>
        {loading ? "Searching…" : "Connect Ledger Device"}
      </button>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Config button */}
        <button
          onClick={() => setShowConfig(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 12, fontWeight: 600, padding: 0 }}
        >
          <span style={{ fontSize: 14 }}>⚙️</span>
          {useSpeculos ? `Speculos :${speculosPort}` : "Real device"}
        </button>

        {/* Help button */}
        <button
          onClick={() => setShowHelp(true)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 12, fontWeight: 600, padding: 0 }}
        >
          <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${C.muted}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>?</span>
          First time setup?
        </button>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", background: C.card, borderRadius: "20px 20px 0 0", padding: "24px 22px 28px", boxSizing: "border-box", border: `1px solid ${C.border}` }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Disable Chrome Passwords</span>
              <button onClick={() => setShowHelp(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {HELP_STEPS.map((section, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                    {section.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {section.steps.map((step, j) => (
                      <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.accentLight, color: C.accent, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{j + 1}</span>
                        <span style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
