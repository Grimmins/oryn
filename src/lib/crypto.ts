export async function deriveAESKey(signature: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signature)
  )
  return crypto.subtle.importKey(
    "raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  )
}

export async function encrypt(key: CryptoKey, data: string): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    new TextEncoder().encode(data)
  )
  const blob = new Uint8Array(12 + encrypted.byteLength)
  blob.set(nonce, 0)
  blob.set(new Uint8Array(encrypted), 12)
  return blob
}

export async function decrypt(key: CryptoKey, blob: Uint8Array): Promise<string> {
  const nonce = blob.slice(0, 12)
  const ciphertext = blob.slice(12)
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}