import type { TaskWithMeta } from '../lib/types'
import { TaakRegel } from './TaakRegel'
import { toonDuur } from '../lib/duur'

interface Props {
  taken: TaskWithMeta[]
  opBewerken: (taak: TaskWithMeta) => void
  toonLijst?: boolean
  leegTekst?: string
}

export function TakenLijst({ taken, opBewerken, toonLijst, leegTekst = 'Niets te doen hier.' }: Props) {
  if (taken.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-faint">
        {leegTekst}
      </div>
    )
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-line bg-surface">
      {taken.map((t) => (
        <TaakRegel key={t.id} taak={t} opBewerken={opBewerken} toonLijst={toonLijst} />
      ))}
    </ul>
  )
}

export function Sectie({
  titel,
  aantal,
  duur,
  accent,
  actie,
  children,
}: {
  titel: string
  aantal?: number
  /** De geschatte duur van de taken samen, in minuten. */
  duur?: number
  accent?: boolean
  /** Knop rechts van het kopje; blijft leeg als er niets te doen valt. */
  actie?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mb-7">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className={['first-letter:uppercase', accent ? 'text-danger' : ''].join(' ')}>
          {titel}
        </span>
        {aantal !== undefined && aantal > 0 && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-soft">
            {aantal}
          </span>
        )}
        {duur !== undefined && duur > 0 && (
          <span className="text-xs font-medium text-ink-faint" title="Geschatte duur samen">
            ⏱️ {toonDuur(duur)}
          </span>
        )}
        {actie && <span className="ml-auto">{actie}</span>}
      </h2>
      {children}
    </section>
  )
}
