export {}

export type SessionEntry = {
  domain: string
  username: string
  password: string
}
console.log("Background service worker loaded ✓")

var sessionId : string | null = null

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  console.log("Message received:", msg.type)
  if (msg.type === "AUTOFILL_REQUEST") {
    console.log(`Autofill request for domain: ${msg.domain}`)
    chrome.storage.session.get("vault", ({ vault }) => {
      const entries: SessionEntry[] = vault ?? []
      const match = entries.find(
        (e) => msg.domain === e.domain || msg.domain.endsWith(`.${e.domain}`)
      )
      reply(match ? { password: match.password, username: match.username } : { password: null, username: null })
    })
    return true
  }

  if (msg.type === "INITIALIZE_DEVICE") {
    sessionId = msg.device.id
    chrome.storage.session.set({ "sessionId": sessionId })
    reply({ success: true })
  }

  if (msg.type === "SAVE_PASSWORD_REQUEST") {
    chrome.storage.session.get("vault", ({ vault }) => {
      const entries: SessionEntry[] = vault ?? []
      const existingIndex = entries.findIndex((e) => e.domain === msg.domain)
      if (existingIndex >= 0) {
        entries[existingIndex] = { domain: msg.domain, username: msg.username, password: msg.password }
      } else {
        entries.push({ domain: msg.domain, username: msg.username, password: msg.password })
      }
      chrome.storage.session.set({ "vault": entries }, () => {
        reply({ success: true })
      })
    })
    return true
  }
})
