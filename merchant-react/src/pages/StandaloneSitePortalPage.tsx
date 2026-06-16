import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Globe, KeyRound, MessageSquare, Receipt, ShieldCheck, Wallet } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@xiaoone/react-ui'
import { BillingAPI } from '../lib/billingApi'
import { describeAxiosError } from '../lib/apiErrors'
import { api } from '../lib/httpClient'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { RealNameVerifyDialog } from '../components/RealNameVerifyDialog'
import { useRealNameVerified } from '../lib/useRealNameVerified'
import { useAssistantRuntimeStatusQuery } from '../components/AssistantRuntimeStatus'
import { WorkspacePreparingModal } from '../components/WorkspacePreparingModal'
import { usePreferences } from '../app/preferences'
import type { KycStatus } from '../lib/kycTypes'
import { ensureWorkspaceProvision, type WorkspaceStatusResponse } from '../lib/workspaceStatusApi'
import {
  isStandaloneWorkspaceOpen,
  shouldEnsureStandaloneWorkspaceProvision,
} from '../lib/standaloneWorkspaceGate'
import { StandaloneSiteAccountConfig, type StandaloneAdminStatus } from './StandaloneSiteAccountConfig'
import './standalone-site-portal-page.css'

type PortalTab = 'settings' | 'messages' | 'payments' | 'withdrawals'
type MessageKind = 'sms' | 'email'

interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

interface StandaloneBalance {
  total_collected_cny: string
  total_fee_cny: string
  total_withdrawable_cny: string
  withdrawn_amount_cny: string
  available_amount_cny: string
  max_withdrawal_cny: string
}

const TAB_ITEMS: Array<{ id: PortalTab; labelKey: string; fallback: string; icon: typeof Globe }> = [
  { id: 'settings', labelKey: 'standalone.tabs.settings', fallback: '设置', icon: KeyRound },
  { id: 'messages', labelKey: 'standalone.tabs.messages', fallback: '消息', icon: MessageSquare },
  { id: 'payments', labelKey: 'standalone.tabs.payments', fallback: '收款', icon: Receipt },
  { id: 'withdrawals', labelKey: 'standalone.tabs.withdrawals', fallback: '提现', icon: Wallet },
]

const PAYEE_METHODS = [
  { id: 'bank', labelKey: 'standalone.payee.bank', fallback: '银行卡' },
  { id: 'alipay', labelKey: 'standalone.payee.alipay', fallback: '支付宝' },
  { id: 'wechat', labelKey: 'standalone.payee.wechat', fallback: '微信' },
] as const

function storefrontUrlFromAdminUrl(adminUrl: string): string {
  return adminUrl.replace(/\/admin\/?$/, '') || adminUrl
}

function formatMoney(value: string | number | undefined) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatTime(value: string | null | undefined, locale: 'zh' | 'en') {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

function payeeMethodLabel(method: string | undefined, t: (key: string, fallback?: string) => string) {
  const item = PAYEE_METHODS.find(m => m.id === method)
  return item ? t(item.labelKey, item.fallback) : method || '-'
}

function withdrawalStatusMeta(status?: string): { labelKey?: string; fallback: string; cls: string } {
  switch (status) {
    case 'applied':
      return { labelKey: 'standalone.withdraw.status.applied', fallback: '待审核', cls: 'sa-badge--pending' }
    case 'approved':
      return { labelKey: 'standalone.withdraw.status.approved', fallback: '已批准', cls: 'sa-badge--approved' }
    case 'settled':
      return { labelKey: 'standalone.withdraw.status.settled', fallback: '已打款', cls: 'sa-badge--settled' }
    case 'rejected':
      return { labelKey: 'standalone.withdraw.status.rejected', fallback: '已驳回', cls: 'sa-badge--rejected' }
    default:
      return { fallback: status || '-', cls: 'sa-badge--pending' }
  }
}

function maskCardNo(value?: string) {
  const raw = String(value || '').replace(/\s/g, '')
  if (raw.length <= 8) return raw || '-'
  return `${raw.slice(0, 4)} **** **** ${raw.slice(-4)}`
}

export function StandaloneSitePortalPage() {
  const { locale, t } = usePreferences()
  const { verified: realNameVerified, loading: realNameLoading, refresh: refreshRealName } = useRealNameVerified()
  const assistantRuntimeStatusQuery = useAssistantRuntimeStatusQuery()
  const [activeTab, setActiveTab] = useState<PortalTab>('settings')
  const [messageKind, setMessageKind] = useState<MessageKind>('sms')
  const [status, setStatus] = useState<StandaloneAdminStatus | null>(null)
  const [balance, setBalance] = useState<StandaloneBalance | null>(null)
  const [smsRecords, setSmsRecords] = useState<Paginated<any> | null>(null)
  const [emailRecords, setEmailRecords] = useState<Paginated<any> | null>(null)
  const [paymentRecords, setPaymentRecords] = useState<Paginated<any> | null>(null)
  const [withdrawals, setWithdrawals] = useState<Paginated<any> | null>(null)
  const [loadingTab, setLoadingTab] = useState(false)
  const [kycRealName, setKycRealName] = useState('')

  const [realNameOpen, setRealNameOpen] = useState(false)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'alipay' | 'wechat'>('bank')
  const [payeeName, setPayeeName] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankCardNo, setBankCardNo] = useState('')
  const [payeeAccount, setPayeeAccount] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false)
  const [preparingOpen, setPreparingOpen] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const configSectionRef = useRef<HTMLElement>(null)

  const storefrontUrl = status?.admin_url ? storefrontUrlFromAdminUrl(status.admin_url) : ''
  const adminUrl = status?.admin_url || ''
  const configured = Boolean(status?.configured)
  const standaloneSiteUrl = storefrontUrl
    || (status?.subdomain ? `https://${status.subdomain}.xiaoone.net` : '')
  const canOpenStorefront = configured && Boolean(storefrontUrl)
  const canOpenAdmin = configured && Boolean(adminUrl)
  const nameLocked = Boolean(kycRealName.trim())
  const workspaceStatus = assistantRuntimeStatusQuery.data ?? null

  useLocalizedTopbarSlot(() => ({
    className: 'mr-topbar--repo-tabs',
    leading: (
      <nav className="repo-tabs repo-tabs--topbar" role="tablist" aria-label={t('standalone.tabs.aria', '独立站标签')}>
        {TAB_ITEMS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'is-active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon aria-hidden /> {t(tab.labelKey, tab.fallback)}
            </button>
          )
        })}
      </nav>
    ),
  }), [activeTab, t])

  const loadKycRealName = useCallback(async () => {
    try {
      const r = await api.get('/api/v1/iam/merchant/kyc/status/')
      const kyc = (r.data?.data || r.data) as KycStatus
      const name = String(kyc?.real_name || '').trim()
      setKycRealName(name)
      if (name) setPayeeName(name)
    } catch {
      setKycRealName('')
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'withdrawals' && realNameVerified) {
      void loadKycRealName()
    }
  }, [activeTab, realNameVerified, loadKycRealName])

  const loadBalance = useCallback(async () => {
    const data = await BillingAPI.standaloneBalance()
    setBalance(data as StandaloneBalance)
    return data as StandaloneBalance
  }, [])

  const loadTab = useCallback(async (tab: PortalTab, kind: MessageKind = messageKind) => {
    setLoadingTab(true)
    try {
      if (tab === 'payments' || tab === 'withdrawals') {
        await loadBalance()
      }
      if (tab === 'messages') {
        if (kind === 'sms') {
          setSmsRecords(await BillingAPI.standaloneSmsRecords({ page: 1, page_size: 20 }))
        } else {
          setEmailRecords(await BillingAPI.standaloneEmailRecords({ page: 1, page_size: 20 }))
        }
      } else if (tab === 'payments') {
        setPaymentRecords(await BillingAPI.standalonePaymentRecords({ page: 1, page_size: 20 }))
      } else if (tab === 'withdrawals') {
        setWithdrawals(await BillingAPI.standaloneWithdrawals({ page: 1, page_size: 20 }))
      }
    } catch (err) {
      toast.error(describeAxiosError(err))
    } finally {
      setLoadingTab(false)
    }
  }, [loadBalance, messageKind])

  useEffect(() => {
    if (activeTab === 'settings') return
    if (activeTab === 'withdrawals' && !realNameVerified && !realNameLoading) return
    void loadTab(activeTab)
  }, [activeTab, loadTab, realNameVerified, realNameLoading])

  useEffect(() => {
    if (activeTab !== 'messages') return
    void loadTab('messages', messageKind)
  }, [messageKind, activeTab, loadTab])

  function focusAdminConfig(message: string) {
    setActiveTab('settings')
    toast.error(message)
    window.requestAnimationFrame(() => {
      configSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      configSectionRef.current?.querySelector<HTMLInputElement>('input:not([disabled]):not([readonly])')?.focus()
    })
  }

  function openWorkspacePreparingModal() {
    setPreparingOpen(true)
  }

  async function refreshStandaloneWorkspaceStatus(): Promise<WorkspaceStatusResponse | null> {
    const result = await assistantRuntimeStatusQuery.refetch()
    return result.data ?? assistantRuntimeStatusQuery.data ?? null
  }

  async function ensureStandaloneWorkspaceReady(): Promise<boolean> {
    try {
      const nextStatus = await refreshStandaloneWorkspaceStatus()
      if (shouldEnsureStandaloneWorkspaceProvision(nextStatus)) {
        openWorkspacePreparingModal()
        void ensureWorkspaceProvision()
          .then(() => assistantRuntimeStatusQuery.refetch())
          .catch(() => {})
        return false
      }
      if (!isStandaloneWorkspaceOpen(nextStatus)) {
        openWorkspacePreparingModal()
        return false
      }
      return true
    } catch (err) {
      toast.warning(describeAxiosError(err, t('common.agent.statusReadFailed', '无法读取用户空间状态')))
      openWorkspacePreparingModal()
      return false
    }
  }

  async function openStorefront() {
    if (!canOpenStorefront) {
      focusAdminConfig(t('standalone.open.storefrontMissing', '请先完成管理账户配置，再打开独立站官网。'))
      return
    }
    if (!await ensureStandaloneWorkspaceReady()) return
    window.open(storefrontUrl, '_blank', 'noopener,noreferrer')
  }

  async function openAdmin() {
    if (!canOpenAdmin) {
      focusAdminConfig(t('standalone.open.adminMissing', '请先完成管理账户配置，再打开后台管理。'))
      return
    }
    if (!await ensureStandaloneWorkspaceReady()) return
    window.open(adminUrl, '_blank', 'noopener,noreferrer')
  }

  function resetWithdrawForm() {
    setWithdrawAmount('')
    setWithdrawMethod('bank')
    setPayeeName(kycRealName || '')
    setBankName('')
    setBankCardNo('')
    setPayeeAccount('')
    setProofUrl('')
  }

  function openWithdrawDialog() {
    resetWithdrawForm()
    setWithdrawDialogOpen(true)
  }

  async function handleUploadProof(file: File) {
    setUploadingProof(true)
    try {
      const result = await BillingAPI.standaloneUploadProof(file)
      setProofUrl(String(result?.url || ''))
      toast.success(t('standalone.toast.proofUploaded', '收款码已上传'))
    } catch (err) {
      toast.error(describeAxiosError(err))
    } finally {
      setUploadingProof(false)
    }
  }

  async function handleApplyWithdraw() {
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('standalone.withdraw.invalidAmount', '请输入有效提现金额'))
      return
    }
    if (amount > 10000) {
      toast.error(t('standalone.withdraw.maxAmount', '单次提现不能超过 1 万元'))
      return
    }
    const name = payeeName.trim()
    if (!name) {
      toast.error(t('standalone.withdraw.missingPayeeName', '请填写收款人姓名'))
      return
    }
    if (nameLocked && name !== kycRealName) {
      toast.error(t('standalone.withdraw.nameMismatch', '收款姓名须与实名信息一致'))
      return
    }
    if (withdrawMethod === 'bank') {
      if (!bankCardNo.trim()) {
        toast.error(t('standalone.withdraw.missingBankCard', '请填写银行卡号'))
        return
      }
      if (!bankName.trim()) {
        toast.error(t('standalone.withdraw.missingBankName', '请填写所属银行'))
        return
      }
    } else {
      if (!payeeAccount.trim()) {
        toast.error(t(withdrawMethod === 'alipay' ? 'standalone.withdraw.missingAlipayAccount' : 'standalone.withdraw.missingWechatAccount'))
        return
      }
      if (!proofUrl) {
        toast.error(t('standalone.withdraw.missingProof', '请上传收款二维码'))
        return
      }
    }
    setSubmittingWithdraw(true)
    try {
      await BillingAPI.standaloneApplyWithdrawal({
        amount_cny: amount.toFixed(2),
        payee_method: withdrawMethod,
        payee_name: name,
        bank_name: withdrawMethod === 'bank' ? bankName.trim() : undefined,
        bank_card_no: withdrawMethod === 'bank' ? bankCardNo.trim() : undefined,
        payee_account: withdrawMethod !== 'bank' ? payeeAccount.trim() : undefined,
        payee_image_url: withdrawMethod !== 'bank' ? proofUrl : undefined,
      })
      toast.success(t('standalone.withdraw.submitted', '提现申请已提交，等待审核'))
      setWithdrawDialogOpen(false)
      resetWithdrawForm()
      await loadTab('withdrawals')
    } catch (err) {
      toast.error(describeAxiosError(err))
    } finally {
      setSubmittingWithdraw(false)
    }
  }

  async function handleRealNameVerified() {
    await refreshRealName()
    await loadKycRealName()
    if (activeTab === 'withdrawals') {
      await loadTab('withdrawals')
    }
  }

  return (
    <div className="sa-portal">
      {activeTab === 'settings' ? (
        <div className="sa-block sa-block--narrow">
          <div className="sa-rows">
            <div className="sa-row">
              <span className="sa-row__icon"><Globe size={18} strokeWidth={1.9} /></span>
              <div className="sa-row__main">
                <span className="sa-row__title">{t('standalone.site.title')}</span>
                <span className="sa-row__url">
                  {t('standalone.site.urlPrefix')} {standaloneSiteUrl || t('standalone.site.urlPending')}
                </span>
              </div>
              <button type="button" className="sa-btn sa-btn--primary" aria-disabled={!canOpenStorefront} onClick={() => void openStorefront()}>
                {canOpenStorefront ? t('standalone.action.open') : t('standalone.action.configureFirst')} <ExternalLink aria-hidden />
              </button>
            </div>
            <div className="sa-row">
              <span className="sa-row__icon"><KeyRound size={18} strokeWidth={1.9} /></span>
              <div className="sa-row__main">
                <span className="sa-row__title">{t('standalone.admin.title')}</span>
                <span className="sa-row__desc">{t('standalone.admin.desc')}</span>
              </div>
              <button type="button" className="sa-btn" aria-disabled={!canOpenAdmin} onClick={() => void openAdmin()}>
                {canOpenAdmin ? t('standalone.action.open') : t('standalone.action.configureFirst')} <ExternalLink aria-hidden />
              </button>
            </div>
          </div>

          <section className="sa-section" ref={configSectionRef}>
            <div className="sa-section__head">
              <div className="sa-section__title"><KeyRound size={16} strokeWidth={1.9} /> {t('standalone.account.title')}</div>
              <div className="sa-section__desc">{t('standalone.account.desc')}</div>
            </div>
            <div className="sa-section__body">
              <StandaloneSiteAccountConfig onStatusChange={setStatus} />
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'messages' ? (
        <div className="sa-block">
          <div className="sa-toolbar">
            <div className="sa-seg" role="tablist" aria-label={t('standalone.messages.typeAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={messageKind === 'sms'}
                className={messageKind === 'sms' ? 'is-active' : ''}
                onClick={() => setMessageKind('sms')}
              >
                {t('standalone.messages.sms')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={messageKind === 'email'}
                className={messageKind === 'email' ? 'is-active' : ''}
                onClick={() => setMessageKind('email')}
              >
                {t('standalone.messages.email')}
              </button>
            </div>
          </div>
          {messageKind === 'sms' ? (
            <RecordsTable
              title={t('standalone.messages.smsRecords')}
              loading={loadingTab}
              total={smsRecords?.total}
              isEmpty={!smsRecords?.items?.length}
              emptyTitle={t('standalone.messages.smsEmptyTitle')}
              emptyBody={t('standalone.messages.smsEmptyBody')}
              columns={[t('standalone.table.time'), t('standalone.table.phone'), t('standalone.table.scene'), t('standalone.table.fee')]}
            >
              {(smsRecords?.items || []).map(row => (
                <tr key={row.id}>
                  <td className="sa-num">{formatTime(row.created_at, locale)}</td>
                  <td>{row.phone}</td>
                  <td className="sa-muted">{row.scene}</td>
                  <td className="sa-amount">¥{formatMoney(row.fee_cny)}</td>
                </tr>
              ))}
            </RecordsTable>
          ) : (
            <RecordsTable
              title={t('standalone.messages.emailRecords')}
              loading={loadingTab}
              total={emailRecords?.total}
              isEmpty={!emailRecords?.items?.length}
              emptyTitle={t('standalone.messages.emailEmptyTitle')}
              emptyBody={t('standalone.messages.emailEmptyBody')}
              columns={[t('standalone.table.time'), t('standalone.table.email'), t('standalone.table.scene'), t('standalone.table.fee')]}
            >
              {(emailRecords?.items || []).map(row => (
                <tr key={row.id}>
                  <td className="sa-num">{formatTime(row.created_at, locale)}</td>
                  <td>{row.email}</td>
                  <td className="sa-muted">{row.scene}</td>
                  <td className="sa-amount">¥{formatMoney(row.fee_cny)}</td>
                </tr>
              ))}
            </RecordsTable>
          )}
        </div>
      ) : null}

      {activeTab === 'payments' ? (
        <div className="sa-block">
          <div className="sa-summary">
            <SummaryItem label={t('standalone.payments.totalCollected')} value={balance?.total_collected_cny} />
            <SummaryItem label={t('standalone.payments.totalFee')} value={balance?.total_fee_cny} />
            <SummaryItem label={t('standalone.payments.available')} value={balance?.available_amount_cny} accent />
            <SummaryItem label={t('standalone.payments.withdrawn')} value={balance?.withdrawn_amount_cny} />
          </div>
          <RecordsTable
            title={t('standalone.payments.records')}
            loading={loadingTab}
            total={paymentRecords?.total}
            isEmpty={!paymentRecords?.items?.length}
            emptyTitle={t('standalone.payments.emptyTitle')}
            emptyBody={t('standalone.payments.emptyBody')}
            columns={[t('standalone.table.time'), t('standalone.table.orderNo'), t('standalone.table.amount'), t('standalone.table.fee'), t('standalone.table.withdrawable')]}
          >
            {(paymentRecords?.items || []).map(row => (
              <tr key={row.id}>
                <td className="sa-num">{formatTime(row.created_at, locale)}</td>
                <td className="sa-muted">{row.external_payment_id || row.id}</td>
                <td className="sa-amount">¥{formatMoney(row.amount_cny)}</td>
                <td className="sa-num sa-muted">-¥{formatMoney(row.fee_cny)}</td>
                <td className="sa-amount sa-amount--accent">¥{formatMoney(row.withdrawable_cny)}</td>
              </tr>
            ))}
          </RecordsTable>
        </div>
      ) : null}

      {activeTab === 'withdrawals' ? (
        <div className="sa-block">
          {realNameLoading ? (
            <div className="sa-state"><span className="sa-state__body">{t('standalone.state.loading')}</span></div>
          ) : !realNameVerified ? (
            <div className="sa-gate">
              <span className="sa-gate__icon"><ShieldCheck size={28} strokeWidth={1.8} /></span>
              <span className="sa-gate__title">{t('standalone.withdraw.kycTitle')}</span>
              <span className="sa-gate__body">{t('standalone.withdraw.kycBody')}</span>
              <button type="button" className="sa-btn sa-btn--primary" onClick={() => setRealNameOpen(true)}>
                {t('standalone.withdraw.verifyNow')}
              </button>
            </div>
          ) : (
            <>
              <div className="sa-withdraw-head">
                <div className="sa-summary sa-summary--compact">
                  <SummaryItem label={t('standalone.payments.available')} value={balance?.available_amount_cny} accent />
                  <SummaryItem label={t('standalone.payments.withdrawn')} value={balance?.withdrawn_amount_cny} />
                </div>
                <button type="button" className="sa-btn sa-btn--primary" onClick={openWithdrawDialog}>
                  {t('standalone.withdraw.apply')}
                </button>
              </div>
              <RecordsTable
                title={t('standalone.withdraw.records')}
                loading={loadingTab}
                total={withdrawals?.total}
                isEmpty={!withdrawals?.items?.length}
                emptyTitle={t('standalone.withdraw.emptyTitle')}
                emptyBody={t('standalone.withdraw.emptyBody')}
                columns={[t('standalone.table.time'), t('standalone.table.amount'), t('standalone.table.method'), t('standalone.table.payeeInfo'), t('standalone.table.status'), t('standalone.table.note')]}
              >
                {(withdrawals?.items || []).map(row => {
                  const meta = withdrawalStatusMeta(row.status)
                  const payeeInfo = row.payee_method === 'bank'
                    ? `${row.payee_name || '-'} · ${row.bank_name || '-'} · ${maskCardNo(row.bank_card_no)}`
                    : `${row.payee_name || '-'} · ${row.payee_account || '-'}`
                  return (
                    <tr key={row.id}>
                      <td className="sa-num">{formatTime(row.created_at, locale)}</td>
                      <td className="sa-amount">¥{formatMoney(row.amount_cny)}</td>
                      <td>{payeeMethodLabel(row.payee_method, t)}</td>
                      <td className="sa-muted">{payeeInfo}</td>
                      <td><span className={`sa-badge ${meta.cls}`}>{meta.labelKey ? t(meta.labelKey, meta.fallback) : meta.fallback}</span></td>
                      <td className="sa-muted">{row.review_note || row.partner_note || row.payee_note || '-'}</td>
                    </tr>
                  )
                })}
              </RecordsTable>
            </>
          )}
        </div>
      ) : null}

      <RealNameVerifyDialog
        open={realNameOpen}
        onOpenChange={setRealNameOpen}
        featureLabel={t('standalone.withdraw.featureLabel')}
        onVerified={handleRealNameVerified}
      />

      <WorkspacePreparingModal
        open={preparingOpen}
        onClose={() => setPreparingOpen(false)}
        merchantSubdomain={workspaceStatus?.merchant_subdomain || status?.subdomain || ''}
        subdomainRoot={workspaceStatus?.subdomain_root || 'xiaoone.net'}
        locale={locale === 'en' ? 'en' : 'zh'}
      />

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sa-dialog">
          <DialogHeader>
            <DialogTitle>{t('standalone.withdraw.apply')}</DialogTitle>
          </DialogHeader>
          <div className="sa-form sa-form--dialog">
            <div className="sa-field">
              <label className="sa-label" htmlFor="sa-withdraw-amount">
                {t('standalone.withdraw.amount')} <span className="sa-hint">{t('standalone.withdraw.amountHint')}</span>
              </label>
              <input
                id="sa-withdraw-amount"
                className="sa-input"
                inputMode="decimal"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder={t('standalone.withdraw.amountPlaceholder')}
              />
            </div>

            <div className="sa-field">
              <span className="sa-label">{t('standalone.withdraw.payeeMethod')}</span>
              <div className="sa-seg" role="radiogroup" aria-label={t('standalone.withdraw.payeeMethod')}>
                {PAYEE_METHODS.map(method => (
                  <button
                    key={method.id}
                    type="button"
                    role="radio"
                    aria-checked={withdrawMethod === method.id}
                    className={withdrawMethod === method.id ? 'is-active' : ''}
                    onClick={() => setWithdrawMethod(method.id)}
                  >
                    {t(method.labelKey, method.fallback)}
                  </button>
                ))}
              </div>
            </div>

            <div className="sa-field">
              <label className="sa-label" htmlFor="sa-payee-name">
                {t(withdrawMethod === 'bank' ? 'standalone.withdraw.bankOwnerName' : 'standalone.withdraw.realName')}
                {nameLocked ? <span className="sa-hint">{t('standalone.withdraw.nameLocked')}</span> : null}
              </label>
              <input
                id="sa-payee-name"
                className={`sa-input${nameLocked ? ' sa-input--locked' : ''}`}
                value={payeeName}
                readOnly={nameLocked}
                onChange={e => setPayeeName(e.target.value)}
                placeholder={t('standalone.withdraw.namePlaceholder')}
              />
            </div>

            {withdrawMethod === 'bank' ? (
              <>
                <div className="sa-field">
                  <label className="sa-label" htmlFor="sa-bank-card">{t('standalone.withdraw.bankCard')}</label>
                  <input
                    id="sa-bank-card"
                    className="sa-input"
                    inputMode="numeric"
                    value={bankCardNo}
                    onChange={e => setBankCardNo(e.target.value)}
                    placeholder={t('standalone.withdraw.bankCardPlaceholder')}
                  />
                </div>
                <div className="sa-field">
                  <label className="sa-label" htmlFor="sa-bank-name">{t('standalone.withdraw.bankName')}</label>
                  <input
                    id="sa-bank-name"
                    className="sa-input"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder={t('standalone.withdraw.bankNamePlaceholder')}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sa-field">
                  <label className="sa-label" htmlFor="sa-payee-account">
                    {t(withdrawMethod === 'alipay' ? 'standalone.withdraw.alipayAccount' : 'standalone.withdraw.wechatAccount')}
                  </label>
                  <input
                    id="sa-payee-account"
                    className="sa-input"
                    value={payeeAccount}
                    onChange={e => setPayeeAccount(e.target.value)}
                    placeholder={t(withdrawMethod === 'alipay' ? 'standalone.withdraw.alipayPlaceholder' : 'standalone.withdraw.wechatPlaceholder')}
                  />
                </div>
                <div className="sa-field">
                  <span className="sa-label">{t('standalone.withdraw.proof')}</span>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*"
                    className="sa-hidden-input"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) void handleUploadProof(f) }}
                  />
                  <div className="sa-upload">
                    <button type="button" className="sa-btn" disabled={uploadingProof} onClick={() => proofInputRef.current?.click()}>
                      {uploadingProof ? t('standalone.withdraw.uploading') : proofUrl ? t('standalone.withdraw.reupload') : t('standalone.withdraw.uploadProof')}
                    </button>
                    {proofUrl ? (
                      <span className="sa-proof">
                        <img src={proofUrl} alt={t('standalone.withdraw.proof')} />
                        <a className="sa-link" href={proofUrl} target="_blank" rel="noreferrer">{t('standalone.withdraw.viewProof')}</a>
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)} disabled={submittingWithdraw}>
              {t('standalone.action.cancel')}
            </Button>
            <Button onClick={() => void handleApplyWithdraw()} disabled={submittingWithdraw}>
              {submittingWithdraw ? t('standalone.action.submitting') : t('standalone.action.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryItem({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  return (
    <div className="sa-summary__item">
      <span className="sa-summary__label">{label}</span>
      <span className={`sa-summary__value${accent ? ' sa-summary__value--accent' : ''}`}>
        <span className="sa-summary__unit">¥</span>{formatMoney(value)}
      </span>
    </div>
  )
}

function RecordsTable({
  title,
  loading,
  total,
  isEmpty,
  emptyTitle,
  emptyBody,
  columns,
  children,
}: {
  title: string
  loading: boolean
  total?: number
  isEmpty?: boolean
  emptyTitle: string
  emptyBody: string
  columns: string[]
  children: React.ReactNode
}) {
  const { t, tpl } = usePreferences()
  return (
    <section className="sa-records">
      <div className="sa-records__head">
        <span className="sa-records__title">{title}</span>
        {!loading && !isEmpty && typeof total === 'number' ? (
          <span className="sa-records__count">{tpl('standalone.records.count', String(total))}</span>
        ) : null}
      </div>
      {loading ? (
        <div className="sa-state"><span className="sa-state__body">{t('standalone.state.loading')}</span></div>
      ) : isEmpty ? (
        <div className="sa-state">
          <span className="sa-state__title">{emptyTitle}</span>
          <span className="sa-state__body">{emptyBody}</span>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
