import { useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
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

  return (
    <div className="flex h-full">
      <Zijbalk
        open={menuOpen}
        opSluiten={() => setMenuOpen(false)}
        opNieuweTaak={() => {
          setMenuOpen(false)
          schil.nieuweTaak()
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <button
          onClick={() => setMenuOpen(true)}
          className="m-4 w-fit rounded-lg border border-line bg-surface px-3 py-2 text-sm lg:hidden"
        >
          ☰ Menu
        </button>

        {fout && (
          <p className="mx-6 mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {fout}
          </p>
        )}

        {bezigMetLaden ? <Laadscherm /> : <Outlet context={schil} />}
      </main>

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
  actie,
}: {
  titel: string
  onderschrift?: string
  actie?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titel}</h1>
        {onderschrift && <p className="mt-1 text-sm text-ink-soft">{onderschrift}</p>}
      </div>
      {actie}
    </header>
  )
}
