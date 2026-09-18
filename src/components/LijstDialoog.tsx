import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTaken } from '../data/TakenProvider'
import { LIJSTKLEUREN } from '../lib/kleuren'
import type { Label, List } from '../lib/types'

interface Props {
  /** Precies één van beide; welke bepaalt wat er bijgewerkt wordt. */
  lijst?: List
  label?: Label
  opSluiten: () => void
}

/** Naam en kleur van een lijst of label aanpassen. */
export function LijstDialoog({ lijst, label, opSluiten }: Props) {
  const { lijstBijwerken, labelBijwerken } = useTaken()
  const huidige = lijst ?? label
  const [naam, setNaam] = useState(huidige?.name ?? '')
  const [kleur, setKleur] = useState(huidige?.color ?? LIJSTKLEUREN[0])
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') opSluiten()
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [opSluiten])

  if (!huidige) return null

  async function opslaan(e: FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return
    setBezig(true)
    if (lijst) await lijstBijwerken(lijst.id, { name: naam.trim(), color: kleur })
    else if (label) await labelBijwerken(label.id, { name: naam.trim(), color: kleur })
    setBezig(false)
    opSluiten()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/40 sm:items-start sm:p-4 sm:pt-[15vh]">
      <button aria-label="Sluiten" className="fixed inset-0 -z-10" onClick={opSluiten} />

      <form
        onSubmit={opslaan}
        className="w-full max-w-sm rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:rounded-2xl"
      >
        <h2 className="mb-4 text-sm font-semibold tracking-tight">
          {lijst ? 'Lijst bewerken' : 'Label bewerken'}
        </h2>

        <input
          autoFocus
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Naam"
          className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-base outline-none focus:border-brand sm:text-sm"
        />

        <p className="mt-4 mb-2 text-xs font-medium text-ink-soft">Kleur</p>
        <div className="flex flex-wrap gap-2">
          {LIJSTKLEUREN.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKleur(k)}
              aria-label={`Kleur ${k}`}
              aria-pressed={k === kleur}
              className={[
                'size-8 rounded-full transition',
                // Het vinkje zit in de stip zelf, zodat de rij niet verspringt
                // zodra je een andere kleur kiest.
                k === kleur ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '',
              ].join(' ')}
              style={{ background: k }}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={opSluiten}
            className="rounded-lg px-4 py-2.5 text-sm text-ink-soft transition hover:bg-surface-muted sm:py-2"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!naam.trim() || bezig}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:py-2"
          >
            Opslaan
          </button>
        </div>
      </form>
    </div>
  )
}
