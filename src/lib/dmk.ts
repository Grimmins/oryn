import {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} from "@ledgerhq/device-management-kit"
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum"
import { speculosTransportFactory } from "@ledgerhq/device-transport-kit-speculos"
import { ethers } from "ethers"

let _dmk: ReturnType<DeviceManagementKitBuilder["build"]> | null = null

export function buildDmk(port = 5001) {
  const builder = new DeviceManagementKitBuilder()
  builder.addTransport(speculosTransportFactory(`http://localhost:${port}`))
  _dmk = builder.build()
  return _dmk
}

export function getDmk() {
  if (!_dmk) throw new Error("DMK not initialized — call buildDmk first")
  return _dmk
}

let discoverySubscription: any
let stateSubscription: any
let currentSessionId: string | null = null

export function startDiscoveryAndConnect(
  onStateChange?: (state: any) => void
): Promise<string> {
  const dmk = getDmk()
  if (discoverySubscription) discoverySubscription.unsubscribe()

  return new Promise((resolve, reject) => {
    discoverySubscription = dmk.startDiscovering({}).subscribe({
      next: async (device: any) => {
        try {
          currentSessionId = await dmk.connect({ device })
          discoverySubscription.unsubscribe()
          if (onStateChange) {
            stateSubscription = monitorDeviceState(currentSessionId, onStateChange)
          }
          resolve(currentSessionId)
        } catch (error) {
          reject(error)
        }
      },
      error: reject,
    })
  })
}

function monitorDeviceState(sessionId: string, onStateChange?: (state: any) => void) {
  return getDmk().getDeviceSessionState({ sessionId }).subscribe({
    next: (state: any) => {
      console.log(`Device status: ${state.deviceStatus}`)
      if (onStateChange) onStateChange(state)
    },
    error: console.error,
  })
}

export async function cleanup() {
  if (discoverySubscription) discoverySubscription.unsubscribe()
  if (stateSubscription) stateSubscription.unsubscribe()
  if (currentSessionId) {
    try {
      await getDmk().disconnect({ sessionId: currentSessionId })
      currentSessionId = null
    } catch (error) {
      console.error("Disconnection error:", error)
    }
  }
}

export function actionToPromise<TOutput>(observable: { subscribe: (obs: any) => any }): Promise<TOutput> {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: (state: any) => {
        if (state.status === DeviceActionStatus.Completed) resolve(state.output as TOutput)
        else if (state.status === DeviceActionStatus.Error) reject(state.error)
      },
      error: reject,
    })
  })
}

export const DERIVATION_PATH = "44'/60'/0'/0/0"

export async function getEthAddress(sessionId: string): Promise<string> {
  const signerEth = new SignerEthBuilder({ dmk: getDmk(), sessionId }).build()
  const { observable } = signerEth.getAddress(DERIVATION_PATH, { checkOnDevice: false })
  const result = await actionToPromise<{ address: `0x${string}` }>(observable)
  return result.address
}

export async function signPersonalMessage(sessionId: string, message: string): Promise<string> {
  const signerEth = new SignerEthBuilder({ dmk: getDmk(), sessionId }).build()
  const { observable } = signerEth.signMessage(DERIVATION_PATH, message)
  const sig = await actionToPromise<{ r: string; s: string; v: number }>(observable)
  return ethers.Signature.from({ r: sig.r, s: sig.s, v: sig.v }).serialized
}
