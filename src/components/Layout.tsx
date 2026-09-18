import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Zijbalk } from './Zijbalk'
import { TaakDialoog } from './TaakDialoog'
import { Laadscherm } from './Laadscherm'
import { useTaken } from '../data/TakenProvider'
import type { TaskWithMeta } from '../lib/types'

export interface Schil {
  /** Opent de dialoog voor een bestaande taak. */
  bewerk: (taak: TaskWithMeta) => void
  /** Opent de dialoog voor een nieuwe taak, eventueel voorgevuld. */
  nieuweTaak: (standaarden?: { lijstId?: string | null; datum?: string | null }) => void
}

export function useSchil(): Schil {
  return useOutletContext<Schil>()
}

export function Layout() {
  const { bezigMetLaden, fout } = useTaken()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialoogOpen, setDialoogOpen] = useState(false)
  const [bewerkTaak, setBewerkTaak] = useState<TaskWithMeta | undefined>()
  const [standaarden, setStandaarden] = useState<{
    lijstId?: string | null
    datum?: string | null
  }>({})
  const [zoekParams, setZoekParams] = useSearchParams()
  const navigeer = useNavigate()

  const schil: Schil = {
    bewerk(taak) {
      setBewerkTaak(taak)
      setStandaarden({})
      setDialoogOpen(true)
    },
    nieuweTaak(nieuweStandaarden) {
      setBewerkTaak(undefined)
      setStandaarden(nieuweStandaarden ?? {})
      setDialoogOpen(true)
    },
  }

  // Sneltoetsen zoals je ze van een takenprogramma verwacht. Alleen buiten
  // een invoerveld, anders kun je geen "q" meer typen in een taaktitel.
  useEffect(() => {
    function opToets(e: KeyboardEvent) {
      if (dialoogOpen || e.metaKey || e.ctrlKey || e.altKey) return
      const doel = e.target as HTMLElement | null
      if (doel?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 'q') {
        e.preventDefault()
        setBewerkTaak(undefined)
        setStandaarden({})
        setDialoogOpen(true)
      }
      if (e.key === '/') {
        e.preventDefault()
        navigeer('/zoeken')
      }
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [navigeer, dialoogOpen])

  // De snelkoppeling "Nieuwe taak" van de geïnstalleerde app komt binnen als
  // ?nieuw=1. Meteen weer uit de URL halen, anders opent de dialoog opnieuw
  // zodra je terugnavigeert.
  useEffect(() => {
    if (zoekParams.get('nieuw') === null) return
    setBewerkTaak(undefined)
    setStandaarden({})
    setDialoogOpen(true)
    zoekParams.delete('nieuw')
    setZoekParams(zoekParams, { replace: true })
  }, [zoekParams, setZoekParams])

  return (
    // 100dvh in plaats van 100%: op mobiel krimpt het scherm als de
    // adresbalk verschijnt, en dan valt de onderkant anders weg.
    <div className="flex h-[100dvh]">
      <Zijbalk
        open={menuOpen}
        opSluiten={() => setMenuOpen(false)}
        opNieuweTaak={() => {
          setMenuOpen(false)
          schil.nieuweTaak()
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menu openen"
            className="-ml-2 grid size-11 place-items-center rounded-lg text-xl text-ink-soft transition active:bg-surface-muted"
          >
            ☰
          </button>
          <span className="font-semibold tracking-tight">Mijn taken</span>
        </header>

        {fout && (
          <p className="mx-4 mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger sm:mx-6">
            {fout}
          </p>
        )}

        {bezigMetLaden ? <Laadscherm /> : <Outlet context={schil} />}
      </main>

      {/* Duimbereik: op een telefoon is de knop rechtsboven in de pagina net
          te ver weg om er snel een taak in te gooien. */}
      <button
        onClick={() => schil.nieuweTaak()}
        aria-label="Nieuwe taak"
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full bg-brand text-2xl leading-none text-white shadow-lg transition active:scale-95 lg:hidden"
      >
        +
      </button>

      <TaakDialoog
        open={dialoogOpen}
        opSluiten={() => setDialoogOpen(false)}
        taak={bewerkTaak}
        standaardLijst={standaarden.lijstId ?? null}
        standaardDatum={standaarden.datum ?? null}
      />
    </div>
  )
}

export function Paginakop({
  titel,
  onderschrift,
  kleur,
  actie,
}: {
  titel: string
  onderschrift?: string
  /** Kleur van de lijst of het label, als stip voor de titel. */
  kleur?: string
  actie?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {kleur && (
            <span className="size-3 shrink-0 rounded-full" style={{ background: kleur }} />
          )}
          <span className="truncate">{titel}</span>
        </h1>
        {onderschrift && <p className="mt-1 text-sm text-ink-soft">{onderschrift}</p>}
      </div>
      {actie}
    </header>
  )
}
