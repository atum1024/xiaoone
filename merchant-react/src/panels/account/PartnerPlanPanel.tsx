import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '@xiaoone/react-ui'
import {
  CheckCircle2,
  Copy,
  Gift,
  Link2,
  RefreshCw,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react'
import {
  getLocalPartnerRoleOverride,
  LOCAL_PARTNER_ROLE_EVENT,
  LOCAL_PARTNER_ROLE_STORAGE_KEY,
  type LocalPartnerRoleChangeDetail,
} from '@xiaoone/region'
import { Input } from '../../marketing/components/ui/input'
import { usePreferences } from '../../app/preferences'
import { describeAxiosError } from '../../lib/apiErrors'
import { BillingAPI } from '../../lib/billingApi'
import './account.css'

interface PartnerPlanPanelProps {
  embedded?: boolean
}

interface RewardSummary {
  total_reward_points?: number
  referral_count?: number
}

interface RebateSummary {
  pending_amount_cny: string
  settled_amount_cny: string
  available_amount_cny: string
  withdrawn_amount_cny: string
  binding_count: number
  effective_user_count?: number
  referral_count?: number
}

interface DiscountPolicy {
  effective_user_count: number
  referral_count: number
  tier_index: number
  tier_min_users: number
  tier_max_users: number | null
  membership_base_rate: string
  recharge_base_rate: string | null
  recharge_enabled: boolean
  uses_custom_tiers?: boolean
}

interface OverviewData {
  merchant_id?: number
  referral_code?: string
  referral_code_customized?: boolean
  share_link?: string
  is_super_partner?: boolean
  bound_referrer_merchant_id: number | null
  status?: string
  referral_reward_summary?: RewardSummary
  rebate_summary?: RebateSummary
  discount_policy?: DiscountPolicy
}

type PartnerSubTab = 'mine' | 'coupons' | 'rewards' | 'earnings' | 'wallet'
type StateKind = 'loading' | 'empty' | 'error' | 'success' | 'info'
type PillTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted' | 'info'

interface TabDef {
  key: PartnerSubTab
  label: string
}

interface BindingRow {
  user_id: number
  merchant_id: number
  source: string
  bound_at: string | null
  membership_spend_cny: string
  recharge_spend_cny: string
  current_plan_code: string
  current_plan_name: string
}

interface RewardRow {
  id: number
  source_checkout_id: string
  source_merchant_id: number
  paid_amount_cny: string
  reward_points: number
  created_at: string | null
}

interface CouponRow {
  id: number
  code: string
  discount_kind: string
  voucher_type: string
  deduct_cny: string
  threshold_cny: string
  discount_rate: string
  base_discount_rate: string
  partner_markup_cny: string
  assigned_user_id: number | null
  redeemed_at: string | null
  created_at: string | null
}

interface RebateRow {
  id: number
  source_checkout_id: string
  source_merchant_id: number
  business_type: string
  base_amount_cny: string
  rebate_amount_cny: string
  status: string
  created_at: string | null
}

interface WithdrawalRow {
  id: number
  amount_cny: string
  status: string
  partner_note?: string
  review_note?: string
  created_at: string | null
}

interface MetricItem {
  label: string
  value: string | number
  hint?: string
  tone?: PillTone
  icon?: ReactNode
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function unwrapPayloadRecord(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {}
  return isRecord(payload.data) ? payload.data : payload
}

function unwrapData<T>(payload: unknown): T {
  return unwrapPayloadRecord(payload) as T
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data as T[]
  const body = unwrapPayloadRecord(payload)
  return Array.isArray(body.items) ? body.items as T[] : []
}

function pointsToYuan(points: number): string {
  if (!Number.isFinite(points)) return '0.00'
  return (points / 1000).toFixed(2)
}

function moneyValue(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return String(value || '0.00')
  return numeric.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function cny(value: string | number | null | undefined): string {
  return `¥${moneyValue(value)}`
}

function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '-'
}

function shortId(value: string | null | undefined, length = 14): string {
  if (!value) return '-'
  return value.length > length ? `${value.slice(0, length)}...` : value
}

function normalizeAmountInput(value: string): string {
  return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
}

const PARTNER_ERROR_CODE_KEYS: Record<string, string> = {
  referral_code_invalid_length: 'account.partner.errorInvalidCodeLength',
  referral_code_invalid_characters: 'account.partner.errorInvalidCodeCharacters',
  referral_code_already_customized: 'account.partner.errorAlreadyCustomized',
  referral_code_taken: 'account.partner.errorCodeTaken',
  referral_code_not_found: 'account.partner.errorCodeNotFound',
  referral_code_self_bind: 'account.partner.errorSelfBind',
  method_not_allowed: 'account.partner.errorMethodNotAllowed',
}

function partnerPlanErrorMessage(err: unknown, t: (key: string) => string): string {
  const axiosErr = err as {
    response?: {
      status?: number
      data?: {
        message?: string
        error?: string
        code?: string
      }
    }
  }
  const backendMessage = axiosErr.response?.data?.message
  const backendError = axiosErr.response?.data?.error
  const backendCode = axiosErr.response?.data?.code
  const code = String(backendCode || backendMessage || backendError || '').trim()
  const mappedKey = PARTNER_ERROR_CODE_KEYS[code]
  if (mappedKey) return t(mappedKey)
  if (axiosErr.response?.status === 405) return t(PARTNER_ERROR_CODE_KEYS.method_not_allowed)
  return backendMessage || backendError || describeAxiosError(err)
}

function StatusPill({ tone = 'muted', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`partner-plan-pill is-${tone}`}>{children}</span>
}

function MetricGrid({ items, compact = false }: { items: MetricItem[]; compact?: boolean }) {
  return (
    <div className={`partner-plan-metrics ${compact ? 'is-compact' : ''}`}>
      {items.map(item => (
        <div key={item.label} className={`partner-plan-metric ${item.tone ? `is-${item.tone}` : ''}`}>
          {item.icon ? <span className="partner-plan-metric-icon">{item.icon}</span> : null}
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <small>{item.hint}</small> : null}
        </div>
      ))}
    </div>
  )
}

function PartnerPlanState({
  kind,
  title,
  description,
  action,
}: {
  kind: StateKind
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div
      className={`partner-plan-state is-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
      {action ? <div className="partner-plan-state-action">{action}</div> : null}
    </div>
  )
}

function TableWrap({ children }: { children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <>
      <div className="partner-plan-scroll-hint">{t('account.partner.scrollHint')}</div>
      <div className="partner-plan-table-wrap">{children}</div>
    </>
  )
}

export function PartnerPlanPanel({ embedded }: PartnerPlanPanelProps) {
  const { t } = usePreferences()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bindCode, setBindCode] = useState('')
  const [bindSubmitting, setBindSubmitting] = useState(false)
  const [bindError, setBindError] = useState('')
  const [bindNotice, setBindNotice] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [customCodeSubmitting, setCustomCodeSubmitting] = useState(false)
  const [customCodeError, setCustomCodeError] = useState('')
  const [customCodeNotice, setCustomCodeNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [localPartnerRole, setLocalPartnerRole] = useState(() => getLocalPartnerRoleOverride())
  const [activeTab, setActiveTab] = useState<PartnerSubTab>('mine')

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    try {
      const data = await BillingAPI.partnerPlanOverview()
      setOverview(unwrapData<OverviewData>(data))
      setError('')
    } catch (err) {
      setError(describeAxiosError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    function onPartnerRoleChange(event: Event) {
      const detail = (event as CustomEvent<LocalPartnerRoleChangeDetail>).detail
      setLocalPartnerRole(detail?.role ?? getLocalPartnerRoleOverride())
    }
    function onStorage(event: StorageEvent) {
      if (event.key === LOCAL_PARTNER_ROLE_STORAGE_KEY)
        setLocalPartnerRole(getLocalPartnerRoleOverride())
    }
    window.addEventListener(LOCAL_PARTNER_ROLE_EVENT, onPartnerRoleChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_PARTNER_ROLE_EVENT, onPartnerRoleChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const isSuperPartner = localPartnerRole === 'super' || (localPartnerRole === null && Boolean(overview?.is_super_partner))

  const tabs = useMemo<TabDef[]>(() => {
    if (isSuperPartner) {
      return [
        { key: 'mine', label: t('account.partner.tabMine') },
        { key: 'coupons', label: t('account.partner.tabCoupons') },
        { key: 'earnings', label: t('account.partner.tabEarnings') },
        { key: 'wallet', label: t('account.partner.tabWallet') },
      ]
    }
    return [
      { key: 'mine', label: t('account.partner.tabMine') },
      { key: 'rewards', label: t('account.partner.tabRewards') },
    ]
  }, [isSuperPartner, t])

  useEffect(() => {
    if (!tabs.some(tab => tab.key === activeTab))
      setActiveTab('mine')
  }, [tabs, activeTab])

  const handleBind = async () => {
    const referralCode = bindCode.trim()
    if (!referralCode) return
    setBindSubmitting(true)
    setBindError('')
    setBindNotice('')
    try {
      await BillingAPI.partnerPlanBind(referralCode)
      setBindCode('')
      setBindNotice(t('account.partner.bindNotice'))
      await fetchOverview()
    } catch (err: unknown) {
      setBindError(partnerPlanErrorMessage(err, t))
    } finally {
      setBindSubmitting(false)
    }
  }

  const handleCustomCode = async () => {
    const referralCode = customCode.trim()
    if (!referralCode) return
    setCustomCodeSubmitting(true)
    setCustomCodeError('')
    setCustomCodeNotice('')
    try {
      await BillingAPI.partnerPlanSetReferralCode(referralCode)
      setCustomCode('')
      setCustomCodeNotice(t('account.partner.customCodeNotice'))
      await fetchOverview()
    } catch (err: unknown) {
      setCustomCodeError(partnerPlanErrorMessage(err, t))
    } finally {
      setCustomCodeSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    if (!overview?.share_link) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(overview.share_link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopyError(t('account.partner.copyFailed'))
    }
  }

  if (loading) {
    return (
      <div className={embedded ? 'partner-plan-panel' : 'p-4 partner-plan-panel'}>
        <PartnerPlanState kind="loading" title={t('account.partner.loading')} description={t('account.partner.loadingDesc')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={embedded ? 'partner-plan-panel' : 'p-4 partner-plan-panel'}>
        <PartnerPlanState
          kind="error"
          title={t('account.partner.loadFailed')}
          description={error}
          action={<Button variant="outline" size="sm" onClick={() => void fetchOverview()}>{t('account.common.retry')}</Button>}
        />
      </div>
    )
  }

  const referralRewardSummary = overview?.referral_reward_summary
  const referralCount = Number(referralRewardSummary?.referral_count ?? 0)

  return (
    <div className={embedded ? 'partner-plan-panel' : 'p-4 partner-plan-panel'}>
      <header className="acct-head acct-head--compact partner-plan-head">
        <div className="partner-plan-tabs-bar">
          <nav className="acct-tabs partner-plan-tabs" role="tablist" aria-label={t('account.partner.tabsAria')}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`acct-tab ${activeTab === tab.key ? 'is-active' : ''}`}
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <span className="partner-plan-tabs-status">
            <StatusPill tone={isSuperPartner ? 'accent' : 'info'}>
              {isSuperPartner ? t('account.partner.superPartner') : t('account.partner.normalPartner')}
            </StatusPill>
          </span>
        </div>
      </header>

      <div className="partner-plan-tab-body">
        {activeTab === 'mine' ? (
          <MineTab
            overview={overview}
            referralCount={referralCount}
            bindCode={bindCode}
            setBindCode={setBindCode}
            bindSubmitting={bindSubmitting}
            bindError={bindError}
            bindNotice={bindNotice}
            onBind={handleBind}
            customCode={customCode}
            setCustomCode={setCustomCode}
            customCodeSubmitting={customCodeSubmitting}
            customCodeError={customCodeError}
            customCodeNotice={customCodeNotice}
            onCustomCode={handleCustomCode}
            copied={copied}
            copyError={copyError}
            onCopyLink={handleCopyLink}
          />
        ) : null}
        {activeTab === 'rewards' ? <RewardsTab referralRewardSummary={referralRewardSummary} /> : null}
        {activeTab === 'coupons' ? <CouponsTab /> : null}
        {activeTab === 'earnings' ? <EarningsTab rebateSummary={overview?.rebate_summary} /> : null}
        {activeTab === 'wallet' ? (
          <WalletTab rebateSummary={overview?.rebate_summary} onOverviewRefresh={fetchOverview} />
        ) : null}
      </div>
    </div>
  )
}

interface MineTabProps {
  overview: OverviewData | null
  referralCount: number
  bindCode: string
  setBindCode: (v: string) => void
  bindSubmitting: boolean
  bindError: string
  bindNotice: string
  onBind: () => void
  customCode: string
  setCustomCode: (v: string) => void
  customCodeSubmitting: boolean
  customCodeError: string
  customCodeNotice: string
  onCustomCode: () => void
  copied: boolean
  copyError: string
  onCopyLink: () => void
}

function MineTab({
  overview,
  referralCount,
  bindCode,
  setBindCode,
  bindSubmitting,
  bindError,
  bindNotice,
  onBind,
  customCode,
  setCustomCode,
  customCodeSubmitting,
  customCodeError,
  customCodeNotice,
  onCustomCode,
  copied,
  copyError,
  onCopyLink,
}: MineTabProps) {
  const { t, tpl } = usePreferences()
  const [bindings, setBindings] = useState<BindingRow[]>([])
  const [bindingsLoading, setBindingsLoading] = useState(true)
  const [bindingsError, setBindingsError] = useState('')

  const bindingSourceLabel = useMemo(() => ({
    referral_register: t('account.partner.sourceReferralRegister'),
    manual_code: t('account.partner.sourceManualCode'),
    coupon_implicit: t('account.partner.sourceCouponImplicit'),
  }), [t])

  const loadBindings = useCallback(() => {
    setBindingsLoading(true)
    return BillingAPI.partnerBindings()
      .then((data) => {
        setBindings(unwrapList<BindingRow>(data))
        setBindingsError('')
      })
      .catch((err) => {
        setBindingsError(describeAxiosError(err))
      })
      .finally(() => setBindingsLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    setBindingsLoading(true)
    BillingAPI.partnerBindings()
      .then((data) => {
        if (cancelled) return
        setBindings(unwrapList<BindingRow>(data))
        setBindingsError('')
      })
      .catch((err) => {
        if (cancelled) return
        setBindingsError(describeAxiosError(err))
      })
      .finally(() => {
        if (!cancelled) setBindingsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const referralCode = overview?.referral_code || '-'
  const shareLink = overview?.share_link || ''
  const isCustomized = Boolean(overview?.referral_code_customized)
  const isBound = Boolean(overview?.bound_referrer_merchant_id)

  return (
    <>
      <div className="partner-plan-workspace">
        <section className="service-card partner-plan-primary-card">
          <div className="service-head">
            <div>
              <strong>{t('account.partner.referralEntry')}</strong>
              <small>{t('account.partner.referralEntryDesc')}</small>
            </div>
            <StatusPill tone={isCustomized ? 'success' : 'muted'}>
              {isCustomized ? t('account.partner.customCodeSet') : t('account.partner.customCodeOnce')}
            </StatusPill>
          </div>

          <div className="partner-plan-share-grid">
            <div className="partner-plan-code-box">
              <span>{t('account.partner.myReferralCode')}</span>
              <code>{referralCode}</code>
            </div>
            <div className="partner-plan-link-box">
              <label htmlFor="partner-share-link">
                <Link2 size={14} />
                {t('account.partner.shareLink')}
              </label>
              <div className="partner-plan-inline-form">
                <Input id="partner-share-link" value={shareLink} readOnly />
                <Button size="sm" variant="outline" onClick={onCopyLink} disabled={!shareLink}>
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? t('account.partner.copied') : t('account.partner.copy')}
                </Button>
              </div>
              {copyError ? <p className="partner-plan-feedback is-error">{copyError}</p> : null}
            </div>
          </div>

          {!isCustomized ? (
            <div className="partner-plan-action-row">
              <div>
                <strong>{t('account.partner.setCustomCode')}</strong>
                <span>{t('account.partner.setCustomCodeHint')}</span>
              </div>
              <div className="partner-plan-inline-form">
                <Input
                  value={customCode}
                  placeholder={t('account.partner.customCodePlaceholder')}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomCode(e.target.value)}
                />
                <Button size="sm" disabled={customCodeSubmitting || !customCode.trim()} onClick={onCustomCode}>
                  {customCodeSubmitting ? t('account.partner.setting') : t('account.partner.set')}
                </Button>
              </div>
            </div>
          ) : null}
          {customCodeError ? <p className="partner-plan-feedback is-error">{customCodeError}</p> : null}
          {customCodeNotice ? <p className="partner-plan-feedback is-success">{customCodeNotice}</p> : null}
        </section>

        <aside className="partner-plan-side-stack">
          <section className="service-card partner-plan-compact-card">
            <div className="service-head">
              <div>
                <strong>{t('account.partner.referralStatus')}</strong>
                <small>{t('account.partner.referralStatusDesc')}</small>
              </div>
            </div>
            <MetricGrid
              compact
              items={[
                {
                  label: t('account.partner.referredCount'),
                  value: Number.isFinite(referralCount) ? referralCount : 0,
                  hint: t('account.partner.referredHint'),
                  tone: 'accent',
                  icon: <Users size={15} />,
                },
                {
                  label: t('account.partner.referrer'),
                  value: isBound ? `#${overview?.bound_referrer_merchant_id}` : t('account.partner.notBound'),
                  hint: isBound ? t('account.partner.boundLocked') : t('account.partner.bindOnceHint'),
                  tone: isBound ? 'success' : 'muted',
                },
              ]}
            />
          </section>

          <section className="service-card partner-plan-compact-card">
            <div className="service-head">
              <div>
                <strong>{t('account.partner.bindReferrer')}</strong>
                <small>{t('account.partner.bindReferrerDesc')}</small>
              </div>
            </div>
            {isBound ? (
              <PartnerPlanState
                kind="success"
                title={tpl('account.partner.boundReferrer', String(overview?.bound_referrer_merchant_id))}
                description={t('account.partner.boundOnceDesc')}
              />
            ) : (
              <>
                <div className="partner-plan-inline-form">
                  <Input
                    value={bindCode}
                    placeholder={t('account.partner.referralCodePlaceholder')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBindCode(e.target.value)}
                  />
                  <Button size="sm" disabled={bindSubmitting || !bindCode.trim()} onClick={onBind}>
                    {bindSubmitting ? t('account.partner.binding') : t('account.partner.bind')}
                  </Button>
                </div>
                {bindError ? <p className="partner-plan-feedback is-error">{bindError}</p> : null}
                {bindNotice ? <p className="partner-plan-feedback is-success">{bindNotice}</p> : null}
              </>
            )}
          </section>
        </aside>
      </div>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.downline')}</strong>
            <small>{t('account.partner.downlineDesc')}</small>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadBindings()} disabled={bindingsLoading}>
            <RefreshCw size={14} />
            {t('account.common.refresh')}
          </Button>
        </div>
        {bindingsLoading ? (
          <PartnerPlanState kind="loading" title={t('account.partner.loadingDownline')} />
        ) : bindingsError ? (
          <PartnerPlanState
            kind="error"
            title={t('account.partner.downlineLoadFailed')}
            description={bindingsError}
            action={<Button variant="outline" size="sm" onClick={() => void loadBindings()}>{t('account.common.retry')}</Button>}
          />
        ) : bindings.length === 0 ? (
          <PartnerPlanState kind="empty" title={t('account.partner.noDownline')} description={t('account.partner.noDownlineDesc')} />
        ) : (
          <TableWrap>
            <table className="partner-plan-table" aria-label={t('account.partner.downline')}>
              <thead>
                <tr>
                  <th>{t('account.partner.colMerchantId')}</th>
                  <th>{t('account.partner.colBindSource')}</th>
                  <th>{t('account.partner.colCurrentPlan')}</th>
                  <th>{t('account.partner.colMembershipSpend')}</th>
                  <th>{t('account.partner.colRechargeSpend')}</th>
                  <th>{t('account.partner.colBoundAt')}</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map(row => (
                  <tr key={`${row.user_id}-${row.merchant_id}`}>
                    <td>#{row.merchant_id}</td>
                    <td>{bindingSourceLabel[row.source as keyof typeof bindingSourceLabel] || row.source}</td>
                    <td>{row.current_plan_name || row.current_plan_code || '-'}</td>
                    <td>{cny(row.membership_spend_cny)}</td>
                    <td>{cny(row.recharge_spend_cny)}</td>
                    <td>{formatDate(row.bound_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </>
  )
}

function RewardsTab({ referralRewardSummary }: { referralRewardSummary?: RewardSummary }) {
  const { t } = usePreferences()
  const [items, setItems] = useState<RewardRow[]>([])
  const [summary, setSummary] = useState<RewardSummary | undefined>(referralRewardSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setSummary(referralRewardSummary)
  }, [referralRewardSummary])

  const loadRewards = useCallback(() => {
    setLoading(true)
    return BillingAPI.partnerRewards()
      .then((data) => {
        const body = unwrapPayloadRecord(data)
        setItems(unwrapList<RewardRow>(data))
        if (isRecord(body.summary)) setSummary(body.summary as RewardSummary)
        setError('')
      })
      .catch((err) => {
        setError(describeAxiosError(err))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadRewards()
  }, [loadRewards])

  const totalPoints = Number(summary?.total_reward_points ?? 0)
  const referralCount = Number(summary?.referral_count ?? 0)

  return (
    <>
      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.rewardsOverview')}</strong>
            <small>{t('account.partner.rewardsOverviewDesc')}</small>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadRewards()} disabled={loading}>
            <RefreshCw size={14} />
            {t('account.common.refresh')}
          </Button>
        </div>
        <MetricGrid
          items={[
            {
              label: t('account.partner.totalRewards'),
              value: cny(pointsToYuan(totalPoints)),
              hint: t('account.partner.pointsToYuan'),
              tone: 'accent',
              icon: <Gift size={15} />,
            },
            {
              label: t('account.partner.referredCount'),
              value: Number.isFinite(referralCount) ? referralCount : 0,
              hint: t('account.partner.referredHint'),
              tone: 'info',
              icon: <Users size={15} />,
            },
          ]}
        />
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.rewardDetails')}</strong>
            <small>{t('account.partner.rewardDetailsDesc')}</small>
          </div>
        </div>
        {loading ? (
          <PartnerPlanState kind="loading" title={t('account.partner.loadingRewards')} />
        ) : error ? (
          <PartnerPlanState
            kind="error"
            title={t('account.partner.rewardsLoadFailed')}
            description={error}
            action={<Button variant="outline" size="sm" onClick={() => void loadRewards()}>{t('account.common.retry')}</Button>}
          />
        ) : items.length === 0 ? (
          <PartnerPlanState kind="empty" title={t('account.partner.noRewards')} description={t('account.partner.noRewardsDesc')} />
        ) : (
          <TableWrap>
            <table className="partner-plan-table" aria-label={t('account.partner.rewardDetails')}>
              <thead>
                <tr>
                  <th>{t('account.partner.colOrderId')}</th>
                  <th>{t('account.partner.colSourceMerchant')}</th>
                  <th>{t('account.partner.colPaidAmount')}</th>
                  <th>{t('account.partner.colRewardPoints')}</th>
                  <th>{t('account.partner.colRewardAmount')}</th>
                  <th>{t('account.partner.colTime')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr key={row.id || row.source_checkout_id}>
                    <td className="partner-plan-mono" title={row.source_checkout_id}>{shortId(row.source_checkout_id)}</td>
                    <td>#{row.source_merchant_id}</td>
                    <td>{cny(row.paid_amount_cny)}</td>
                    <td>{row.reward_points.toLocaleString('zh-CN')}</td>
                    <td>{cny(pointsToYuan(row.reward_points))}</td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </>
  )
}

function CouponsTab() {
  const { t, tpl } = usePreferences()
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [policy, setPolicy] = useState<DiscountPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generateVoucherType, setGenerateVoucherType] = useState<'recharge' | 'membership'>('membership')
  const [generateUserRate, setGenerateUserRate] = useState('')
  const [generateCount, setGenerateCount] = useState('1')
  const [generateAssignee, setGenerateAssignee] = useState('')
  const [generateSubmitting, setGenerateSubmitting] = useState(false)
  const [generateNotice, setGenerateNotice] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [copiedCode, setCopiedCode] = useState('')
  const [copyCodeError, setCopyCodeError] = useState('')

  const couponKindLabel = useMemo(() => ({
    voucher: t('account.partner.couponVoucher'),
    percentage: t('account.partner.couponPercentage'),
    partner_discount: t('account.partner.couponPartnerDiscount'),
    recharge: t('account.partner.couponTypeRecharge'),
    membership: t('account.partner.couponTypeMembership'),
    resource_pack: t('account.partner.couponTypeService'),
  }), [t])

  const loadCoupons = useCallback(() => {
    setLoading(true)
    return Promise.all([
      BillingAPI.partnerCoupons(),
      BillingAPI.partnerDiscountPolicy(),
    ])
      .then(([couponData, policyData]) => {
        setCoupons(unwrapList<CouponRow>(couponData))
        setPolicy(unwrapData<DiscountPolicy>(policyData))
        setError('')
      })
      .catch((err) => {
        setError(describeAxiosError(err))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCoupons()
  }, [loadCoupons])

  const currentBaseRate = useMemo(() => {
    if (!policy) return ''
    return generateVoucherType === 'recharge'
      ? (policy.recharge_base_rate || '')
      : policy.membership_base_rate
  }, [policy, generateVoucherType])

  useEffect(() => {
    if (currentBaseRate) setGenerateUserRate(currentBaseRate)
  }, [currentBaseRate])

  const couponStats = useMemo(() => {
    const partnerCoupons = coupons.filter(c => c.discount_kind === 'partner_discount')
    const redeemed = partnerCoupons.filter(c => c.redeemed_at).length
    const assigned = partnerCoupons.filter(c => c.assigned_user_id && !c.redeemed_at).length
    const available = partnerCoupons.length - redeemed - assigned
    const marginTotal = partnerCoupons.reduce((sum, c) => {
      const base = Number(c.base_discount_rate || 0)
      const user = Number(c.discount_rate || 0)
      return sum + Math.max(user - base, 0)
    }, 0)
    return { redeemed, assigned, available, marginTotal, total: partnerCoupons.length }
  }, [coupons])

  const tierLabel = useMemo(() => {
    if (!policy) return '-'
    const minUsers = policy.tier_min_users
    const maxUsers = policy.tier_max_users
    if (maxUsers == null)
      return tpl('account.partner.tierRangeOpen', String(minUsers))
    return tpl('account.partner.tierRange', String(minUsers), String(maxUsers))
  }, [policy, tpl, t])

  async function handleGenerate(push: boolean) {
    if (!policy) return
    if (generateVoucherType === 'recharge' && !policy.recharge_enabled) {
      setGenerateError(t('account.partner.rechargeDisabled'))
      return
    }
    const userRate = Number(generateUserRate)
    const baseRate = Number(currentBaseRate || 0)
    if (!Number.isFinite(userRate) || userRate < baseRate || userRate > 0.99) {
      setGenerateError(t('account.partner.invalidUserRate'))
      return
    }
    const count = Math.max(1, Math.min(100, Number(generateCount || 1)))
    if (!Number.isFinite(count)) {
      setGenerateError(t('account.partner.invalidUserRate'))
      return
    }
    setGenerateSubmitting(true)
    setGenerateError('')
    setGenerateNotice('')
    try {
      const payload: {
        voucher_type: 'recharge' | 'membership'
        discount_rate: string
        count: number
        assigned_user_identifier?: string
      } = {
        voucher_type: generateVoucherType,
        discount_rate: userRate.toFixed(4),
        count,
      }
      if (push && generateAssignee.trim())
        payload.assigned_user_identifier = generateAssignee.trim()
      const data = await BillingAPI.partnerGenerateCoupon(payload)
      const items = unwrapList<CouponRow>(data)
      setGenerateNotice(tpl('account.partner.generateSuccess', String(items.length || count)))
      await loadCoupons()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setGenerateError(axiosErr?.response?.data?.error || describeAxiosError(err))
    } finally {
      setGenerateSubmitting(false)
    }
  }

  async function handleCopyCode(code: string) {
    setCopyCodeError('')
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      window.setTimeout(() => setCopiedCode(''), 1800)
    } catch {
      setCopyCodeError(t('account.partner.copyFailed'))
    }
  }

  function formatRate(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric))
      return '-'
    return numeric.toFixed(2)
  }

  function formatMarginRate(coupon: CouponRow): string {
    const base = Number(coupon.base_discount_rate || 0)
    const user = Number(coupon.discount_rate || 0)
    const margin = Math.max(user - base, 0)
    return margin.toFixed(2)
  }

  function couponTypeLabel(coupon: CouponRow): string {
    if (coupon.discount_kind === 'partner_discount')
      return couponKindLabel[coupon.voucher_type as keyof typeof couponKindLabel] || coupon.voucher_type
    return couponKindLabel[coupon.voucher_type as keyof typeof couponKindLabel]
      || couponKindLabel[coupon.discount_kind as keyof typeof couponKindLabel]
      || coupon.voucher_type
      || coupon.discount_kind
  }

  return (
    <>
      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.discountPolicy')}</strong>
            <small>{t('account.partner.discountPolicyDesc')}</small>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadCoupons()} disabled={loading}>
            <RefreshCw size={14} />
            {t('account.common.refresh')}
          </Button>
        </div>
        <MetricGrid
          items={[
            { label: t('account.partner.referredCount'), value: policy?.referral_count ?? 0, hint: t('account.partner.referredHint'), tone: 'accent', icon: <Users size={15} /> },
            { label: t('account.partner.effectiveUsers'), value: policy?.effective_user_count ?? 0, hint: t('account.partner.effectiveUsersHint'), tone: 'success', icon: <Users size={15} /> },
            { label: t('account.partner.currentTier'), value: tierLabel, hint: t('account.partner.currentTierHint'), tone: 'info' },
            { label: t('account.partner.membershipBaseRate'), value: formatRate(policy?.membership_base_rate), hint: t('account.partner.couponTypeMembership'), tone: 'warning' },
            { label: t('account.partner.rechargeBaseRate'), value: policy?.recharge_enabled ? formatRate(policy?.recharge_base_rate) : t('account.partner.rechargeDisabled'), hint: t('account.partner.couponTypeRecharge'), tone: policy?.recharge_enabled ? 'accent' : 'muted' },
          ]}
        />
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.generateCoupon')}</strong>
            <small>{t('account.partner.generateCouponDesc')}</small>
          </div>
        </div>
        <div className="partner-plan-inline-form partner-plan-rate-form">
          <select value={generateVoucherType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setGenerateVoucherType(e.target.value as 'recharge' | 'membership')}>
            <option value="membership">{t('account.partner.couponTypeMembership')}</option>
            <option value="recharge" disabled={!policy?.recharge_enabled}>{t('account.partner.couponTypeRecharge')}</option>
          </select>
          <Input
            value={generateUserRate}
            placeholder={t('account.partner.userRatePlaceholder')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGenerateUserRate(normalizeAmountInput(e.target.value))}
            inputMode="decimal"
          />
          <Input
            value={generateCount}
            placeholder={t('account.partner.generateCount')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGenerateCount(normalizeAmountInput(e.target.value))}
            inputMode="numeric"
          />
          <Input
            value={generateAssignee}
            placeholder={t('account.partner.assignedUserPlaceholder')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGenerateAssignee(e.target.value)}
          />
          <Button size="sm" disabled={generateSubmitting || loading} onClick={() => void handleGenerate(false)}>
            {generateSubmitting ? t('account.partner.generating') : t('account.partner.generateOnly')}
          </Button>
          <Button size="sm" disabled={generateSubmitting || loading || !generateAssignee.trim()} onClick={() => void handleGenerate(true)}>
            {generateSubmitting ? t('account.partner.generating') : t('account.partner.generateSubmit')}
          </Button>
        </div>
        {currentBaseRate ? <p className="partner-plan-feedback">{tpl('account.partner.baseRateOption', formatRate(currentBaseRate))}</p> : null}
        {generateError ? <p className="partner-plan-feedback is-error">{generateError}</p> : null}
        {generateNotice ? <p className="partner-plan-feedback is-success">{generateNotice}</p> : null}
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.couponPool')}</strong>
            <small>{t('account.partner.couponPoolDesc')}</small>
          </div>
        </div>
        <MetricGrid
          items={[
            { label: t('account.partner.assignable'), value: couponStats.available, hint: t('account.partner.assignableHint'), tone: 'accent', icon: <Ticket size={15} /> },
            { label: t('account.partner.assigned'), value: couponStats.assigned, hint: t('account.partner.assignedHint'), tone: 'info' },
            { label: t('account.partner.redeemed'), value: couponStats.redeemed, hint: t('account.partner.redeemedHint'), tone: 'success' },
            { label: t('account.partner.marginTotal'), value: formatRate(couponStats.marginTotal), hint: t('account.partner.marginHint'), tone: 'warning' },
          ]}
        />
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.couponList')}</strong>
            <small>{t('account.partner.couponListDesc')}</small>
          </div>
        </div>
        {loading ? (
          <PartnerPlanState kind="loading" title={t('account.partner.loadingCoupons')} />
        ) : error ? (
          <PartnerPlanState
            kind="error"
            title={t('account.partner.couponsLoadFailed')}
            description={error}
            action={<Button variant="outline" size="sm" onClick={() => void loadCoupons()}>{t('account.common.retry')}</Button>}
          />
        ) : couponStats.total === 0 ? (
          <PartnerPlanState kind="empty" title={t('account.partner.noCoupons')} description={t('account.partner.noCouponsDesc')} />
        ) : (
          <TableWrap>
            <table className="partner-plan-table" aria-label={t('account.partner.couponList')}>
              <thead>
                <tr>
                  <th>{t('account.partner.colCouponCode')}</th>
                  <th>{t('account.partner.colCouponType')}</th>
                  <th>{t('account.partner.colBaseRate')}</th>
                  <th>{t('account.partner.colForwardRate')}</th>
                  <th>{t('account.partner.colMarginRate')}</th>
                  <th>{t('account.partner.colAssignee')}</th>
                  <th>{t('account.partner.colStatus')}</th>
                  <th>{t('account.partner.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {coupons.filter(c => c.discount_kind === 'partner_discount').map(coupon => {
                  const isRedeemed = Boolean(coupon.redeemed_at)
                  return (
                    <tr key={coupon.id || coupon.code}>
                      <td className="partner-plan-mono" title={coupon.code}>{shortId(coupon.code, 18)}</td>
                      <td>{couponTypeLabel(coupon)}</td>
                      <td>{formatRate(coupon.base_discount_rate)}</td>
                      <td>{formatRate(coupon.discount_rate)}</td>
                      <td>{formatMarginRate(coupon)}</td>
                      <td>{coupon.assigned_user_id ? `#${coupon.assigned_user_id}` : t('account.partner.unassigned')}</td>
                      <td>
                        <StatusPill tone={isRedeemed ? 'success' : coupon.assigned_user_id ? 'info' : 'muted'}>
                          {isRedeemed ? t('account.partner.redeemed') : coupon.assigned_user_id ? t('account.partner.assigned') : t('account.partner.unassigned')}
                        </StatusPill>
                      </td>
                      <td>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyCode(coupon.code)}>
                          {copiedCode === coupon.code ? t('account.partner.codeCopied') : t('account.partner.copyCode')}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
        {copyCodeError ? <p className="partner-plan-feedback is-error">{copyCodeError}</p> : null}
      </section>
    </>
  )
}


function EarningsTab({ rebateSummary }: { rebateSummary?: RebateSummary }) {
  const { t } = usePreferences()
  const [rebates, setRebates] = useState<RebateRow[]>([])
  const [summary, setSummary] = useState<RebateSummary | undefined>(rebateSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rebateStatusLabel = useMemo(() => ({
    pending: t('account.partner.rebatePending'),
    settled: t('account.partner.rebateSettled'),
    cancelled: t('account.partner.rebateCancelled'),
  }), [t])

  useEffect(() => {
    setSummary(rebateSummary)
  }, [rebateSummary])

  const loadRebates = useCallback(() => {
    setLoading(true)
    return BillingAPI.partnerRebates()
      .then((data) => {
        const body = unwrapPayloadRecord(data)
        setRebates(unwrapList<RebateRow>(data))
        if (isRecord(body.summary)) setSummary(body.summary as unknown as RebateSummary)
        setError('')
      })
      .catch((err) => {
        setError(describeAxiosError(err))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadRebates()
  }, [loadRebates])

  return (
    <>
      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.earningsOverview')}</strong>
            <small>{t('account.partner.earningsOverviewDesc')}</small>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadRebates()} disabled={loading}>
            <RefreshCw size={14} />
            {t('account.common.refresh')}
          </Button>
        </div>
        <MetricGrid
          items={[
            { label: t('account.partner.pendingSettlement'), value: cny(summary?.pending_amount_cny), hint: t('account.partner.pendingHint'), tone: 'warning' },
            { label: t('account.partner.settled'), value: cny(summary?.settled_amount_cny), hint: t('account.partner.settledHint'), tone: 'info' },
            { label: t('account.partner.withdrawable'), value: cny(summary?.available_amount_cny), hint: t('account.partner.withdrawableHint'), tone: 'accent', icon: <Wallet size={15} /> },
            { label: t('account.partner.withdrawn'), value: cny(summary?.withdrawn_amount_cny), hint: t('account.partner.withdrawnHint'), tone: 'success' },
          ]}
        />
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.earningsDetails')}</strong>
            <small>{t('account.partner.earningsDetailsDesc')}</small>
          </div>
        </div>
        {loading ? (
          <PartnerPlanState kind="loading" title={t('account.partner.loadingEarnings')} />
        ) : error ? (
          <PartnerPlanState
            kind="error"
            title={t('account.partner.earningsLoadFailed')}
            description={error}
            action={<Button variant="outline" size="sm" onClick={() => void loadRebates()}>{t('account.common.retry')}</Button>}
          />
        ) : rebates.length === 0 ? (
          <PartnerPlanState kind="empty" title={t('account.partner.noEarnings')} description={t('account.partner.noEarningsDesc')} />
        ) : (
          <TableWrap>
            <table className="partner-plan-table" aria-label={t('account.partner.earningsDetails')}>
              <thead>
                <tr>
                  <th>{t('account.partner.colOrderId')}</th>
                  <th>{t('account.partner.colSourceMerchant')}</th>
                  <th>{t('account.partner.colBusiness')}</th>
                  <th>{t('account.partner.colBase')}</th>
                  <th>{t('account.partner.colEarning')}</th>
                  <th>{t('account.partner.colStatus')}</th>
                  <th>{t('account.partner.colTime')}</th>
                </tr>
              </thead>
              <tbody>
                {rebates.map(row => (
                  <tr key={row.id || row.source_checkout_id}>
                    <td className="partner-plan-mono" title={row.source_checkout_id}>{shortId(row.source_checkout_id)}</td>
                    <td>#{row.source_merchant_id}</td>
                    <td>{row.business_type || '-'}</td>
                    <td>{cny(row.base_amount_cny)}</td>
                    <td>{cny(row.rebate_amount_cny)}</td>
                    <td>
                      <StatusPill tone={row.status === 'settled' ? 'success' : row.status === 'cancelled' ? 'danger' : 'warning'}>
                        {rebateStatusLabel[row.status as keyof typeof rebateStatusLabel] || row.status}
                      </StatusPill>
                    </td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </>
  )
}

function WalletTab({
  rebateSummary,
  onOverviewRefresh,
}: {
  rebateSummary?: RebateSummary
  onOverviewRefresh?: () => Promise<void>
}) {
  const { t, tpl } = usePreferences()
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawNotice, setWithdrawNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const withdrawalStatusLabel = useMemo(() => ({
    applied: t('account.partner.withdrawalApplied'),
    approved: t('account.partner.withdrawalApproved'),
    settled: t('account.partner.settled'),
    rejected: t('account.partner.withdrawalRejected'),
  }), [t])

  const loadWithdrawals = useCallback(() => {
    setLoading(true)
    return BillingAPI.partnerWithdrawals()
      .then((data) => {
        setWithdrawals(unwrapList<WithdrawalRow>(data))
        setListError('')
      })
      .catch((err) => {
        setListError(describeAxiosError(err))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadWithdrawals()
  }, [loadWithdrawals])

  const availableAmount = Number(rebateSummary?.available_amount_cny ?? 0)
  const amountNumber = Number(withdrawAmount || 0)
  const amountTooLarge = Number.isFinite(availableAmount) && amountNumber > availableAmount
  const canWithdraw = amountNumber > 0 && !amountTooLarge && !withdrawSubmitting

  const handleWithdraw = async () => {
    if (!canWithdraw) return
    setWithdrawSubmitting(true)
    setWithdrawError('')
    setWithdrawNotice('')
    try {
      const created = unwrapData<WithdrawalRow>(await BillingAPI.partnerApplyWithdrawal(withdrawAmount))
      setWithdrawAmount('')
      setWithdrawals(prev => [created, ...prev.filter(item => item.id !== created.id)])
      setWithdrawNotice(tpl('account.partner.withdrawSubmitted', cny(created.amount_cny)))
      await Promise.allSettled([loadWithdrawals(), onOverviewRefresh?.()])
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setWithdrawError(axiosErr?.response?.data?.error || describeAxiosError(err, t('account.partner.withdrawFailed')))
    } finally {
      setWithdrawSubmitting(false)
    }
  }

  return (
    <>
      <section className="service-card partner-plan-section partner-plan-wallet-hero">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.walletTitle')}</strong>
            <small>{t('account.partner.walletDesc')}</small>
          </div>
          <StatusPill tone={availableAmount > 0 ? 'accent' : 'muted'}>
            {availableAmount > 0 ? t('account.partner.canWithdraw') : t('account.partner.noWithdrawable')}
          </StatusPill>
        </div>
        <MetricGrid
          items={[
            { label: t('account.partner.withdrawableBalance'), value: cny(rebateSummary?.available_amount_cny), hint: t('account.partner.currentWithdrawable'), tone: 'accent', icon: <Wallet size={15} /> },
            { label: t('account.partner.settled'), value: cny(rebateSummary?.settled_amount_cny), hint: t('account.partner.settledHint'), tone: 'info' },
            { label: t('account.partner.pendingSettlement'), value: cny(rebateSummary?.pending_amount_cny), hint: t('account.partner.pendingHint'), tone: 'warning' },
            { label: t('account.partner.withdrawn'), value: cny(rebateSummary?.withdrawn_amount_cny), hint: t('account.partner.withdrawnHint'), tone: 'success' },
          ]}
        />
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.applyWithdraw')}</strong>
            <small>{t('account.partner.applyWithdrawDesc')}</small>
          </div>
        </div>
        <div className="partner-plan-withdraw-form">
          <Input
            value={withdrawAmount}
            placeholder={t('account.partner.withdrawAmountPlaceholder')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setWithdrawAmount(normalizeAmountInput(e.target.value))}
            type="number"
            min="0.01"
            step="0.01"
          />
          <Button size="sm" disabled={!canWithdraw} onClick={handleWithdraw}>
            {withdrawSubmitting ? t('account.partner.submitting') : t('account.partner.applyWithdrawBtn')}
          </Button>
        </div>
        {amountTooLarge ? <p className="partner-plan-feedback is-error">{t('account.partner.withdrawTooLarge')}</p> : null}
        {withdrawError ? <p className="partner-plan-feedback is-error">{withdrawError}</p> : null}
        {withdrawNotice ? <p className="partner-plan-feedback is-success">{withdrawNotice}</p> : null}
      </section>

      <section className="service-card partner-plan-section">
        <div className="service-head">
          <div>
            <strong>{t('account.partner.withdrawalRecords')}</strong>
            <small>{t('account.partner.withdrawalRecordsDesc')}</small>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadWithdrawals()} disabled={loading}>
            <RefreshCw size={14} />
            {t('account.common.refresh')}
          </Button>
        </div>
        {loading ? (
          <PartnerPlanState kind="loading" title={t('account.partner.loadingWithdrawals')} />
        ) : listError ? (
          <PartnerPlanState
            kind="error"
            title={t('account.partner.withdrawalsLoadFailed')}
            description={listError}
            action={<Button variant="outline" size="sm" onClick={() => void loadWithdrawals()}>{t('account.common.retry')}</Button>}
          />
        ) : withdrawals.length === 0 ? (
          <PartnerPlanState kind="empty" title={t('account.partner.noWithdrawals')} description={t('account.partner.noWithdrawalsDesc')} />
        ) : (
          <TableWrap>
            <table className="partner-plan-table is-compact" aria-label={t('account.partner.withdrawalRecords')}>
              <thead>
                <tr>
                  <th>{t('account.partner.colAmount')}</th>
                  <th>{t('account.partner.colStatus')}</th>
                  <th>{t('account.partner.colSubmittedAt')}</th>
                  <th>{t('account.partner.colReviewNote')}</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(row => (
                  <tr key={row.id}>
                    <td>{cny(row.amount_cny)}</td>
                    <td>
                      <StatusPill tone={row.status === 'settled' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>
                        {withdrawalStatusLabel[row.status as keyof typeof withdrawalStatusLabel] || row.status}
                      </StatusPill>
                    </td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{row.review_note || row.partner_note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </>
  )
}
