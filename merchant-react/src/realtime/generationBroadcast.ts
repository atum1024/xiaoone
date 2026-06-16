export const MERCHANT_GENERATION_BROADCAST = 'xiaoone-merchant-generation-v1'

class GenerationBroadcast {
  private channel: BroadcastChannel | null = null
  private listeners = new Set<() => void>()

  init() {
    if (typeof BroadcastChannel === 'undefined') return
    if (this.channel) return
    this.channel = new BroadcastChannel(MERCHANT_GENERATION_BROADCAST)
    this.channel.onmessage = (event) => {
      if (event.data?.type === 'refresh-domains') {
        this.listeners.forEach(cb => cb())
      }
    }
  }

  /** Register a listener. Returns an unsubscribe function. */
  listen(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  broadcastRefresh() {
    if (!this.channel) return
    this.channel.postMessage({ type: 'refresh-domains' })
  }
}

export const generationBroadcast = new GenerationBroadcast()
