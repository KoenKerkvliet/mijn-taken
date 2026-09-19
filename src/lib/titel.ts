import type { Label, List, Priority } from './types'
import { vindTags } from './tags'
import { vindDatum } from './datumtaal'
import { eersteDatum, schrijfHerhaling, vindHerhaling, type Herhaling } from './herhaling'
import { kleurVanPrioriteit } from './prioriteiten'

/** Alles wat een titel over zichzelf verklapt: een lijst of label achter een
 *  #, een datum in gewone woorden, en een prioriteit als p1 tot en met p4.
 *  Wat herkend wordt verdwijnt uit de titel en komt in het juiste veld terecht.
 *
 *  Eén plek voor alle drie, want ze knippen in dezelfde tekst. Los van elkaar
 *  zouden de posities na de eerste knipbeurt niet meer kloppen. */

export type Soort = 'lijst' | 'label' | 'datum' | 'prioriteit' | 'herhaling'

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
  herhaling: Herhaling | null
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
    herhaling: null,
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
    herhaling: null,
    stukken: [],
  }

  const tags = vindTags(ruweTitel, lijsten, labels)
  const stukken: Stuk[] = [...tags.stukken]

  // Eerst de herhaling, want die eet de weekdag op: in "elke maandag" is
  // "maandag" geen losse dag maar een deel van het ritme. Wat hij pakt wordt
  // daarom uit de tekst gehaald voordat de datumlezer erlangs gaat - met
  // spaties, zodat alle posities blijven kloppen.
  const herhaling = vindHerhaling(ruweTitel)
  let voorDatum = ruweTitel
  if (herhaling) {
    // Een eigen kleur, zodat je ziet dat dit iets anders is dan een datum.
    stukken.push({
      van: herhaling.van,
      tot: herhaling.tot,
      soort: 'herhaling',
      kleur: 'var(--color-success)',
    })
    voorDatum =
      ruweTitel.slice(0, herhaling.van) +
      ' '.repeat(herhaling.tot - herhaling.van) +
      ruweTitel.slice(herhaling.tot)
  }

  const datum = vindDatum(voorDatum, nu)
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
    // Een herhaling zonder datum moet ergens beginnen: bij de eerstvolgende
    // keer dat hij aan de beurt is.
    datum: datum?.iso ?? (herhaling ? eersteDatum(herhaling.herhaling, nu) : null),
    prioriteit,
    herhaling: herhaling?.herhaling ?? null,
    stukken,
  }
}

/** De herhaling zoals hij de database in gaat. */
export function herhalingVoorOpslag(uitkomst: Titeluitkomst): string | null {
  return uitkomst.herhaling ? schrijfHerhaling(uitkomst.herhaling) : null
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
