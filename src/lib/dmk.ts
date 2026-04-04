import {
  ConsoleLogger,
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} from "@ledgerhq/device-management-kit"
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum"
import { speculosTransportFactory } from "@ledgerhq/device-transport-kit-speculos"
import { ethers } from "ethers"

export const dmk = new DeviceManagementKitBuilder()
  .addTransport(speculosTransportFactory("http://localhost:5001"))
  .build()

let discoverySubscription: any
let stateSubscription: any
let currentSessionId: string | null = null

export function startDiscoveryAndConnect(
  onStateChange?: (state: ReturnType<typeof dmk.getDeviceSessionState> extends { subscribe: (o: { next: (v: infer S) => void }) => void } ? S : never) => void
): Promise<string> {
  if (discoverySubscription) {
    discoverySubscription.unsubscribe()
  }

  console.log("Starting device discovery...")

  return new Promise((resolve, reject) => {
    discoverySubscription = dmk.startDiscovering({}).subscribe({
      next: async (device) => {
        console.log(`Found device: ${device.id}, model: ${device.deviceModel.model}`)
        try {
          currentSessionId = await dmk.connect({ device })
          console.log(`Connected! Session ID: ${currentSessionId}`)
          discoverySubscription.unsubscribe()
          if (onStateChange) {
            stateSubscription = monitorDeviceState(currentSessionId, onStateChange)
          }
          resolve(currentSessionId)
        } catch (error) {
          console.error("Connection failed:", error)
          reject(error)
        }
      },
      error: (error) => {
        console.error("Discovery error:", error)
        reject(error)
      },
    })
  })
}

function monitorDeviceState(sessionId: string, onStateChange?: (state: any) => void) {
  return dmk.getDeviceSessionState({ sessionId }).subscribe({
    next: (state) => {
      console.log(`Device status: ${state.deviceStatus}`)
      if (onStateChange) onStateChange(state)
    },
    error: (error) => {
      console.error("State monitoring error:", error)
    },
  })
}

export async function cleanup() {
  if (discoverySubscription) discoverySubscription.unsubscribe()
  if (stateSubscription) stateSubscription.unsubscribe()
  if (currentSessionId) {
    try {
      await dmk.disconnect({ sessionId: currentSessionId })
      console.log("Device disconnected successfully")
      currentSessionId = null
    } catch (error) {
      console.error("Disconnection error:", error)
    }
  }
}

// Wraps an Observable<DeviceActionState> into a Promise that resolves on Completed
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

// Récupère l'adresse Ethereum du Ledger connecté
export async function getEthAddress(sessionId: string): Promise<string> {
  const signerEth = new SignerEthBuilder({ dmk, sessionId }).build()
  const { observable } = signerEth.getAddress(DERIVATION_PATH, { checkOnDevice: false })
  const result = await actionToPromise<{ address: `0x${string}` }>(observable)
  return result.address
}

// Signe un message personnel via le Ledger et retourne la signature hex complète
export async function signPersonalMessage(sessionId: string, message: string): Promise<string> {
  const signerEth = new SignerEthBuilder({ dmk, sessionId }).build()
  const { observable } = signerEth.signMessage(DERIVATION_PATH, message)
  const sig = await actionToPromise<{ r: string; s: string; v: number }>(observable)
  return ethers.Signature.from({ r: sig.r, s: sig.s, v: sig.v }).serialized
}
