import { useEffect, useRef, useState } from 'react'
import { WEERGAVEN, type Weergave } from '../lib/weergave'

interface Props {
  weergave: Weergave
  opKiezen: (w: Weergave) => void
}

/** De knop rechtsboven waarmee je tussen lijst, bord en agenda wisselt. */
export function Weergavekiezer({ weergave, opKiezen }: Props) {
  const [open, setOpen] = useState(false)
  const huidig = WEERGAVEN.find((w) => w.waarde === weergave) ?? WEERGAVEN[0]
  const doos = useRef<HTMLDivElement>(null)

  // Escape sluit het menu; klikken ernaast gaat via het scherm eronder.
  useEffect(() => {
    if (!open) return
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [open])

  return (
    <div ref={doos} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
          open
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-line bg-surface text-ink-soft hover:border-brand hover:text-brand',
        ].join(' ')}
      >
        <span className="text-base leading-none">{huidig.icoon}</span>
        <span>Weergave</span>
        <span className="text-xs text-ink-faint">{huidig.naam}</span>
      </button>

      {open && (
        <>
          <button
            aria-label="Menu sluiten"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl"
          >
            {WEERGAVEN.map((w) => (
              <button
                key={w.waarde}
                role="menuitemradio"
                aria-checked={w.waarde === weergave}
                onClick={() => {
                  opKiezen(w.waarde)
                  setOpen(false)
                }}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                  w.waarde === weergave ? 'bg-brand-soft text-brand' : 'hover:bg-surface-muted',
                ].join(' ')}
              >
                <span className="text-base leading-none">{w.icoon}</span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{w.naam}</span>
                  <span className="block text-xs text-ink-faint">{w.uitleg}</span>
                </span>
                {w.waarde === weergave && <span className="text-sm">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
