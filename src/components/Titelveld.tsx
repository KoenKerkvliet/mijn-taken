import { useEffect, useRef } from 'react'
import type { Stuk } from '../lib/titel'

interface Props {
  waarde: string
  opWijzigen: (waarde: string) => void
  /** Wat er herkend is: die stukken krijgen een kleurtje.  */
  stukken: Stuk[]
  placeholder?: string
}

/** Het titelveld met een gekleurde markering over wat er herkend is: een
 *  datum, een prioriteit, een lijst of een label.
 *
 *  Een invoerveld kan geen halve zin kleuren, dus er ligt een tweede laag
 *  onder met dezelfde tekst - onzichtbaar, alleen de vlakjes erachter zijn te
 *  zien. Dat scheelt een contenteditable: knippen, plakken, ongedaan maken en
 *  de cursor blijven gewoon van de browser. */
export function Titelveld({ waarde, opWijzigen, stukken, placeholder }: Props) {
  const spiegel = useRef<HTMLDivElement>(null)
  const veld = useRef<HTMLInputElement>(null)

  // Bij een lange titel schuift het veld mee met de cursor; de laag eronder
  // moet dan precies even ver mee, anders staan de vlakjes scheef.
  useEffect(() => {
    if (spiegel.current && veld.current) spiegel.current.scrollLeft = veld.current.scrollLeft
  }, [waarde, stukken])

  const LETTERS = 'text-lg leading-7 font-medium tracking-normal'

  return (
    <div className="relative">
      <div
        ref={spiegel}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden p-0 whitespace-pre text-transparent ${LETTERS}`}
      >
        {verdeel(waarde, stukken)}
      </div>

      <input
        ref={veld}
        autoFocus
        value={waarde}
        onChange={(e) => opWijzigen(e.target.value)}
        onScroll={(e) => {
          if (spiegel.current) spiegel.current.scrollLeft = e.currentTarget.scrollLeft
        }}
        placeholder={placeholder}
        className={`relative w-full bg-transparent p-0 outline-none placeholder:text-ink-faint ${LETTERS}`}
      />
    </div>
  )
}

function verdeel(waarde: string, stukken: Stuk[]) {
  const delen: React.ReactNode[] = []
  let positie = 0

  for (const stuk of stukken) {
    if (stuk.van < positie) continue
    delen.push(waarde.slice(positie, stuk.van))

    // De vlakjes mogen de tekst geen haarbreed opschuiven, anders loopt de
    // markering uit de pas met het veld erboven. Vandaar de rand als schaduw
    // in plaats van als opvulling: die telt niet mee voor de opmaak.
    const verf = `color-mix(in srgb, ${stuk.kleur ?? 'var(--color-brand)'} 28%, transparent)`
    delen.push(
      <span
        key={`${stuk.van}-${stuk.soort}`}
        className="rounded-sm"
        style={{ background: verf, boxShadow: `0 0 0 2px ${verf}` }}
      >
        {waarde.slice(stuk.van, stuk.tot)}
      </span>,
    )
    positie = stuk.tot
  }

  delen.push(waarde.slice(positie))
  return delen
}
