export {}

import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { ethers } from "ethers"
import { type TransportConfig, buildDmk, cleanup, getDmk, getEthAddress, startDiscoveryAndConnect } from "./lib/dmk"
import { LedgerSigner } from "./lib/ledger-signer"
import { getCredentials, loadVault } from "./lib/vault"
import { executeSave } from "./lib/save-password"

export type SessionEntry = {
  domain: string
  username: string
  password: string
}

const RPC_URL = "https://sepolia.base.org"

// Module-level signer — vit dans le service worker, survit aux fermetures du popup
let _signer: LedgerSigner | null = null
let _signatureMaster: string | null = null

function setStatus(step: string) {
  chrome.storage.session.set({ connectionStatus: { step, connected: false, error: null } })
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "CONNECT_LEDGER") {
    const transport: TransportConfig = msg.transport ?? { type: "webhid" }
    buildDmk(transport)
    setStatus("Looking for Ledger…")
    ;(async () => {
      try {
        const sessionId = await startDiscoveryAndConnect((state: any) => {
          if (state.deviceStatus === DeviceStatus.LOCKED) setStatus("Locked — enter your PIN")
        })
        const device = getDmk().getConnectedDevice({ sessionId })

        const provider = new ethers.JsonRpcProvider(RPC_URL)
        _signer = new LedgerSigner(sessionId, provider)

        setStatus("Waiting for Ledger confirmation…")
        const ownerAddress = await getEthAddress(sessionId)
        _signatureMaster = await _signer.signMessage("oryn:master:v1")

        setStatus("Loading vault…")
        const entries = await loadVault(ownerAddress, _signatureMaster)
        const vault: SessionEntry[] = entries.map(e => ({
          domain: e.domain,
          username: e.username ?? "",
          password: "",
        }))

        await chrome.storage.session.set({
          sessionId: device.id,
          ownerAddress,
          vault,
          connectionStatus: { step: null, connected: true, error: null },
        })
        reply({ ok: true })
      } catch (e: any) {
        const error = e?._tag === "NoAccessibleDeviceError" ? "No device selected" : "Connection failed"
        await chrome.storage.session.set({
          connectionStatus: { step: null, connected: false, error },
        })
        reply({ ok: false, error })
      }
    })()
    return true
  }

  if (msg.type === "DISCONNECT_LEDGER") {
    ;(async () => {
      await cleanup()
      await chrome.storage.session.clear()
      _signer = null
      _signatureMaster = null
      reply({ ok: true })
    })()
    return true
  }

  if (msg.type === "SAVE_PASSWORD_REQUEST") {
    ;(async () => {
      if (!_signer || !_signatureMaster) { reply({ ok: false, error: "Ledger not connected" }); return }
      try {
        await executeSave(msg.domain, msg.username ?? "", msg.password, _signer, _signatureMaster)
        // Upsert in session vault (replace if domain already exists)
        chrome.storage.session.get("vault", ({ vault }) => {
          const existing: SessionEntry[] = vault ?? []
          const filtered = existing.filter(e => e.domain !== msg.domain)
          const updated: SessionEntry[] = [...filtered, { domain: msg.domain, username: msg.username ?? "", password: "" }]
          chrome.storage.session.set({ vault: updated })
        })
        reply({ ok: true })
      } catch (e) {
        console.error("Failed to save on-chain:", e)
        reply({ ok: false, error: "Save failed" })
      }
    })()
    return true
  }

  if (msg.type === "AUTOFILL_CHECK") {
    chrome.storage.session.get("vault", ({ vault }) => {
      const entries: SessionEntry[] = vault ?? []
      const match = entries.find(
        (e) => msg.domain === e.domain || msg.domain.endsWith(`.${e.domain}`)
      )
      reply(match ? { domain: match.domain } : { domain: null })
    })
    return true
  }

  if (msg.type === "AUTOFILL_REQUEST") {
    ;(async () => {
      console.log("Autofill request received for domain:", msg.domain)
      if (!_signer || !_signatureMaster) { reply({ username: null, password: null }); return }
      chrome.storage.session.get(["vault", "ownerAddress"], async ({ vault, ownerAddress }) => {
        const entries: SessionEntry[] = vault ?? []
        const match = entries.find(
          (e) => msg.domain === e.domain || msg.domain.endsWith(`.${e.domain}`)
        )
        console.log("Autofill request for domain:", msg.domain, "Matched vault entry:", match ? "Yes" : "No")
        if (!match || !ownerAddress) { reply({ username: null, password: null }); return }
        try {
          console.log("Retrieving credentials for domain:", match.domain)
          const credentials = await getCredentials(match.domain, _signer!, ownerAddress, _signatureMaster!)
          console.log("Retrieved credentials for domain:", match.domain, "Username:", credentials?.username ? "Yes" : "No", "Password:", credentials?.password ? "Yes" : "No")
          reply(credentials ?? { username: null, password: null })
        } catch (e) {
          console.error("Failed to retrieve credentials for domain:", match.domain)
          console.error("Error:", e)
          reply({ username: null, password: null })
        }
      })
    })()
    return true
  }
})
