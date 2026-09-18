import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useTaken } from '../data/TakenProvider'
import { isAchterstallig, vandaag } from '../lib/dates'
import { volgendeKleur } from '../lib/kleuren'

interface Props {
  opNieuweTaak: () => void
  /** Op smalle schermen schuift de zijbalk over de inhoud heen. */
  open: boolean
  opSluiten: () => void
}

export function Zijbalk({ opNieuweTaak, open, opSluiten }: Props) {
  const { session, uitloggen } = useAuth()
  const { lijsten, labels, taken, lijstToevoegen, labelToevoegen } = useTaken()
  const [nieuweLijst, setNieuweLijst] = useState('')
  const [nieuwLabel, setNieuwLabel] = useState('')
  const [lijstOpen, setLijstOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)

  const open_taken = taken.filter((t) => !t.completed_at)
  const aantalVandaag = open_taken.filter(
    (t) => t.due_date !== null && t.due_date <= vandaag(),
  ).length
  const aantalInbox = open_taken.filter((t) => t.list_id === null).length
  const aantalTeLaat = open_taken.filter((t) => isAchterstallig(t.due_date)).length

  function perLijst(id: string) {
    return open_taken.filter((t) => t.list_id === id).length
  }

  async function lijstOpslaan(e: React.FormEvent) {
    e.preventDefault()
    if (!nieuweLijst.trim()) return
    await lijstToevoegen(nieuweLijst, volgendeKleur(lijsten.length))
    setNieuweLijst('')
    setLijstOpen(false)
  }

  async function labelOpslaan(e: React.FormEvent) {
    e.preventDefault()
    if (!nieuwLabel.trim()) return
    await labelToevoegen(nieuwLabel, volgendeKleur(labels.length + 3))
    setNieuwLabel('')
    setLabelOpen(false)
  }

  return (
    <>
      {open && (
        <button
          aria-label="Menu sluiten"
          onClick={opSluiten}
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-line bg-surface',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'transition-transform lg:static lg:max-w-none lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">
            ✓
          </span>
          <span className="flex-1 font-semibold tracking-tight">Mijn taken</span>
          <button
            onClick={opSluiten}
            aria-label="Menu sluiten"
            className="-mr-2 grid size-10 place-items-center rounded-lg text-xl text-ink-faint transition active:bg-surface-muted lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={opNieuweTaak}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <span className="text-base leading-none">+</span> Nieuwe taak
          </button>
        </div>

        {/* Eén handler voor alle links: op mobiel ligt de zijbalk over de
            pagina heen, dus na het kiezen van een lijst moet hij dicht. */}
        <nav
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) opSluiten()
          }}
          className="flex-1 overflow-y-auto px-3 pb-4"
        >
          <ul className="space-y-0.5">
            <Item to="/" label="Vandaag" icoon="☀️" aantal={aantalVandaag} nadruk={aantalTeLaat > 0} />
            <Item to="/binnenkort" label="Binnenkort" icoon="🗓️" />
            <Item to="/inbox" label="Inbox" icoon="📥" aantal={aantalInbox} />
            <Item to="/klaar" label="Afgerond" icoon="✅" />
          </ul>

          <Kop
            titel="Lijsten"
            opToevoegen={() => setLijstOpen((v) => !v)}
            actief={lijstOpen}
          />
          {lijstOpen && (
            <form onSubmit={lijstOpslaan} className="mb-2 px-2">
              <input
                autoFocus
                value={nieuweLijst}
                onChange={(e) => setNieuweLijst(e.target.value)}
                onBlur={() => !nieuweLijst && setLijstOpen(false)}
                placeholder="Naam van de lijst"
                className="w-full rounded-md border border-line bg-canvas px-2.5 py-2 text-base outline-none focus:border-brand lg:py-1.5 lg:text-sm"
              />
            </form>
          )}
          <ul className="space-y-0.5">
            {lijsten.map((l) => (
              <li key={l.id}>
                <NavLink
                  to={`/lijst/${l.id}`}
                  className={({ isActive }) => regelKlassen(isActive)}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: l.color }}
                  />
                  <span className="flex-1 truncate">{l.name}</span>
                  {perLijst(l.id) > 0 && <span className="text-xs text-ink-faint">{perLijst(l.id)}</span>}
                </NavLink>
              </li>
            ))}
            {lijsten.length === 0 && !lijstOpen && (
              <li className="px-3 py-1.5 text-xs text-ink-faint">Nog geen lijsten.</li>
            )}
          </ul>

          <Kop titel="Labels" opToevoegen={() => setLabelOpen((v) => !v)} actief={labelOpen} />
          {labelOpen && (
            <form onSubmit={labelOpslaan} className="mb-2 px-2">
              <input
                autoFocus
                value={nieuwLabel}
                onChange={(e) => setNieuwLabel(e.target.value)}
                onBlur={() => !nieuwLabel && setLabelOpen(false)}
                placeholder="Naam van het label"
                className="w-full rounded-md border border-line bg-canvas px-2.5 py-2 text-base outline-none focus:border-brand lg:py-1.5 lg:text-sm"
              />
            </form>
          )}
          <ul className="space-y-0.5">
            {labels.map((lb) => (
              <li key={lb.id}>
                <NavLink to={`/label/${lb.id}`} className={({ isActive }) => regelKlassen(isActive)}>
                  <span className="text-ink-faint">#</span>
                  <span className="flex-1 truncate" style={{ color: lb.color }}>
                    {lb.name}
                  </span>
                </NavLink>
              </li>
            ))}
            {labels.length === 0 && !labelOpen && (
              <li className="px-3 py-1.5 text-xs text-ink-faint">Nog geen labels.</li>
            )}
          </ul>
        </nav>

        <div className="border-t border-line px-4 py-3">
          <p className="truncate text-xs text-ink-faint" title={session?.user.email ?? ''}>
            {session?.user.email}
          </p>
          <button
            onClick={() => void uitloggen()}
            className="mt-1 text-sm text-ink-soft transition hover:text-danger"
          >
            Uitloggen
          </button>
        </div>
      </aside>
    </>
  )
}

function regelKlassen(actief: boolean) {
  return [
    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition lg:py-2',
    actief ? 'bg-brand-soft font-medium text-brand' : 'text-ink-soft hover:bg-surface-muted',
  ].join(' ')
}

function Item({
  to,
  label,
  icoon,
  aantal,
  nadruk,
}: {
  to: string
  label: string
  icoon: string
  aantal?: number
  nadruk?: boolean
}) {
  return (
    <li>
      <NavLink to={to} end className={({ isActive }) => regelKlassen(isActive)}>
        <span className="text-base leading-none">{icoon}</span>
        <span className="flex-1">{label}</span>
        {aantal !== undefined && aantal > 0 && (
          <span className={nadruk ? 'text-xs font-semibold text-danger' : 'text-xs text-ink-faint'}>
            {aantal}
          </span>
        )}
      </NavLink>
    </li>
  )
}

function Kop({
  titel,
  opToevoegen,
  actief,
}: {
  titel: string
  opToevoegen: () => void
  actief: boolean
}) {
  return (
    <div className="mt-6 mb-1 flex items-center justify-between px-3">
      <span className="text-xs font-semibold tracking-wider text-ink-faint uppercase">{titel}</span>
      <button
        onClick={opToevoegen}
        aria-label={`${titel} toevoegen`}
        className={[
          'grid size-8 place-items-center rounded transition hover:bg-surface-muted lg:size-5',
          actief ? 'text-brand' : 'text-ink-faint',
        ].join(' ')}
      >
        +
      </button>
    </div>
  )
}
