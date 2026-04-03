import {
    ConsoleLogger,
  DeviceManagementKitBuilder,
  
} from "@ledgerhq/device-management-kit";
import { speculosTransportFactory } from "@ledgerhq/device-transport-kit-speculos"
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid"

const USE_SPECULOS = true

export const dmk = new DeviceManagementKitBuilder()
  .addTransport(
    USE_SPECULOS
      ? speculosTransportFactory("http://localhost:5000")
      : webHidTransportFactory
  )
  .build()
 
// Global variables to store subscriptions and session info
let discoverySubscription : any;
let stateSubscription : any;
let currentSessionId : string | null = null;
 
export function startDiscoveryAndConnect(
  onStateChange?: (state: ReturnType<typeof dmk.getDeviceSessionState> extends { subscribe: (o: { next: (v: infer S) => void }) => void } ? S : never) => void
): Promise<string> {
  if (discoverySubscription) {
    discoverySubscription.unsubscribe();
  }

  console.log("Starting device discovery...");

  return new Promise((resolve, reject) => {
    discoverySubscription = dmk.startDiscovering({}).subscribe({
      next: async (device) => {
        console.log(`Found device: ${device.id}, model: ${device.deviceModel.model}`);
        try {
          currentSessionId = await dmk.connect({ device });
          console.log(`Connected! Session ID: ${currentSessionId}`);
          discoverySubscription.unsubscribe();
          if (onStateChange) {
            stateSubscription = monitorDeviceState(currentSessionId, onStateChange);
          }
          resolve(currentSessionId);
        } catch (error) {
          console.error("Connection failed:", error);
          reject(error);
        }
      },
      error: (error) => {
        console.error("Discovery error:", error);
        reject(error);
      },
    });
  });
}
 
function monitorDeviceState(sessionId: string, onStateChange?: (state: any) => void) {
  return dmk.getDeviceSessionState({ sessionId }).subscribe({
    next: (state) => {
      console.log(`Device status: ${state.deviceStatus}`);
      if (onStateChange) onStateChange(state);
    },
    error: (error) => {
      console.error("State monitoring error:", error);
    },
  });
}
 
// Always clean up resources when done
export async function cleanup() {
  // Unsubscribe from all observables
  if (discoverySubscription) {
    discoverySubscription.unsubscribe();
  }
 
  if (stateSubscription) {
    stateSubscription.unsubscribe();
  }
 
  // Disconnect from device if connected
  if (currentSessionId) {
    try {
      await dmk.disconnect({ sessionId: currentSessionId });
      console.log("Device disconnected successfully");
      currentSessionId = null;
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  }
}
 
// Example usage:
// startDiscoveryAndConnect();
// ...later when done...
// cleanup();