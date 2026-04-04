import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { useEffect, useRef, useState } from "react"
import { AddScreen } from "./components/AddScreen"
import { ConnectScreen } from "./components/ConnectScreen"
import { VaultScreen, type VaultEntry } from "./components/VaultScreen"
import type { SessionEntry } from "./background"
import { ethers } from "ethers"
import { cleanup, dmk, getEthAddress, signPersonalMessage, startDiscoveryAndConnect } from "./lib/dmk"
import { deriveSiteHash } from "./lib/crypto"
import { LedgerSigner } from "./lib/ledger-signer"
import { loadVault, saveEntry } from "./lib/vault"
import { C } from "./styles"

type Screen = "home" | "add"

export default function Popup() {
  const [connected, setConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>("home")
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)

  // masterSig et sessionId en mémoire uniquement — jamais persistés, effacés au disconnect
  const masterSigRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    chrome.storage.session.get("sessionId", ({ sessionId }) => {
      if (sessionId) {
        console.log(`Existing session found with ID: ${sessionId}`)
        setConnected(true)
        entries.length === 0 && chrome.storage.session.get("vault", ({ vault }) => {
          const sessionEntries: SessionEntry[] = vault ?? []
          setEntries(sessionEntries.map(e => ({ domain: e.domain, username: e.username, siteHash: "" })))
        })
      } else {
        console.log("No existing session found")
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

      setStatus("Waiting for Ledger confirmation…")
      const [ownerAddress, masterSig] = await Promise.all([
        getEthAddress(sessionId),
        signPersonalMessage(sessionId, "chainvault:master:v1"),
      ])
      masterSigRef.current = masterSig
      sessionIdRef.current = sessionId
      setAddress(ownerAddress)

      setStatus("Loading vault…")
      const loaded = await loadVault(masterSig, ownerAddress)
      setEntries(loaded)
      const session: SessionEntry[] = loaded.map((e) => ({ domain: e.domain, username: e.username, password: "" }))
      await chrome.storage.session.set({ vault: session })

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
    masterSigRef.current = null
    sessionIdRef.current = null
    setConnected(false)
    setDeviceName(null)
    setAddress(null)
    setEntries([])
    setScreen("home")
    setStatus(null)
  }

  const handleSave = async (domain: string, username: string, password: string) => {
    const masterSig = masterSigRef.current
    const sessionId = sessionIdRef.current
    if (!masterSig || !sessionId) return

    setStatus("Waiting for Ledger confirmation…")
    try {
      const provider = new ethers.JsonRpcProvider("https://sepolia.base.org")
      const ledgerSigner = new LedgerSigner(sessionId, provider)
      await saveEntry(domain, username, password, masterSig, ledgerSigner)
    } catch (e) {
      console.error("Failed to save on-chain:", e)
      setStatus("Save failed")
      return
    }

    const siteHash = await deriveSiteHash(domain, masterSig)
    const newEntry: VaultEntry = { domain, username, siteHash }
    const updated = [...entries, newEntry]
    setEntries(updated)

    const session: SessionEntry[] = updated.map((e) => ({
      domain: e.domain,
      username: e.username,
      password: e.domain === domain ? password : "",
    }))
    await chrome.storage.session.set({ vault: session })
    setStatus(null)
    setScreen("home")
  }

  return (
    <div style={{ width: 340, minHeight: 460, background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 22px 16px", borderBottom: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔐</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px", color: C.text }}>Oryn</span>
        </div>
        {connected && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.greenLight, borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{deviceName ?? "Ledger"}</span>
          </div>
        )}
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
