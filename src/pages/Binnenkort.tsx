import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Sectie, TakenLijst } from '../components/TakenLijst'
import { overDagen, toonDatum } from '../lib/dates'
import { sorteerTaken } from '../lib/sorteren'

const DAGEN_VOORUIT = 7

export function Binnenkort() {
  const { taken } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()

  const open = taken.filter((t) => !t.completed_at)
  const dagen = Array.from({ length: DAGEN_VOORUIT }, (_, i) => overDagen(i))
  const grens = overDagen(DAGEN_VOORUIT)

  const later = sorteerTaken(open.filter((t) => t.due_date !== null && t.due_date >= grens))
  const zonderDatum = sorteerTaken(open.filter((t) => t.due_date === null))

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-6 pb-16">
      <Paginakop
        titel="Binnenkort"
        onderschrift="De komende zeven dagen, dag voor dag."
        actie={
          <button
            onClick={() => nieuweTaak()}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
          >
            + Nieuwe taak
          </button>
        }
      />

      {dagen.map((dag) => {
        const vanDieDag = sorteerTaken(open.filter((t) => t.due_date === dag))
        return (
          <Sectie key={dag} titel={toonDatum(dag) ?? dag} aantal={vanDieDag.length}>
            {vanDieDag.length > 0 ? (
              <TakenLijst taken={vanDieDag} opBewerken={bewerk} />
            ) : (
              <button
                onClick={() => nieuweTaak({ datum: dag })}
                className="w-full rounded-xl border border-dashed border-line px-4 py-3 text-left text-sm text-ink-faint transition hover:border-brand hover:text-brand"
              >
                + Taak voor deze dag
              </button>
            )}
          </Sectie>
        )
      })}

      {later.length > 0 && (
        <Sectie titel="Later" aantal={later.length}>
          <TakenLijst taken={later} opBewerken={bewerk} />
        </Sectie>
      )}

      {zonderDatum.length > 0 && (
        <Sectie titel="Zonder datum" aantal={zonderDatum.length}>
          <TakenLijst taken={zonderDatum} opBewerken={bewerk} />
        </Sectie>
      )}
    </div>
  )
}
