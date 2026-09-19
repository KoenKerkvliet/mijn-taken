import { useMemo, useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Bord } from '../components/Bord'
import { Zwever } from '../components/Zwever'
import { opDatumGroeperen } from '../lib/groepen'
import { paginaKlassen } from '../lib/weergave'

const SLEUTEL = 'mijn-taken:planning-filter'

interface Filter {
  lijsten: string[]
  labels: string[]
}

/** Alles wat openstaat, uit alle lijsten door elkaar, op een bord. Waar de
 *  lijstpagina's per lijst kijken, kijkt deze pagina per moment: wat moet er
 *  deze week gebeuren, wat volgende week, en wat heeft nog helemaal geen dag. */
export function Planning() {
  const { taken, lijsten, labels } = useTaken()
  const { bewerk, nieuweTaak } = useSchil()
  const [filter, setFilter] = useState<Filter>(() => leesFilter())

  const gefilterd = useMemo(() => {
    const open = taken.filter((t) => !t.completed_at)
    return open.filter((t) => {
      // Niets aangevinkt is "alles", niet "niets": anders staar je na het
      // wissen van je laatste filter naar een leeg bord.
      const lijstOk =
        filter.lijsten.length === 0 || filter.lijsten.includes(t.list_id ?? 'geen')
      const labelOk =
        filter.labels.length === 0 || t.labelIds.some((id) => filter.labels.includes(id))
      return lijstOk && labelOk
    })
  }, [taken, filter])

  const groepen = useMemo(() => opDatumGroeperen(gefilterd), [gefilterd])
  const actief = filter.lijsten.length > 0 || filter.labels.length > 0

  function wissel(soort: keyof Filter, id: string) {
    setFilter((huidig) => {
      const lijst = huidig[soort]
      const nieuw = {
        ...huidig,
        [soort]: lijst.includes(id) ? lijst.filter((x) => x !== id) : [...lijst, id],
      }
      bewaarFilter(nieuw)
      return nieuw
    })
  }

  function wissen() {
    const leeg = { lijsten: [], labels: [] }
    setFilter(leeg)
    bewaarFilter(leeg)
  }

  return (
    <div className={paginaKlassen('bord')}>
      <Paginakop
        titel="Planning"
        onderschrift={`${gefilterd.length} openstaand uit al je lijsten`}
      />

      {/* Eén regel, wat er ook aan lijsten en labels bijkomt: op een
          telefoon vraten losse knopjes anders het halve scherm op voordat je
          de eerste taak zag. */}
      <div className="mb-4 flex shrink-0 items-center gap-2">
        <Keuzeknop
          naam="Lijsten"
          gekozen={filter.lijsten.length}
          opties={[
            ...lijsten.map((l) => ({ id: l.id, naam: l.name, kleur: l.color })),
            { id: 'geen', naam: 'Geen lijst', kleur: '#8a8fa3' },
          ]}
          actief={filter.lijsten}
          opWisselen={(id) => wissel('lijsten', id)}
        />
        <Keuzeknop
          naam="Labels"
          gekozen={filter.labels.length}
          opties={labels.map((l) => ({ id: l.id, naam: `#${l.name}`, kleur: l.color }))}
          actief={filter.labels}
          opWisselen={(id) => wissel('labels', id)}
        />

        {actief && (
          <button
            onClick={wissen}
            className="rounded-full px-2.5 py-1 text-xs text-ink-faint transition hover:text-brand"
          >
            Wissen
          </button>
        )}
      </div>

      <Bord groepen={groepen} opBewerken={bewerk} opNieuweTaak={nieuweTaak} />
    </div>
  )
}

function Keuzeknop({
  naam,
  gekozen,
  opties,
  actief,
  opWisselen,
}: {
  naam: string
  gekozen: number
  opties: { id: string; naam: string; kleur: string }[]
  actief: string[]
  opWisselen: (id: string) => void
}) {
  if (opties.length === 0) return null

  return (
    <Zwever
      breedte={232}
      uitlijning="links"
      knopInhoud={
        <>
          {naam}
          {gekozen > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {gekozen}
            </span>
          )}
          <span className="text-[10px] text-ink-faint">⌄</span>
        </>
      }
      knopKlassen={(open) =>
        [
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
          gekozen > 0 || open
            ? 'border-brand text-brand'
            : 'border-line text-ink-soft hover:border-ink-faint/50',
        ].join(' ')
      }
    >
      {() =>
        opties.map((o) => {
          const aan = actief.includes(o.id)
          return (
            <button
              key={o.id}
              role="menuitemcheckbox"
              aria-checked={aan}
              // Niet sluiten na een keuze: meestal vink je er meer dan één aan.
              onClick={() => opWisselen(o.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-muted"
            >
              <span
                className={[
                  'grid size-4 shrink-0 place-items-center rounded border text-[10px] text-white transition',
                  aan ? 'border-transparent' : 'border-line',
                ].join(' ')}
                style={aan ? { background: o.kleur } : undefined}
              >
                {aan && '✓'}
              </span>
              <span className="size-2 shrink-0 rounded-full" style={{ background: o.kleur }} />
              <span className="flex-1 truncate">{o.naam}</span>
            </button>
          )
        })
      }
    </Zwever>
  )
}

/** De filter blijft staan tot je hem wist; hij hoort bij hoe je naar je werk
 *  kijkt, en dat verandert niet per keer dat je de pagina opent. */
function leesFilter(): Filter {
  try {
    const ruw = localStorage.getItem(SLEUTEL)
    if (ruw) {
      const bewaard = JSON.parse(ruw) as Filter
      if (Array.isArray(bewaard.lijsten) && Array.isArray(bewaard.labels)) return bewaard
    }
  } catch {
    // Onleesbaar of geblokkeerd: dan gewoon alles tonen.
  }
  return { lijsten: [], labels: [] }
}

function bewaarFilter(filter: Filter): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(filter))
  } catch {
    // Zie hierboven.
  }
}
