import type { TaskWithMeta } from '../lib/types'
import { TaakRegel } from './TaakRegel'

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
  accent,
  children,
}: {
  titel: string
  aantal?: number
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="mb-7">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className={accent ? 'text-danger' : ''}>{titel}</span>
        {aantal !== undefined && aantal > 0 && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-soft">
            {aantal}
          </span>
        )}
      </h2>
      {children}
    </section>
  )
}
