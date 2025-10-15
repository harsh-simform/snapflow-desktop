import type { IpcHandler, API } from '../main/preload'

declare global {
  interface Window {
    ipc: IpcHandler
    api: API
  }
}
