/** Hoe lang je denkt dat een taak duurt, kort ingetypt: "5m", "30m", "1u",
 *  "1u30m". Alleen m en u - geen "min", "uur" of "h" - zodat het één
 *  schrijfwijze blijft die je op een telefoon in twee tikken hebt.
 *
 *  Opgeslagen wordt het in hele minuten; "1u" en "60m" zijn dus hetzelfde. */
import type { Task } from './types'

export interface Duurtreffer {
  van: number
  tot: number
  minuten: number
}

// Los in de tekst, net als "p1": in "Step5m" of "A4u" zit geen duur.
const DUUR = /(^|[\s(])(?:(?<uren>\d{1,2})u(?:(?<rest>\d{1,2})m)?|(?<minuten>\d{1,4})m)(?=$|[\s.,;:!?)])/iu

/** Langer dan een dag is geen inschatting meer maar een project. */
const MAX = 24 * 60

/** Leest precies één duur, zoals in het veld van het taakvenster: "45m",
 *  "2u", "1u15m". null als het dat niet is. */
export function leesDuur(tekst: string): number | null {
  const treffer = vindDuur(tekst.trim())
  if (!treffer || treffer.van !== 0 || treffer.tot !== tekst.trim().length) return null
  return treffer.minuten
}

/** De eerste duur in een titel. */
export function vindDuur(tekst: string): Duurtreffer | null {
  const m = DUUR.exec(tekst)
  if (!m) return null

  const g = m.groups ?? {}
  const minuten = g.uren
    ? Number(g.uren) * 60 + Number(g.rest ?? 0)
    : Number(g.minuten)
  // "0m" is geen inschatting, en "1u75m" schrijft niemand die 2u15m bedoelt.
  if (minuten <= 0 || minuten > MAX || Number(g.rest ?? 0) >= 60) return null

  const van = m.index + m[1].length
  return { van, tot: m.index + m[0].length, minuten }
}

/** Wat de open taken samen aan tijd kosten, in minuten. Afgevinkt werk telt
 *  niet mee: dat hoeft niet meer te gebeuren. */
export function totaleDuur(taken: Pick<Task, 'completed_at' | 'duration_minutes'>[]): number {
  return taken.reduce((som, t) => (t.completed_at ? som : som + (t.duration_minutes ?? 0)), 0)
}

/** Terug naar dezelfde schrijfwijze als je intypt: 5m, 1u, 1u30m. */
export function toonDuur(minuten: number): string {
  const uren = Math.floor(minuten / 60)
  const rest = minuten % 60
  if (uren === 0) return `${rest}m`
  return rest === 0 ? `${uren}u` : `${uren}u${rest}m`
}
