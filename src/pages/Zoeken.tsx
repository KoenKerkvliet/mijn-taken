import { useMemo, useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Sectie, TakenLijst } from '../components/TakenLijst'
import { normaliseer } from '../lib/tags'
import { sorteerTaken } from '../lib/sorteren'
import type { TaskWithMeta } from '../lib/types'

export function Zoeken() {
  const { taken, lijsten, labels } = useTaken()
  const { bewerk } = useSchil()
  const [vraag, setVraag] = useState('')

  const treffers = useMemo(() => {
    const woorden = vraag
      .split(/\s+/u)
      .map(normaliseer)
      .filter(Boolean)
    if (woorden.length === 0) return null

    // Zoeken door alles wat je over een taak kunt onthouden: de titel, de
    // omschrijving, de lijst waar hij in staat en zijn labels. Elk woord moet
    // ergens raak zijn - zo maak je een zoekopdracht scherper door te typen.
    function hooi(t: TaskWithMeta): string {
      const lijst = lijsten.find((l) => l.id === t.list_id)?.name ?? ''
      const eigen = labels
        .filter((lb) => t.labelIds.includes(lb.id))
        .map((lb) => lb.name)
        .join(' ')
      const sub = t.subtasks.map((s) => s.title).join(' ')
      return normaliseer(`${t.title} ${t.description ?? ''} ${lijst} ${eigen} ${sub}`)
    }

    const raak = taken.filter((t) => {
      const tekst = hooi(t)
      return woorden.every((w) => tekst.includes(w))
    })

    return {
      open: sorteerTaken(raak.filter((t) => !t.completed_at)),
      klaar: raak
        .filter((t) => t.completed_at)
        .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1)),
    }
  }, [vraag, taken, lijsten, labels])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-28 sm:px-6 lg:pb-16">
      <Paginakop titel="Zoeken" onderschrift="Door titels, omschrijvingen, lijsten en labels." />

      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-brand">
        <span className="text-ink-faint">🔍</span>
        <input
          autoFocus
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          placeholder="Waar ben je naar op zoek?"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-faint"
        />
        {vraag && (
          <button
            onClick={() => setVraag('')}
            aria-label="Zoekopdracht wissen"
            className="grid size-7 shrink-0 place-items-center rounded-md text-ink-faint transition hover:bg-surface-muted hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {treffers === null ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-faint">
          Typ een woord om te zoeken. Hoofdletters en accenten maken niet uit.
        </p>
      ) : (
        <>
          <Sectie titel="Openstaand" aantal={treffers.open.length}>
            <TakenLijst
              taken={treffers.open}
              opBewerken={bewerk}
              leegTekst="Geen openstaande taak die hierop past."
            />
          </Sectie>

          {treffers.klaar.length > 0 && (
            <Sectie titel="Afgerond" aantal={treffers.klaar.length}>
              <TakenLijst taken={treffers.klaar} opBewerken={bewerk} />
            </Sectie>
          )}
        </>
      )}
    </div>
  )
}
