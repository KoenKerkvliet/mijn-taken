import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Taakweergave } from '../components/Taakweergave'
import { Weergavekiezer } from '../components/Weergavekiezer'
import { overDagen } from '../lib/dates'
import { dagTitel, type Groep } from '../lib/groepen'
import { sorteerTaken } from '../lib/sorteren'
import { paginaKlassen, useWeergave } from '../lib/weergave'

const DAGEN_VOORUIT = 7

export function Binnenkort() {
  const { taken } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()
  const [weergave, kiesWeergave] = useWeergave('binnenkort')

  const open = taken.filter((t) => !t.completed_at)
  const dagen = Array.from({ length: DAGEN_VOORUIT }, (_, i) => overDagen(i))
  const grens = overDagen(DAGEN_VOORUIT)

  const later = sorteerTaken(open.filter((t) => t.due_date !== null && t.due_date >= grens))
  const zonderDatum = sorteerTaken(open.filter((t) => t.due_date === null))

  const groepen: Groep[] = [
    ...dagen.map((dag) => ({
      sleutel: dag,
      titel: dagTitel(dag),
      datum: dag,
      taken: sorteerTaken(open.filter((t) => t.due_date === dag)),
    })),
    { sleutel: 'later', titel: 'Later', taken: later },
    { sleutel: 'geendatum', titel: 'Zonder datum', datum: null, taken: zonderDatum },
  ]

  return (
    <div className={paginaKlassen(weergave)}>
      <Paginakop
        titel="Binnenkort"
        onderschrift="De komende zeven dagen, dag voor dag."
        actie={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => nieuweTaak()}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
            >
              + Nieuwe taak
            </button>
            <Weergavekiezer weergave={weergave} opKiezen={kiesWeergave} />
          </div>
        }
      />

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
