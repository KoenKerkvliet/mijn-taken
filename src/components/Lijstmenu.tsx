import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTaken } from '../data/TakenProvider'
import { kanVerplaatsen } from '../lib/volgorde'
import type { Label, List } from '../lib/types'

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
  const [open, setOpen] = useState(false)
  const knop = useRef<HTMLButtonElement>(null)
  const [plek, setPlek] = useState({ top: 0, left: 0 })

  // Het menu hangt in een laag over de pagina heen in plaats van in de
  // zijbalk: die schuift, en dan zou een menu onderaan half afgesneden zijn.
  useLayoutEffect(() => {
    if (!open || !knop.current) return
    const r = knop.current.getBoundingClientRect()
    const breedte = 216
    const hoogte = lijst ? 232 : 104
    setPlek({
      top: r.bottom + hoogte > window.innerHeight ? r.top - hoogte - 4 : r.bottom + 4,
      left: Math.min(Math.max(8, r.right - breedte), window.innerWidth - breedte - 8),
    })
  }, [open, lijst])

  useEffect(() => {
    if (!open) return
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // Schuift er iets onder het menu vandaan, dan klopt de plek niet meer.
    function sluit() {
      setOpen(false)
    }
    window.addEventListener('keydown', opToets)
    window.addEventListener('resize', sluit)
    window.addEventListener('scroll', sluit, true)
    return () => {
      window.removeEventListener('keydown', opToets)
      window.removeEventListener('resize', sluit)
      window.removeEventListener('scroll', sluit, true)
    }
  }, [open])

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
    <>
      <button
        ref={knop}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Opties"
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'grid place-items-center rounded-md text-ink-faint transition hover:bg-surface-muted hover:text-ink',
          inZijbalk
            ? // Op een telefoon bestaat aanwijzen niet, dus daar staat hij er gewoon.
              `size-7 shrink-0 ${open ? 'bg-surface-muted text-ink' : 'lg:opacity-0 lg:group-hover/regel:opacity-100'}`
            : 'size-9 border border-line bg-surface px-2',
        ].join(' ')}
      >
        <span className="text-base leading-none">⋯</span>
      </button>

      {open &&
        createPortal(
          <>
            <button
              aria-label="Menu sluiten"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              style={{ top: plek.top, left: plek.left, width: 216 }}
              className="fixed z-50 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl"
            >
              <Regel icoon="✎" label="Bewerken" opKlik={() => { setOpen(false); opBewerken() }} />

              {lijst && (
                <>
                  <Regel
                    icoon="↑"
                    label="Omhoog verplaatsen"
                    uit={!kanVerplaatsen(alle, lijst.id, 'omhoog')}
                    opKlik={() => {
                      setOpen(false)
                      void lijstVerplaatsen(lijst.id, 'omhoog')
                    }}
                  />
                  <Regel
                    icoon="↓"
                    label="Omlaag verplaatsen"
                    uit={!kanVerplaatsen(alle, lijst.id, 'omlaag')}
                    opKlik={() => {
                      setOpen(false)
                      void lijstVerplaatsen(lijst.id, 'omlaag')
                    }}
                  />
                  <Regel
                    icoon={opgeborgen ? '↩' : '🗄'}
                    label={opgeborgen ? 'Terughalen' : 'Archiveren'}
                    opKlik={() => {
                      setOpen(false)
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
                  setOpen(false)
                  void verwijderen()
                }}
              />
            </div>
          </>,
          document.body,
        )}
    </>
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
