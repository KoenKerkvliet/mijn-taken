import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Statistieken } from '../components/Statistieken'
import { Sectie, TakenLijst } from '../components/TakenLijst'
import { isAchterstallig, vandaag } from '../lib/dates'
import { sorteerTaken } from '../lib/sorteren'

export function Vandaag() {
  const { taken } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()

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

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-6 pb-16">
      <Paginakop
        titel="Vandaag"
        onderschrift={datumTekst.charAt(0).toUpperCase() + datumTekst.slice(1)}
        actie={
          <button
            onClick={() => nieuweTaak({ datum: vandaag() })}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
          >
            + Taak voor vandaag
          </button>
        }
      />

      <Statistieken taken={taken} />

      {teLaat.length > 0 && (
        <Sectie titel="Achterstallig" aantal={teLaat.length} accent>
          <TakenLijst taken={teLaat} opBewerken={bewerk} />
        </Sectie>
      )}

      <Sectie titel="Vandaag" aantal={vandaagTaken.length}>
        <TakenLijst
          taken={vandaagTaken}
          opBewerken={bewerk}
          leegTekst={
            teLaat.length === 0
              ? 'Niets meer te doen vandaag. Goed bezig.'
              : 'Geen taken die vandaag aflopen.'
          }
        />
      </Sectie>

      {vandaagKlaar.length > 0 && (
        <Sectie titel="Vandaag afgerond" aantal={vandaagKlaar.length}>
          <TakenLijst taken={vandaagKlaar} opBewerken={bewerk} />
        </Sectie>
      )}
    </div>
  )
}
