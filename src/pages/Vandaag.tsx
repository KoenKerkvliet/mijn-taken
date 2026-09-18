import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Statistieken } from '../components/Statistieken'
import { Taakweergave } from '../components/Taakweergave'
import { Weergavekiezer } from '../components/Weergavekiezer'
import { isAchterstallig, vandaag } from '../lib/dates'
import type { Groep } from '../lib/groepen'
import { sorteerTaken } from '../lib/sorteren'
import { breedte, useWeergave } from '../lib/weergave'

export function Vandaag() {
  const { taken, takenHerplannen } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()
  const [weergave, kiesWeergave] = useWeergave('vandaag')

  const open = taken.filter((t) => !t.completed_at)
  const teLaat = sorteerTaken(open.filter((t) => isAchterstallig(t.due_date)))
  const vandaagTaken = sorteerTaken(open.filter((t) => t.due_date === vandaag()))
  const vandaagKlaar = taken.filter(
    (t) => t.completed_at !== null && t.completed_at.slice(0, 10) === vandaag(),
  )

  const datumTekst = new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  /** Alles van gisteren en eerder in één klap naar vandaag. Met een vraag
   *  ertussen: het zijn er vaak meer dan je denkt en er is geen ongedaan
   *  maken. */
  async function herplannen() {
    const zeker = window.confirm(
      teLaat.length === 1
        ? 'Deze achterstallige taak naar vandaag verzetten?'
        : `Alle ${teLaat.length} achterstallige taken naar vandaag verzetten?`,
    )
    if (!zeker) return
    await takenHerplannen(
      teLaat.map((t) => t.id),
      vandaag(),
    )
  }

  const groepen: Groep[] = [
    {
      sleutel: 'telaat',
      titel: 'Achterstallig',
      accent: true,
      taken: teLaat,
      actie: teLaat.length > 0 && (
        <button
          onClick={() => void herplannen()}
          className="text-xs font-medium text-brand transition hover:opacity-80"
        >
          Herplannen
        </button>
      ),
    },
    {
      sleutel: 'vandaag',
      titel: 'Vandaag',
      datum: vandaag(),
      taken: vandaagTaken,
      leegTekst:
        teLaat.length === 0
          ? 'Niets meer te doen vandaag. Goed bezig.'
          : 'Geen taken die vandaag aflopen.',
    },
    {
      sleutel: 'klaar',
      titel: 'Vandaag afgerond',
      taken: vandaagKlaar,
    },
  ]

  return (
    <div className={`mx-auto w-full px-4 pt-6 pb-28 sm:px-6 lg:pb-16 ${breedte(weergave)}`}>
      <Paginakop
        titel="Vandaag"
        onderschrift={datumTekst.charAt(0).toUpperCase() + datumTekst.slice(1)}
        actie={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => nieuweTaak({ datum: vandaag() })}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
            >
              + Taak voor vandaag
            </button>
            <Weergavekiezer weergave={weergave} opKiezen={kiesWeergave} />
          </div>
        }
      />

      {/* De cijfers horen bij de dag, niet bij een weergave; op het bord en in
          de agenda zouden ze alleen de kolommen wegdrukken. */}
      {weergave === 'lijst' && <Statistieken taken={taken} />}

      <Taakweergave
        weergave={weergave}
        groepen={groepen}
        agendaTaken={taken}
        opBewerken={bewerk}
        opNieuweTaak={nieuweTaak}
      />
    </div>
  )
}
