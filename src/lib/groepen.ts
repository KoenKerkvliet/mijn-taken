import type { ReactNode } from 'react'
import { maandNaam, parseISODate, startVanDeWeek, toISODate, toonDatum } from './dates'
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

/** De indeling van een bord op een pagina zonder eigen dagindeling.
 *
 *  De weken lopen mee met de kalender, niet met een venster van zeven dagen
 *  vanaf vandaag. Anders valt "volgende week donderdag" op een vrijdag onder
 *  "deze week", terwijl je hem net als volgende week hebt ingetypt. Deze week
 *  loopt dus tot en met zondag, volgende week is de maandag daarna tot en met
 *  de zondag erop.
 *
 *  Een taak komt in de eerste kolom die past. Op een zondag hoort "morgen" al
 *  bij de week erna; die staat dan onder Morgen en niet nog eens onder
 *  Volgende week. */
export function opDatumGroeperen(taken: TaskWithMeta[], nu = new Date()): Groep[] {
  const vandaagISO = toISODate(nu)
  const morgenISO = dagErbij(nu, 1)
  const overmorgenISO = dagErbij(nu, 2)

  const maandag = startVanDeWeek(nu)
  const zondagISO = dagErbij(maandag, 6)
  const volgendeZondagISO = dagErbij(maandag, 13)

  /** Waar een taak landt die je in deze kolom laat vallen: de eerste dag van
   *  het vak die nog niet door Vandaag of Morgen is opgeëist. Ligt die dag
   *  voorbij het einde van het vak, dan valt er niets te plaatsen. */
  function eersteDag(begin: string, einde: string): string | undefined {
    const dag = begin < overmorgenISO ? overmorgenISO : begin
    return dag <= einde ? dag : undefined
  }

  const groepen: Groep[] = [
    { sleutel: 'telaat', titel: 'Over tijd', accent: true, taken: [], leegTekst: 'Niets te laat.' },
    { sleutel: 'vandaag', titel: 'Vandaag', datum: vandaagISO, taken: [] },
    { sleutel: 'morgen', titel: 'Morgen', datum: morgenISO, taken: [] },
    {
      sleutel: 'week',
      titel: 'Deze week',
      datum: eersteDag(overmorgenISO, zondagISO),
      taken: [],
    },
    {
      sleutel: 'volgendeweek',
      titel: 'Volgende week',
      datum: eersteDag(dagErbij(maandag, 7), volgendeZondagISO),
      taken: [],
    },
    { sleutel: 'later', titel: 'Later', taken: [] },
    { sleutel: 'geendatum', titel: 'Geen datum', datum: null, taken: [] },
  ]

  const bij = (sleutel: string) => groepen.find((g) => g.sleutel === sleutel)!

  for (const t of taken) {
    if (!t.due_date) bij('geendatum').taken.push(t)
    else if (t.due_date < vandaagISO) bij('telaat').taken.push(t)
    else if (t.due_date === vandaagISO) bij('vandaag').taken.push(t)
    else if (t.due_date === morgenISO) bij('morgen').taken.push(t)
    else if (t.due_date <= zondagISO) bij('week').taken.push(t)
    else if (t.due_date <= volgendeZondagISO) bij('volgendeweek').taken.push(t)
    else bij('later').taken.push(t)
  }

  return groepen.map((g) => ({ ...g, taken: sorteerTaken(g.taken) }))
}

/** Afgevinkte taken onder kopjes, nieuwste eerst: Vandaag, Gisteren, Eerder
 *  deze week, Vorige week en daarna per maand. Een "Ouder" onderaan zou weer
 *  de grote hoop worden waar dit juist vanaf moet; een maand blijft te
 *  overzien, ook na een jaar. Lege kopjes vallen weg, zoals "Eerder deze week"
 *  op een dinsdag, als maandag al Gisteren is. */
export function opAfgerondGroeperen(taken: TaskWithMeta[], nu = new Date()): Groep[] {
  const vandaagISO = toISODate(nu)
  const gisterenISO = dagErbij(nu, -1)
  const maandag = startVanDeWeek(nu)
  const maandagISO = toISODate(maandag)
  const vorigeMaandagISO = dagErbij(maandag, -7)

  const groepen = new Map<string, Groep>()
  const nieuwsteEerst = [...taken].sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))

  for (const t of nieuwsteEerst) {
    const moment = new Date(t.completed_at!)
    const dag = toISODate(moment)

    let sleutel: string
    let titel: string
    if (dag === vandaagISO) [sleutel, titel] = ['vandaag', 'Vandaag']
    else if (dag === gisterenISO) [sleutel, titel] = ['gisteren', 'Gisteren']
    else if (dag >= maandagISO) [sleutel, titel] = ['week', 'Eerder deze week']
    else if (dag >= vorigeMaandagISO) [sleutel, titel] = ['vorigeweek', 'Vorige week']
    else {
      sleutel = dag.slice(0, 7)
      const jaar = moment.getFullYear() === nu.getFullYear() ? '' : ` ${moment.getFullYear()}`
      titel = `${maandNaam(moment)}${jaar}`
    }

    const groep = groepen.get(sleutel)
    if (groep) groep.taken.push(t)
    else groepen.set(sleutel, { sleutel, titel, taken: [t] })
  }

  // Een Map onthoudt de volgorde van toevoegen, en de taken kwamen al op
  // volgorde binnen.
  return [...groepen.values()]
}

function dagErbij(vanaf: Date, dagen: number): string {
  const d = new Date(vanaf)
  d.setDate(d.getDate() + dagen)
  return toISODate(d)
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
