// Use require to ensure it stays as CommonJS in the final build
// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron')

console.log('Preload Script: Starting execution (CJS version)...')

try {
  contextBridge.exposeInMainWorld('ipcRenderer', {
    on(channel: string, listener: (event: any, ...args: any[]) => void) {
      return ipcRenderer.on(channel, (event: any, ...args: any[]) => listener(event, ...args))
    },
    off(channel: string, listener: (event: any, ...args: any[]) => void) {
      return ipcRenderer.off(channel, listener)
    },
    send(channel: string, ...args: any[]) {
      return ipcRenderer.send(channel, ...args)
    },
    invoke(channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args)
    },
  })
  console.log('Preload Script: ipcRenderer exposed successfully')
} catch (error) {
  console.error('Preload Script: Failed to expose ipcRenderer:', error)
}
