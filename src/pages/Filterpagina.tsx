import { useState } from 'react'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Sectie, TakenLijst } from '../components/TakenLijst'
import { sorteerTaken } from '../lib/sorteren'

type Soort = 'inbox' | 'klaar' | 'lijst' | 'label'

export function Filterpagina({ soort }: { soort: Soort }) {
  const { id } = useParams()
  const navigeer = useNavigate()
  const { taken, lijsten, labels, lijstBijwerken, lijstVerwijderen, labelVerwijderen } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()
  const [hernoemen, setHernoemen] = useState(false)
  const [nieuweNaam, setNieuweNaam] = useState('')

  const lijst = soort === 'lijst' ? lijsten.find((l) => l.id === id) : undefined
  const label = soort === 'label' ? labels.find((l) => l.id === id) : undefined

  // Verwijderd of een verkeerde link: terug naar Vandaag in plaats van een
  // lege pagina zonder uitleg.
  if ((soort === 'lijst' && !lijst) || (soort === 'label' && !label)) {
    return <Navigate to="/" replace />
  }

  const open = taken.filter((t) => !t.completed_at)
  const gefilterd = sorteerTaken(
    soort === 'inbox'
      ? open.filter((t) => t.list_id === null)
      : soort === 'lijst'
        ? open.filter((t) => t.list_id === id)
        : soort === 'label'
          ? open.filter((t) => t.labelIds.includes(id!))
          : [],
  )

  const afgerond = taken
    .filter((t) => t.completed_at !== null)
    .filter((t) =>
      soort === 'lijst' ? t.list_id === id : soort === 'label' ? t.labelIds.includes(id!) : true,
    )
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))

  const titel =
    soort === 'inbox'
      ? 'Inbox'
      : soort === 'klaar'
        ? 'Afgerond'
        : soort === 'lijst'
          ? lijst!.name
          : `#${label!.name}`

  const onderschrift =
    soort === 'inbox'
      ? 'Taken die nog niet in een lijst staan.'
      : soort === 'klaar'
        ? 'Alles wat je hebt afgevinkt, nieuwste eerst.'
        : soort === 'lijst'
          ? `${gefilterd.length} openstaand`
          : 'Alle taken met dit label.'

  async function naamOpslaan(e: React.FormEvent) {
    e.preventDefault()
    if (nieuweNaam.trim() && lijst) await lijstBijwerken(lijst.id, { name: nieuweNaam.trim() })
    setHernoemen(false)
  }

  async function verwijderen() {
    if (lijst) {
      const zeker = window.confirm(
        `Lijst "${lijst.name}" verwijderen? De taken blijven bestaan en komen in de inbox.`,
      )
      if (!zeker) return
      await lijstVerwijderen(lijst.id)
    }
    if (label) {
      const zeker = window.confirm(`Label "${label.name}" verwijderen?`)
      if (!zeker) return
      await labelVerwijderen(label.id)
    }
    navigeer('/', { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-6 pb-16">
      {hernoemen && lijst ? (
        <form onSubmit={naamOpslaan} className="mb-6">
          <input
            autoFocus
            defaultValue={lijst.name}
            onChange={(e) => setNieuweNaam(e.target.value)}
            onBlur={() => setHernoemen(false)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xl font-semibold outline-none focus:border-brand"
          />
        </form>
      ) : (
        <Paginakop
          titel={titel}
          onderschrift={onderschrift}
          actie={
            <div className="flex gap-2">
              {soort !== 'klaar' && (
                <button
                  onClick={() => nieuweTaak({ lijstId: soort === 'lijst' ? id : null })}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
                >
                  + Nieuwe taak
                </button>
              )}
              {lijst && (
                <button
                  onClick={() => {
                    setNieuweNaam(lijst.name)
                    setHernoemen(true)
                  }}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-soft transition hover:text-ink"
                >
                  Hernoemen
                </button>
              )}
              {(lijst || label) && (
                <button
                  onClick={() => void verwijderen()}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-soft transition hover:border-danger hover:text-danger"
                >
                  Verwijderen
                </button>
              )}
            </div>
          }
        />
      )}

      {soort !== 'klaar' && (
        <TakenLijst
          taken={gefilterd}
          opBewerken={bewerk}
          toonLijst={soort !== 'lijst'}
          leegTekst="Nog niets hier. Voeg een taak toe."
        />
      )}

      {afgerond.length > 0 && soort !== 'inbox' && (
        <div className="mt-8">
          <Sectie titel="Afgerond" aantal={afgerond.length}>
            <TakenLijst taken={afgerond} opBewerken={bewerk} toonLijst={soort !== 'lijst'} />
          </Sectie>
        </div>
      )}

      {soort === 'klaar' && afgerond.length === 0 && (
        <TakenLijst taken={[]} opBewerken={bewerk} leegTekst="Nog niets afgerond." />
      )}
    </div>
  )
}
