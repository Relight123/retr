// Р“РµРЅРµСЂР°С†РёСЏ PNG-РёРєРѕРЅРѕРє PWA РёР· РѕРґРЅРѕРіРѕ SVG (РЅСѓР¶РµРЅ sharp: npm i)
// Р—Р°РїСѓСЃРєР°РµС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРµСЂРµРґ `dev`/`build`. Р•СЃР»Рё sharp РЅРµРґРѕСЃС‚СѓРїРµРЅ вЂ” РјСЏРіРєРѕ РїСЂРѕРїСѓСЃРєР°РµРј.
import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve('public/icons')
const skipped = (e) => {
  console.warn('[icons] РїСЂРѕРїСѓС‰РµРЅРѕ:', e?.message ?? e)
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })

  let sharpMod
  try {
    sharpMod = await import('sharp')
  } catch {
    return skipped(new Error('sharp РЅРµ СѓСЃС‚Р°РЅРѕРІР»РµРЅ вЂ” РёРєРѕРЅРєРё РїСЂРѕРїСѓС‰РµРЅС‹'))
  }
  const sharp = sharpMod.default

  // Р›РѕРіРѕС‚РёРї: РіСЂР°С„РёС‚ + РґРІРµ СЃРІРµС‡Рё (Р·РµР»С‘РЅР°СЏ/РєСЂР°СЃРЅР°СЏ) РЅР° В«РєР»РµС‚РѕС‡РЅРѕРјВ» С„РѕРЅРµ С†РµРЅС‹
  const svg = (size, maskable) => {
    // safe zone РґР»СЏ maskable: РєРѕРЅС‚РµРЅС‚ РІ С†РµРЅС‚СЂР°Р»СЊРЅС‹С… 80%
    const pad = maskable ? size * 0.1 : size * 0.07
    const inner = size - pad * 2
    const s = inner / 100
    const candles = (cx, up) => `
      <rect x="${cx - 6 * s}" y="${up ? 42 : 30}" width="12" height="34" rx="3"
        fill="${up ? '#16C784' : '#EA3943'}"/>
      <line x1="${cx}" y1="${up ? 28 : 20}" x2="${cx}" y2="${up ? 44 : 32}"
        stroke="${up ? '#16C784' : '#EA3943'}" stroke-width="3" stroke-linecap="round"/>
      <line x1="${cx}" y1="${up ? 74 : 62}" x2="${cx}" y2="${up ? 86 : 74}"
        stroke="${up ? '#16C784' : '#EA3943'}" stroke-width="3" stroke-linecap="round"/>`
    return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0B0E14"/>
          <stop offset="1" stop-color="#151B2A"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${maskable ? 0 : Math.round(size * 0.22)}"
        fill="url(#bg)"/>
      ${maskable ? '' : `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${Math.round(size * 0.21)}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>`}
      <g transform="translate(${pad} ${pad})">
        <path d="M 6 78 L 26 66 L 46 70 L 69 48 L 88 36" fill="none" stroke="#6C5CFF" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>
        <circle cx="60" cy="52" r="10" fill="#6C5CFF" fill-opacity="0.22"/>
        ${candles(38 * s + 0, false)}
        ${candles(64 * s + 0, true)}
      </g>
    </svg>`)
  }

  const jobs = [
    ['pwa-192.png', svg(192, false)],
    ['pwa-512.png', svg(512, false)],
    ['maskable-512.png', svg(512, true)],
    ['apple-touch-icon.png', svg(180, false)],
  ]
  for (const [name, input] of jobs) {
    const target = path.join(outDir, name)
    if (await exists(target)) continue
    await sharp(input).png().toFile(target)
  }
  await writeFile(
    'public/favicon.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0B0E14"/><rect x="17" y="20" width="7" height="20" rx="2" fill="#EA3943"/><rect x="40" y="24" width="7" height="20" rx="2" fill="#16C784"/><line x1="20" y1="15" x2="20" y2="22" stroke="#EA3943" stroke-width="2"/><line x1="43" y1="42" x2="43" y2="49" stroke="#16C784" stroke-width="2"/></svg>`,
    'utf8'
  )
  console.log('[icons] РіРѕС‚РѕРІРѕ')
}

main().catch(skipped)
