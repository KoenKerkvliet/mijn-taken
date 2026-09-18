import type { Label, List } from './types'

/** Tags in de titel: "Verslagen uitwerken #klas" hangt de taak aan lijst
 *  "Klas" en houdt "Verslagen uitwerken" over als titel.
 *
 *  Eerst wordt er in de lijsten gezocht, daarna in de labels. Die volgorde is
 *  er omdat de zijbalk labels al als #naam toont: staat er geen lijst met die
 *  naam, dan is een label de enige andere zinnige bedoeling.
 *
 *  Een tag die nergens op slaat blijft gewoon in de titel staan. Vanzelf een
 *  lijst aanmaken klinkt behulpzaam, maar bij één tikfout zit je met een lijst
 *  "#klsa" die je later met de hand moet opruimen. */

// Alleen na het begin of een spatie, zodat een "C#" in een titel heel blijft.
const TAG = /(^|\s)#([\p{L}\p{N}_-]+)/gu

/** Vergelijkt namen door alles weg te halen wat je niet in een tag typt:
 *  hoofdletters, accenten, spaties en leestekens. Zo vindt #werkschool ook
 *  de lijst "Werk & school". */
export function normaliseer(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase()
}

export interface Tagstuk {
  van: number
  tot: number
  soort: 'lijst' | 'label'
  kleur: string
}

export interface Tagtreffer {
  lijst: List | null
  labels: Label[]
  /** Tags zonder lijst of label erachter; die blijven in de titel staan. */
  onbekend: string[]
  /** Waar de herkende tags staan, voor het markeren en wegknippen. */
  stukken: Tagstuk[]
}

export function vindTags(ruweTitel: string, lijsten: List[], labels: Label[]): Tagtreffer {
  let lijst: List | null = null
  const gevondenLabels: Label[] = []
  const onbekend: string[] = []
  const stukken: Tagstuk[] = []

  for (const match of ruweTitel.matchAll(TAG)) {
    const naam = match[2]
    const sleutel = normaliseer(naam)
    // match.index wijst naar de spatie ervoor; de tag zelf begint erna.
    const van = (match.index ?? 0) + match[1].length
    const tot = van + naam.length + 1

    const lijstTreffer = lijsten.find((l) => normaliseer(l.name) === sleutel)
    // De eerste lijst wint: een taak kan er maar in één staan, en een tweede
    // tag stilletjes negeren is verwarrender dan hem laten staan.
    if (lijstTreffer && !lijst) {
      lijst = lijstTreffer
      stukken.push({ van, tot, soort: 'lijst', kleur: lijstTreffer.color })
      continue
    }

    const labelTreffer = labels.find((l) => normaliseer(l.name) === sleutel)
    if (labelTreffer && !lijstTreffer) {
      if (!gevondenLabels.some((l) => l.id === labelTreffer.id)) gevondenLabels.push(labelTreffer)
      stukken.push({ van, tot, soort: 'label', kleur: labelTreffer.color })
      continue
    }

    onbekend.push(naam)
  }

  return { lijst, labels: gevondenLabels, onbekend, stukken }
}
