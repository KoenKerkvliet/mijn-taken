import { useMemo, useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { TaskWithMeta } from '../lib/types'
import { parseISODate, startVanDeWeek, toISODate, vandaag } from '../lib/dates'
import { dagTitel } from '../lib/groepen'
import { sorteerTaken } from '../lib/sorteren'
import { PRIORITEITEN } from './TaakDialoog'
import { TakenLijst } from './TakenLijst'

const DAGKOPPEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

interface Props {
  taken: TaskWithMeta[]
  opBewerken: (taak: TaskWithMeta) => void
  opNieuweTaak: (standaarden?: { lijstId?: string | null; datum?: string | null }) => void
  lijstId?: string | null
}

/** Een maand in één beeld. Een taak naar een andere dag slepen verzet hem,
 *  net als op het bord; taken zonder datum staan eronder klaar om ingepland
 *  te worden. */
export function Agenda({ taken, opBewerken, opNieuweTaak, lijstId = null }: Props) {
  const { taakVerzetten } = useTaken()
  const nu = vandaag()
  const [anker, setAnker] = useState(() => parseISODate(nu))
  const [gekozen, setGekozen] = useState(nu)
  const [boven, setBoven] = useState<string | null>(null)

  // Zes volle weken vanaf de maandag voor de eerste van de maand. Altijd zes,
  // anders springt de hoogte van het raster per maand.
  const dagen = useMemo(() => {
    const eerste = new Date(anker.getFullYear(), anker.getMonth(), 1)
    const start = startVanDeWeek(eerste)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return toISODate(d)
    })
  }, [anker])

  const perDag = useMemo(() => {
    const kaart = new Map<string, TaskWithMeta[]>()
    for (const t of taken) {
      if (!t.due_date) continue
      const bestaand = kaart.get(t.due_date)
      if (bestaand) bestaand.push(t)
      else kaart.set(t.due_date, [t])
    }
    for (const [dag, lijst] of kaart) kaart.set(dag, sorteerTaken(lijst))
    return kaart
  }, [taken])

  const zonderDatum = useMemo(
    () => sorteerTaken(taken.filter((t) => !t.due_date && !t.completed_at)),
    [taken],
  )

  const maandNaam = new Intl.DateTimeFormat('nl-NL', {
    month: 'long',
    year: 'numeric',
  }).format(anker)

  function verschuif(maanden: number) {
    setAnker((h) => new Date(h.getFullYear(), h.getMonth() + maanden, 1))
  }

  function laatVallen(e: React.DragEvent, datum: string | null) {
    e.preventDefault()
    setBoven(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id) void taakVerzetten(id, datum)
  }

  const takenVanGekozen = perDag.get(gekozen) ?? []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight first-letter:uppercase">{maandNaam}</h2>
        <div className="flex items-center gap-1">
          <Pijl label="Vorige maand" teken="‹" opKlik={() => verschuif(-1)} />
          <button
            onClick={() => {
              setAnker(parseISODate(nu))
              setGekozen(nu)
            }}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Vandaag
          </button>
          <Pijl label="Volgende maand" teken="›" opKlik={() => verschuif(1)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line">
          {DAGKOPPEN.map((d) => (
            <span
              key={d}
              className="py-2 text-center text-[11px] font-semibold tracking-wider text-ink-faint uppercase"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dagen.map((dag, i) => {
            const d = parseISODate(dag)
            const buitenMaand = d.getMonth() !== anker.getMonth()
            const vanDag = perDag.get(dag) ?? []
            const open = vanDag.filter((t) => !t.completed_at)

            return (
              <div
                key={dag}
                role="gridcell"
                onClick={() => setGekozen(dag)}
                onDoubleClick={() => opNieuweTaak({ datum: dag, lijstId })}
                onDragOver={(e) => {
                  e.preventDefault()
                  setBoven(dag)
                }}
                onDragLeave={() => setBoven((h) => (h === dag ? null : h))}
                onDrop={(e) => laatVallen(e, dag)}
                className={[
                  'relative flex min-h-16 cursor-pointer flex-col gap-1 border-b border-line p-1.5 text-left transition sm:min-h-28',
                  // Geen streep aan de rechterkant van de laatste kolom en niet
                  // onder de laatste rij: anders wordt het een hokjesvel.
                  (i + 1) % 7 === 0 ? '' : 'border-r',
                  i >= 35 ? 'border-b-0' : '',
                  buitenMaand ? 'bg-canvas/60' : '',
                  boven === dag ? 'bg-brand-soft' : '',
                  gekozen === dag ? 'ring-1 ring-brand ring-inset' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-6 shrink-0 place-items-center rounded-full text-xs',
                    dag === nu
                      ? 'bg-brand font-semibold text-white'
                      : buitenMaand
                        ? 'text-ink-faint'
                        : 'text-ink-soft',
                  ].join(' ')}
                >
                  {d.getDate()}
                </span>

                {/* Op een telefoon passen er geen titels in een hokje; daar
                    staan stippen en lees je de dag eronder uit. */}
                <span className="flex flex-wrap gap-1 sm:hidden">
                  {open.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className="size-1.5 rounded-full"
                      style={{ background: kleurVan(t) }}
                    />
                  ))}
                </span>

                <span className="hidden flex-col gap-0.5 sm:flex">
                  {vanDag.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        e.dataTransfer.setData('text/plain', t.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        opBewerken(t)
                      }}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight transition hover:bg-surface-muted"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: kleurVan(t) }}
                      />
                      <span
                        className={[
                          'truncate',
                          t.completed_at ? 'text-ink-faint line-through' : 'text-ink-soft',
                        ].join(' ')}
                      >
                        {t.title}
                      </span>
                    </span>
                  ))}
                  {vanDag.length > 3 && (
                    <span className="px-1 text-[11px] text-ink-faint">
                      +{vanDag.length - 3} meer
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="first-letter:uppercase">{dagTitel(gekozen)}</span>
          {takenVanGekozen.length > 0 && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-soft">
              {takenVanGekozen.length}
            </span>
          )}
          <button
            onClick={() => opNieuweTaak({ datum: gekozen, lijstId })}
            className="ml-auto text-xs font-medium text-brand transition hover:opacity-80"
          >
            + Taak op deze dag
          </button>
        </h3>
        <TakenLijst
          taken={takenVanGekozen}
          opBewerken={opBewerken}
          leegTekst="Niets gepland op deze dag."
        />
      </div>

      {zonderDatum.length > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setBoven('geen')
          }}
          onDragLeave={() => setBoven((h) => (h === 'geen' ? null : h))}
          onDrop={(e) => laatVallen(e, null)}
          className={[
            'mt-6 rounded-xl border p-3 transition',
            boven === 'geen' ? 'border-brand bg-brand-soft' : 'border-dashed border-line',
          ].join(' ')}
        >
          {/* Sleep ze het raster in om ze in te plannen - of sleep er iets in
              om een datum juist weer weg te halen. */}
          <h3 className="mb-2 px-1 text-sm font-semibold tracking-tight">
            Zonder datum <span className="text-xs font-medium text-ink-faint">{zonderDatum.length}</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {zonderDatum.map((t) => (
              <button
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', t.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => opBewerken(t)}
                className="flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs transition hover:border-brand"
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: kleurVan(t) }} />
                <span className="truncate">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function kleurVan(taak: TaskWithMeta): string {
  return PRIORITEITEN.find((p) => p.waarde === taak.priority)?.kleur ?? '#94a3b8'
}

function Pijl({ label, teken, opKlik }: { label: string; teken: string; opKlik: () => void }) {
  return (
    <button
      onClick={opKlik}
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:border-brand hover:text-brand"
    >
      {teken}
    </button>
  )
}
