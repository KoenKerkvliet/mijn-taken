import { useEffect, useMemo, useRef, useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { TaskWithMeta } from '../lib/types'
import { toonHerinnering } from '../lib/dates'
import { meldHerinnering } from '../lib/feedback'
import { Vinkje } from './TaakRegel'

/** Een vangnet: de volgende herinnering krijgt zijn eigen wekker, maar als de
 *  computer sliep of het tabblad stillag, kijkt dit alsnog. */
const VANGNET = 60_000

/** Meer dan drie balken boven elkaar is geen melding meer maar een muur. */
const ZICHTBAAR = 3

/** Herinneringen die afgaan, als balk bovenin het scherm. Alleen zolang de
 *  app openstaat: meldingen terwijl hij dicht is vragen om pushberichten via
 *  een server, en die zijn er (nog) niet. */
export function Herinneringen({ opOpenen }: { opOpenen: (taak: TaskWithMeta) => void }) {
  const { taken, taakBijwerken, taakAfvinken } = useTaken()
  const [nu, setNu] = useState(() => Date.now())
  // Weggeklikt, in afwachting van de database: de balk hoort meteen weg te
  // zijn, niet pas als het antwoord binnen is.
  const [weg, setWeg] = useState<Set<string>>(() => new Set())
  const gemeld = useRef(new Set<string>())

  useEffect(() => {
    const tik = () => setNu(Date.now())
    const vangnet = window.setInterval(tik, VANGNET)
    // Terug naar het tabblad of de telefoon weer aan: meteen kijken.
    document.addEventListener('visibilitychange', tik)
    return () => {
      window.clearInterval(vangnet)
      document.removeEventListener('visibilitychange', tik)
    }
  }, [])

  // Een wekker precies op de eerstvolgende herinnering, zodat 14:30 ook
  // echt om 14:30 verschijnt en niet pas bij de volgende ronde.
  useEffect(() => {
    const straks = taken
      .filter((t) => !t.completed_at && t.remind_at)
      .map((t) => new Date(t.remind_at!).getTime())
      .filter((moment) => moment > nu)
    if (straks.length === 0) return
    const wachten = Math.min(...straks) - Date.now() + 50
    // Verder dan een dag vooruit is een wekker zinloos; het vangnet komt eerder.
    if (wachten > 86_400_000) return
    const wekker = window.setTimeout(() => setNu(Date.now()), Math.max(wachten, 0))
    return () => window.clearTimeout(wekker)
  }, [taken, nu])

  const actief = useMemo(
    () =>
      taken
        .filter((t) => {
          if (t.completed_at || !t.remind_at) return false
          const moment = new Date(t.remind_at).getTime()
          if (moment > nu || weg.has(sleutel(t))) return false
          return !t.reminded_at || new Date(t.reminded_at).getTime() < moment
        })
        .sort((a, b) => (a.remind_at! < b.remind_at! ? -1 : 1)),
    [taken, nu, weg],
  )

  // Geluid bij elke nieuwe melding, niet bij elke ronde opnieuw.
  useEffect(() => {
    const nieuw = actief.filter((t) => !gemeld.current.has(sleutel(t)))
    if (nieuw.length === 0) return
    for (const t of nieuw) gemeld.current.add(sleutel(t))
    meldHerinnering()
  }, [actief])

  if (actief.length === 0) return null

  function wegklikken(t: TaskWithMeta) {
    setWeg((huidig) => new Set(huidig).add(sleutel(t)))
    void taakBijwerken(t.id, { reminded_at: new Date().toISOString() })
  }

  function uitstellen(t: TaskWithMeta) {
    setWeg((huidig) => new Set(huidig).add(sleutel(t)))
    void taakBijwerken(t.id, { remind_at: new Date(Date.now() + 3_600_000).toISOString() })
  }

  return (
    // Onder de statusbalk van een telefoon: de inzet bovenin is de ruimte
    // van de klok en de accu, en daar komt de balk pas onder. Op een breed
    // scherm hangt hij los bovenaan, midden in beeld.
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-4"
    >
      {actief.slice(0, ZICHTBAAR).map((t) => (
        <div
          key={t.id}
          role="alert"
          className="herinnering pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl bg-brand py-2.5 pr-2 pl-4 text-white shadow-2xl"
        >
          <Vinkje
            aan={false}
            kleur="rgba(255,255,255,0.85)"
            opKlik={() => {
              setWeg((huidig) => new Set(huidig).add(sleutel(t)))
              void taakAfvinken(t.id, true)
            }}
          />
          <button
            type="button"
            onClick={() => {
              wegklikken(t)
              opOpenen(t)
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-xs text-white/75">🔔 {toonHerinnering(t.remind_at!)}</span>
            <span className="block truncate text-sm font-semibold">{t.title}</span>
          </button>
          <button
            type="button"
            onClick={() => uitstellen(t)}
            className="shrink-0 rounded-lg bg-white/15 px-2.5 py-2 text-xs font-medium transition hover:bg-white/25 sm:py-1.5"
          >
            1 uur later
          </button>
          <button
            type="button"
            onClick={() => wegklikken(t)}
            aria-label="Herinnering sluiten"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-lg transition hover:bg-white/15 sm:size-8"
          >
            ×
          </button>
        </div>
      ))}
      {actief.length > ZICHTBAAR && (
        <p className="pointer-events-auto rounded-full bg-ink/80 px-3 py-1 text-xs text-canvas shadow">
          en nog {actief.length - ZICHTBAAR}
        </p>
      )}
    </div>
  )
}

/** Een herinnering is een taak op een moment: uitgesteld is een nieuwe. */
function sleutel(t: TaskWithMeta): string {
  return `${t.id}:${t.remind_at}`
}
