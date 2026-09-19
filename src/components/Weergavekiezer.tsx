import { WEERGAVEN, type Weergave } from '../lib/weergave'
import { Zwever } from './Zwever'

interface Props {
  weergave: Weergave
  opKiezen: (w: Weergave) => void
}

/** De knop rechtsboven waarmee je tussen lijst, bord en agenda wisselt. */
export function Weergavekiezer({ weergave, opKiezen }: Props) {
  const huidig = WEERGAVEN.find((w) => w.waarde === weergave) ?? WEERGAVEN[0]

  return (
    <Zwever
      breedte={240}
      knopInhoud={
        <>
          <span className="text-base leading-none">{huidig.icoon}</span>
          <span>Weergave</span>
          <span className="text-xs text-ink-faint">{huidig.naam}</span>
        </>
      }
      knopKlassen={(open) =>
        [
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
          open
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-line bg-surface text-ink-soft hover:border-brand hover:text-brand',
        ].join(' ')
      }
    >
      {(sluit) =>
        WEERGAVEN.map((w) => (
          <button
            key={w.waarde}
            role="menuitemradio"
            aria-checked={w.waarde === weergave}
            onClick={() => {
              opKiezen(w.waarde)
              sluit()
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
        ))
      }
    </Zwever>
  )
}
