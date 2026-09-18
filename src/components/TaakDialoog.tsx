import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { Priority, TaskWithMeta } from '../lib/types'
import { overDagen, vandaag } from '../lib/dates'
import { leesTags } from '../lib/tags'
import { volgendeKleur } from '../lib/kleuren'

export const PRIORITEITEN: { waarde: Priority; naam: string; kleur: string }[] = [
  { waarde: 1, naam: 'Urgent', kleur: '#dc2626' },
  { waarde: 2, naam: 'Hoog', kleur: '#ea580c' },
  { waarde: 3, naam: 'Normaal', kleur: '#2563eb' },
  { waarde: 4, naam: 'Laag', kleur: '#94a3b8' },
]

/** 16px op mobiel, want onder die grens zoomt Safari bij het focussen in. */
const VELD =
  'rounded-lg border border-line bg-canvas px-2.5 py-2 text-base outline-none focus:border-brand sm:py-1.5 sm:text-sm'

interface Props {
  open: boolean
  opSluiten: () => void
  /** Meegeven bij bewerken; weglaten voor een nieuwe taak. */
  taak?: TaskWithMeta
  standaardLijst?: string | null
  standaardDatum?: string | null
}

export function TaakDialoog({ open, opSluiten, taak, standaardLijst, standaardDatum }: Props) {
  const { lijsten, labels, taakToevoegen, taakBijwerken, lijstToevoegen } = useTaken()
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [datum, setDatum] = useState('')
  const [prioriteit, setPrioriteit] = useState<Priority>(4)
  const [lijstId, setLijstId] = useState<string>('')
  const [gekozenLabels, setGekozenLabels] = useState<string[]>([])
  const [bezig, setBezig] = useState(false)

  // Wat er met "#klas" in de titel gaat gebeuren. Live, zodat je het ziet
  // voordat je opslaat in plaats van erna.
  const tags = useMemo(() => leesTags(titel, lijsten, labels), [titel, lijsten, labels])

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
    if (!tags.titel.trim()) return
    setBezig(true)

    // Een tag in de titel wint van de keuzelijst: die heb je net getypt, de
    // keuzelijst stond er misschien al vanaf het openen.
    const velden = {
      title: tags.titel,
      description: omschrijving.trim() || null,
      due_date: datum || null,
      priority: prioriteit,
      list_id: tags.lijst ? tags.lijst.id : lijstId || null,
    }

    const alleLabels = [...new Set([...gekozenLabels, ...tags.labels.map((l) => l.id)])]

    if (taak) await taakBijwerken(taak.id, velden, alleLabels)
    else await taakToevoegen({ ...velden, labelIds: alleLabels })

    setBezig(false)
    opSluiten()
  }

  function labelWisselen(id: string) {
    setGekozenLabels((huidig) =>
      huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id],
    )
  }

  async function lijstMakenVoor(naam: string) {
    const nieuw = await lijstToevoegen(naam, volgendeKleur(lijsten.length))
    // De tag in de titel vindt de lijst hierna vanzelf; dit is alleen voor het
    // geval de naam net anders geschreven is dan de tag.
    if (nieuw) setLijstId(nieuw.id)
  }

  const gekoppeldViaTag = tags.lijst !== null || tags.labels.length > 0
  const kanOpslaan = tags.titel.trim().length > 0 && !bezig

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/40 sm:items-start sm:p-4 sm:pt-[10vh]">
      <button aria-label="Sluiten" className="fixed inset-0 -z-10" onClick={opSluiten} />

      <form
        onSubmit={opslaan}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="p-5">
          <input
            autoFocus
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Wat moet er gebeuren? Tip: #lijstnaam"
            className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-ink-faint"
          />
          <textarea
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Omschrijving (optioneel)"
            rows={2}
            className="mt-2 w-full resize-none bg-transparent text-base outline-none placeholder:text-ink-faint sm:text-sm"
          />

          {(gekoppeldViaTag || tags.onbekend.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs">
              {gekoppeldViaTag && (
                <span className="text-ink-soft">
                  Wordt opgeslagen als <span className="font-medium text-ink">{tags.titel}</span>
                </span>
              )}
              {tags.lijst && (
                <span
                  className="rounded-full px-2 py-0.5 font-medium text-white"
                  style={{ background: tags.lijst.color }}
                >
                  {tags.lijst.name}
                </span>
              )}
              {tags.labels.map((lb) => (
                <span key={lb.id} className="font-medium" style={{ color: lb.color }}>
                  #{lb.name}
                </span>
              ))}
              {tags.onbekend.map((naam) => (
                <button
                  key={naam}
                  type="button"
                  onClick={() => void lijstMakenVoor(naam)}
                  className="rounded-full border border-dashed border-line px-2 py-0.5 text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  Lijst "{naam}" maken
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className={VELD}
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
              className={VELD}
            >
              {PRIORITEITEN.map((p) => (
                <option key={p.waarde} value={p.waarde}>
                  Prioriteit: {p.naam}
                </option>
              ))}
            </select>

            <select
              value={tags.lijst ? tags.lijst.id : lijstId}
              onChange={(e) => setLijstId(e.target.value)}
              disabled={tags.lijst !== null}
              title={tags.lijst ? `Vastgezet door #${tags.lijst.name} in de titel` : undefined}
              className={`${VELD} disabled:opacity-60`}
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
                const aan = gekozenLabels.includes(lb.id) || tags.labels.some((t) => t.id === lb.id)
                return (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => labelWisselen(lb.id)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-xs transition sm:py-1',
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

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button
            type="button"
            onClick={opSluiten}
            className="rounded-lg px-4 py-2.5 text-sm text-ink-soft transition hover:bg-surface-muted sm:py-2"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!kanOpslaan}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:py-2"
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
      className="rounded-lg border border-line px-2.5 py-2 text-xs text-ink-soft transition hover:border-brand hover:text-brand sm:py-1.5"
    >
      {label}
    </button>
  )
}
