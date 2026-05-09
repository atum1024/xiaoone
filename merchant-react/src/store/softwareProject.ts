import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from '@xiaoone/react-ui'

export type MyServerSource = 'manual' | 'purchase'

export interface MyServerEntry {
  id: string
  name: string
  specText: string
  ip: string
  remark: string
  source: MyServerSource
  plan?: string
  price?: string
  payment?: 'wechat' | 'alipay'
  createdAt: string
}

interface SoftwareProjectState {
  serverAccount: string
  serverPassword: string
  serverDomain: string
  serverIp: string
  serverInfo: string
  userPreviewUrl: string
  opsPreviewUrl: string
  projectName: string
  projectSlogan: string
  logoDataUrl: string
  myServers: MyServerEntry[]
}

interface SoftwareProjectActions {
  saveProjectInfo: (patch?: Partial<SoftwareProjectState>) => void
  addPurchasedMyServer: (payload: {
    planName: string
    specText: string
    price: string
    payment: 'wechat' | 'alipay'
  }) => void
  removeMyServer: (id: string) => void
  setLogoDataUrl: (dataUrl: string) => void
  syncFromChatFile: (file: File) => void
}

export const useSoftwareProjectStore = create<SoftwareProjectState & SoftwareProjectActions>()(
  persist(
    (set, get) => ({
      serverAccount: '',
      serverPassword: '',
      serverDomain: '',
      serverIp: '',
      serverInfo: '',
      userPreviewUrl: '',
      opsPreviewUrl: '',
      projectName: '',
      projectSlogan: '',
      logoDataUrl: '',
      myServers: [],

      saveProjectInfo: (patch) => {
        if (patch)
          set(patch)
        else
          toast.success('项目信息已保存')
      },
      addPurchasedMyServer: (payload) => {
        const tail = Math.floor(10 + Math.random() * 240)
        const mid = Math.floor(10 + Math.random() * 240)
        const demoIp = `38.54.${mid}.${tail}`
        const entry: MyServerEntry = {
          id: `p-${Date.now()}`,
          name: payload.planName,
          specText: payload.specText.trim(),
          ip: demoIp,
          remark: `演示开通 · ${payload.payment === 'wechat' ? '微信' : '支付宝'} · ${payload.price}`,
          source: 'purchase',
          plan: payload.planName,
          price: payload.price,
          payment: payload.payment,
          createdAt: new Date().toISOString(),
        }
        set(state => ({ myServers: [entry, ...state.myServers] }))
        toast.success('已添加至我的服务器')
      },
      removeMyServer: (id) => {
        set(state => ({ myServers: state.myServers.filter(server => server.id !== id) }))
      },
      setLogoDataUrl: dataUrl => set({ logoDataUrl: dataUrl }),
      syncFromChatFile: (file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = String(reader.result || '')
            if (dataUrl.length > 1_200_000) {
              toast.warning('图片过大，请选择约 800KB 以内的图片')
              return
            }
            set({ logoDataUrl: dataUrl })
            toast.success('已从对话同步到配置项 · 项目 Logo')
          }
          reader.readAsDataURL(file)
          return
        }

        const line = `[对话附件] ${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`
        const current = get().serverInfo.trim()
        set({ serverInfo: [current, line].filter(Boolean).join('\n') })
        toast.success('已同步到配置项 · 服务器信息')
      },
    }),
    {
      name: 'xiaoone-merchant-software-project',
      partialize: state => ({
        serverAccount: state.serverAccount,
        serverPassword: state.serverPassword,
        serverDomain: state.serverDomain,
        serverIp: state.serverIp,
        serverInfo: state.serverInfo,
        userPreviewUrl: state.userPreviewUrl,
        opsPreviewUrl: state.opsPreviewUrl,
        projectName: state.projectName,
        projectSlogan: state.projectSlogan,
        logoDataUrl: state.logoDataUrl,
        myServers: state.myServers,
      }),
    },
  ),
)
