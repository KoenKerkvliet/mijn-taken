import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Paginakop } from '../components/Layout'
import { bewaarThema, leesThema, THEMAS, type Thema } from '../lib/thema'
import { paginaKlassen } from '../lib/weergave'

type Tab = 'algemeen' | 'voortgang' | 'uiterlijk'

const TABS: { waarde: Tab; naam: string }[] = [
  { waarde: 'algemeen', naam: 'Algemeen' },
  { waarde: 'voortgang', naam: 'Voortgang' },
  { waarde: 'uiterlijk', naam: 'Uiterlijk' },
]

export function Instellingen() {
  const [tab, setTab] = useState<Tab>('algemeen')

  return (
    <div className={paginaKlassen('lijst')}>
      <Paginakop titel="Instellingen" />

      {/* Tabs, zodat er later een derde bij kan zonder dat de pagina een
          lange rol met kopjes wordt. */}
      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.waarde}
            onClick={() => setTab(t.waarde)}
            aria-current={tab === t.waarde}
            className={[
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === t.waarde
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            {t.naam}
          </button>
        ))}
      </div>

      {tab === 'algemeen' && <Algemeen />}
      {tab === 'voortgang' && <Voortgang />}
      {tab === 'uiterlijk' && <Uiterlijk />}
    </div>
  )
}

function Algemeen() {
  const { session, naam, naamOpslaan, wachtwoordWijzigen } = useAuth()
  const [nieuweNaam, setNieuweNaam] = useState(naam)
  const [naamBezig, setNaamBezig] = useState(false)
  const [naamMelding, setNaamMelding] = useState<Melding>(null)

  const [huidig, setHuidig] = useState('')
  const [nieuw, setNieuw] = useState('')
  const [herhaal, setHerhaal] = useState('')
  const [wwBezig, setWwBezig] = useState(false)
  const [wwMelding, setWwMelding] = useState<Melding>(null)

  async function naamOpslaanKlik(e: FormEvent) {
    e.preventDefault()
    if (!nieuweNaam.trim()) return
    setNaamBezig(true)
    setNaamMelding(null)
    try {
      await naamOpslaan(nieuweNaam)
      setNaamMelding({ soort: 'goed', tekst: 'Naam opgeslagen.' })
    } catch (fout) {
      setNaamMelding({ soort: 'fout', tekst: tekstVan(fout) })
    }
    setNaamBezig(false)
  }

  async function wachtwoordOpslaan(e: FormEvent) {
    e.preventDefault()
    setWwMelding(null)

    if (nieuw.length < 8) {
      setWwMelding({ soort: 'fout', tekst: 'Kies een wachtwoord van minstens 8 tekens.' })
      return
    }
    if (nieuw !== herhaal) {
      setWwMelding({ soort: 'fout', tekst: 'De twee nieuwe wachtwoorden zijn niet gelijk.' })
      return
    }

    setWwBezig(true)
    try {
      await wachtwoordWijzigen(huidig, nieuw)
      setHuidig('')
      setNieuw('')
      setHerhaal('')
      setWwMelding({ soort: 'goed', tekst: 'Wachtwoord gewijzigd.' })
    } catch (fout) {
      setWwMelding({ soort: 'fout', tekst: tekstVan(fout) })
    }
    setWwBezig(false)
  }

  return (
    <div className="space-y-6">
      <Kaart titel="Naam" uitleg="Zo sta je bovenaan in de zijbalk.">
        <form onSubmit={naamOpslaanKlik} className="flex flex-wrap items-center gap-2">
          <input
            value={nieuweNaam}
            onChange={(e) => setNieuweNaam(e.target.value)}
            placeholder="Je naam"
            className={VELD + ' min-w-0 flex-1'}
          />
          <button
            type="submit"
            disabled={!nieuweNaam.trim() || naamBezig || nieuweNaam.trim() === naam}
            className={KNOP}
          >
            Opslaan
          </button>
        </form>
        <Regel melding={naamMelding} />
        <p className="mt-3 text-xs text-ink-faint">
          Je logt in met <span className="text-ink-soft">{session?.user.email}</span>. Dat adres is
          hier niet te wijzigen.
        </p>
      </Kaart>

      <Kaart titel="Wachtwoord" uitleg="Minstens 8 tekens.">
        <form onSubmit={wachtwoordOpslaan} className="space-y-2">
          <input
            type="password"
            autoComplete="current-password"
            value={huidig}
            onChange={(e) => setHuidig(e.target.value)}
            placeholder="Huidig wachtwoord"
            className={VELD + ' w-full'}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            placeholder="Nieuw wachtwoord"
            className={VELD + ' w-full'}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={herhaal}
            onChange={(e) => setHerhaal(e.target.value)}
            placeholder="Nieuw wachtwoord herhalen"
            className={VELD + ' w-full'}
          />
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={!huidig || !nieuw || wwBezig} className={KNOP}>
              Wachtwoord wijzigen
            </button>
          </div>
        </form>
        <Regel melding={wwMelding} />
      </Kaart>
    </div>
  )
}

function Voortgang() {
  const { dagdoel, dagdoelOpslaan } = useAuth()
  const [doel, setDoel] = useState(dagdoel)
  const [melding, setMelding] = useState<Melding>(null)

  async function zet(nieuw: number) {
    const geklemd = Math.max(0, Math.min(50, nieuw))
    setDoel(geklemd)
    setMelding(null)
    try {
      await dagdoelOpslaan(geklemd)
    } catch (fout) {
      setMelding({ soort: 'fout', tekst: tekstVan(fout) })
      setDoel(dagdoel)
    }
  }

  return (
    <Kaart
      titel="Dagelijks doel"
      uitleg="Hoeveel taken je op een dag af wilt hebben. Op Vandaag loopt er een balk mee."
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void zet(doel - 1)}
          disabled={doel <= 0}
          aria-label="Eentje minder"
          className={STAP}
        >
          −
        </button>
        <span className="min-w-16 text-center text-2xl font-semibold tabular-nums">
          {doel === 0 ? 'uit' : doel}
        </span>
        <button
          type="button"
          onClick={() => void zet(doel + 1)}
          disabled={doel >= 50}
          aria-label="Eentje meer"
          className={STAP}
        >
          +
        </button>
        <span className="text-xs text-ink-faint">
          {doel === 0 ? 'Geen doel; je ziet alleen het aantal.' : 'taken per dag'}
        </span>
      </div>
      <Regel melding={melding} />
    </Kaart>
  )
}

function Uiterlijk() {
  const [thema, setThema] = useState<Thema>(() => leesThema())

  function kies(nieuw: Thema) {
    setThema(nieuw)
    bewaarThema(nieuw)
  }

  return (
    <Kaart titel="Thema" uitleg="Geldt op dit apparaat; op je telefoon stel je het apart in.">
      <div className="space-y-2">
        {THEMAS.map((t) => (
          <button
            key={t.waarde}
            onClick={() => kies(t.waarde)}
            aria-pressed={thema === t.waarde}
            className={[
              'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
              thema === t.waarde
                ? 'border-brand bg-brand-soft'
                : 'border-line hover:border-ink-faint/40',
            ].join(' ')}
          >
            <span
              className={[
                'grid size-5 shrink-0 place-items-center rounded-full border-2 transition',
                thema === t.waarde ? 'border-brand' : 'border-line',
              ].join(' ')}
            >
              {thema === t.waarde && <span className="size-2.5 rounded-full bg-brand" />}
            </span>
            <span>
              <span className="block text-sm font-medium">{t.naam}</span>
              <span className="block text-xs text-ink-faint">{t.uitleg}</span>
            </span>
          </button>
        ))}
      </div>
    </Kaart>
  )
}

type Melding = { soort: 'goed' | 'fout'; tekst: string } | null

const VELD =
  'rounded-lg border border-line bg-canvas px-3 py-2 text-base outline-none focus:border-brand sm:text-sm'

const KNOP =
  'rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'

const STAP =
  'grid size-10 place-items-center rounded-lg border border-line text-lg text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft'

function Kaart({
  titel,
  uitleg,
  children,
}: {
  titel: string
  uitleg?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-tight">{titel}</h2>
      {uitleg && <p className="mt-0.5 mb-3 text-xs text-ink-faint">{uitleg}</p>}
      {children}
    </section>
  )
}

function Regel({ melding }: { melding: Melding }) {
  if (!melding) return null
  return (
    <p
      className={[
        'mt-2 text-xs',
        melding.soort === 'goed' ? 'text-success' : 'text-danger',
      ].join(' ')}
    >
      {melding.tekst}
    </p>
  )
}

function tekstVan(fout: unknown): string {
  return fout instanceof Error ? fout.message : 'Er ging iets mis. Probeer het nog eens.'
}
