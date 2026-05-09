import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/httpClient' // Wait, I'll copy the api file to lib/httpClient or just keep using api.ts. I'll just change api/http to the new location later if I move it. Actually, I can just use `../api/http` for now since the axios setup there is fine or I'll copy it.
import { notifyAccessTokenRefreshed } from '../lib/authEvents'
import {
  clearPlatformTokens,
  hasPlatformAccessToken,
  setPlatformTokens,
} from '../lib/platformAuthEvents'
import { useAgentStore } from './agent'
import { useLiveChatStore } from './liveChat'
import { disposeTeamChatStore, useTeamChatStore } from './teamChat'

interface MeResponse {
  code: number
  message: string
  data: {
    user: {
      id: number
      email: string
      phone?: string
      name: string
      is_demo: boolean
      is_platform_admin?: boolean
      email_verified?: boolean
      phone_verified?: boolean
    }
    merchants: Array<{
      id: number
      code: string
      name: string
      is_demo: boolean
      consultant_allowed_model_keys?: string[]
    }>
    current_merchant_id: number | null
    is_platform_admin: boolean
    current_scope?: string
    is_platform_scope?: boolean
  }
}

interface TokenPair {
  access_token: string
  refresh_token: string
}

type LoginIdentityType = 'phone' | 'email'

interface AuthState {
  user: MeResponse['data']['user'] | null
  me: MeResponse['data'] | null
  merchants: MeResponse['data']['merchants']
  currentMerchantId: number | null
  currentMerchantName: string
  isDemo: boolean
  status: 'idle' | 'loading' | 'authed'
}

interface AuthActions {
  currentMerchant: () => MeResponse['data']['merchants'][number] | null
  persistTokens: (tokens: TokenPair) => void
  afterLoginSync: () => Promise<void>
  loginByCredentials: (payload: { type: LoginIdentityType; identifier: string; password: string }) => Promise<void>
  loginBySms: (phone: string, code: string) => Promise<void>
  loginByPhone: (phone: string, password: string) => Promise<void>
  loginByEmail: (email: string, password: string) => Promise<void>
  login: (payload: { type: LoginIdentityType; identifier: string; password: string }) => Promise<void>
  redeemHandoff: (token: string) => Promise<void>
  startWechatScan: () => Promise<any>
  pollWechatScan: (state: string) => Promise<any>
  fetchMe: () => Promise<void>
  bootstrap: () => Promise<void>
  logout: () => void
  elevatePlatform: (opts?: { password?: string }) => Promise<void>
  hasPlatformSession: () => boolean
  revokePlatform: () => void
  switchMerchant: (merchantCode: string) => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      me: null,
      merchants: [],
      currentMerchantId: null,
      currentMerchantName: '',
      isDemo: false,
      status: 'idle',

      currentMerchant: () => {
        const id = get().currentMerchantId
        if (id == null) return null
        return get().merchants.find(m => m.id === id) ?? null
      },

      persistTokens: (tokens) => {
        localStorage.setItem('xiaoone.access_token', tokens.access_token)
        localStorage.setItem('xiaoone.refresh_token', tokens.refresh_token)
      },

      afterLoginSync: async () => {
        await get().fetchMe()
        set({ status: 'authed' })
        const teamChat = useTeamChatStore.getState()
        teamChat.reset()
        await teamChat.fetch().catch(() => {})
        teamChat.startTeamRealtime()
        useLiveChatStore.getState().startRealtime()
      },

      loginByCredentials: async (payload) => {
        const username = payload.type === 'phone'
          ? payload.identifier.trim()
          : payload.identifier.trim().toLowerCase()
        const r = await api.post('/oauth2/token/', {
          grant_type: 'password',
          username,
          password: payload.password,
          scope: 'merchant',
        })
        get().persistTokens({ access_token: r.data.access_token, refresh_token: r.data.refresh_token })
        await get().afterLoginSync()
      },

      loginBySms: async (phone, code) => {
        const r = await api.post('/api/v1/iam/public/login/sms/', {
          phone: phone.trim(),
          code: code.trim(),
        })
        const tokens = r.data?.data?.tokens || r.data?.tokens || r.data
        if (!tokens?.access_token || !tokens?.refresh_token) throw new Error('sms_login_failed')
        get().persistTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
        await get().afterLoginSync()
      },

      loginByPhone: async (phone, password) => get().loginByCredentials({ type: 'phone', identifier: phone, password }),
      loginByEmail: async (email, password) => get().loginByCredentials({ type: 'email', identifier: email, password }),
      login: async (payload) => get().loginByCredentials(payload),

      redeemHandoff: async (token) => {
        const r = await api.post('/api/v1/iam/handoff/redeem/', { token: token.trim() })
        const tokens = r.data?.data?.tokens || r.data?.tokens || r.data
        if (!tokens?.access_token || !tokens?.refresh_token) throw new Error('handoff_token_invalid')
        get().persistTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
        await get().afterLoginSync()
      },

      startWechatScan: async () => {
        const r = await api.get('/api/v1/iam/oauth/wechat/qrcode/')
        return r.data?.data || r.data
      },

      pollWechatScan: async (stateId) => {
        const r = await api.get('/api/v1/iam/oauth/wechat/poll/', { params: { state: stateId } })
        const data = r.data?.data || r.data
        if (data?.tokens?.access_token && data?.tokens?.refresh_token) {
          get().persistTokens({ access_token: data.tokens.access_token, refresh_token: data.tokens.refresh_token })
          await get().afterLoginSync()
        }
        return data
      },

      fetchMe: async () => {
        const r = await api.get('/api/v1/iam/me/')
        const data = r.data?.data || r.data
        const currentMerchant = data.merchants.find((m: any) => m.id === data.current_merchant_id) || data.merchants[0] || null
        set({
          user: data.user,
          me: data,
          merchants: data.merchants,
          currentMerchantId: data.current_merchant_id,
          currentMerchantName: currentMerchant?.name || currentMerchant?.code || '',
          isDemo: !!data.user?.is_demo || data.merchants.some((m: any) => m.is_demo)
        })
      },

      logout: () => {
        localStorage.removeItem('xiaoone.access_token')
        localStorage.removeItem('xiaoone.refresh_token')
        clearPlatformTokens()
        set({ user: null, me: null, merchants: [], currentMerchantId: null, currentMerchantName: '', status: 'idle' })
        useTeamChatStore.getState().reset()
        disposeTeamChatStore('platform:internal')
        useLiveChatStore.getState().reset()
        useAgentStore.getState().reset()
      },

      bootstrap: async () => {
        const token = localStorage.getItem('xiaoone.access_token')
        if (!token) {
          set({ status: 'idle', user: null, me: null, merchants: [], currentMerchantId: null, currentMerchantName: '' })
          return
        }
        if (get().user) {
          await get().fetchMe().catch(() => {})
          set({ status: 'authed' })
          const teamChat = useTeamChatStore.getState()
          teamChat.fetch().catch(() => {})
          teamChat.startTeamRealtime()
          useLiveChatStore.getState().startRealtime()
          return
        }
        set({ status: 'loading' })
        try {
          await get().fetchMe()
          set({ status: 'authed' })
          const teamChat = useTeamChatStore.getState()
          teamChat.fetch().catch(() => {})
          teamChat.startTeamRealtime()
          useLiveChatStore.getState().startRealtime()
        }
        catch {
          localStorage.removeItem('xiaoone.access_token')
          localStorage.removeItem('xiaoone.refresh_token')
          set({ status: 'idle', user: null, me: null, merchants: [], currentMerchantId: null, currentMerchantName: '' })
        }
      },

      elevatePlatform: async (opts) => {
        const body = opts?.password ? { password: opts.password } : {}
        const r = await api.post('/api/v1/iam/auth/platform/elevate/', body)
        const access = r.data?.access_token
        const refresh = r.data?.refresh_token
        if (!access) throw new Error('elevate_failed')
        setPlatformTokens(access, refresh)
      },

      hasPlatformSession: () => hasPlatformAccessToken(),

      revokePlatform: () => {
        clearPlatformTokens()
        disposeTeamChatStore('platform:internal')
      },

      switchMerchant: async (merchantCode) => {
        const rt = localStorage.getItem('xiaoone.refresh_token')
        if (!rt) throw new Error('missing_refresh_token')
        const oldId = get().currentMerchantId
        const oldKey = oldId && oldId > 0 ? `merchant:${oldId}` : 'merchant:default'
        
        const r = await api.post('/oauth2/switch_merchant/', {
          refresh_token: rt,
          merchant_code: String(merchantCode).trim(),
        })
        localStorage.setItem('xiaoone.access_token', r.data.access_token)
        if (r.data.refresh_token) localStorage.setItem('xiaoone.refresh_token', r.data.refresh_token)
        notifyAccessTokenRefreshed(r.data.access_token)
        
        await get().fetchMe()
        
        const newId = get().currentMerchantId
        const newKey = newId && newId > 0 ? `merchant:${newId}` : 'merchant:default'
        if (oldKey !== newKey) disposeTeamChatStore(oldKey)
        
        const ag = useAgentStore.getState()
        ag.reset()
        ag.refreshAllAgentDomains().catch(() => {})
        
        const teamChat = useTeamChatStore.getState()
        teamChat.reset()
        await teamChat.fetch().catch(() => {})
        teamChat.startTeamRealtime()
        useLiveChatStore.getState().startRealtime()
      }
    }),
    {
      name: 'auth', // same as Pinia default key
      partialize: (state) => ({
        user: state.user,
        me: state.me,
        merchants: state.merchants,
        currentMerchantId: state.currentMerchantId,
        currentMerchantName: state.currentMerchantName,
        isDemo: state.isDemo,
      }),
    }
  )
)
