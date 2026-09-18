import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { Priority, TaskWithMeta } from '../lib/types'
import { overDagen, vandaag } from '../lib/dates'

export const PRIORITEITEN: { waarde: Priority; naam: string; kleur: string }[] = [
  { waarde: 1, naam: 'Urgent', kleur: '#dc2626' },
  { waarde: 2, naam: 'Hoog', kleur: '#ea580c' },
  { waarde: 3, naam: 'Normaal', kleur: '#2563eb' },
  { waarde: 4, naam: 'Laag', kleur: '#94a3b8' },
]

interface Props {
  open: boolean
  opSluiten: () => void
  /** Meegeven bij bewerken; weglaten voor een nieuwe taak. */
  taak?: TaskWithMeta
  standaardLijst?: string | null
  standaardDatum?: string | null
}

export function TaakDialoog({ open, opSluiten, taak, standaardLijst, standaardDatum }: Props) {
  const { lijsten, labels, taakToevoegen, taakBijwerken } = useTaken()
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [datum, setDatum] = useState('')
  const [prioriteit, setPrioriteit] = useState<Priority>(4)
  const [lijstId, setLijstId] = useState<string>('')
  const [gekozenLabels, setGekozenLabels] = useState<string[]>([])
  const [bezig, setBezig] = useState(false)

  // Bij openen het formulier vullen met de taak (of met de standaarden van de
  // pagina waar je vandaan komt).
  useEffect(() => {
    if (!open) return
    setTitel(taak?.title ?? '')
    setOmschrijving(taak?.description ?? '')
    setDatum(taak?.due_date ?? standaardDatum ?? '')
    setPrioriteit(taak?.priority ?? 4)
    setLijstId(taak?.list_id ?? standaardLijst ?? '')
    setGekozenLabels(taak?.labelIds ?? [])
    setBezig(false)
  }, [open, taak, standaardLijst, standaardDatum])

  useEffect(() => {
    if (!open) return
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') opSluiten()
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [open, opSluiten])

  if (!open) return null

  async function opslaan(e: FormEvent) {
    e.preventDefault()
    if (!titel.trim()) return
    setBezig(true)

    const velden = {
      title: titel.trim(),
      description: omschrijving.trim() || null,
      due_date: datum || null,
      priority: prioriteit,
      list_id: lijstId || null,
    }

    if (taak) await taakBijwerken(taak.id, velden, gekozenLabels)
    else await taakToevoegen({ ...velden, labelIds: gekozenLabels })

    setBezig(false)
    opSluiten()
  }

  function labelWisselen(id: string) {
    setGekozenLabels((huidig) =>
      huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id],
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]">
      <button aria-label="Sluiten" className="fixed inset-0 -z-10" onClick={opSluiten} />

      <form
        onSubmit={opslaan}
        className="w-full max-w-xl rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <div className="p-5">
          <input
            autoFocus
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Wat moet er gebeuren?"
            className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-ink-faint"
          />
          <textarea
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Omschrijving (optioneel)"
            rows={2}
            className="mt-2 w-full resize-none bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            />
            <SnelleDatum label="Vandaag" opKlik={() => setDatum(vandaag())} />
            <SnelleDatum label="Morgen" opKlik={() => setDatum(overDagen(1))} />
            <SnelleDatum label="Volgende week" opKlik={() => setDatum(overDagen(7))} />
            {datum && <SnelleDatum label="Wissen" opKlik={() => setDatum('')} />}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={prioriteit}
              onChange={(e) => setPrioriteit(Number(e.target.value) as Priority)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            >
              {PRIORITEITEN.map((p) => (
                <option key={p.waarde} value={p.waarde}>
                  Prioriteit: {p.naam}
                </option>
              ))}
            </select>

            <select
              value={lijstId}
              onChange={(e) => setLijstId(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Inbox (geen lijst)</option>
              {lijsten.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {labels.map((lb) => {
                const aan = gekozenLabels.includes(lb.id)
                return (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => labelWisselen(lb.id)}
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs transition',
                      aan ? 'border-transparent text-white' : 'border-line text-ink-soft',
                    ].join(' ')}
                    style={aan ? { background: lb.color } : undefined}
                  >
                    #{lb.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={opSluiten}
            className="rounded-lg px-3.5 py-2 text-sm text-ink-soft transition hover:bg-surface-muted"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!titel.trim() || bezig}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {taak ? 'Opslaan' : 'Taak toevoegen'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SnelleDatum({ label, opKlik }: { label: string; opKlik: () => void }) {
  return (
    <button
      type="button"
      onClick={opKlik}
      className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
    >
      {label}
    </button>
  )
}
