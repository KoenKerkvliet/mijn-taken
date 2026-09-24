import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Sectie, TakenLijst } from '../components/TakenLijst'
import { Taakweergave } from '../components/Taakweergave'
import { Weergavekiezer } from '../components/Weergavekiezer'
import { Lijstmenu } from '../components/Lijstmenu'
import { LijstDialoog } from '../components/LijstDialoog'
import { opAfgerondGroeperen, opDatumGroeperen, type Groep } from '../lib/groepen'
import { overDagen, toISODate } from '../lib/dates'
import type { TaskWithMeta } from '../lib/types'
import { sorteerTaken } from '../lib/sorteren'
import { toonDuur, totaleDuur } from '../lib/duur'
import { paginaKlassen, useWeergave } from '../lib/weergave'

type Soort = 'inbox' | 'klaar' | 'lijst' | 'label'

/** Zoveel afgevinkte taken staan er dichtgeklapt onder een lijst. */
const AFGEROND_KORT = 5

/** De dag waarop een taak is afgevinkt, in lokale tijd. */
function dagVanAfvinken(t: TaskWithMeta): string {
  return toISODate(new Date(t.completed_at!))
}

export function Filterpagina({ soort }: { soort: Soort }) {
  const { id } = useParams()
  const { taken, alleTaken, lijsten, gearchiveerdeLijsten, labels } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()
  const [bewerkOpen, setBewerkOpen] = useState(false)
  const [weergave, kiesWeergave] = useWeergave(`${soort}:${id ?? ''}`)
  // Van lijst naar lijst blijft dit component staan, en dan zou "alles tonen"
  // meeverhuizen. Daarom onthouden we voor wélke pagina het openstaat.
  const [allesAfgerondVan, setAllesAfgerondVan] = useState<string | null>(null)
  // Op Afgerond: alles vanaf deze dag staat in beeld, de rest wacht op
  // "Ouder tonen". Bij duizenden afgevinkte taken blijft de pagina zo vlot.
  const [afgerondVanaf, setAfgerondVanaf] = useState(() => overDagen(-30))

  // Een gearchiveerde lijst is nog gewoon te openen; alleen telt hij nergens
  // meer mee. Zijn taken zitten dus niet in `taken` maar in `alleTaken`.
  const lijst =
    soort === 'lijst'
      ? (lijsten.find((l) => l.id === id) ?? gearchiveerdeLijsten.find((l) => l.id === id))
      : undefined
  const opgeborgen = Boolean(lijst?.archived_at)
  const label = soort === 'label' ? labels.find((l) => l.id === id) : undefined

  // Verwijderd of een verkeerde link: terug naar Vandaag in plaats van een
  // lege pagina zonder uitleg.
  if ((soort === 'lijst' && !lijst) || (soort === 'label' && !label)) {
    return <Navigate to="/" replace />
  }

  const bron = opgeborgen ? alleTaken : taken
  const open = bron.filter((t) => !t.completed_at)
  const gefilterd = sorteerTaken(
    soort === 'inbox'
      ? open.filter((t) => t.list_id === null)
      : soort === 'lijst'
        ? open.filter((t) => t.list_id === id)
        : soort === 'label'
          ? open.filter((t) => t.labelIds.includes(id!))
          : [],
  )

  const duur = totaleDuur(gefilterd)

  const afgerond = bron
    .filter((t) => t.completed_at !== null)
    .filter((t) =>
      soort === 'lijst' ? t.list_id === id : soort === 'label' ? t.labelIds.includes(id!) : true,
    )
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))

  // Onder een lijst of label staat alleen het laatste werk; wie verder terug
  // wil, klapt het open.
  const pagina = `${soort}:${id ?? ''}`
  const allesAfgerond = allesAfgerondVan === pagina
  const afgerondInBeeld = allesAfgerond ? afgerond : afgerond.slice(0, AFGEROND_KORT)

  // `afgerond` loopt van nieuw naar oud, dus wat in beeld is, is het begin.
  const recentAfgerond = afgerond.filter((t) => dagVanAfvinken(t) >= afgerondVanaf)
  const ouderAfgerond = afgerond.length - recentAfgerond.length

  /** Telkens een hele maand erbij: die van de nieuwste taak die nog buiten
   *  beeld valt. Zo komt er altijd iets bij, ook na een stille maand, en
   *  staat een maand nooit maar half op het scherm. */
  function ouderTonen() {
    const volgende = afgerond.find((t) => dagVanAfvinken(t) < afgerondVanaf)
    if (volgende) setAfgerondVanaf(`${dagVanAfvinken(volgende).slice(0, 7)}-01`)
  }

  const titel =
    soort === 'inbox'
      ? 'Inbox'
      : soort === 'klaar'
        ? 'Afgerond'
        : soort === 'lijst'
          ? lijst!.name
          : `#${label!.name}`

  const onderschrift =
    soort === 'inbox'
      ? 'Taken die nog niet in een lijst staan.'
      : soort === 'klaar'
        ? 'Alles wat je hebt afgevinkt, nieuwste bovenaan.'
        : soort === 'lijst'
          ? opgeborgen
            ? 'Gearchiveerd - deze taken tellen nergens mee.'
            : duur > 0
              ? `${gefilterd.length} openstaand · ⏱️ ${toonDuur(duur)}`
              : `${gefilterd.length} openstaand`
          : 'Alle taken met dit label.'

  // In de lijst blijft het één doorlopende reeks, zoals het altijd was. Op het
  // bord moeten er kolommen zijn, en dan is de datum de enige indeling die
  // deze pagina heeft.
  const groepen: Groep[] =
    weergave === 'lijst'
      ? [
          {
            sleutel: 'alles',
            titel,
            zonderKop: true,
            taken: gefilterd,
            leegTekst: 'Nog niets hier. Voeg een taak toe.',
          },
        ]
      : opDatumGroeperen(gefilterd)

  return (
    <div className={paginaKlassen(weergave)}>
      <Paginakop
        titel={titel}
        onderschrift={onderschrift}
        kleur={lijst?.color ?? label?.color}
        actie={
          <div className="flex flex-wrap items-center gap-2">
            {soort !== 'klaar' && <Weergavekiezer weergave={weergave} opKiezen={kiesWeergave} />}
            {(lijst || label) && (
              <Lijstmenu lijst={lijst} label={label} opBewerken={() => setBewerkOpen(true)} />
            )}
          </div>
        }
      />

      {bewerkOpen && (
        <LijstDialoog lijst={lijst} label={label} opSluiten={() => setBewerkOpen(false)} />
      )}

      {soort !== 'klaar' && (
        <Taakweergave
          weergave={weergave}
          groepen={groepen}
          agendaTaken={soort === 'lijst' ? taken.filter((t) => t.list_id === id) : gefilterd}
          opBewerken={bewerk}
          opNieuweTaak={nieuweTaak}
          toonLijst={soort !== 'lijst'}
          lijstId={soort === 'lijst' ? (id ?? null) : null}
        />
      )}

      {/* De knop boven de pagina is weg; toevoegen hoort onder de lijst, waar
          je toch al kijkt als je iets mist. */}
      {soort !== 'klaar' && weergave === 'lijst' && !opgeborgen && (
        <button
          onClick={() => nieuweTaak({ lijstId: soort === 'lijst' ? id : null })}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-ink-faint transition hover:bg-surface-muted hover:text-brand"
        >
          <span className="text-base leading-none">+</span> Taak toevoegen
        </button>
      )}

      {afgerond.length > 0 && soort !== 'inbox' && soort !== 'klaar' && weergave === 'lijst' && (
        <div className="mt-8">
          <Sectie titel="Afgerond" aantal={afgerond.length}>
            <TakenLijst
              taken={afgerondInBeeld}
              opBewerken={bewerk}
              toonLijst={soort !== 'lijst'}
            />
            {afgerond.length > AFGEROND_KORT && (
              <button
                onClick={() => setAllesAfgerondVan(allesAfgerond ? null : pagina)}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-faint transition hover:bg-surface-muted hover:text-brand"
              >
                {allesAfgerond ? 'Minder tonen' : `Alles tonen (${afgerond.length})`}
              </button>
            )}
          </Sectie>
        </div>
      )}

      {soort === 'klaar' &&
        (afgerond.length === 0 ? (
          <TakenLijst taken={[]} opBewerken={bewerk} leegTekst="Nog niets afgerond." />
        ) : (
          <>
            {recentAfgerond.length === 0 && (
              <div className="mb-7">
                <TakenLijst
                  taken={[]}
                  opBewerken={bewerk}
                  leegTekst="De afgelopen 30 dagen niets afgevinkt."
                />
              </div>
            )}
            {opAfgerondGroeperen(recentAfgerond).map((groep) => (
              <Sectie
                key={groep.sleutel}
                titel={groep.titel}
                aantal={groep.taken.length}
                duur={totaleDuur(groep.taken)}
              >
                <TakenLijst taken={groep.taken} opBewerken={bewerk} />
              </Sectie>
            ))}
            {ouderAfgerond > 0 && (
              <button
                onClick={ouderTonen}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-faint transition hover:bg-surface-muted hover:text-brand"
              >
                Ouder tonen ({ouderAfgerond})
              </button>
            )}
          </>
        ))}
    </div>
  )
}
