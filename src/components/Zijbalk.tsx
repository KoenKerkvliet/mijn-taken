import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useTaken } from '../data/TakenProvider'
import { isAchterstallig, vandaag } from '../lib/dates'
import { volgendeKleur } from '../lib/kleuren'
import type { Label, List } from '../lib/types'
import { Lijstmenu } from './Lijstmenu'
import { LijstDialoog } from './LijstDialoog'

interface Props {
  opNieuweTaak: () => void
  /** Op smalle schermen schuift de zijbalk over de inhoud heen. */
  open: boolean
  opSluiten: () => void
}

export function Zijbalk({ opNieuweTaak, open, opSluiten }: Props) {
  const { session, uitloggen } = useAuth()
  const { lijsten, gearchiveerdeLijsten, labels, taken, lijstToevoegen, labelToevoegen } =
    useTaken()
  const [nieuweLijst, setNieuweLijst] = useState('')
  const [nieuwLabel, setNieuwLabel] = useState('')
  const [lijstOpen, setLijstOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [lijstenUit, setLijstenUit] = useState(false)
  const [labelsUit, setLabelsUit] = useState(false)
  const [profielOpen, setProfielOpen] = useState(false)
  const [archiefUit, setArchiefUit] = useState(true)
  const [bewerken, setBewerken] = useState<{ lijst?: List; label?: Label } | null>(null)

  const open_taken = taken.filter((t) => !t.completed_at)
  const aantalVandaag = open_taken.filter(
    (t) => t.due_date !== null && t.due_date <= vandaag(),
  ).length
  const aantalInbox = open_taken.filter((t) => t.list_id === null).length
  const aantalTeLaat = open_taken.filter((t) => isAchterstallig(t.due_date)).length

  const email = session?.user.email ?? ''
  const naam = email.split('@')[0] ?? ''
  const initialen = naam.slice(0, 2).toUpperCase() || '?'

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
        {/* Wie je bent en hoe je eruit komt, allebei bovenaan. De regel
            onderaan met een e-mailadres in muizenletters kon daarmee weg. */}
        <div className="relative flex items-center gap-2 px-3 pt-3 pb-2">
          <button
            onClick={() => setProfielOpen((v) => !v)}
            aria-expanded={profielOpen}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-muted"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
              {initialen}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold first-letter:uppercase">
              {naam}
            </span>
            <span className="text-xs text-ink-faint">⌄</span>
          </button>
          <button
            onClick={opSluiten}
            aria-label="Menu sluiten"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-xl text-ink-faint transition active:bg-surface-muted lg:hidden"
          >
            ×
          </button>

          {profielOpen && (
            <>
              <button
                aria-label="Menu sluiten"
                onClick={() => setProfielOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
              <div className="absolute top-full right-3 left-3 z-40 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl">
                <p className="truncate px-3 py-2 text-xs text-ink-faint" title={email}>
                  {email}
                </p>
                <button
                  onClick={() => void uitloggen()}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-surface-muted hover:text-danger"
                >
                  Uitloggen
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-3 pb-1">
          <button
            onClick={opNieuweTaak}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
          >
            <span className="grid size-6 place-items-center rounded-full bg-brand text-base leading-none text-white">
              +
            </span>
            Taak toevoegen
          </button>
        </div>

        {/* Eén handler voor alle links: op mobiel ligt de zijbalk over de
            pagina heen, dus na het kiezen van een lijst moet hij dicht. */}
        <nav
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) opSluiten()
          }}
          className="flex-1 overflow-y-auto px-3 pb-6"
        >
          <ul className="space-y-0.5">
            <Item to="/zoeken" label="Zoeken" icoon="🔍" />
            <Item to="/inbox" label="Inbox" icoon="📥" aantal={aantalInbox} />
            <Item to="/" label="Vandaag" icoon="☀️" aantal={aantalVandaag} nadruk={aantalTeLaat > 0} />
            <Item to="/binnenkort" label="Binnenkort" icoon="🗓️" />
            <Item to="/klaar" label="Afgerond" icoon="✅" />
          </ul>

          <Kop
            titel="Mijn lijsten"
            opToevoegen={() => {
              setLijstenUit(false)
              setLijstOpen((v) => !v)
            }}
            toevoegenActief={lijstOpen}
            ingeklapt={lijstenUit}
            opKlappen={() => setLijstenUit((v) => !v)}
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
          {!lijstenUit && (
            <ul className="space-y-0.5">
              {lijsten.map((l) => (
                <Lijstregel
                  key={l.id}
                  lijst={l}
                  aantal={perLijst(l.id)}
                  opBewerken={() => setBewerken({ lijst: l })}
                />
              ))}
              {lijsten.length === 0 && !lijstOpen && (
                <li className="px-3 py-1.5 text-xs text-ink-faint">Nog geen lijsten.</li>
              )}
            </ul>
          )}

          <Kop
            titel="Labels"
            opToevoegen={() => {
              setLabelsUit(false)
              setLabelOpen((v) => !v)
            }}
            toevoegenActief={labelOpen}
            ingeklapt={labelsUit}
            opKlappen={() => setLabelsUit((v) => !v)}
          />
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
          {!labelsUit && (
            <ul className="space-y-0.5">
              {labels.map((lb) => (
                <li key={lb.id} className="group/regel relative">
                  <NavLink
                    to={`/label/${lb.id}`}
                    className={({ isActive }) => `${regelKlassen(isActive)} pr-9`}
                  >
                    <span className="grid size-4 shrink-0 place-items-center text-ink-faint">#</span>
                    <span className="flex-1 truncate" style={{ color: lb.color }}>
                      {lb.name}
                    </span>
                  </NavLink>
                  <span className="absolute inset-y-0 right-1 flex items-center">
                    <Lijstmenu label={lb} inZijbalk opBewerken={() => setBewerken({ label: lb })} />
                  </span>
                </li>
              ))}
              {labels.length === 0 && !labelOpen && (
                <li className="px-3 py-1.5 text-xs text-ink-faint">Nog geen labels.</li>
              )}
            </ul>
          )}
          {gearchiveerdeLijsten.length > 0 && (
            <>
              {/* Opgeborgen lijsten staan onderaan en beginnen ingeklapt: je
                  hebt ze weggezet, dus ze horen niet meer in de weg te staan. */}
              <button
                onClick={() => setArchiefUit((v) => !v)}
                aria-expanded={!archiefUit}
                className="mt-5 mb-1 flex w-full items-center gap-1 px-3 py-1 text-left text-xs font-semibold tracking-wider text-ink-faint uppercase transition hover:text-ink-soft"
              >
                Archief
                <span className={archiefUit ? '-rotate-90 text-[10px]' : 'text-[10px]'}>⌄</span>
                <span className="ml-auto text-[10px] normal-case">
                  {gearchiveerdeLijsten.length}
                </span>
              </button>
              {!archiefUit && (
                <ul className="space-y-0.5 opacity-70">
                  {gearchiveerdeLijsten.map((l) => (
                    <Lijstregel
                      key={l.id}
                      lijst={l}
                      aantal={0}
                      opBewerken={() => setBewerken({ lijst: l })}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </nav>

        {bewerken && (
          <LijstDialoog
            lijst={bewerken.lijst}
            label={bewerken.label}
            opSluiten={() => setBewerken(null)}
          />
        )}

        <p className="hidden border-t border-line px-5 py-2.5 text-[11px] text-ink-faint lg:block">
          <kbd className="rounded border border-line px-1">q</kbd> nieuwe taak ·{' '}
          <kbd className="rounded border border-line px-1">/</kbd> zoeken
        </p>
      </aside>
    </>
  )
}

function Lijstregel({
  lijst,
  aantal,
  opBewerken,
}: {
  lijst: List
  aantal: number
  opBewerken: () => void
}) {
  return (
    // De knop staat naast de link en niet erin: een knop in een link is voor
    // een schermlezer (en voor de browser) een raadsel.
    <li className="group/regel relative">
      <NavLink to={`/lijst/${lijst.id}`} className={({ isActive }) => `${regelKlassen(isActive)} pr-9`}>
        <span className="grid size-4 shrink-0 place-items-center">
          <span className="size-2.5 rounded-full" style={{ background: lijst.color }} />
        </span>
        <span className="flex-1 truncate">{lijst.name}</span>
        {aantal > 0 && (
          <span className="text-xs text-ink-faint lg:group-hover/regel:invisible">{aantal}</span>
        )}
      </NavLink>
      <span className="absolute inset-y-0 right-1 flex items-center">
        <Lijstmenu lijst={lijst} inZijbalk opBewerken={opBewerken} />
      </span>
    </li>
  )
}

function regelKlassen(actief: boolean) {
  return [
    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition lg:py-1.5',
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
        <span className="grid size-4 shrink-0 place-items-center text-base leading-none">
          {icoon}
        </span>
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
  toevoegenActief,
  ingeklapt,
  opKlappen,
}: {
  titel: string
  opToevoegen: () => void
  toevoegenActief: boolean
  ingeklapt: boolean
  opKlappen: () => void
}) {
  return (
    <div className="group/kop mt-5 mb-1 flex items-center gap-1 pr-1 pl-3">
      {/* Het kopje is zelf de knop om in te klappen; met tien lijsten wil je
          de labels eronder soms even weg hebben. */}
      <button
        onClick={opKlappen}
        aria-expanded={!ingeklapt}
        className="flex flex-1 items-center gap-1 py-1 text-left text-xs font-semibold tracking-wider text-ink-faint uppercase transition hover:text-ink-soft"
      >
        {titel}
        <span className={ingeklapt ? '-rotate-90 text-[10px]' : 'text-[10px]'}>⌄</span>
      </button>
      <button
        onClick={opToevoegen}
        aria-label={`${titel} toevoegen`}
        className={[
          'grid size-8 place-items-center rounded transition hover:bg-surface-muted lg:size-6',
          toevoegenActief ? 'text-brand' : 'text-ink-faint',
        ].join(' ')}
      >
        +
      </button>
    </div>
  )
}
