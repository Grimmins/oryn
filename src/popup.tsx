import { useEffect, useState } from "react"
import { AddScreen } from "./components/AddScreen"
import { ConnectScreen } from "./components/ConnectScreen"
import { VaultScreen, type VaultEntry } from "./components/VaultScreen"
import { ThemeProvider, useTheme } from "./lib/ThemeContext"
import type { SessionEntry } from "./background"
import "./style.css"
import logoUrl from "url:../assets/logo.png"

type Screen = "home" | "add"

function PopupInner() {
  const { C, mode, toggle } = useTheme()
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>("home")
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)

  // Restore state from session on popup open
  useEffect(() => {
    chrome.storage.session.get(["sessionId", "ownerAddress", "vault"], ({ sessionId, ownerAddress, vault }) => {
      if (sessionId) {
        setConnected(true)
        if (ownerAddress) setAddress(ownerAddress)
        const sessionEntries: SessionEntry[] = vault ?? []
        setEntries(sessionEntries.map(e => ({ domain: e.domain, username: e.username, siteHash: "" })))
      }
    })
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) setCurrentDomain(new URL(tab.url).hostname)
    })
  }, [])

  // Listen to background status updates during connection
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.connectionStatus?.newValue) {
        const { step, connected: isConnected, error } = changes.connectionStatus.newValue
        if (error) { setStatus(error); setLoading(false); return }
        if (isConnected) {
          chrome.storage.session.get(["ownerAddress", "vault"], ({ ownerAddress, vault }) => {
            if (ownerAddress) setAddress(ownerAddress)
            const sessionEntries: SessionEntry[] = vault ?? []
            setEntries(sessionEntries.map(e => ({ domain: e.domain, username: e.username, siteHash: "" })))
            setConnected(true)
            setStatus(null)
            setLoading(false)
          })
          return
        }
        if (step) setStatus(step)
      }
      // Reflect vault additions (e.g. from save)
      if (changes.vault?.newValue) {
        const sessionEntries: SessionEntry[] = changes.vault.newValue
        setEntries(sessionEntries.map(e => ({ domain: e.domain, username: e.username, siteHash: "" })))
      }
    }
    chrome.storage.session.onChanged.addListener(listener)
    return () => chrome.storage.session.onChanged.removeListener(listener)
  }, [])

  const handleConnect = async (transport: any) => {
    setLoading(true)
    setStatus("Looking for Ledger…")
    chrome.runtime.sendMessage({ type: "CONNECT_LEDGER", transport })
  }

  const handleDisconnect = async () => {
    await chrome.runtime.sendMessage({ type: "DISCONNECT_LEDGER" })
    setConnected(false)
    setAddress(null)
    setEntries([])
    setScreen("home")
    setStatus(null)
  }

  const handleSave = async (domain: string, username: string, password: string) => {
    setStatus("Waiting for Ledger confirmation…")
    const result = await chrome.runtime.sendMessage({ type: "SAVE_PASSWORD_REQUEST", domain, username, password })
    if (result?.ok) {
      setStatus(null)
      setScreen("home")
    } else {
      setStatus(result?.error ?? "Save failed")
    }
  }

  return (
    <div style={{ width: 380, minHeight: 520, background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 22px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src={logoUrl} alt="Oryn" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }} />
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px", color: C.text }}>Oryn</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {connected && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.greenLight, borderRadius: 20, padding: "4px 10px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Connected</span>
            </div>
          )}
          <button
            onClick={toggle}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{ background: C.accentLight, border: "none", borderRadius: 10, width: 30, height: 30, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {mode === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
        {!connected
          ? <ConnectScreen loading={loading} status={status} onConnect={handleConnect} />
          : screen === "home"
          ? <VaultScreen address={address} entries={entries} currentDomain={currentDomain} onAdd={() => setScreen("add")} onDisconnect={handleDisconnect} />
          : <AddScreen onBack={() => setScreen("home")} currentDomain={currentDomain} onSave={handleSave} />
        }
      </div>
    </div>
  )
}

export default function Popup() {
  return (
    <ThemeProvider>
      <PopupInner />
    </ThemeProvider>
  )
}
