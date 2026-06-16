import { create } from 'zustand'
import { useLiveChatStore } from './liveChat'

interface WsHealthState {
  agentRealtimeConnected: boolean
}

export const useWsHealthStore = create<WsHealthState>(() => ({
  agentRealtimeConnected: false,
}))

let bridgeReady = false

export function ensureWsHealthBridge() {
  if (bridgeReady)
    return
  bridgeReady = true
  useWsHealthStore.setState({
    agentRealtimeConnected: useLiveChatStore.getState().realtimeConnected,
  })
  useLiveChatStore.subscribe((state, prevState) => {
    if (state.realtimeConnected === prevState.realtimeConnected)
      return
    useWsHealthStore.setState({ agentRealtimeConnected: state.realtimeConnected })
  })
}
