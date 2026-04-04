import { DeviceStatus } from "@ledgerhq/device-management-kit"
import { ethers } from "ethers"
import type { SessionEntry } from "../background"
import type { VaultEntry } from "../components/VaultScreen"
import { cleanup, dmk, getEthAddress, startDiscoveryAndConnect } from "./dmk"
import { LedgerSigner } from "./ledger-signer"
import { loadVault } from "./vault"
import { executeSave } from "./save-password"

const RPC_URL = "https://sepolia.base.org"

// Module-level signer — survives tant que le popup est ouvert
let _signer: LedgerSigner | null = null

export function getSigner(): LedgerSigner | null {
  return _signer
}

export type ConnectResult = {
  device: ReturnType<typeof dmk.getConnectedDevice>
  ownerAddress: string
  entries: VaultEntry[]
  vault: SessionEntry[]
}

export async function connect(
  onStatus: (status: string) => void,
): Promise<ConnectResult> {
  const sessionId = await startDiscoveryAndConnect((state) => {
    if (state.deviceStatus === DeviceStatus.LOCKED) onStatus("Locked — enter your PIN")
  })
  const device = dmk.getConnectedDevice({ sessionId })

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  _signer = new LedgerSigner(sessionId, provider)

  onStatus("Waiting for Ledger confirmation…")
  const ownerAddress = await getEthAddress(sessionId)

  onStatus("Loading vault…")
  const entries = await loadVault(_signer, ownerAddress)
  const vault: SessionEntry[] = entries.map(e => ({
    domain: e.domain,
    username: e.username ?? "",
    password: "",
  }))

  return { device, ownerAddress, entries, vault }
}

export async function disconnect(): Promise<void> {
  await cleanup()
  _signer = null
}

export async function savePassword(
  domain: string,
  username: string,
  password: string,
): Promise<void> {
  if (!_signer) throw new Error("Ledger not connected")
  await executeSave(domain, username, password, _signer)
}
