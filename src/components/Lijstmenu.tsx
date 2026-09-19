import { useLocation, useNavigate } from 'react-router-dom'
import { useTaken } from '../data/TakenProvider'
import { kanVerplaatsen } from '../lib/volgorde'
import type { Label, List } from '../lib/types'
import { Zwever } from './Zwever'

interface Props {
  lijst?: List
  label?: Label
  /** Opent het venster waarin naam en kleur aangepast worden. */
  opBewerken: () => void
  /** In de zijbalk verschijnt de knop pas als je de regel aanwijst. */
  inZijbalk?: boolean
}

/** De drie puntjes achter een lijst of label, met alles wat je ermee kunt. */
export function Lijstmenu({ lijst, label, opBewerken, inZijbalk }: Props) {
  const {
    lijsten,
    gearchiveerdeLijsten,
    lijstVerwijderen,
    lijstVerplaatsen,
    lijstArchiveren,
    labelVerwijderen,
  } = useTaken()
  const navigeer = useNavigate()
  const locatie = useLocation()

  const alle = [...lijsten, ...gearchiveerdeLijsten]
  const opgeborgen = Boolean(lijst?.archived_at)

  /** Sta je op de pagina van wat net verdween, dan hoor je daar weg te gaan. */
  function wegAlsJeErStaat(id: string) {
    if (locatie.pathname.includes(id)) navigeer('/', { replace: true })
  }

  async function verwijderen() {
    if (lijst) {
      const zeker = window.confirm(
        `Lijst "${lijst.name}" verwijderen? De taken blijven bestaan en komen in de inbox.`,
      )
      if (!zeker) return
      await lijstVerwijderen(lijst.id)
      wegAlsJeErStaat(lijst.id)
    }
    if (label) {
      const zeker = window.confirm(`Label "${label.name}" verwijderen?`)
      if (!zeker) return
      await labelVerwijderen(label.id)
      wegAlsJeErStaat(label.id)
    }
  }

  async function archiveren() {
    if (!lijst) return
    await lijstArchiveren(lijst.id, !opgeborgen)
    if (!opgeborgen) wegAlsJeErStaat(lijst.id)
  }

  return (
    <Zwever
      label="Opties"
      breedte={216}
      knopInhoud={<span className="text-base leading-none">⋯</span>}
      knopKlassen={(open) =>
        [
          'grid place-items-center rounded-md text-ink-faint transition hover:bg-surface-muted hover:text-ink',
          inZijbalk
            ? // Op een telefoon bestaat aanwijzen niet, dus daar staat hij er gewoon.
              `size-7 shrink-0 ${open ? 'bg-surface-muted text-ink' : 'lg:opacity-0 lg:group-hover/regel:opacity-100'}`
            : 'size-9 border border-line bg-surface px-2',
        ].join(' ')
      }
    >
      {(sluit) => (
        <>
          <Regel icoon="✎" label="Bewerken" opKlik={() => { sluit(); opBewerken() }} />

          {lijst && (
            <>
              <Regel
                icoon="↑"
                label="Omhoog verplaatsen"
                uit={!kanVerplaatsen(alle, lijst.id, 'omhoog')}
                opKlik={() => {
                  sluit()
                  void lijstVerplaatsen(lijst.id, 'omhoog')
                }}
              />
              <Regel
                icoon="↓"
                label="Omlaag verplaatsen"
                uit={!kanVerplaatsen(alle, lijst.id, 'omlaag')}
                opKlik={() => {
                  sluit()
                  void lijstVerplaatsen(lijst.id, 'omlaag')
                }}
              />
              <Regel
                icoon={opgeborgen ? '↩' : '🗄'}
                label={opgeborgen ? 'Terughalen' : 'Archiveren'}
                opKlik={() => {
                  sluit()
                  void archiveren()
                }}
              />
            </>
          )}

          <div className="my-1 border-t border-line" />
          <Regel
            icoon="×"
            label="Verwijderen"
            gevaar
            opKlik={() => {
              sluit()
              void verwijderen()
            }}
          />
        </>
      )}
    </Zwever>
  )
}

function Regel({
  icoon,
  label,
  opKlik,
  uit,
  gevaar,
}: {
  icoon: string
  label: string
  opKlik: () => void
  uit?: boolean
  gevaar?: boolean
}) {
  return (
    <button
      role="menuitem"
      disabled={uit}
      onClick={opKlik}
      className={[
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition',
        uit
          ? 'cursor-default text-ink-faint opacity-40'
          : gevaar
            ? 'text-ink-soft hover:bg-danger/10 hover:text-danger'
            : 'text-ink-soft hover:bg-surface-muted hover:text-ink',
      ].join(' ')}
    >
      <span className="w-4 text-center text-xs">{icoon}</span>
      {label}
    </button>
  )
}
