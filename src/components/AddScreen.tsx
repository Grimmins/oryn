import { useState } from "react"
import { C, btn, input, label } from "../styles"

type Props = {
  onBack: () => void
  currentDomain: string | null
  onSave: (domain: string, username: string, password: string) => void
}

export function AddScreen({ onBack, currentDomain, onSave }: Props) {
  const [domain, setDomain] = useState(currentDomain ?? "")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const fields = [
    { key: "domain",   label: "Domain",          placeholder: "github.com",      value: domain,   set: setDomain },
    { key: "username", label: "Username / email", placeholder: "alice@gmail.com", value: username, set: setUsername },
    { key: "password", label: "Password",         placeholder: "••••••••",        value: password, set: setPassword, password: true },
  ]

  return (
    <>
      {/* Back nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 10, background: C.accentLight, border: "none", cursor: "pointer", fontSize: 16, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>New password</span>
      </div>

      {/* Fields */}
      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 14 }}>
          <label style={label}>{f.label}</label>
          <input
            type={f.password ? "password" : "text"}
            placeholder={f.placeholder}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            style={input}
          />
        </div>
      ))}

      {/* Info */}
      <div style={{ background: C.accentLight, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: C.accent, lineHeight: 1.6, marginBottom: 20, marginTop: 4 }}>
        💡 You'll need to physically confirm this action on your Ledger device.
      </div>

      <button
        onClick={() => onSave(domain, username, password)}
        disabled={!domain || !password}
        style={btn({ background: C.accent, color: "#fff", opacity: !domain || !password ? 0.5 : 1, boxShadow: "0 4px 16px rgba(97,82,232,0.25)" })}>
        Save & sign on Ledger
      </button>
    </>
  )
}
