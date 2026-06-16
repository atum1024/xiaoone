import { chromium } from 'playwright'

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/
const BASE = process.env.XIAOONE_WEB_URL || 'http://127.0.0.1:5177'

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 })
  const inputs = page.locator('input:visible')
  const count = await inputs.count()
  for (let i = 0; i < count; i += 1) {
    const type = await inputs.nth(i).getAttribute('type')
    if (type === 'password') {
      await inputs.nth(i).fill('123456')
    } else if (type === 'tel' || type === 'text' || type === 'email' || !type) {
      await inputs.nth(i).fill('11111111111')
    }
  }
  const submit = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Sign in"), button:has-text("Log in")').first()
  await submit.click({ timeout: 15000 })
  await page.waitForURL(/workbench|membership/, { timeout: 30000 })
  if (page.url().includes('membership')) {
    await page.goto(`${BASE}/workbench`, { waitUntil: 'networkidle' })
  }
}

function scanCjk(page) {
  return page.evaluate((cjkSource) => {
    const CJK = new RegExp(cjkSource)
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      const text = (n.textContent || '').trim()
      if (!text || !CJK.test(text)) continue
      const el = n.parentElement
      if (!el || skip.has(el.tagName)) continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) continue
      const cls = String(el.className || '')
      if (cls.includes('mr-profile-name')) continue
      out.push({ text: text.slice(0, 120), tag: el.tagName, cls: cls.slice(0, 80) })
    }
    return out
  }, CJK.source)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } })
try {
  await login(page)
  await page.evaluate(() => {
    localStorage.setItem('xiaoone-merchant-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  let hits = await scanCjk(page)
  console.log(`URL: ${page.url()}`)
  console.log(`CJK hits (workbench): ${hits.length}`)
  hits.slice(0, 40).forEach((h, i) => console.log(`${i + 1}. [${h.tag}.${h.cls}] ${h.text}`))

  const modelBtn = page.locator('button:has-text("Model"), button:has-text("大模型"), [aria-label*="model" i]').first()
  if (await modelBtn.count()) {
    await modelBtn.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(800)
    const modelHits = await scanCjk(page)
    const extra = modelHits.filter(h => !hits.some(x => x.text === h.text))
    console.log(`CJK hits after model dropdown: ${modelHits.length} (+${extra.length} new)`)
    extra.slice(0, 20).forEach((h, i) => console.log(`M${i + 1}. [${h.tag}] ${h.text}`))
    hits = modelHits
  }

  await page.goto(`${BASE}/workbench/account`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const planText = await page.evaluate(() => {
    const body = document.body.innerText
    return {
      hasLite: /Lite/.test(body),
      hasPro: /Pro/.test(body),
      hasUltra: /Ultra/.test(body),
      hasCnPlan: /娱乐版|创业版|商户版/.test(body),
    }
  })
  console.log('Account plan labels:', JSON.stringify(planText))

  if (hits.length > 0) process.exitCode = 1
} finally {
  await browser.close()
}
