import type { Priority } from './types'

/** Eén lijst voor de keuzelijst in het venster, het rondje voor een taak en de
 *  markering van "p1" in een titel. */
export const PRIORITEITEN: { waarde: Priority; naam: string; kleur: string }[] = [
  { waarde: 1, naam: 'Urgent', kleur: '#dc2626' },
  { waarde: 2, naam: 'Hoog', kleur: '#ea580c' },
  { waarde: 3, naam: 'Normaal', kleur: '#2563eb' },
  { waarde: 4, naam: 'Laag', kleur: '#94a3b8' },
]

export function kleurVanPrioriteit(waarde: Priority): string {
  return PRIORITEITEN.find((p) => p.waarde === waarde)?.kleur ?? '#94a3b8'
}
