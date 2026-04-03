import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { useState } from "react"
import { AddScreen } from "./components/AddScreen"
import { ConnectScreen } from "./components/ConnectScreen"
import { VaultScreen, type VaultEntry } from "./components/VaultScreen"
import { cleanup, dmk, startDiscoveryAndConnect } from "./lib/dmk"
import { C } from "./styles"

type Screen = "home" | "add"

export default function Popup() {
  const [connected, setConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>("home")
  const [entries] = useState<VaultEntry[]>([])

  const connect = async () => {
    setLoading(true)
    setStatus("Looking for Ledger…")
    try {
      const sessionId = await startDiscoveryAndConnect((state) => {
        if (state.deviceStatus === DeviceStatus.LOCKED) setStatus("Locked — enter your PIN")
      })
      const device = dmk.getConnectedDevice({ sessionId })
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
    setConnected(false)
    setDeviceName(null)
    setAddress(null)
    setScreen("home")
    setStatus(null)
  }

  const handleSave = (_domain: string, _username: string, _password: string) => {
    // TODO: encrypt + store on-chain
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
          ? <VaultScreen address={address} entries={entries} onAdd={() => setScreen("add")} onDisconnect={disconnect} />
          : <AddScreen onBack={() => setScreen("home")} onSave={handleSave} />
        }
      </div>
    </div>
  )
}
