import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Agenda } from '../components/Agenda'
import { paginaKlassen } from '../lib/weergave'

/** Alles wat een datum heeft in één maandoverzicht, uit alle lijsten samen.
 *  Dezelfde agenda die je per lijst kunt kiezen, maar dan over de hele boel. */
export function Agendapagina() {
  const { taken } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()

  return (
    <div className={paginaKlassen('agenda')}>
      <Paginakop titel="Agenda" onderschrift="Al je taken, maand voor maand." />
      <Agenda taken={taken} opBewerken={bewerk} opNieuweTaak={nieuweTaak} />
    </div>
  )
}
