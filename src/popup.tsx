import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { useEffect, useState } from "react"
import { AddScreen } from "./components/AddScreen"
import { ConnectScreen } from "./components/ConnectScreen"
import { VaultScreen, type VaultEntry } from "./components/VaultScreen"
import { cleanup, dmk, startDiscoveryAndConnect } from "./lib/dmk"
import { ThemeProvider, useTheme } from "./lib/ThemeContext"
import type { SessionEntry } from "./background"
import "./style.css"
import logoUrl from "url:../assets/logo.png"

type Screen = "home" | "add"

function PopupInner() {
  const { C, mode, toggle } = useTheme()
  const [connected, setConnected] = useState(false)
  const [, setDeviceName] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>("home")
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)

  useEffect(() => {
    chrome.storage.session.get("sessionId", ({ sessionId }) => {
      if (sessionId) {
        setConnected(true)
        entries.length === 0 && chrome.storage.session.get("vault", ({ vault }) => {
          const sessionEntries: SessionEntry[] = vault ?? []
          setEntries(sessionEntries.map(e => ({ domain: e.domain, username: e.username, siteHash: "" })))
        })
      }
    })
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) setCurrentDomain(new URL(tab.url).hostname)
    })
  }, [])

  const connect = async () => {
    setLoading(true)
    setStatus("Looking for Ledger…")
    try {
      const sessionId = await startDiscoveryAndConnect((state) => {
        if (state.deviceStatus === DeviceStatus.LOCKED) setStatus("Locked — enter your PIN")
      })
      const device = dmk.getConnectedDevice({ sessionId })
      await chrome.runtime.sendMessage({ type: "INITIALIZE_DEVICE", device })
      setDeviceName(device.name)
      setConnected(true)
      setStatus(null)
    } catch (e: any) {
      setStatus(e?._tag === "NoAccessibleDeviceError" ? "No device selected" : "Connection failed")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    await cleanup()
    await chrome.storage.session.remove("vault")
    await chrome.storage.session.remove("sessionId")
    setConnected(false)
    setDeviceName(null)
    setAddress(null)
    setEntries([])
    setScreen("home")
    setStatus(null)
  }

  const handleSave = async (domain: string, username: string, password: string) => {
    const newEntry: VaultEntry = { domain, username, siteHash: crypto.randomUUID() }
    const updated = [...entries, newEntry]
    setEntries(updated)
    const session = updated.map((e) => ({ domain: e.domain, username: e.username, password: e.domain === domain ? password : "" }))
    await chrome.storage.session.set({ vault: session })
    setScreen("home")
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
          ? <ConnectScreen loading={loading} status={status} onConnect={connect} />
          : screen === "home"
          ? <VaultScreen address={address} entries={entries} currentDomain={currentDomain} onAdd={() => setScreen("add")} onDisconnect={disconnect} />
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
