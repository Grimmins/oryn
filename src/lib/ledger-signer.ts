import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum"
import { ethers } from "ethers"
import { DERIVATION_PATH, actionToPromise, dmk, getEthAddress, signPersonalMessage } from "./dmk"

export class LedgerSigner extends ethers.AbstractSigner {
  constructor(
    readonly sessionId: string,
    provider: ethers.Provider,
  ) {
    super(provider)
  }

  async getAddress(): Promise<string> {
    return getEthAddress(this.sessionId)
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const msg = typeof message === "string" ? message : ethers.toUtf8String(message)
    return signPersonalMessage(this.sessionId, msg)
  }

  async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
    const signerEth = new SignerEthBuilder({ dmk, sessionId: this.sessionId }).build()
    const populated = await this.populateTransaction(tx)
    const { from: _from, ...txWithoutFrom } = populated
    const transaction = ethers.Transaction.from(txWithoutFrom)
    const serialized = ethers.getBytes(transaction.unsignedSerialized)
    const { observable } = signerEth.signTransaction(DERIVATION_PATH, serialized)
    const sig = await actionToPromise<{ r: string; s: string; v: number }>(observable)
    return ethers.Transaction.from({
      ...populated,
      signature: ethers.Signature.from(sig),
    }).serialized
  }

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    throw new Error("signTypedData not supported")
  }

  connect(provider: ethers.Provider): LedgerSigner {
    return new LedgerSigner(this.sessionId, provider)
  }
}
