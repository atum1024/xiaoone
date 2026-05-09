export const MERCHANT_GENERATION_BROADCAST = 'xiaoone-merchant-generation-v1'

class GenerationBroadcast {
  private channel: BroadcastChannel | null = null

  init() {
    if (typeof BroadcastChannel === 'undefined') return
    this.channel = new BroadcastChannel(MERCHANT_GENERATION_BROADCAST)
  }

  listen(callback: () => void) {
    if (!this.channel) return
    this.channel.onmessage = (event) => {
      if (event.data?.type === 'refresh-domains') {
        callback()
      }
    }
  }

  broadcastRefresh() {
    if (!this.channel) return
    this.channel.postMessage({ type: 'refresh-domains' })
  }
}

export const generationBroadcast = new GenerationBroadcast()
