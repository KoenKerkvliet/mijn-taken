/** Datums in dit programma zijn kale dagen (YYYY-MM-DD), geen momenten.
 *  Alles hieronder rekent daarom in lokale tijd en nooit via toISOString(),
 *  dat zou in Nederland een dag kunnen verschuiven. */

export function toISODate(d: Date): string {
  const maand = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${maand}-${dag}`
}

export function vandaag(): string {
  return toISODate(new Date())
}

export function overDagen(aantal: number): string {
  const d = new Date()
  d.setDate(d.getDate() + aantal)
  return toISODate(d)
}

export function parseISODate(iso: string): Date {
  const [j, m, d] = iso.split('-').map(Number)
  return new Date(j, m - 1, d)
}

const WEEKDAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MAAND = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/** 'Vandaag', 'Morgen', 'vrijdag' of '3 oktober' - net als in een agenda. */
export function toonDatum(iso: string | null): string | null {
  if (!iso) return null
  const d = parseISODate(iso)
  const verschil = dagenVanafVandaag(iso)

  if (verschil === 0) return 'Vandaag'
  if (verschil === 1) return 'Morgen'
  if (verschil === -1) return 'Gisteren'
  if (verschil > 1 && verschil < 7) return WEEKDAG[d.getDay()]
  if (verschil < 0 && verschil > -7) return `${WEEKDAG[d.getDay()]} (te laat)`

  const jaar = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${d.getDate()} ${MAAND[d.getMonth()]}${jaar}`
}

export function dagenVanafVandaag(iso: string): number {
  const nu = new Date()
  nu.setHours(0, 0, 0, 0)
  const d = parseISODate(iso)
  return Math.round((d.getTime() - nu.getTime()) / 86_400_000)
}

export function isAchterstallig(iso: string | null): boolean {
  return iso !== null && dagenVanafVandaag(iso) < 0
}

/** Maandag als eerste dag, zoals hier gebruikelijk. */
export function startVanDeWeek(d = new Date()): Date {
  const kopie = new Date(d)
  const dag = (kopie.getDay() + 6) % 7
  kopie.setDate(kopie.getDate() - dag)
  kopie.setHours(0, 0, 0, 0)
  return kopie
}

const MAAND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/** De naam van een maand, zoals boven een groep afgevinkte taken. */
export function maandNaam(d: Date): string {
  return MAAND[d.getMonth()]
}

/** Wanneer een taak is afgevinkt. Dat is wel een moment, geen kale dag: kort
 *  geleden telt de tijd, daarna alleen nog de dag. */
export function toonAfgerond(tijdstip: string): string {
  const d = new Date(tijdstip)
  const verschil = dagenVanafVandaag(toISODate(d))
  const tijd = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

  if (verschil === 0) return `vandaag ${tijd}`
  if (verschil === -1) return `gisteren ${tijd}`
  if (d.getFullYear() === new Date().getFullYear()) {
    return `${WEEKDAG[d.getDay()].slice(0, 2)} ${d.getDate()} ${MAAND_KORT[d.getMonth()]}`
  }
  return `${d.getDate()} ${MAAND_KORT[d.getMonth()]} ${d.getFullYear()}`
}
