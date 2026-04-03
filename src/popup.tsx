import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { useState } from "react"
import { cleanup, dmk, startDiscoveryAndConnect } from "./lib/dmk"

export default function Popup() {
  const [connected, setConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const connect = async () => {
    setStatus("Searching...")
    try {
      const sessionId = await startDiscoveryAndConnect((state) => {
        if (state.deviceStatus === DeviceStatus.LOCKED) {
          setStatus("Locked — enter your PIN")
        } else {
          setStatus(state.deviceStatus)
        }
      })
      const device = dmk.getConnectedDevice({ sessionId })
      setDeviceName(device.name)
      setConnected(true)
      setStatus(null)
    } catch (e: any) {
      if (e?._tag === "NoAccessibleDeviceError") {
        setStatus("No device found — make sure your Ledger is connected and unlocked")
      } else {
        console.error("Connection failed:", e)
        setStatus("Connection failed")
      }
      setConnected(false)
    }
  }

  const disconnect = async () => {
    await cleanup()
    setConnected(false)
    setDeviceName(null)
    setStatus(null)
  }

  return (
    <div style={{ width: 280, padding: 16, fontFamily: "sans-serif" }}>
      <h2 style={{ margin: "0 0 12px" }}>Oryn</h2>
      <div style={{ marginBottom: 12 }}>
        Status :{" "}
        <strong>
          {connected ? `🟢 Connected${deviceName ? ` — ${deviceName}` : ""}` : "🔴 Disconnected"}
        </strong>
      </div>
      {status && <div style={{ marginBottom: 12, color: "gray" }}>{status}</div>}
      {!connected ? (
        <button onClick={connect} style={{ width: "100%", padding: 8 }}>
          Connect Ledger
        </button>
      ) : (
        <button onClick={disconnect} style={{ width: "100%", padding: 8 }}>
          Disconnect
        </button>
      )}
    </div>
  )
}
