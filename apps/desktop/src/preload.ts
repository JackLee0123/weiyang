import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('planner', {
  version: '0.1.0',
})
