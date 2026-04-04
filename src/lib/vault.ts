import { ethers } from "ethers";



import type { VaultEntry } from "../components/VaultScreen";
import { decrypt, deriveAESKey, encrypt } from "./crypto";
import vaultJson from "./vault.json";


const RPC_URL = "https://sepolia.base.org"

function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(vaultJson.address, vaultJson.abi, signerOrProvider)
}

export async function saveEntry(
  domain: string,
  username: string,
  password: string,
  signer: ethers.Signer,
): Promise<void> {
  const signatureMaster = await signer.signMessage("oryn:master:v1")
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

export async function loadVault(
  signer: ethers.Signer,
  ownerAddress: string,
): Promise<VaultEntry[]> {
  console.log("Loading vault for address", ownerAddress)
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const voidSigner = new ethers.VoidSigner(ownerAddress, provider)
  const contract = getContract(voidSigner)

  const [siteHashes, blobsDomain] = await contract.getAllPasswords()
  if (siteHashes.length === 0) return []

  const signatureMaster = await signer.signMessage("oryn:master:v1")
  const AESkeyMaster = await deriveAESKey(signatureMaster)

  console.log("Decrypting vault entries…")

  const entries: VaultEntry[] = []
  for (let i = 0; i < siteHashes.length; i++) {
    try {
      const domain = await decrypt(AESkeyMaster, ethers.getBytes(blobsDomain[i]))
      entries.push({ siteHash: siteHashes[i], domain, username: null })
      console.log(`Decrypted entry for domain: ${domain}`)
    } catch {
      console.error(`Failed to decrypt entry for site hash: ${siteHashes[i]}`)
    }
  }
  return entries
}