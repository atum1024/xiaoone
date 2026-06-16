#!/usr/bin/env node
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.VIP_SHOT_BASE || 'http://127.0.0.1:5177'
const OUT = process.env.VIP_SHOT_OUT || path.join(__dirname, '../public/vip/shots')
const PHONE = '11111111111'
const PASSWORD = '123456'

const PAGES = [
  { url: '/workbench', file: 'workbench.png' },
  { url: '/workbench/kefu', file: 'kefu.png' },
  { url: '/workbench/marketing/image', file: 'image-composer.png' },
  { url: '/workbench/marketing/video', file: 'video.png' },
  { url: '/workbench/automation/social', file: 'social.png' },
  { url: '/workbench/hermes', file: 'hermes.png' },
  { url: '/workbench/generation-assets?tab=ad-card', file: 'cards.png' },
  { url: '/workbench/generation-assets?tab=numbers', file: 'us-number.png' },
  { url: '/workbench/account?section=partner', file: 'partner.png' },
  { url: '/workbench/kefu/help-center', file: 'help-center.png' },
  { url: '/pricing', file: 'pricing.png' },
]

async function login(page) {
  await page.goto(`${BASE}/login?style=classic`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(1000)
  const phoneTab = page.getByRole('button', { name: /手机|Phone/i }).first()
  if (await phoneTab.count()) await phoneTab.click().catch(() => {})
  const phoneInput = page.locator('input[type="tel"], input[autocomplete="tel"]').first()
  const passInput = page.locator('input[type="password"]').first()
  if (await phoneInput.count()) await phoneInput.fill(PHONE)
  if (await passInput.count()) await passInput.fill(PASSWORD)
  const submit = page.getByRole('button', { name: /登录|Sign in/i }).first()
  if (await submit.count()) await submit.click()
  await page.waitForURL(/\/(workbench|membership)/, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await login(page)
    for (const { url, file } of PAGES) {
      console.log(`Capturing ${url} -> ${file}`)
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(1500)
      await page.screenshot({ path: path.join(OUT, file), fullPage: false, type: 'png' })
    }
    console.log('Done:', OUT)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
