import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** Wat er in de knop staat. */
  knopInhoud: ReactNode
  knopKlassen: (open: boolean) => string
  label?: string
  breedte?: number
  /** Waar het paneel op uitlijnt: de linker- of rechterkant van de knop. */
  uitlijning?: 'links' | 'rechts'
  /** Krijgt een functie om zichzelf te sluiten. */
  children: (sluit: () => void) => ReactNode
}

const MARGE = 8

/** Een knop met een paneel eronder dat altijd binnen het scherm blijft.
 *
 *  Het paneel hangt in een laag over de pagina heen en niet in de knop: een
 *  zijbalk of een kop die schuift zou het anders afsnijden. En omdat het met
 *  vaste plaatsbepaling werkt, kan het meten of het er nog onder past - zo
 *  niet, dan klapt het naar boven of schuift het naar binnen. */
export function Zwever({
  knopInhoud,
  knopKlassen,
  label,
  breedte = 216,
  uitlijning = 'rechts',
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const knop = useRef<HTMLButtonElement>(null)
  const paneel = useRef<HTMLDivElement>(null)
  // Tot de eerste meting hangt het paneel buiten beeld; die meting gebeurt
  // vóór het tekenen, dus je ziet het daar nooit staan.
  const [plek, setPlek] = useState({ top: -9999, left: 0 })

  useLayoutEffect(() => {
    if (!open) return

    function plaats() {
      const k = knop.current?.getBoundingClientRect()
      if (!k) return
      const hoogte = paneel.current?.offsetHeight ?? 0

      // Onder de knop, tenzij het daar niet past en er boven wél ruimte is.
      const past = k.bottom + 4 + hoogte <= window.innerHeight - MARGE
      const ruimteBoven = k.top - 4 - hoogte >= MARGE
      const top = past || !ruimteBoven ? k.bottom + 4 : k.top - 4 - hoogte
      const links = uitlijning === 'rechts' ? k.right - breedte : k.left

      setPlek({
        top: Math.max(MARGE, Math.min(top, window.innerHeight - hoogte - MARGE)),
        left: Math.max(MARGE, Math.min(links, window.innerWidth - breedte - MARGE)),
      })
    }

    plaats()
    window.addEventListener('resize', plaats)
    window.addEventListener('scroll', plaats, true)
    return () => {
      window.removeEventListener('resize', plaats)
      window.removeEventListener('scroll', plaats, true)
    }
  }, [open, breedte, uitlijning])

  useEffect(() => {
    if (!open) return
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [open])

  return (
    <>
      <button
        ref={knop}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={knopKlassen(open)}
      >
        {knopInhoud}
      </button>

      {open &&
        createPortal(
          <>
            <button
              aria-label="Sluiten"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              ref={paneel}
              role="menu"
              style={{ top: plek.top, left: plek.left, width: breedte }}
              className="schuifbaan fixed z-50 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1 shadow-xl"
            >
              {children(() => setOpen(false))}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
