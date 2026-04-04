export {}

export type SessionEntry = {
  domain: string
  username: string
  password: string
}
console.log("Background service worker loaded ✓")

var sessionId : string | null = null

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "INITIALIZE_DEVICE") {
    const { device, ownerAddress, vault } = msg
    chrome.storage.session.set({ sessionId: device.id, ownerAddress, vault }, () => {
      reply({ ok: true })
    })
    return true
  }

  if (msg.type === "ADD_ENTRY") {
    const { entry }: { entry: SessionEntry } = msg
    chrome.storage.session.get("vault", ({ vault }) => {
      const updated: SessionEntry[] = [...(vault ?? []), entry]
      chrome.storage.session.set({ vault: updated }, () => reply({ ok: true }))
    })
    return true
  }

  if (msg.type === "AUTOFILL_REQUEST") {
    chrome.storage.session.get("vault", ({ vault }) => {
      const entries: SessionEntry[] = vault ?? []
      const match = entries.find(
        (e) => msg.domain === e.domain || msg.domain.endsWith(`.${e.domain}`)
      )
      reply(match ? { username: match.username, password: match.password } : { username: null, password: null })
    })
    return true
  }
})
