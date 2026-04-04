import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { ethers } from "ethers"
import { useEffect, useRef, useState } from "react"
import { AddScreen } from "./components/AddScreen"
import { ConnectScreen } from "./components/ConnectScreen"
import { VaultScreen, type VaultEntry } from "./components/VaultScreen"
import type { SessionEntry } from "./background"
import { cleanup, dmk, getEthAddress, startDiscoveryAndConnect } from "./lib/dmk"
import { LedgerSigner } from "./lib/ledger-signer"
import { loadVault, saveEntry } from "./lib/vault"
import { C } from "./styles"
import type { SessionEntry } from "./background"

const RPC_URL = "https://sepolia.base.org"

type Screen = "home" | "add"

export default function Popup() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>("home")
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)

  const signerRef = useRef<LedgerSigner | null>(null)

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

  const connect = async () => {
    setLoading(true)
    setStatus("Looking for Ledger…")
    try {
      const sessionId = await startDiscoveryAndConnect((state) => {
        if (state.deviceStatus === DeviceStatus.LOCKED) setStatus("Locked — enter your PIN")
      })
      const device = dmk.getConnectedDevice({ sessionId })

      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const signer = new LedgerSigner(sessionId, provider)
      signerRef.current = signer

      setStatus("Waiting for Ledger confirmation…")
      const ownerAddress = await getEthAddress(sessionId)

      setStatus("Loading vault…")
      const loaded = await loadVault(signer, ownerAddress)
      const vault: SessionEntry[] = loaded.map(e => ({ domain: e.domain, username: e.username ?? "", password: "" }))

      await chrome.runtime.sendMessage({ type: "INITIALIZE_DEVICE", device, ownerAddress, vault })

      setAddress(ownerAddress)
      setEntries(loaded)
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
    await chrome.storage.session.clear()
    signerRef.current = null
    setConnected(false)
    setAddress(null)
    setEntries([])
    setScreen("home")
    setStatus(null)
  }

  const handleSave = async (domain: string, username: string, password: string) => {
    const signer = signerRef.current
    if (!signer) return

    setStatus("Waiting for Ledger confirmation…")
    try {
      await saveEntry(domain, username, password, signer)
    } catch (e) {
      console.error("Failed to save on-chain:", e)
      setStatus("Save failed")
      console.error(e)
      return
    }

    const entry: SessionEntry = { domain, username, password }
    await chrome.runtime.sendMessage({ type: "ADD_ENTRY", entry })

    const newEntry: VaultEntry = { domain, username, siteHash: crypto.randomUUID() }
    setEntries(prev => [...prev, newEntry])
    setStatus(null)
    setScreen("home")
  }

  return (
    <div style={{ width: 380, minHeight: 520, background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 22px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔐</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px", color: C.text }}>Oryn</span>
        </div>
        {connected && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.greenLight, borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Connected</span>
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
