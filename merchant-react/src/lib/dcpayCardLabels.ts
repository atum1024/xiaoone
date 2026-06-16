import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

function norm(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

const CARD_STATUS_KEYS: Record<string, string> = {
  active: 'common.dcpay.card.active',
  block: 'common.dcpay.card.blocked',
  blocked: 'common.dcpay.card.blocked',
  freeze: 'common.dcpay.card.blocked',
  frozen: 'common.dcpay.card.blocked',
  cancel: 'common.dcpay.card.cancelled',
  cancelled: 'common.dcpay.card.cancelled',
  canceled: 'common.dcpay.card.cancelled',
  inactive: 'common.dcpay.card.inactive',
  pending: 'common.dcpay.card.pending',
  failed: 'common.dcpay.card.failed',
  unknown: 'common.dcpay.card.unknown',
}

const TX_STATUS_KEYS: Record<string, string> = {
  settled: 'common.dcpay.tx.settled',
  success: 'common.dcpay.tx.success',
  pending: 'common.dcpay.card.pending',
  failed: 'common.dcpay.card.failed',
  declined: 'common.dcpay.tx.declined',
  reject: 'common.dcpay.tx.declined',
  rejected: 'common.dcpay.tx.declined',
  cancelled: 'common.dcpay.tx.cancelled',
  canceled: 'common.dcpay.tx.cancelled',
  unknown: 'common.dcpay.card.unknown',
}

const FUNDS_DIRECTION_KEYS: Record<string, string> = {
  nochange: 'common.dcpay.funds.nochange',
  increase: 'common.dcpay.funds.increase',
  decrease: 'common.dcpay.funds.decrease',
  income: 'common.dcpay.funds.increase',
  expenditure: 'common.dcpay.funds.decrease',
  expense: 'common.dcpay.funds.decrease',
  in: 'common.dcpay.funds.increase',
  out: 'common.dcpay.funds.decrease',
  credit: 'common.dcpay.funds.increase',
  debit: 'common.dcpay.funds.decrease',
}

const TX_TYPE_KEYS: Record<string, string> = {
  opencardfee: 'common.dcpay.type.openCardFee',
  cardrecharge: 'common.dcpay.type.cardRecharge',
  rechargefee: 'common.dcpay.type.rechargeFee',
  transfee: 'common.dcpay.type.transFee',
  auth: 'common.dcpay.type.auth',
  verification: 'common.dcpay.type.verification',
  recharge: 'common.dcpay.type.recharge',
  refund: 'common.dcpay.type.refund',
}

function lookup(map: Record<string, string>, value: string, locale: Locale, fallbackKey: string) {
  if (!value) return uiT(locale, fallbackKey)
  const key = map[norm(value)]
  return key ? uiT(locale, key) : value
}

export function cardStatusLabel(status: string, locale: Locale) {
  return lookup(CARD_STATUS_KEYS, status, locale, 'common.dcpay.card.unknown')
}

export function txStatusLabel(status: string, locale: Locale) {
  return lookup(TX_STATUS_KEYS, status, locale, 'common.dcpay.card.unknown')
}

export function fundsDirectionLabel(direction: string, locale: Locale) {
  return lookup(FUNDS_DIRECTION_KEYS, direction, locale, 'common.dcpay.dash')
}

export function txTypeLabel(type: string, locale: Locale) {
  return lookup(TX_TYPE_KEYS, type, locale, 'common.dcpay.dash')
}

export function getDcpayCardLabels(locale: Locale) {
  return {
    cardStatusLabel: (status: string) => cardStatusLabel(status, locale),
    txStatusLabel: (status: string) => txStatusLabel(status, locale),
    fundsDirectionLabel: (direction: string) => fundsDirectionLabel(direction, locale),
    txTypeLabel: (type: string) => txTypeLabel(type, locale),
  }
}

export function txDisplayAmount(tx: { auth_amount?: string; settle_amount?: string; display_amount?: string }) {
  const display = Number(tx.display_amount || 0)
  if (Number.isFinite(display) && display !== 0) return display
  const settle = Number(tx.settle_amount || 0)
  if (Number.isFinite(settle) && settle !== 0) return settle
  const auth = Number(tx.auth_amount || 0)
  return Number.isFinite(auth) ? auth : 0
}
