import { useState } from "react"
import { useTheme } from "../lib/ThemeContext"
import { btn } from "../styles"

export type VaultEntry = {
  domain: string
  username: string | null
  siteHash: string
}

type Credentials = { username: string; password: string }

type Props = {
  address: string | null
  entries: VaultEntry[]
  currentDomain: string | null
  onAdd: () => void
  onDisconnect: () => void
}

function EntryRow({ entry }: { entry: VaultEntry }) {
  const [state, setState] = useState<"idle" | "loading" | "revealed">("idle")
  const [credentials, setCredentials] = useState<Credentials | null>(null)

  const handleReveal = async () => {
    if (state === "revealed") { setState("idle"); setCredentials(null); return }
    setState("loading")
    const response = await chrome.runtime.sendMessage({
      type: "AUTOFILL_REQUEST",
      domain: entry.domain,
    })
    if (response?.password) {
      setCredentials({ username: response.username ?? "", password: response.password })
      setState("revealed")
    } else {
      setState("idle")
    }
  }

  return (
    <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.domain}</div>
          {entry.username && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.6 }}>{entry.username}</div>}
        </div>
        <button
          onClick={handleReveal}
          disabled={state === "loading"}
          style={{ background: "var(--accentLight)", color: "var(--accent)", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700, opacity: state === "loading" ? 0.6 : 1 }}
        >
          {state === "loading" ? "…" : state === "revealed" ? "Hide" : "Reveal"}
        </button>
      </div>
      {state === "revealed" && credentials && (
        <RevealedRow credentials={credentials} />
      )}
    </div>
  )
}

function RevealedRow({ credentials }: { credentials: Credentials }) {
  const { C } = useTheme()
  const [copiedField, setCopiedField] = useState<"username" | "password" | null>(null)

  const copy = (field: "username" | "password") => {
    navigator.clipboard.writeText(credentials[field])
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
      {[
        { label: "Username", field: "username" as const },
        { label: "Password", field: "password" as const },
      ].map(({ label, field }) => (
        <div key={field} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
            <div style={{ fontSize: 12, color: C.text, fontFamily: "monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
              {field === "password" ? "••••••••" : credentials[field] || "—"}
            </div>
          </div>
          <button
            onClick={() => copy(field)}
            style={{ background: C.accentLight, color: C.accent, border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700, flexShrink: 0 }}
          >
            {copiedField === field ? "✓" : "Copy"}
          </button>
        </div>
      ))}
    </div>
  )
}

export function VaultScreen({ address, entries, currentDomain: _currentDomain, onAdd, onDisconnect }: Props) {
  const { C } = useTheme()
  const truncate = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, ["--card" as any]: C.card, ["--border" as any]: C.border, ["--accentLight" as any]: C.accentLight, ["--accent" as any]: C.accent }}>
      {/* Address pill */}
      {address && (
        <div style={{ background: C.accentLight, borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>Address</span>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: C.text, fontWeight: 700 }}>{truncate(address)}</span>
        </div>
      )}

      {/* Section title */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Saved passwords
      </div>

      {/* List */}
      <div style={{ flex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13, gap: 8, padding: "32px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>📭</div>
            <span style={{ fontWeight: 600 }}>No passwords yet</span>
            <span style={{ fontSize: 12, lineHeight: 1.5, textAlign: "center" }}>Tap the button below to<br />save your first password</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((e) => <EntryRow key={e.siteHash || e.domain} entry={e} />)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        <button onClick={onAdd} style={btn({ background: C.accent, color: "#fff", boxShadow: "0 4px 16px rgba(97,82,232,0.25)" })}>
          + Add password
        </button>
        <button onClick={onDisconnect} style={btn({ background: C.accentLight, color: C.accent })}>
          Disconnect
        </button>
      </div>
    </div>
  )
}
