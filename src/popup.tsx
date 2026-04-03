import { useState } from "react"

export default function Popup() {
  const [connected, setConnected] = useState(false)

  const connect = () => {
    chrome.runtime.sendMessage({ type: "CONNECT_LEDGER" }, (res) => {
      setConnected(res?.success ?? false)
    })
  }

  return (
    <div style={{ width: 280, padding: 16, fontFamily: "sans-serif" }}>
      <h2 style={{ margin: "0 0 12px" }}>ChainVault</h2>
      <div style={{ marginBottom: 12 }}>
        Status : <strong>{connected ? "🟢 Ledger connecté" : "🔴 Déconnecté"}</strong>
      </div>
      {!connected && (
        <button onClick={connect} style={{ width: "100%", padding: 8 }}>
          Connecter le Ledger
        </button>
      )}
    </div>
  )
}