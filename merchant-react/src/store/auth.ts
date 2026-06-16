import { create } from 'zustand'
import { withLocalIpRegionHeaders } from '@xiaoone/region'
import { api } from '../lib/httpClient' // Wait, I'll copy the api file to lib/httpClient or just keep using api.ts. I'll just change api/http to the new location later if I move it. Actually, I can just use `../api/http` for now since the axios setup there is fine or I'll copy it.
import { isUserBlockedMenu } from '../app/blockedMenus'
import { featureRequiredForMenu } from '../app/menuPermissions'
import { clearTokens, hasAccessToken, setTokens } from '../auth/token'
import { refreshToken } from '../lib/httpClient'
import {
  clearPlatformTokens,
  hasPlatformAccessToken,
  setPlatformTokens,
} from '../lib/platformAuthEvents'
import { useAgentStore } from './agent'
import { useLiveChatStore } from './liveChat'
import { queryClient } from '../app/queryClient'
import { syncWorkspaceAfterLogin } from '../lib/workspaceStatusApi'

interface MeResponse {
  code: number
  message: string
  data: {
    user: {
      id: number
      email: string
      phone?: string
      name: string
      avatar?: string
      region?: 'mainland' | 'overseas'
      locale?: string
      is_platform_admin?: boolean
      email_verified?: boolean
      phone_verified?: boolean
    }
    merchants: Array<{
      id: number
      code: string
      name: string
      default_agent_model_key?: string
      default_kefu_model_key?: string
      default_kefu_translation_model_key?: string
      consultant_allowed_model_keys?: string[]
      workspace_code?: string
      workspace_provider?: string
      workspace_runtime?: string
      workspace_profile?: string
    }>
    current_merchant_id: number | null
    current_member?: {
      role: string
      menu_permissions: string[]
      effective_menu_permissions: string[]
    } | null
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
  featureFlags: Record<string, boolean>
  subscriptionPlanCode: string
  subscriptionPeriodEnd: string | null
  storesMax: number
  teamSeatsMax: number
  status: 'idle' | 'loading' | 'authed'
}

interface AuthActions {
  currentMerchant: () => MeResponse['data']['merchants'][number] | null
  currentMember: () => MeResponse['data']['current_member'] | null
  hasFeature: (feature: string) => boolean
  hasMenuAccess: (menuId: string) => boolean
  persistTokens: (tokens: TokenPair) => void
  afterLoginSync: () => Promise<void>
  loginByCredentials: (payload: { type: LoginIdentityType; identifier: string; password: string }) => Promise<void>
  loginBySms: (phone: string, code: string) => Promise<void>
  loginByEmailCode: (email: string, code: string) => Promise<void>
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
}

let bootstrapInflight: Promise<void> | null = null

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
      user: null,
      me: null,
      merchants: [],
      currentMerchantId: null,
      currentMerchantName: '',
      featureFlags: {},
      subscriptionPlanCode: '',
      subscriptionPeriodEnd: null,
      storesMax: 0,
      teamSeatsMax: 0,
      status: 'idle',

      currentMerchant: () => {
        const merchants = get().merchants
        const id = get().currentMerchantId
        if (id == null) return merchants[0] ?? null
        return merchants.find(m => m.id === id) ?? merchants[0] ?? null
      },

      currentMember: () => get().me?.current_member || null,

      hasFeature: (feature: string) => {
        const key = String(feature || '').trim()
        if (!key)
          return true
        return !!get().featureFlags[key]
      },

      hasMenuAccess: (menuId: string) => {
        if (isUserBlockedMenu(menuId))
          return false
        const requiredFeature = featureRequiredForMenu(menuId)
        if (requiredFeature && !get().hasFeature(requiredFeature))
          return false
        const member = get().currentMember()
        if (!member || member.role === 'owner')
          return true
        const items = member.effective_menu_permissions || member.menu_permissions || []
        if (!Array.isArray(items) || items.length === 0)
          return true
        const allowed = new Set(items.map(String))
        if (allowed.has(menuId))
          return true
        return false
      },

      persistTokens: (tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token)
      },

      afterLoginSync: async () => {
        await get().fetchMe()
        set({ status: 'authed' })
        await syncWorkspaceAfterLogin(get().subscriptionPlanCode).catch(() => {})
        await queryClient.invalidateQueries({ queryKey: ['assistant', 'runtime-status'] }).catch(() => {})
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

      loginByEmailCode: async (email, code) => {
        const r = await api.post('/api/v1/iam/public/login/email/', {
          email: email.trim().toLowerCase(),
          code: code.trim(),
        })
        const tokens = r.data?.data?.tokens || r.data?.tokens || r.data
        if (!tokens?.access_token || !tokens?.refresh_token) throw new Error('email_code_login_failed')
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
        let featureFlags: Record<string, boolean> = {}
        let subscriptionPlanCode = ''
        let subscriptionPeriodEnd: string | null = null
        let storesMax = 0
        let teamSeatsMax = 0
        const merchantId = Number(data.current_merchant_id || currentMerchant?.id || 0)
        if (merchantId > 0) {
          try {
            const subscriptionResp = await api.get('/api/v1/billing/merchant-subscription/', { params: { merchant_id: merchantId } })
            const subscriptionPayload = subscriptionResp.data?.data || subscriptionResp.data || {}
            const subscription = subscriptionPayload.subscription || null
            subscriptionPlanCode = String(subscription?.plan?.code || subscription?.plan_id || '')
            subscriptionPeriodEnd = subscription?.current_period_end ? String(subscription.current_period_end) : null
            const plan = subscription?.plan || {}
            const entitlements = (plan?.entitlements && typeof plan.entitlements === 'object')
              ? plan.entitlements
              : (subscription?.entitlements && typeof subscription.entitlements === 'object' ? subscription.entitlements : {})
            const features = (entitlements?.features && typeof entitlements.features === 'object') ? entitlements.features : {}
            featureFlags = Object.fromEntries(
              Object.entries(features).map(([key, value]) => [String(key), Boolean(value)]),
            )
            storesMax = Number(entitlements?.stores_max || 0)
            teamSeatsMax = Number(entitlements?.team_seats_max || 0)
          } catch {
            const previous = get()
            featureFlags = previous.featureFlags
            subscriptionPlanCode = previous.subscriptionPlanCode
            subscriptionPeriodEnd = previous.subscriptionPeriodEnd
            storesMax = previous.storesMax
            teamSeatsMax = previous.teamSeatsMax
          }
        }
        set({
          user: data.user,
          me: data,
          merchants: data.merchants,
          currentMerchantId: data.current_merchant_id,
          currentMerchantName: currentMerchant?.name || currentMerchant?.code || '',
          featureFlags,
          subscriptionPlanCode,
          subscriptionPeriodEnd,
          storesMax,
          teamSeatsMax,
        })
      },

      logout: () => {
        void fetch('/oauth2/logout/', withLocalIpRegionHeaders({
          method: 'POST',
          credentials: 'same-origin',
        })).catch(() => {})
        clearTokens()
        clearPlatformTokens()
        set({
          user: null,
          me: null,
          merchants: [],
          currentMerchantId: null,
          currentMerchantName: '',
          featureFlags: {},
          subscriptionPlanCode: '',
          subscriptionPeriodEnd: null,
          storesMax: 0,
          teamSeatsMax: 0,
          status: 'idle',
        })
        useLiveChatStore.getState().reset()
        useAgentStore.getState().reset()
      },

      bootstrap: async () => {
        if (bootstrapInflight) return bootstrapInflight
        bootstrapInflight = (async () => {
          const token = hasAccessToken() || !!(await refreshToken())
          if (!token) {
            set({ status: 'idle', user: null, me: null, merchants: [], currentMerchantId: null, currentMerchantName: '' })
            return
          }
          if (get().status === 'authed' && get().user) {
            useLiveChatStore.getState().startRealtime()
            return
          }
          set({ status: 'loading' })
          try {
            await get().fetchMe()
            set({ status: 'authed' })
            useLiveChatStore.getState().startRealtime()
          }
          catch (err: any) {
            const status = err?.response?.status
            if (status === 401 || status === 403) {
              clearTokens()
            }
            set({
              status: 'idle',
              user: null,
              me: null,
              merchants: [],
              currentMerchantId: null,
              currentMerchantName: '',
              featureFlags: {},
              subscriptionPlanCode: '',
              storesMax: 0,
              teamSeatsMax: 0,
            })
          }
        })().finally(() => {
          bootstrapInflight = null
        })
        return bootstrapInflight
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
      }
}))
