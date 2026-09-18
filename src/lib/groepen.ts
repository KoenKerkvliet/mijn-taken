import type { ReactNode } from 'react'
import { dagenVanafVandaag, overDagen, parseISODate, toonDatum, vandaag } from './dates'
import { sorteerTaken } from './sorteren'
import type { TaskWithMeta } from './types'

/** Een kopje met taken eronder. Elke pagina levert zijn eigen groepen aan; de
 *  weergave (lijst, bord of agenda) bepaalt alleen nog hoe ze eruitzien. */
export interface Groep {
  sleutel: string
  titel: string
  /** De dag waar deze groep bij hoort. `undefined` betekent: hier kun je niets
   *  naartoe slepen. `null` is de kolom "Geen datum" en wist juist de datum. */
  datum?: string | null
  /** Rood kopje, voor achterstallig werk. */
  accent?: boolean
  /** Knop naast het kopje, zoals "Herplannen" bij wat te laat is. */
  actie?: ReactNode
  /** Geen kopje boven de lijst. Voor een pagina die maar één groep heeft en
   *  al een titel bovenaan draagt. */
  zonderKop?: boolean
  taken: TaskWithMeta[]
  leegTekst?: string
}

/** De indeling die een bord bruikbaar maakt op een pagina zonder eigen
 *  dagindeling: te laat, vandaag, morgen, de rest van de week, later, en wat
 *  helemaal geen datum heeft. Lege kolommen blijven staan - een bord waarvan
 *  de kolommen verspringen zodra je iets versleept, is niet te volgen. */
export function opDatumGroeperen(taken: TaskWithMeta[]): Groep[] {
  const nu = vandaag()
  const groepen: Groep[] = [
    { sleutel: 'telaat', titel: 'Over tijd', accent: true, taken: [], leegTekst: 'Niets te laat.' },
    { sleutel: 'vandaag', titel: 'Vandaag', datum: nu, taken: [] },
    { sleutel: 'morgen', titel: 'Morgen', datum: overDagen(1), taken: [] },
    { sleutel: 'week', titel: 'Deze week', datum: overDagen(2), taken: [] },
    { sleutel: 'later', titel: 'Later', taken: [] },
    { sleutel: 'geendatum', titel: 'Geen datum', datum: null, taken: [] },
  ]

  const bij = (sleutel: string) => groepen.find((g) => g.sleutel === sleutel)!

  for (const t of taken) {
    if (!t.due_date) {
      bij('geendatum').taken.push(t)
      continue
    }
    const verschil = dagenVanafVandaag(t.due_date)
    if (verschil < 0) bij('telaat').taken.push(t)
    else if (verschil === 0) bij('vandaag').taken.push(t)
    else if (verschil === 1) bij('morgen').taken.push(t)
    else if (verschil < 7) bij('week').taken.push(t)
    else bij('later').taken.push(t)
  }

  return groepen.map((g) => ({ ...g, taken: sorteerTaken(g.taken) }))
}

/** Kopje voor een losse dag: "Vandaag · 18 sep." of "3 oktober". */
export function dagTitel(iso: string): string {
  const naam = toonDatum(iso) ?? iso
  // "Vandaag" en "vrijdag" zeggen niet wélke dag het is; daar hoort de datum
  // nog bij. "3 oktober" zegt dat al wel.
  if (/^\d/u.test(naam)) return naam
  const kort = new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
  }).format(parseISODate(iso))
  return `${naam} · ${kort}`
}
