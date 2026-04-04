import type { ethers } from "ethers"
import { saveEntry } from "./vault"

export async function executeSave(
  domain: string,
  username: string,
  password: string,
  signer: ethers.Signer,
  signatureMaster: string,
): Promise<void> {
  await saveEntry(domain, username, password, signer, signatureMaster)
}
