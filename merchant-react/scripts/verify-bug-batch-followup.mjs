#!/usr/bin/env node
/**
 * Browser verification for recharge auto-close (#2) and security change-binding (#3).
 * Run via scripts/verify-bug-batch-followup.sh (installs Playwright + fulfills checkout from host).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = process.env.VERIFY_OUT_DIR || path.join(__dirname, '..', 'tmp')
const CHECKOUT_FILE = path.join(OUT_DIR, 'verify_checkout_id.txt')
const RESULTS_FILE = path.join(OUT_DIR, 'verify_results.json')
const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5177'
const BFF = process.env.BFF_URL || 'http://bff:8100'

const results = {
  login: false,
  topupButtonVisible: false,
  checkoutCreated: false,
  checkoutId: '',
  dialogClosedAfterPaid: false,
  bindAuthVerified: false,
  errors: [],
}

function saveResults() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(RESULTS_FILE, `${JSON.stringify(results, null, 2)}\n`)
}

async function getTokens() {
  const resp = await fetch(`${BFF}/oauth2/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: '11111111111',
      password: '123456',
      scope: 'merchant',
    }),
  })
  const data = await resp.json()
  if (!resp.ok || !data.access_token)
    throw new Error(`login failed: ${JSON.stringify(data)}`)
  results.login = true
  return data
}

async function main() {
  saveResults()
  const tokens = await getTokens()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  page.on('response', async (response) => {
    try {
      if (!response.url().includes('/payments/intent/wechat-pay/') || response.status() !== 200)
        return
      const payload = await response.json()
      const checkoutId = payload?.data?.checkout_id || payload?.checkout_id
      if (!checkoutId)
        return
      results.checkoutCreated = true
      results.checkoutId = checkoutId
      fs.mkdirSync(OUT_DIR, { recursive: true })
      fs.writeFileSync(CHECKOUT_FILE, checkoutId)
      saveResults()
    }
    catch {
      // ignore parse errors on unrelated responses
    }
  })

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ access, refresh }) => {
    sessionStorage.setItem('xiaoone.session_access_token', access)
    sessionStorage.setItem('xiaoone.session_refresh_token', refresh)
  }, { access: tokens.access_token, refresh: tokens.refresh_token })

  await page.goto(`${BASE}/workbench/account`, { waitUntil: 'networkidle', timeout: 60000 })

  const topupBtn = page.getByRole('button', { name: '充值' })
  await topupBtn.waitFor({ timeout: 15000 })
  results.topupButtonVisible = true
  saveResults()

  await topupBtn.click()
  await page.getByRole('dialog').waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: '生成微信支付二维码' }).click()

  for (let i = 0; i < 30; i++) {
    if (results.checkoutId)
      break
    await page.waitForTimeout(1000)
  }

  if (!results.checkoutId) {
    results.errors.push('checkout_id not captured within 30s')
    saveResults()
  }
  else {
    for (let i = 0; i < 12; i++) {
      const open = await page.getByRole('dialog').isVisible().catch(() => false)
      if (!open) {
        results.dialogClosedAfterPaid = true
        break
      }
      await page.waitForTimeout(2000)
    }
    if (!results.dialogClosedAfterPaid)
      results.errors.push('topup dialog still open 24s after checkout fulfill expected')
    saveResults()
  }

  await page.goto(`${BASE}/workbench/account`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByRole('tab', { name: '安全设置' }).click()
  await page.waitForTimeout(1000)

  await page.getByRole('button', { name: '更换绑定' }).first().click()
  await page.getByRole('button', { name: '发送验证码' }).first().click()
  await page.waitForTimeout(1500)

  const authCode = process.env.VERIFY_BIND_AUTH_CODE || '112233'
  await page.locator('input[placeholder="6 位验证码"]').first().fill(authCode)
  await page.getByRole('button', { name: '确认验证' }).click()
  await page.waitForTimeout(1500)
  results.bindAuthVerified = await page.getByRole('button', { name: '已验证' }).isVisible().catch(() => false)
  if (!results.bindAuthVerified)
    results.errors.push('bind auth verify did not reach 已验证 state')
  saveResults()

  await browser.close()
  saveResults()
  const failed = results.errors.length > 0
    || !results.topupButtonVisible
    || !results.checkoutCreated
    || !results.dialogClosedAfterPaid
    || !results.bindAuthVerified
  console.log(JSON.stringify(results, null, 2))
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  results.errors.push(String(error?.message || error))
  saveResults()
  console.error(error)
  process.exit(1)
})
