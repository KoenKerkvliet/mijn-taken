/** Vaste reeks voor nieuwe lijsten en labels. Gewoon op volgorde doorlopen:
 *  een willekeurige kleur levert te vaak twee bijna gelijke buren op. */
export const LIJSTKLEUREN = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#64748b',
]

export function volgendeKleur(aantalBestaand: number): string {
  return LIJSTKLEUREN[aantalBestaand % LIJSTKLEUREN.length]
}
