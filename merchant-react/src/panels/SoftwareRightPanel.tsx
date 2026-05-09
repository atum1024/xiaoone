import { useState, useMemo, useRef } from 'react'
import { useSoftwareProjectStore } from '../store/softwareProject'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  toast
} from '@xiaoone/react-ui'
import { Icon } from '../components/Icon'
import ServerPurchasePlanCard from './ServerPurchasePlanCard'
import DemoOfficialSite from './demo/DemoOfficialSite'
import DemoAdminConsole from './demo/DemoAdminConsole'
import './SoftwareRightPanel.css'

interface Props {
  onClose: () => void
}

function tabButtonClass(active: boolean) {
  return [
    'h-10 px-3 text-sm font-medium border-b-2 bg-transparent transition-colors',
    active
      ? 'border-[var(--xiaoone-accent)] text-[var(--xiaoone-fg)]'
      : 'border-transparent text-[var(--xiaoone-fg-mute)] hover:text-[var(--xiaoone-fg)]',
  ].join(' ')
}

export default function SoftwareRightPanel({ onClose }: Props) {
  const proj = useSoftwareProjectStore()
  const [activeTab, setActiveTab] = useState<'user' | 'ops' | 'config'>('user')
  const [configSubTab, setConfigSubTab] = useState<'project' | 'myserver'>('project')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [demoUserKey, setDemoUserKey] = useState(0)
  const [demoOpsKey, setDemoOpsKey] = useState(0)

  const DEMO_USER_CLIP = 'Xiaoone 内置用户端演示（无独立 URL，数据来自「项目信息配置」）'
  const DEMO_OPS_CLIP = 'Xiaoone 内置运营端演示（无独立 URL）'

  function normalizePreviewUrl(raw: string): string | null {
    const t = raw.trim()
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    if (/^localhost\b/i.test(t) || /^127\.\d+\.\d+\.\d+/.test(t)) return `http://${t}`
    return `https://${t}`
  }

  const nzUserUrl = useMemo(() => normalizePreviewUrl(proj.userPreviewUrl), [proj.userPreviewUrl])
  const nzOpsUrl = useMemo(() => normalizePreviewUrl(proj.opsPreviewUrl), [proj.opsPreviewUrl])

  const userLinkBar = nzUserUrl || '（内置演示，无外链 — 请在「配置项 → 项目信息」填写用户端外链）'
  const opsLinkBar = nzOpsUrl || '（内置演示，无外链 — 请在「配置项 → 项目信息」填写运营端外链）'

  const hasDevelopmentRuntime = useMemo(() => {
    return proj.myServers.length > 0 || !!proj.serverIp.trim() || !!proj.serverDomain.trim() || !!proj.serverInfo?.trim()
  }, [proj.myServers, proj.serverIp, proj.serverDomain, proj.serverInfo])

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast({ description: '已复制到剪贴板' })
    } catch {
      toast({ variant: 'destructive', description: '复制失败' })
    }
  }

  function openResolved(resolved: string | null) {
    if (!resolved) {
      toast({ variant: 'destructive', description: '请先在「配置项 → 项目信息配置」填写预览地址' })
      return
    }
    window.open(resolved, '_blank', 'noopener,noreferrer')
  }

  function onLogoPick(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const s = reader.result as string
      if (s.length > 1_200_000) return
      proj.saveProjectInfo({ logoDataUrl: s }) // Assumes saveProjectInfo updates state
    }
    reader.readAsDataURL(file)
  }

  function formatServerTime(iso: string) {
    try {
      const d = new Date(iso)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch {
      return iso
    }
  }

  // --- Purchase / Mock Pay ---
  const [purchaseDialogVisible, setPurchaseDialogVisible] = useState(false)
  const [purchaseStep, setPurchaseStep] = useState<'pick' | 'pay'>('pick')
  const [selectedPlan, setSelectedPlan] = useState<'ev3' | 'starter' | null>(null)
  const [payChannel, setPayChannel] = useState<'wechat' | 'alipay' | null>(null)
  const [mockOrderId, setMockOrderId] = useState('')

  function openPurchaseModal(preselect: 'ev3' | 'starter' = 'ev3') {
    setPurchaseStep('pick')
    setPayChannel(null)
    setMockOrderId('')
    setSelectedPlan(preselect)
    setPurchaseDialogVisible(true)
  }

  function closePurchaseModal() {
    setPurchaseDialogVisible(false)
    setPurchaseStep('pick')
    setPayChannel(null)
    setSelectedPlan(null)
    setMockOrderId('')
  }

  const selectedMeta = useMemo(() => {
    if (!selectedPlan) return null
    if (selectedPlan === 'starter') {
      return {
        planName: 'Starter-S1',
        price: 'HK$88/月',
        specText: ['2 vCPU', '2 GiB 内存', '40 GiB SSD', '1 TiB / 200 Mbps', '1 个 IPv4', '适合联调与演示'].join('\n'),
      }
    }
    return {
      planName: 'Enterprise-V3',
      price: 'HK$240/月',
      specText: ['4 vCPU', '4 GiB 内存', '20 GiB / RAID-10 SSD 系统盘', '60 GiB / RAID-10 SSD 数据盘', '5 TiB / 500 Mbps 峰值速率', '20Gbps DDoS 防御', '1 个 IPv4'].join('\n'),
    }
  }, [selectedPlan])

  function goToPayStep() {
    if (!selectedPlan) {
      toast({ description: '请先选择一个套餐' })
      return
    }
    setMockOrderId(`DEMO-${Date.now().toString(36).toUpperCase()}`)
    setPurchaseStep('pay')
    setPayChannel(null)
  }

  function confirmPaid() {
    if (!selectedPlan || !payChannel || !selectedMeta) {
      toast({ description: '请选择支付方式' })
      return
    }
    proj.addPurchasedMyServer({
      planName: selectedMeta.planName,
      specText: selectedMeta.specText,
      price: selectedMeta.price,
      payment: payChannel,
    })
    closePurchaseModal()
    setConfigSubTab('myserver')
    setActiveTab('config')
  }

  return (
    <aside className="srp">
      <header className="srp-head">
        <nav className="srp-tabs flex h-10 w-full items-center justify-start border-b border-[var(--xiaoone-border-soft)]" aria-label="软件开发面板">
          <button type="button" className={tabButtonClass(activeTab === 'user')} onClick={() => setActiveTab('user')}>用户端</button>
          <button type="button" className={tabButtonClass(activeTab === 'ops')} onClick={() => setActiveTab('ops')}>运营端</button>
          <button type="button" className={tabButtonClass(activeTab === 'config')} onClick={() => setActiveTab('config')}>配置项</button>
        </nav>
        <button type="button" className="srp-close" title="关闭开发预览" onClick={onClose}>
          <Icon name="x" size={14} />
        </button>
      </header>

      <div className="srp-body">
        {activeTab === 'user' && (
          <div className="srp-pane srp-pane--preview">
            {!hasDevelopmentRuntime ? (
              <div className="dev-intro">
                <strong>用户端需要先接入项目服务器</strong>
                <p>绑定已有服务器后，AI 才能扫描运行环境、部署用户端，并把真实访问地址同步到这里。</p>
                <div className="dev-intro-actions">
                  <Button variant="default" size="sm" onClick={() => { setActiveTab('config'); setConfigSubTab('myserver') }}>连接服务器</Button>
                  <Button variant="outline" size="sm" onClick={() => openPurchaseModal()}>购买服务器</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="preview-head">
                  <span className="preview-head-title">用户端 · 官网演示</span>
                  <span className="preview-head-sub">内置页面，读取「项目信息配置」中的名称与 Slogan；客服联调以独立 demo 系统为准。</span>
                </div>
                <div className="preview-url-row">
                  <span className="preview-url-label">链接地址</span>
                  <Input className="preview-url-input" readOnly value={userLinkBar} />
                  <Button variant="outline" size="sm" onClick={() => copyText(userLinkBar)}>复制</Button>
                </div>
                <div className="preview-toolbar">
                  <Button variant="outline" size="sm" onClick={() => setDemoUserKey(k => k + 1)}>刷新演示</Button>
                  <Button variant="outline" size="sm" onClick={() => copyText(DEMO_USER_CLIP)}>复制说明</Button>
                  <Button variant="outline" size="sm" disabled={!nzUserUrl} onClick={() => openResolved(nzUserUrl)}>新标签打开外链</Button>
                </div>
                <div className="preview-frame-wrap preview-frame-wrap--demo">
                  <DemoOfficialSite key={demoUserKey} />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'ops' && (
          <div className="srp-pane srp-pane--preview">
            {!hasDevelopmentRuntime ? (
              <div className="dev-intro">
                <strong>运营端需要项目服务器支撑</strong>
                <p>购买或绑定服务器后，AI 会基于服务器信息生成部署计划，并把运营端预览地址沉淀到项目配置中。</p>
                <div className="dev-intro-actions">
                  <Button variant="default" size="sm" onClick={() => { setActiveTab('config'); setConfigSubTab('myserver') }}>连接服务器</Button>
                  <Button variant="outline" size="sm" onClick={() => openPurchaseModal()}>购买服务器</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="preview-head">
                  <span className="preview-head-title">运营端 · 后台演示</span>
                  <span className="preview-head-sub">内置深色控制台样式预览；数据为占位，不代表真实业务。</span>
                </div>
                <div className="preview-url-row">
                  <span className="preview-url-label">链接地址</span>
                  <Input className="preview-url-input" readOnly value={opsLinkBar} />
                  <Button variant="outline" size="sm" onClick={() => copyText(opsLinkBar)}>复制</Button>
                </div>
                <div className="preview-toolbar">
                  <Button variant="outline" size="sm" onClick={() => setDemoOpsKey(k => k + 1)}>刷新演示</Button>
                  <Button variant="outline" size="sm" onClick={() => copyText(DEMO_OPS_CLIP)}>复制说明</Button>
                  <Button variant="outline" size="sm" disabled={!nzOpsUrl} onClick={() => openResolved(nzOpsUrl)}>新标签打开外链</Button>
                </div>
                <div className="preview-frame-wrap preview-frame-wrap--demo">
                  <DemoAdminConsole key={demoOpsKey} />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="srp-pane srp-pane--config">
            <div className="config-subtabs">
              <nav className="flex h-10 w-full items-center justify-start border-b border-[var(--xiaoone-border-soft)]" aria-label="配置项">
                <button type="button" className={tabButtonClass(configSubTab === 'project')} onClick={() => setConfigSubTab('project')}>项目信息配置</button>
                <button type="button" className={tabButtonClass(configSubTab === 'myserver')} onClick={() => setConfigSubTab('myserver')}>我的服务器</button>
              </nav>
              {configSubTab === 'project' ? (
              <div className="pt-4">
                <form className="srp-form space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">项目名称</label>
                    <Input value={proj.projectName} onChange={(e) => proj.saveProjectInfo({ projectName: e.target.value })} placeholder="Xiaoone 用户端" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">项目 Slogan</label>
                    <Input value={proj.projectSlogan} onChange={(e) => proj.saveProjectInfo({ projectSlogan: e.target.value })} placeholder="一句话介绍" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">项目 Logo</label>
                    <div className="srp-logo-row">
                      {proj.logoDataUrl && (
                        <div className="srp-logo-preview">
                          <img src={proj.logoDataUrl} alt="" />
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => proj.saveProjectInfo({ logoDataUrl: '' })}>清除</Button>
                        </div>
                      )}
                      <input ref={logoInputRef} type="file" accept="image/*" className="srp-logo-input" onChange={onLogoPick} />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>选择图片</Button>
                    </div>
                    <p className="srp-micro">也可在左侧对话中上传图片，将自动同步为 Logo。</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">用户端外链（可选）</label>
                    <Input value={proj.userPreviewUrl} onChange={(e) => proj.saveProjectInfo({ userPreviewUrl: e.target.value })} placeholder="https://app.example.com 或 localhost:5173" />
                    <p className="srp-micro">填写后可在「用户端」用「新标签打开外链」访问；主区域仍为内置官网演示。</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">运营端外链（可选）</label>
                    <Input value={proj.opsPreviewUrl} onChange={(e) => proj.saveProjectInfo({ opsPreviewUrl: e.target.value })} placeholder="https://admin.example.com 或 http://127.0.0.1:4173" />
                    <p className="srp-micro">填写后可在「运营端」用「新标签打开外链」访问。</p>
                  </div>
                </form>
              </div>
              ) : (
              <div className="pt-4">
                <div className="myserver-head">
                  <Button variant="default" onClick={() => openPurchaseModal()}>
                    <Icon name="cart" size={14} className="mr-1" />
                    购买服务器
                  </Button>
                </div>
                {!proj.myServers.length ? (
                  <p className="srp-micro myserver-empty">暂无条目。点击「购买服务器」可完成演示选购与模拟支付。</p>
                ) : (
                  <ul className="myserver-list">
                    {proj.myServers.map(s => (
                      <li key={s.id} className="myserver-card">
                        <div className="myserver-card-top">
                          <span className="myserver-name">{s.name}</span>
                          <span className="myserver-tag">{s.source === 'purchase' ? '购买' : '手动'}</span>
                          <Button variant="ghost" size="sm" className="myserver-rm text-red-500" onClick={() => proj.removeMyServer(s.id)}>移除</Button>
                        </div>
                        <div className="myserver-meta">
                          <span>IP <code>{s.ip}</code></span>
                          <span className="myserver-time">{formatServerTime(s.createdAt)}</span>
                        </div>
                        {s.specText.trim() && <pre className="myserver-spec">{s.specText}</pre>}
                        {s.remark.trim() && <p className="myserver-remark">{s.remark}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                <hr className="my-4 border-[var(--xiaoone-border-soft)]" />
                <h4 className="text-sm font-semibold mb-4">部署连接凭据（可选）</h4>
                <form className="srp-form space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">账户</label>
                    <Input value={proj.serverAccount} onChange={(e) => proj.saveProjectInfo({ serverAccount: e.target.value })} placeholder="SSH / 面板账户" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">密码</label>
                    <Input type="password" value={proj.serverPassword} onChange={(e) => proj.saveProjectInfo({ serverPassword: e.target.value })} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">域名</label>
                    <Input value={proj.serverDomain} onChange={(e) => proj.saveProjectInfo({ serverDomain: e.target.value })} placeholder="api.example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">服务器 IP（全局）</label>
                    <Input value={proj.serverIp} onChange={(e) => proj.saveProjectInfo({ serverIp: e.target.value })} placeholder="如 38.12.34.56 或内网 10.0.0.8" />
                  </div>
                </form>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={purchaseDialogVisible} onOpenChange={(open) => !open && closePurchaseModal()}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{purchaseStep === 'pick' ? '服务器选购' : '模拟支付'}</DialogTitle>
          </DialogHeader>
          {purchaseStep === 'pick' ? (
            <>
              <p className="dlg-tip">请选择套餐后点击「去支付」。</p>
              <div className="dlg-plan-grid">
                <ServerPurchasePlanCard planId="ev3" selectable selected={selectedPlan === 'ev3'} showBuyButton={false} onSelect={setSelectedPlan as any} />
                <ServerPurchasePlanCard planId="starter" selectable selected={selectedPlan === 'starter'} showBuyButton={false} onSelect={setSelectedPlan as any} />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={closePurchaseModal}>取消</Button>
                <Button variant="default" disabled={!selectedPlan} onClick={goToPayStep}>去支付</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {selectedMeta && (
                <div className="pay-summary">
                  <p><strong>{selectedMeta.planName}</strong> · {selectedMeta.price}</p>
                  <p className="srp-micro">请选择模拟支付方式（演示环境）。</p>
                </div>
              )}
              <div className="pay-channels">
                <Button size="lg" className={`pay-btn ${payChannel === 'wechat' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`} variant={payChannel === 'wechat' ? 'default' : 'outline'} onClick={() => setPayChannel('wechat')}>微信支付</Button>
                <Button size="lg" className={`pay-btn ${payChannel === 'alipay' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`} variant={payChannel === 'alipay' ? 'default' : 'outline'} onClick={() => setPayChannel('alipay')}>支付宝</Button>
              </div>
              {payChannel && (
                <div className="pay-mock">
                  <p>收款方：<strong>演示商户（Xiaoone）</strong></p>
                  <p>订单号：<code>{mockOrderId}</code></p>
                  <p className="srp-micro">请在新窗口完成扫码（此处为占位）。返回后点击下方按钮即可将服务器写入列表。</p>
                  <Button variant="default" className="pay-done" onClick={confirmPaid}>我已付款</Button>
                </div>
              )}
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setPurchaseStep('pick'); setPayChannel(null) }}>上一步</Button>
                <Button variant="outline" onClick={closePurchaseModal}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  )
}
