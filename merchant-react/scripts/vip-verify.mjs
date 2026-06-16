#!/usr/bin/env node
/** Verify /vip page — run in docker: node /app/frontends/merchant-react/scripts/vip-verify.mjs */
import { chromium } from 'playwright'

const BASE = process.env.VIP_VERIFY_BASE || 'http://127.0.0.1:5177'

async function checkViewport(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.goto(`${BASE}/vip`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2000)

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const errors = []
    const overflowX = Math.max(0, doc.scrollWidth - doc.clientWidth)
    const hero = document.querySelector('#vip-hero')
    const sections = document.querySelectorAll('.vip-section, #vip-closer').length
    const imgs = [...document.querySelectorAll('.vip-landing img')].map(img => ({
      src: img.getAttribute('src'),
      ok: img.complete && img.naturalWidth > 0,
    }))
    const broken = imgs.filter(i => !i.ok)
    return { overflowX, hero: !!hero, sections, imgTotal: imgs.length, broken: broken.length, brokenSrc: broken.map(b => b.src) }
  })

  const consoleErrors = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  return { width, height, ...metrics, consoleErrors }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const results = []
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    results.push(await checkViewport(page, w, h))
  }
  await browser.close()
  console.log(JSON.stringify(results, null, 2))
  const failed = results.some(r => r.overflowX > 0 || r.broken > 0 || !r.hero)
  process.exit(failed ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
