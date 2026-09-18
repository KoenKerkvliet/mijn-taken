import { startVanDeWeek, toISODate } from './dates'

/** Datums die je gewoon intypt: "morgen", "vrijdag", "volgende week donderdag",
 *  "donderdag 1 oktober", "over drie dagen". Hier wordt alleen gezocht en
 *  gerekend; wat er met de gevonden tekst gebeurt staat in titel.ts.
 *
 *  Er wordt bewust niet op afkortingen als "ma" of "zo" gezocht. Dat zijn in
 *  het Nederlands ook gewone woorden, en een taak die stilletjes "zo" uit zijn
 *  titel kwijtraakt is erger dan een datum die je zelf moet aanklikken. */

export interface Datumtreffer {
  /** Plaats in de oorspronkelijke titel, zodat de tekst gemarkeerd en later
   *  weggeknipt kan worden. */
  van: number
  tot: number
  iso: string
}

const WEEKDAGEN = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

const MAANDEN: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  maart: 2, mrt: 2,
  april: 3, apr: 3,
  mei: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  augustus: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  oktober: 9, okt: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
}

const GETALLEN: Record<string, number> = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5 }

const WEEKDAG = WEEKDAGEN.join('|')
// Langste eerst, anders wint "sep" van "september".
const MAAND = Object.keys(MAANDEN).sort((a, b) => b.length - a.length).join('|')

// Alleen aan het begin of na een spatie, en het woord moet ook echt aflopen.
// Zo blijft "Morgenoverleg" heel en wordt "1 oktober." netjes herkend.
const START = '(?<voor>^|[\\s(])'
const EIND = '(?=$|[\\s.,;:!?)])'

interface Regel {
  patroon: RegExp
  naar: (groepen: Record<string, string | undefined>, nu: Date) => Date | null
}

const REGELS: Regel[] = [
  {
    patroon: new RegExp(`${START}vandaag${EIND}`, 'giu'),
    naar: (_, nu) => nu,
  },
  {
    patroon: new RegExp(`${START}(?<over>over)?morgen${EIND}`, 'giu'),
    naar: (g, nu) => erbij(nu, g.over ? 2 : 1),
  },
  {
    patroon: new RegExp(`${START}volgende\\s+week(\\s+(?<dag>${WEEKDAG}))?${EIND}`, 'giu'),
    naar: (g, nu) => volgendeWeek(nu, g.dag),
  },
  {
    patroon: new RegExp(
      `${START}(aanstaande\\s+|komende\\s+|a\\.s\\.\\s*)?(?<dag>${WEEKDAG})${EIND}`,
      'giu',
    ),
    naar: (g, nu) => eerstvolgende(nu, g.dag!),
  },
  {
    // "1 okt", "1 oktober 2026" en "donderdag 1 oktober" - de weekdag hoort dan
    // bij de datum en mag dus mee weggeknipt worden.
    patroon: new RegExp(
      `${START}((?<dag>${WEEKDAG})\\s+)?(?<d>\\d{1,2})\\s+(?<maand>${MAAND})\\.?(\\s+(?<jaar>\\d{4}))?${EIND}`,
      'giu',
    ),
    naar: (g, nu) =>
      opDatum(nu, Number(g.d), MAANDEN[g.maand!.toLowerCase()], g.jaar ? Number(g.jaar) : null),
  },
  {
    patroon: new RegExp(
      `${START}(?<d>\\d{1,2})[-/](?<m>\\d{1,2})([-/](?<jaar>\\d{2,4}))?${EIND}`,
      'giu',
    ),
    naar: (g, nu) =>
      opDatum(nu, Number(g.d), Number(g.m) - 1, g.jaar ? volJaar(Number(g.jaar)) : null),
  },
  {
    patroon: new RegExp(
      `${START}over\\s+(?<aantal>\\d{1,3}|een|twee|drie|vier|vijf)\\s+(?<eenheid>dagen|dag|weken|week|maanden|maand)${EIND}`,
      'giu',
    ),
    naar: (g, nu) => overTijd(nu, g.aantal!, g.eenheid!),
  },
]

/** De eerste datum in de tekst. Beginnen twee uitleggen op dezelfde plek, dan
 *  wint de langste: "donderdag 1 oktober" zegt meer dan "donderdag". */
export function vindDatum(tekst: string, nu = new Date()): Datumtreffer | null {
  let beste: Datumtreffer | null = null

  for (const regel of REGELS) {
    for (const m of tekst.matchAll(regel.patroon)) {
      const datum = regel.naar(m.groups ?? {}, nu)
      if (!datum) continue

      const van = (m.index ?? 0) + (m.groups?.voor?.length ?? 0)
      const treffer: Datumtreffer = { van, tot: (m.index ?? 0) + m[0].length, iso: toISODate(datum) }

      const beter =
        !beste || treffer.van < beste.van || (treffer.van === beste.van && treffer.tot > beste.tot)
      if (beter) beste = treffer
    }
  }

  return beste
}

function erbij(nu: Date, dagen: number): Date {
  const d = new Date(nu)
  d.setDate(d.getDate() + dagen)
  return d
}

function middernacht(d: Date): Date {
  const kopie = new Date(d)
  kopie.setHours(0, 0, 0, 0)
  return kopie
}

/** "vrijdag" op een vrijdag is vandaag. Wie de week erna bedoelt, heeft
 *  "volgende week vrijdag" - anders zou je vandaag nooit kunnen aanwijzen. */
function eerstvolgende(nu: Date, naam: string): Date {
  const doel = WEEKDAGEN.indexOf(naam.toLowerCase())
  return erbij(nu, (doel - nu.getDay() + 7) % 7)
}

/** Geteld vanaf de maandag van de week hierna, niet "vandaag plus zeven". Wie
 *  op zondag "volgende week dinsdag" zegt, bedoelt de dinsdag over twee dagen
 *  niet. */
function volgendeWeek(nu: Date, naam?: string): Date {
  const maandag = startVanDeWeek(nu)
  maandag.setDate(maandag.getDate() + 7)
  if (!naam) return maandag
  const doel = WEEKDAGEN.indexOf(naam.toLowerCase())
  maandag.setDate(maandag.getDate() + ((doel + 6) % 7))
  return maandag
}

/** Een dag-en-maand zonder jaartal slaat op de eerstvolgende keer dat die dag
 *  langskomt: in december is "3 januari" volgend jaar. */
function opDatum(nu: Date, dag: number, maand: number, jaar: number | null): Date | null {
  const d = maak(jaar ?? nu.getFullYear(), maand, dag)
  if (!d) return null
  if (jaar === null && d < middernacht(nu)) return maak(nu.getFullYear() + 1, maand, dag)
  return d
}

/** null bij een dag die niet bestaat, zoals 31 februari of 29 februari in een
 *  gewoon jaar. Zonder deze controle zou dat stilletjes 3 maart worden. */
function maak(jaar: number, maand: number, dag: number): Date | null {
  const d = new Date(jaar, maand, dag)
  return d.getMonth() === maand && d.getDate() === dag ? d : null
}

function volJaar(n: number): number {
  return n < 100 ? 2000 + n : n
}

function overTijd(nu: Date, aantal: string, eenheid: string): Date | null {
  const n = GETALLEN[aantal.toLowerCase()] ?? Number(aantal)
  if (!Number.isFinite(n) || n <= 0) return null
  if (eenheid.startsWith('dag')) return erbij(nu, n)
  if (eenheid.startsWith('we')) return erbij(nu, n * 7)
  const d = new Date(nu)
  d.setMonth(d.getMonth() + n)
  return d
}
