import { useMemo, useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import { Paginakop, useSchil } from '../components/Layout'
import { Bord } from '../components/Bord'
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

      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-1.5">
        {lijsten.map((l) => (
          <Chip
            key={l.id}
            naam={l.name}
            kleur={l.color}
            aan={filter.lijsten.includes(l.id)}
            opKlik={() => wissel('lijsten', l.id)}
          />
        ))}
        <Chip
          naam="Geen lijst"
          kleur="#8a8fa3"
          aan={filter.lijsten.includes('geen')}
          opKlik={() => wissel('lijsten', 'geen')}
        />

        {labels.length > 0 && <span className="mx-1 h-5 w-px bg-line" />}
        {labels.map((lb) => (
          <Chip
            key={lb.id}
            naam={`#${lb.name}`}
            kleur={lb.color}
            aan={filter.labels.includes(lb.id)}
            opKlik={() => wissel('labels', lb.id)}
          />
        ))}

        {actief && (
          <button
            onClick={wissen}
            className="ml-1 rounded-full px-2.5 py-1 text-xs text-ink-faint transition hover:text-brand"
          >
            Filter wissen
          </button>
        )}
      </div>

      <Bord groepen={groepen} opBewerken={bewerk} opNieuweTaak={nieuweTaak} />
    </div>
  )
}

function Chip({
  naam,
  kleur,
  aan,
  opKlik,
}: {
  naam: string
  kleur: string
  aan: boolean
  opKlik: () => void
}) {
  return (
    <button
      onClick={opKlik}
      aria-pressed={aan}
      className={[
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
        aan ? 'border-transparent font-medium text-white' : 'border-line text-ink-soft hover:border-ink-faint/50',
      ].join(' ')}
      style={aan ? { background: kleur } : undefined}
    >
      {!aan && <span className="size-2 rounded-full" style={{ background: kleur }} />}
      {naam}
    </button>
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
