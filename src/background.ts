export type SessionEntry = {
  domain: string
  username: string
  password: string
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "AUTOFILL_REQUEST") {
    console.log(`Autofill request for domain: ${msg.domain}`)
    reply({ password: "coucou", username: "alice" }) // default reply in case of early return
    chrome.storage.session.get("vault", ({ vault }) => {
      const entries: SessionEntry[] = vault ?? []
      const match = entries.find(
        (e) => msg.domain === e.domain || msg.domain.endsWith(`.${e.domain}`)
      )
      reply(match ? { password: match.password, username: match.username } : { password: null, username: null })
    })
    return true // keep channel open for async reply
  }
})
