// Maakt de PNG-iconen voor de PWA uit dezelfde vorm als public/favicon.svg.
//
// Browsers accepteren voor een manifest geen SVG (en iOS al helemaal niet),
// dus die PNG's moeten er zijn. In plaats van ze met de hand te tekenen staat
// hier de vorm als code: rond vierkant + vinkje, uitgerekend met wat
// supersampling zodat de randen niet rafelen. Zo blijven icoon en favicon
// gelijk als de kleur ooit verandert.
//
//   node scripts/maak-iconen.mjs

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(HIER, '..', 'public')

const BRAND = [0x4f, 0x46, 0xe5]
const WIT = [0xff, 0xff, 0xff]

// Coordinaten in hetzelfde 32x32-raster als favicon.svg.
const VINKJE = [
  [9, 16.5],
  [13.5, 21],
  [23, 11.5],
]
const LIJNDIKTE = 3
const HOEKRONDING = 8

const MONSTERS = 4 // 4x4 per pixel; genoeg om trapjes weg te poetsen.

function afstandTotLijnstuk(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const lengte2 = dx * dx + dy * dy
  const t = lengte2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengte2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Negatief = binnen het afgeronde vierkant. */
function afstandTotVierkant(px, py, halfMaat, straal) {
  const qx = Math.abs(px) - (halfMaat - straal)
  const qy = Math.abs(py) - (halfMaat - straal)
  const buiten = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return buiten + Math.min(Math.max(qx, qy), 0) - straal
}

/**
 * @param maat      pixels in de vierkante afbeelding
 * @param maskable  true = kleur tot de rand (Android legt er zelf een masker
 *                  overheen) en een kleiner vinkje binnen de veilige zone
 */
function tekenIcoon(maat, maskable) {
  const schaal = maat / 32
  const vinkjeSchaal = maskable ? 0.62 : 1
  const rijen = []

  for (let y = 0; y < maat; y++) {
    const rij = Buffer.alloc(1 + maat * 4) // byte 0 = filtertype 'none'
    for (let x = 0; x < maat; x++) {
      let achtergrond = 0
      let vinkje = 0

      for (let sy = 0; sy < MONSTERS; sy++) {
        for (let sx = 0; sx < MONSTERS; sx++) {
          // Monsterpunt terugrekenen naar het 32x32-raster.
          const px = (x + (sx + 0.5) / MONSTERS) / schaal
          const py = (y + (sy + 0.5) / MONSTERS) / schaal

          if (maskable || afstandTotVierkant(px - 16, py - 16, 16, HOEKRONDING) <= 0) {
            achtergrond++
          }

          let dichtstbij = Infinity
          for (let i = 0; i < VINKJE.length - 1; i++) {
            const a = VINKJE[i].map((v) => (v - 16) * vinkjeSchaal + 16)
            const b = VINKJE[i + 1].map((v) => (v - 16) * vinkjeSchaal + 16)
            dichtstbij = Math.min(dichtstbij, afstandTotLijnstuk(px, py, a, b))
          }
          // Ronde uiteinden en hoeken komen er gratis bij: puur afstand tot de
          // lijn, precies wat stroke-linecap="round" doet.
          if (dichtstbij <= (LIJNDIKTE / 2) * vinkjeSchaal) vinkje++
        }
      }

      const totaal = MONSTERS * MONSTERS
      const dekking = achtergrond / totaal
      const wit = vinkje / totaal

      // Vinkje over de achtergrond mengen, daarna pas de alpha van de vorm.
      const meng = (kanaal) => Math.round(BRAND[kanaal] * (1 - wit) + WIT[kanaal] * wit)
      const p = 1 + x * 4
      rij[p] = meng(0)
      rij[p + 1] = meng(1)
      rij[p + 2] = meng(2)
      rij[p + 3] = Math.round(255 * Math.max(dekking, wit))
    }
    rijen.push(rij)
  }

  return pngMaken(maat, maat, Buffer.concat(rijen))
}

function chunk(type, data) {
  const lengte = Buffer.alloc(4)
  lengte.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([lengte, body, crc])
}

const CRC_TABEL = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC_TABEL[(c ^ b) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function pngMaken(breedte, hoogte, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(breedte, 0)
  ihdr.writeUInt32BE(hoogte, 4)
  ihdr[8] = 8 // bits per kanaal
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(PUBLIC, { recursive: true })

const bestanden = [
  ['icoon-192.png', 192, false],
  ['icoon-512.png', 512, false],
  ['icoon-maskable-512.png', 512, true],
  // iOS knipt zelf de hoeken af, dus daar juist wel tot de rand doorkleuren.
  ['apple-touch-icon.png', 180, true],
]

for (const [naam, maat, maskable] of bestanden) {
  const png = tekenIcoon(maat, maskable)
  writeFileSync(resolve(PUBLIC, naam), png)
  console.log(`${naam.padEnd(26)} ${maat}x${maat}  ${(png.length / 1024).toFixed(1)} kB`)
}
