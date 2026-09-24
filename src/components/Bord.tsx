import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { TaskWithMeta } from '../lib/types'
import type { Groep } from '../lib/groepen'
import { isAchterstallig, toonDatum } from '../lib/dates'
import { leesHerhaling, toonHerhaling } from '../lib/herhaling'
import { toonDuur, totaleDuur } from '../lib/duur'
import { PRIORITEITEN } from '../lib/prioriteiten'
import { Herinnering, Locatie, Vinkje } from './TaakRegel'

interface Props {
  groepen: Groep[]
  opBewerken: (taak: TaskWithMeta) => void
  opNieuweTaak: (standaarden?: { lijstId?: string | null; datum?: string | null }) => void
  /** Op een lijstpagina staat de lijstnaam al boven de pagina. */
  toonLijst?: boolean
  /** Nieuwe taken op deze pagina horen in deze lijst. */
  lijstId?: string | null
}

/** Kolommen naast elkaar, zoals een bord hoort te werken: een kaart naar een
 *  andere kolom slepen verzet de datum. */
export function Bord({ groepen, opBewerken, opNieuweTaak, toonLijst, lijstId = null }: Props) {
  const { taakVerzetten } = useTaken()
  const [boven, setBoven] = useState<string | null>(null)
  const [sleeptKaart, setSleeptKaart] = useState(false)
  const [pannen, setPannen] = useState(false)
  const baan = useRef<HTMLDivElement>(null)
  const greep = useRef<{ id: number; x: number; scroll: number } | null>(null)

  // Lege kolommen zijn zonde van de breedte, dus die blijven weg. Behalve
  // terwijl je een kaart versleept: dan moet je er juist iets in kunnen
  // laten vallen. En staat alles leeg, dan zou er niets overblijven om een
  // taak aan toe te voegen.
  const zichtbaar = useMemo(() => {
    const gevuld = groepen.filter((g) => g.taken.length > 0)
    if (sleeptKaart || gevuld.length === 0) return groepen
    return gevuld
  }, [groepen, sleeptKaart])

  // Een muis heeft meestal geen wieltje opzij, en dan kom je met de hand nooit
  // bij de laatste kolom. Rolt er verticaal iets binnen terwijl het bord nog
  // ruimte heeft, dan schuiven we dus opzij. Aan het einde gekomen laten we
  // het rollen weer los, anders zit de pagina eronder klem.
  useEffect(() => {
    const el = baan.current
    if (!el) return

    const opWiel = (e: WheelEvent) => {
      // Een touchpad (of shift+wiel) stuurt zelf al opzij; niet in de weg zitten.
      if (e.deltaX !== 0 || e.shiftKey) return
      const ruimte = el.scrollWidth - el.clientWidth
      if (ruimte <= 0) return
      const naarRechts = e.deltaY > 0
      if (naarRechts && el.scrollLeft >= ruimte - 1) return
      if (!naarRechts && el.scrollLeft <= 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    // passive: false, anders mag preventDefault niet.
    el.addEventListener('wheel', opWiel, { passive: false })
    return () => el.removeEventListener('wheel', opWiel)
  }, [])

  /** Het bord aan de achtergrond opzij trekken. Alleen met de muis: op een
   *  touchscreen veeg je gewoon, en dan zou dit die veeg juist afpakken. */
  function pakken(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    // Een kaart of een knop heeft zijn eigen bedoeling met een sleep.
    if ((e.target as HTMLElement).closest('article, button, input, select, textarea, a')) return
    const el = baan.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    greep.current = { id: e.pointerId, x: e.clientX, scroll: el.scrollLeft }
    el.setPointerCapture(e.pointerId)
    setPannen(true)
  }

  function trekken(e: React.PointerEvent) {
    const vast = greep.current
    if (!vast || vast.id !== e.pointerId || !baan.current) return
    baan.current.scrollLeft = vast.scroll - (e.clientX - vast.x)
  }

  function loslaten(e: React.PointerEvent) {
    if (!greep.current) return
    baan.current?.releasePointerCapture(e.pointerId)
    greep.current = null
    setPannen(false)
  }

  const kanSchuiven = (baan.current?.scrollWidth ?? 0) > (baan.current?.clientWidth ?? 0)

  return (
    // Het bord vult de rest van het scherm. Daardoor staat de schuifbalk altijd
    // onderaan in beeld, ook als één kolom veel langer is dan de rest; die
    // kolom schuift van binnen.
    <div
      ref={baan}
      onPointerDown={pakken}
      onPointerMove={trekken}
      onPointerUp={loslaten}
      onPointerCancel={loslaten}
      className={[
        // scroll-pl laat het vangpunt de binnenmarge meetellen; zonder dat
        // klapt een kolom strak tegen de schermrand en blijft de ruimte
        // aan de andere kant liggen.
        'schuifbaan -mx-4 flex min-h-0 flex-1 snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overflow-y-hidden px-4 sm:-mx-6 sm:snap-none sm:scroll-pl-6 sm:px-6',
        pannen ? 'cursor-grabbing select-none' : kanSchuiven ? 'sm:cursor-grab' : '',
      ].join(' ')}
    >
      {zichtbaar.map((groep) => {
        // `datum === undefined` betekent: deze kolom heeft geen eigen dag, dus
        // slepen zou niet weten welke datum het moest worden.
        const sleepbaar = groep.datum !== undefined
        const actief = boven === groep.sleutel
        const duur = totaleDuur(groep.taken)

        return (
          <section
            key={groep.sleutel}
            onDragOver={(e) => {
              if (!sleepbaar) return
              e.preventDefault()
              setBoven(groep.sleutel)
            }}
            onDragLeave={() => setBoven((h) => (h === groep.sleutel ? null : h))}
            onDrop={(e) => {
              setBoven(null)
              if (!sleepbaar) return
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              if (id) void taakVerzetten(id, groep.datum ?? null)
            }}
            className={[
              // De breedte rekent mee met de ruimte in plaats van vast te
              // staan: op een groot scherm passen er precies vier, en de
              // aftrek is de tussenruimte die bij n kolommen (n-1) keer
              // meetelt. Op een telefoon blijft er bewust 2rem over: zo steekt
              // de volgende kolom er net zichtbaar naast, en zie je dat er
              // meer is zonder dat je het hoeft te ontdekken.
              'kolom flex shrink-0 snap-start flex-col rounded-xl border transition',
              'w-[calc(100%-2rem)] sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)] xl:w-[calc((100%-2.25rem)/4)]',
              actief ? 'border-brand bg-brand-soft' : 'border-transparent',
              // Tijdens het slepen mag je zien waar de lege kolommen zitten.
              sleeptKaart && groep.taken.length === 0 ? 'border-dashed border-line' : '',
            ].join(' ')}
          >
            <h2 className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2 text-sm font-semibold tracking-tight">
              <span
                className={[
                  'first-letter:uppercase',
                  groep.accent && groep.taken.length > 0 ? 'text-danger' : '',
                ].join(' ')}
              >
                {groep.titel}
              </span>
              <span className="text-xs font-medium text-ink-faint">{groep.taken.length}</span>
              {duur > 0 && (
                <span className="text-xs font-medium text-ink-faint" title="Geschatte duur samen">
                  ⏱️ {toonDuur(duur)}
                </span>
              )}
              {groep.actie && <span className="ml-auto">{groep.actie}</span>}
            </h2>

            {/* De kolom schuift van binnen, zodat de schuifbalk van het bord
                zelf onderaan het scherm blijft staan. */}
            <div className="kolombaan flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-20 lg:pb-3">
              {groep.taken.map((t) => (
                <Kaart
                  key={t.id}
                  taak={t}
                  opBewerken={opBewerken}
                  toonLijst={toonLijst}
                  opSlepen={setSleeptKaart}
                />
              ))}

              {groep.taken.length === 0 && !sleeptKaart && (
                <p className="px-1 py-2 text-xs text-ink-faint">{groep.leegTekst ?? 'Leeg.'}</p>
              )}

              {sleepbaar && (
                <button
                  onClick={() => opNieuweTaak({ datum: groep.datum ?? null, lijstId })}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-faint transition hover:bg-surface-muted hover:text-brand"
                >
                  <span className="text-base leading-none">+</span> Taak toevoegen
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Kaart({
  taak,
  opBewerken,
  toonLijst = true,
  opSlepen,
}: {
  taak: TaskWithMeta
  opBewerken: (taak: TaskWithMeta) => void
  toonLijst?: boolean
  opSlepen: (bezig: boolean) => void
}) {
  const { lijsten, labels, taakAfvinken } = useTaken()
  const [gepakt, setGepakt] = useState(false)
  const [uitgeklapt, setUitgeklapt] = useState(false)
  const [teLang, setTeLang] = useState(false)
  const omschrijving = useRef<HTMLSpanElement>(null)

  // Of de omschrijving is afgeknipt, weet je pas als hij op het scherm staat:
  // dat hangt af van de breedte van de kolom. Wordt de kolom smaller of
  // breder, dan opnieuw kijken.
  useLayoutEffect(() => {
    const el = omschrijving.current
    if (!el || uitgeklapt) return
    const meet = () => setTeLang(el.scrollHeight > el.clientHeight + 1)
    meet()
    const waarnemer = new ResizeObserver(meet)
    waarnemer.observe(el)
    return () => waarnemer.disconnect()
  }, [taak.description, uitgeklapt])

  const klaar = taak.completed_at !== null
  const lijst = lijsten.find((l) => l.id === taak.list_id)
  const kleur = PRIORITEITEN.find((p) => p.waarde === taak.priority)?.kleur ?? '#94a3b8'
  const metPrio = taak.priority < 4 && !klaar
  const eigenLabels = labels.filter((lb) => taak.labelIds.includes(lb.id))
  const subKlaar = taak.subtasks.filter((s) => s.completed_at).length
  const teLaat = !klaar && isAchterstallig(taak.due_date)
  const herhaling = leesHerhaling(taak.recurrence)

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', taak.id)
        e.dataTransfer.effectAllowed = 'move'
        setGepakt(true)
        opSlepen(true)
      }}
      onDragEnd={() => {
        setGepakt(false)
        opSlepen(false)
      }}
      // Laag is de standaard en houdt de gewone rand; anders zou elk bord
      // vol grijze randjes staan en valt een urgente kaart minder op.
      style={metPrio ? { borderColor: kleur } : undefined}
      className={[
        'shrink-0 rounded-xl border border-line bg-surface p-3 shadow-sm transition',
        gepakt ? 'opacity-40' : metPrio ? '' : 'hover:border-ink-faint/40',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        <Vinkje aan={klaar} kleur={kleur} opKlik={() => void taakAfvinken(taak.id, !klaar)} />
        <div className="min-w-0 flex-1">
          <button
            onClick={() => opBewerken(taak)}
            className="block w-full text-left text-sm leading-snug"
          >
            <span className={klaar ? 'text-ink-faint line-through' : ''}>{taak.title}</span>
            {taak.description && (
              <span
                ref={omschrijving}
                className={[
                  'mt-0.5 text-xs whitespace-pre-line text-ink-soft',
                  // Geen `block` naast line-clamp: dat zet de display terug en
                  // dan knipt er niets meer af.
                  uitgeklapt ? 'block' : 'line-clamp-3',
                ].join(' ')}
              >
                {taak.description}
              </span>
            )}
          </button>
          {(teLang || uitgeklapt) && (
            <button
              onClick={() => setUitgeklapt((v) => !v)}
              className="mt-0.5 text-xs font-medium text-brand transition hover:opacity-80"
            >
              {uitgeklapt ? 'Minder tonen' : 'Meer lezen'}
            </button>
          )}
        </div>
      </div>

      {(taak.due_date ||
        taak.duration_minutes ||
        (taak.remind_at && !klaar) ||
        taak.location ||
        (toonLijst && lijst) ||
        eigenLabels.length > 0 ||
        taak.subtasks.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-[30px] text-xs">
          {taak.due_date && (
            <span className={teLaat ? 'font-medium text-danger' : 'text-ink-soft'}>
              🗓️ {toonDatum(taak.due_date)}
            </span>
          )}
          {herhaling && (
            <span className="text-success" title={`Herhaalt ${toonHerhaling(herhaling)}`}>
              🔁
            </span>
          )}
          {taak.duration_minutes && (
            <span className="text-ink-soft" title="Geschatte duur">
              ⏱️ {toonDuur(taak.duration_minutes)}
            </span>
          )}
          {taak.remind_at && !klaar && <Herinnering tijdstip={taak.remind_at} />}
          {taak.location && <Locatie plek={taak.location} />}
          {/* Op een kaart is geen ruimte om subtaken uit te klappen; dit
              brengt je naar het venster waar ze staan. Een kaart zonder
              subtaken krijgt geen "0/0": daar klik je gewoon de kaart voor
              aan. */}
          {taak.subtasks.length > 0 && (
            <button
              onClick={() => opBewerken(taak)}
              title="Subtaken"
              className="text-ink-soft transition hover:text-brand"
            >
              ☑ {subKlaar}/{taak.subtasks.length}
            </button>
          )}
          {toonLijst && lijst && (
            <span className="flex items-center gap-1 text-ink-soft">
              <span className="size-2 rounded-full" style={{ background: lijst.color }} />
              {lijst.name}
            </span>
          )}
          {eigenLabels.map((lb) => (
            <span key={lb.id} style={{ color: lb.color }}>
              #{lb.name}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
