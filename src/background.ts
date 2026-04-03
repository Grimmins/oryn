import { startDiscoveryAndConnect,  } from "./lib/dmk"

// Écoute les messages depuis popup et content scripts
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "CONNECT_LEDGER") {
    console.log("Received CONNECT_LEDGER message, starting discovery and connection process...")
    startDiscoveryAndConnect()
    return reply({ success: true })
  }


})