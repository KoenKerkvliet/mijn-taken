import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Sectie, TakenLijst } from '../components/TakenLijst'
import { Taakweergave } from '../components/Taakweergave'
import { Weergavekiezer } from '../components/Weergavekiezer'
import { Lijstmenu } from '../components/Lijstmenu'
import { LijstDialoog } from '../components/LijstDialoog'
import { opDatumGroeperen, type Groep } from '../lib/groepen'
import { sorteerTaken } from '../lib/sorteren'
import { paginaKlassen, useWeergave } from '../lib/weergave'

type Soort = 'inbox' | 'klaar' | 'lijst' | 'label'

export function Filterpagina({ soort }: { soort: Soort }) {
  const { id } = useParams()
  const { taken, alleTaken, lijsten, gearchiveerdeLijsten, labels } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()
  const [bewerkOpen, setBewerkOpen] = useState(false)
  const [weergave, kiesWeergave] = useWeergave(`${soort}:${id ?? ''}`)

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

  const afgerond = bron
    .filter((t) => t.completed_at !== null)
    .filter((t) =>
      soort === 'lijst' ? t.list_id === id : soort === 'label' ? t.labelIds.includes(id!) : true,
    )
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))

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
        ? 'Alles wat je hebt afgevinkt, nieuwste eerst.'
        : soort === 'lijst'
          ? opgeborgen
            ? 'Gearchiveerd - deze taken tellen nergens mee.'
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

      {afgerond.length > 0 && soort !== 'inbox' && weergave === 'lijst' && (
        <div className="mt-8">
          <Sectie titel="Afgerond" aantal={afgerond.length}>
            <TakenLijst taken={afgerond} opBewerken={bewerk} toonLijst={soort !== 'lijst'} />
          </Sectie>
        </div>
      )}

      {soort === 'klaar' && afgerond.length === 0 && (
        <TakenLijst taken={[]} opBewerken={bewerk} leegTekst="Nog niets afgerond." />
      )}
    </div>
  )
}
