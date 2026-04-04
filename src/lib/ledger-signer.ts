import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum"
import {
AbstractSigner,
type Provider,
Signature,
Transaction,
type TransactionRequest,
ethers,
} from "ethers"
import {
DERIVATION_PATH,
actionToPromise,
dmk,
getEthAddress,
signPersonalMessage,
} from "./dmk"

async function getAddress(): Promise<string> {
  return getEthAddress(this.sessionId)
}

async function signTransaction(tx: TransactionRequest): Promise<string> {
  const populated = await this.populateTransaction(tx)
  const { from: _from, ...unsignedTx } = populated

  const unsignedBytes = ethers.getBytes(Transaction.from(unsignedTx).unsignedSerialized)

  const signerEth = new SignerEthBuilder({ dmk, sessionId: this.sessionId }).build()
  const { observable } = signerEth.signTransaction(DERIVATION_PATH, unsignedBytes)
  const ledgerSig = await actionToPromise<{ r: string; s: string; v: number }>(observable)

  const signedTx = Transaction.from(unsignedTx)
  signedTx.signature = Signature.from({ r: ledgerSig.r, s: ledgerSig.s, v: ledgerSig.v })
  return signedTx.serialized
}

export async function signMessage(message: string | Uint8Array): Promise<string> {
  const msg = typeof message === "string" ? message : ethers.toUtf8String(message)
  return signPersonalMessage(this.sessionId, msg)
}

async function signTypedData(
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  value: Record<string, unknown>
): Promise<string> {
  throw new Error("signTypedData not yet implemented")
}

