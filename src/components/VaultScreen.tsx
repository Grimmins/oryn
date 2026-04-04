import { useTheme } from "../lib/ThemeContext"
import { btn } from "../styles"

export type VaultEntry = {
  domain: string
  username: string | null
  siteHash: string
}

type Props = {
  address: string | null
  entries: VaultEntry[]
  currentDomain: string | null
  onAdd: () => void
  onDisconnect: () => void
}

export function VaultScreen({ address, entries, currentDomain: _currentDomain, onAdd, onDisconnect }: Props) {
  const { C } = useTheme()
  const truncate = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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
            {entries.map((e) => (
              <div key={e.siteHash} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{e.domain}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{e.username}</div>
                </div>
                <button style={{ background: C.accentLight, color: C.accent, border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                  Copy
                </button>
              </div>
            ))}
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
