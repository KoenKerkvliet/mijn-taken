import type { Label, List, Priority } from './types'
import { vindTags } from './tags'
import { vindDatum } from './datumtaal'
import { kleurVanPrioriteit } from './prioriteiten'

/** Alles wat een titel over zichzelf verklapt: een lijst of label achter een
 *  #, een datum in gewone woorden, en een prioriteit als p1 tot en met p4.
 *  Wat herkend wordt verdwijnt uit de titel en komt in het juiste veld terecht.
 *
 *  Eén plek voor alle drie, want ze knippen in dezelfde tekst. Los van elkaar
 *  zouden de posities na de eerste knipbeurt niet meer kloppen. */

export type Soort = 'lijst' | 'label' | 'datum' | 'prioriteit'

export interface Stuk {
  van: number
  tot: number
  soort: Soort
  /** Kleur voor de markering in het invoerveld. */
  kleur?: string
}

export interface Titeluitkomst {
  /** De titel zoals hij opgeslagen wordt. */
  titel: string
  lijst: List | null
  labels: Label[]
  onbekend: string[]
  datum: string | null
  prioriteit: Priority | null
  /** De herkende stukken, op volgorde, om ze in het veld te markeren. */
  stukken: Stuk[]
}

/** De titel zoals hij is, zonder er iets uit te lezen. Voor een taak die al
 *  bestaat: die titel is ooit bewust zo opgeslagen, en een oud "Rapport 5 mei
 *  bespreken" hoort niet bij het eerste het beste bewerken ineens "Rapport
 *  bespreken" te worden. Bij het maken van een taak typ je de woorden juist
 *  net, en dan is het herkennen wel de bedoeling. */
export function letterlijk(ruweTitel: string): Titeluitkomst {
  return {
    titel: ruweTitel.trim(),
    lijst: null,
    labels: [],
    onbekend: [],
    datum: null,
    prioriteit: null,
    stukken: [],
  }
}

// "p1" tot "p4", los in de tekst. Niet in "Top3" of "stap2" dus.
const PRIORITEIT = /(^|[\s(])p(?<cijfer>[1-4])(?=$|[\s.,;:!?)])/giu

export function leesTitel(
  ruweTitel: string,
  lijsten: List[],
  labels: Label[],
  nu = new Date(),
): Titeluitkomst {
  const kaal: Titeluitkomst = {
    titel: ruweTitel.trim(),
    lijst: null,
    labels: [],
    onbekend: [],
    datum: null,
    prioriteit: null,
    stukken: [],
  }

  const tags = vindTags(ruweTitel, lijsten, labels)
  const stukken: Stuk[] = [...tags.stukken]

  const datum = vindDatum(ruweTitel, nu)
  if (datum) stukken.push({ van: datum.van, tot: datum.tot, soort: 'datum' })

  const prioriteitTreffer = PRIORITEIT.exec(ruweTitel)
  // exec met een g-vlag onthoudt waar hij gebleven was; de volgende titel zou
  // anders vanaf die plek beginnen te zoeken.
  PRIORITEIT.lastIndex = 0

  let prioriteit: Priority | null = null
  if (prioriteitTreffer) {
    prioriteit = Number(prioriteitTreffer.groups!.cijfer) as Priority
    const van = (prioriteitTreffer.index ?? 0) + prioriteitTreffer[1].length
    stukken.push({
      van,
      tot: van + 2,
      soort: 'prioriteit',
      kleur: kleurVanPrioriteit(prioriteit),
    })
  }

  if (stukken.length === 0) return { ...kaal, onbekend: tags.onbekend }

  stukken.sort((a, b) => a.van - b.van)
  const titel = knip(ruweTitel, stukken)

  // "morgen" als hele titel: dan is het woord blijkbaar de taak. Liever niets
  // koppelen dan een taak zonder titel overhouden.
  if (!titel) return kaal

  return {
    titel,
    lijst: tags.lijst,
    labels: tags.labels,
    onbekend: tags.onbekend,
    datum: datum?.iso ?? null,
    prioriteit,
    stukken,
  }
}

function knip(ruweTitel: string, stukken: Stuk[]): string {
  let titel = ''
  let positie = 0
  for (const stuk of stukken) {
    // Overlappende stukken kunnen niet ontstaan zolang de patronen elkaar
    // uitsluiten, maar een halve knip zou een titel verminken; dus overslaan.
    if (stuk.van < positie) continue
    titel += ruweTitel.slice(positie, stuk.van)
    positie = stuk.tot
  }
  titel += ruweTitel.slice(positie)
  return titel.replace(/\s+/gu, ' ').trim()
}
