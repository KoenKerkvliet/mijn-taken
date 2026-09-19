import { parseISODate, toISODate } from './dates'

/** Taken die telkens terugkomen: "elke maandag", "elke 2 weken", "elk jaar".
 *
 *  Een herhaling staat als klein stukje JSON bij de taak. Vink je zo'n taak
 *  af, dan schuift hij door naar de volgende keer en blijft er een afgeronde
 *  kopie achter - zo klopt je dagteller en zie je in Afgerond wat je werkelijk
 *  gedaan hebt, in plaats van één taak die eeuwig blijft rondzwerven. */

export interface Herhaling {
  eenheid: 'dag' | 'werkdag' | 'week' | 'maand' | 'jaar'
  /** Elke hoeveel eenheden. 1 bij "elke week", 2 bij "elke 2 weken". */
  stap: number
  /** Alleen bij week: 0 is zondag, 1 maandag, enzovoort. */
  weekdag?: number
}

const WEEKDAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const GETALLEN: Record<string, number> = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6 }

export function leesHerhaling(ruw: string | null | undefined): Herhaling | null {
  if (!ruw) return null
  try {
    const h = JSON.parse(ruw) as Herhaling
    if (!h || typeof h.stap !== 'number' || h.stap < 1) return null
    if (!['dag', 'werkdag', 'week', 'maand', 'jaar'].includes(h.eenheid)) return null
    return h
  } catch {
    return null
  }
}

export function schrijfHerhaling(h: Herhaling): string {
  return JSON.stringify(h)
}

/** Hoe het er in het venster en op een kaart komt te staan. */
export function toonHerhaling(h: Herhaling): string {
  const elke = h.stap === 1 ? 'elke' : `elke ${h.stap}`
  if (h.eenheid === 'dag') return h.stap === 1 ? 'elke dag' : `elke ${h.stap} dagen`
  if (h.eenheid === 'werkdag') return 'elke werkdag'
  if (h.eenheid === 'week') {
    const dag = h.weekdag === undefined ? '' : ` op ${WEEKDAGEN[h.weekdag]}`
    return `${h.stap === 1 ? 'elke week' : `elke ${h.stap} weken`}${dag}`
  }
  if (h.eenheid === 'maand') return h.stap === 1 ? 'elke maand' : `elke ${h.stap} maanden`
  return h.stap === 1 ? 'elk jaar' : `${elke} jaar`
}

// Alleen aan het begin of na een spatie, en het woord moet ook echt aflopen.
const START = '(?<voor>^|[\\s(])'
const EIND = '(?=$|[\\s.,;:!?)])'
const AANTAL = '(?<aantal>\\d{1,2}|een|twee|drie|vier|vijf|zes)'
const ELKE = '(?:elke|elk|iedere|ieder)'
const WEEKDAG = WEEKDAGEN.join('|')

interface Regel {
  patroon: RegExp
  naar: (g: Record<string, string | undefined>) => Herhaling | null
}

const REGELS: Regel[] = [
  {
    patroon: new RegExp(`${START}(?:dagelijks|${ELKE}\\s+dag)${EIND}`, 'giu'),
    naar: () => ({ eenheid: 'dag', stap: 1 }),
  },
  {
    patroon: new RegExp(`${START}${ELKE}\\s+werkdag${EIND}`, 'giu'),
    naar: () => ({ eenheid: 'werkdag', stap: 1 }),
  },
  {
    patroon: new RegExp(`${START}(?:wekelijks|${ELKE}\\s+week)${EIND}`, 'giu'),
    naar: () => ({ eenheid: 'week', stap: 1 }),
  },
  {
    patroon: new RegExp(`${START}(?:maandelijks|${ELKE}\\s+maand)${EIND}`, 'giu'),
    naar: () => ({ eenheid: 'maand', stap: 1 }),
  },
  {
    patroon: new RegExp(`${START}(?:jaarlijks|${ELKE}\\s+jaar)${EIND}`, 'giu'),
    naar: () => ({ eenheid: 'jaar', stap: 1 }),
  },
  {
    patroon: new RegExp(`${START}${ELKE}\\s+(?<dag>${WEEKDAG})${EIND}`, 'giu'),
    naar: (g) => ({ eenheid: 'week', stap: 1, weekdag: WEEKDAGEN.indexOf(g.dag!.toLowerCase()) }),
  },
  {
    patroon: new RegExp(
      `${START}${ELKE}\\s+${AANTAL}\\s+(?<eenheid>dagen|weken|maanden|jaar)${EIND}`,
      'giu',
    ),
    naar: (g) => {
      const stap = GETALLEN[g.aantal!.toLowerCase()] ?? Number(g.aantal)
      if (!Number.isInteger(stap) || stap < 1) return null
      const eenheid =
        g.eenheid === 'dagen' ? 'dag' : g.eenheid === 'weken' ? 'week' : g.eenheid === 'maanden' ? 'maand' : 'jaar'
      return { eenheid, stap }
    },
  },
]

export interface Herhalingstreffer {
  van: number
  tot: number
  herhaling: Herhaling
}

/** De eerste herhaling in de tekst. Net als bij datums wint bij gelijke start
 *  de langste: "elke 2 weken" zegt meer dan "elke week" zou doen. */
export function vindHerhaling(tekst: string): Herhalingstreffer | null {
  let beste: Herhalingstreffer | null = null

  for (const regel of REGELS) {
    for (const m of tekst.matchAll(regel.patroon)) {
      const herhaling = regel.naar(m.groups ?? {})
      if (!herhaling) continue
      const van = (m.index ?? 0) + (m.groups?.voor?.length ?? 0)
      const treffer = { van, tot: (m.index ?? 0) + m[0].length, herhaling }
      const beter =
        !beste || treffer.van < beste.van || (treffer.van === beste.van && treffer.tot > beste.tot)
      if (beter) beste = treffer
    }
  }

  return beste
}

/** Wanneer een nieuwe herhalende taak voor het eerst aan de beurt is. Typ je
 *  "elke maandag" op een woensdag, dan begint hij komende maandag - niet
 *  vandaag, want vandaag is geen maandag. */
export function eersteDatum(h: Herhaling, vanaf = new Date()): string {
  if (h.eenheid === 'week' && h.weekdag !== undefined) {
    return toISODate(erbij(vanaf, (h.weekdag - vanaf.getDay() + 7) % 7))
  }
  if (h.eenheid === 'werkdag') {
    const dag = vanaf.getDay()
    if (dag === 6) return toISODate(erbij(vanaf, 2))
    if (dag === 0) return toISODate(erbij(vanaf, 1))
  }
  return toISODate(vanaf)
}

/** De volgende keer, gerekend vanaf de dag waarop de taak stond. Zo blijft
 *  "elke maandag" op maandag vallen, ook als je hem pas woensdag afvinkt. */
export function volgendeDatum(h: Herhaling, vanafISO: string): string {
  const vanaf = parseISODate(vanafISO)

  switch (h.eenheid) {
    case 'dag':
      return toISODate(erbij(vanaf, h.stap))

    case 'werkdag': {
      let d = erbij(vanaf, 1)
      while (d.getDay() === 0 || d.getDay() === 6) d = erbij(d, 1)
      return toISODate(d)
    }

    case 'week':
      return toISODate(erbij(vanaf, 7 * h.stap))

    case 'maand':
      return toISODate(maandenErbij(vanaf, h.stap))

    case 'jaar':
      return toISODate(maandenErbij(vanaf, 12 * h.stap))
  }
}

function erbij(d: Date, dagen: number): Date {
  const kopie = new Date(d)
  kopie.setDate(kopie.getDate() + dagen)
  return kopie
}

/** Maanden erbij zonder over te lopen: 31 januari plus een maand is hier
 *  28 februari en niet 3 maart. */
function maandenErbij(d: Date, maanden: number): Date {
  const dag = d.getDate()
  const doel = new Date(d.getFullYear(), d.getMonth() + maanden, 1)
  const laatste = new Date(doel.getFullYear(), doel.getMonth() + 1, 0).getDate()
  doel.setDate(Math.min(dag, laatste))
  return doel
}
