import type { TaskWithMeta } from '../lib/types'
import type { Groep } from '../lib/groepen'
import type { Weergave } from '../lib/weergave'
import { Sectie, TakenLijst } from './TakenLijst'
import { Bord } from './Bord'
import { Agenda } from './Agenda'
import { totaleDuur } from '../lib/duur'

interface Props {
  weergave: Weergave
  /** De indeling van deze pagina: kopjes in de lijst, kolommen op het bord. */
  groepen: Groep[]
  /** Alles wat op deze pagina hoort. De agenda toont een hele maand en heeft
   *  dus meer taken nodig dan er in de groepen zitten. */
  agendaTaken: TaskWithMeta[]
  opBewerken: (taak: TaskWithMeta) => void
  opNieuweTaak: (standaarden?: { lijstId?: string | null; datum?: string | null }) => void
  toonLijst?: boolean
  lijstId?: string | null
}

/** Eén set taken, drie brillen. De pagina's bepalen wát er te zien is; dit
 *  component alleen hoe. */
export function Taakweergave({
  weergave,
  groepen,
  agendaTaken,
  opBewerken,
  opNieuweTaak,
  toonLijst,
  lijstId = null,
}: Props) {
  if (weergave === 'bord') {
    return (
      <Bord
        groepen={groepen}
        opBewerken={opBewerken}
        opNieuweTaak={opNieuweTaak}
        toonLijst={toonLijst}
        lijstId={lijstId}
      />
    )
  }

  if (weergave === 'agenda') {
    return (
      <Agenda
        taken={agendaTaken}
        opBewerken={opBewerken}
        opNieuweTaak={opNieuweTaak}
        lijstId={lijstId}
      />
    )
  }

  return (
    <>
      {groepen.map((groep) => {
        // Alleen een groep met een echte dag krijgt een uitnodiging om er iets
        // in te zetten. "Zonder datum" hoort leeg gewoon te verdwijnen.
        const heeftDag = typeof groep.datum === 'string'
        if (groep.taken.length === 0 && !groep.leegTekst && !heeftDag) return null

        if (groep.zonderKop) {
          return (
            <TakenLijst
              key={groep.sleutel}
              taken={groep.taken}
              opBewerken={opBewerken}
              toonLijst={toonLijst}
              leegTekst={groep.leegTekst}
            />
          )
        }

        return (
          <Sectie
            key={groep.sleutel}
            titel={groep.titel}
            aantal={groep.taken.length}
            duur={totaleDuur(groep.taken)}
            accent={groep.accent}
            actie={groep.actie}
          >
            {groep.taken.length > 0 ? (
              <TakenLijst taken={groep.taken} opBewerken={opBewerken} toonLijst={toonLijst} />
            ) : groep.leegTekst || !heeftDag ? (
              <TakenLijst taken={[]} opBewerken={opBewerken} leegTekst={groep.leegTekst} />
            ) : (
              <button
                onClick={() => opNieuweTaak({ datum: groep.datum ?? null, lijstId })}
                className="w-full rounded-xl border border-dashed border-line px-4 py-3 text-left text-sm text-ink-faint transition hover:border-brand hover:text-brand"
              >
                + Taak voor deze dag
              </button>
            )}
          </Sectie>
        )
      })}
    </>
  )
}
