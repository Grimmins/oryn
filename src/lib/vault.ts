import { ethers } from "ethers"
import type { VaultEntry } from "../components/VaultScreen"
import { decrypt, deriveAESKey, encrypt } from "./crypto"
import vaultJson from "./vault.json"

const RPC_URL = "https://sepolia.base.org"

function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(vaultJson.address, vaultJson.abi, signerOrProvider)
}

export async function saveEntry(
  domain: string,
  username: string,
  password: string,
  signer: ethers.Signer,
  signatureMaster: string,
): Promise<void> {
  const AESkeyMaster = await deriveAESKey(signatureMaster)
  const blobDomain = await encrypt(AESkeyMaster, domain)

  const signatureEntry = await signer.signMessage(`oryn:save-password:${domain}`)
  const AESkeyEntry = await deriveAESKey(signatureEntry)
  const blobPW = await encrypt(AESkeyEntry, password)
  const blobU  = await encrypt(AESkeyEntry, username)

  const salt = signatureMaster.slice(0, 32)
  const siteHash = ethers.keccak256(
    ethers.concat([ethers.toUtf8Bytes(domain), ethers.toUtf8Bytes(salt)])
  )

  const contract = getContract(signer)
  const tx = await contract.savePassword(siteHash, blobDomain, blobPW, blobU)
  await tx.wait()
}

export async function getCredentials(
  domain: string,
  signer: ethers.Signer,
  ownerAddress: string,
  signatureMaster: string,
): Promise<{ username: string; password: string } | null> {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const voidSigner = new ethers.VoidSigner(ownerAddress, provider)
  const contract = getContract(voidSigner)

  const salt = signatureMaster.slice(0, 32)
  const siteHash = ethers.keccak256(
    ethers.concat([ethers.toUtf8Bytes(domain), ethers.toUtf8Bytes(salt)])
  )

  console.log("[getCredentials] fetching from contract for domain:", domain)
  const [, blobPW, blobU] = await contract.getPassword(siteHash)
  console.log("[getCredentials] contract response received, blobPW length:", ethers.getBytes(blobPW).length)
  if (!blobPW || ethers.getBytes(blobPW).length === 0) return null

  console.log("[getCredentials] signing entry key on Ledger…")
  const signatureEntry = await signer.signMessage(`oryn:save-password:${domain}`)
  console.log("[getCredentials] entry key signed, decrypting…")
  const AESkeyEntry = await deriveAESKey(signatureEntry)

  const password = await decrypt(AESkeyEntry, ethers.getBytes(blobPW))
  const username = await decrypt(AESkeyEntry, ethers.getBytes(blobU))
  console.log("[getCredentials] done")

  return { username, password }
}

export async function loadVault(
  ownerAddress: string,
  signatureMaster: string,
): Promise<VaultEntry[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const voidSigner = new ethers.VoidSigner(ownerAddress, provider)
  const contract = getContract(voidSigner)

  const [siteHashes, blobsDomain] = await contract.getAllPasswords()
  if (siteHashes.length === 0) return []

  const AESkeyMaster = await deriveAESKey(signatureMaster)

  const entries: VaultEntry[] = []
  for (let i = 0; i < siteHashes.length; i++) {
    try {
      const domain = await decrypt(AESkeyMaster, ethers.getBytes(blobsDomain[i]))
      entries.push({ siteHash: siteHashes[i], domain, username: null })
    } catch {
      console.error(`Failed to decrypt entry for site hash: ${siteHashes[i]}`)
    }
  }
  return entries
}
