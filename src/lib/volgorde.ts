import type { List } from './types'

/** Een lijst een plaats omhoog of omlaag in de zijbalk.
 *
 *  Er wordt geruild met de dichtstbijzijnde buur die net zo opgeborgen is:
 *  een gearchiveerde lijst hoort niet ineens tussen de gewone te staan omdat
 *  je iets verplaatste. Daarna krijgt alles opnieuw een nummer, want posities
 *  die ooit gelijk waren (bijvoorbeeld bij lijsten die met de hand in Supabase
 *  zijn gezet) leveren anders een volgorde op die na een herlaadbeurt anders
 *  is dan op het scherm. */
export function verplaats(lijsten: List[], id: string, richting: 'omhoog' | 'omlaag'): List[] {
  const op = [...lijsten].sort((a, b) => a.position - b.position)
  const van = op.findIndex((l) => l.id === id)
  if (van === -1) return op

  const opgeborgen = (l: List) => Boolean(l.archived_at)
  const stap = richting === 'omhoog' ? -1 : 1

  let naar = van + stap
  while (naar >= 0 && naar < op.length && opgeborgen(op[naar]) !== opgeborgen(op[van])) {
    naar += stap
  }
  if (naar < 0 || naar >= op.length) return op

  const nieuw = [...op]
  ;[nieuw[van], nieuw[naar]] = [nieuw[naar], nieuw[van]]
  return nieuw.map((l, i) => ({ ...l, position: i }))
}

/** Kan deze lijst nog die kant op? Voor het grijs maken van een menu-item. */
export function kanVerplaatsen(lijsten: List[], id: string, richting: 'omhoog' | 'omlaag'): boolean {
  const op = [...lijsten].sort((a, b) => a.position - b.position)
  const zelfde = op.filter((l) => Boolean(l.archived_at) === Boolean(op.find((x) => x.id === id)?.archived_at))
  const van = zelfde.findIndex((l) => l.id === id)
  if (van === -1) return false
  return richting === 'omhoog' ? van > 0 : van < zelfde.length - 1
}
