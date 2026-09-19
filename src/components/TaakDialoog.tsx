import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { Priority, TaskWithMeta } from '../lib/types'
import { overDagen, toonDatum, vandaag } from '../lib/dates'
import { herhalingVoorOpslag, leesTitel, letterlijk } from '../lib/titel'
import { leesHerhaling, toonHerhaling } from '../lib/herhaling'
import { PRIORITEITEN } from '../lib/prioriteiten'
import { volgendeKleur } from '../lib/kleuren'
import { Titelveld } from './Titelveld'
import { Vinkje } from './TaakRegel'

/** 16px op mobiel, want onder die grens zoomt Safari bij het focussen in. */
const VELD =
  'rounded-lg border border-line bg-canvas px-2.5 py-2 text-base outline-none focus:border-brand sm:py-1.5 sm:text-sm'

interface Props {
  open: boolean
  opSluiten: () => void
  /** Meegeven bij bewerken; weglaten voor een nieuwe taak. */
  taak?: TaskWithMeta
  standaardLijst?: string | null
  standaardDatum?: string | null
}

export function TaakDialoog({ open, opSluiten, taak, standaardLijst, standaardDatum }: Props) {
  const {
    alleTaken,
    lijsten,
    labels,
    taakToevoegen,
    taakBijwerken,
    taakAfvinken,
    taakVerwijderen,
    lijstToevoegen,
  } = useTaken()
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [datum, setDatum] = useState('')
  const [prioriteit, setPrioriteit] = useState<Priority>(4)
  const [lijstId, setLijstId] = useState<string>('')
  const [gekozenLabels, setGekozenLabels] = useState<string[]>([])
  const [bezig, setBezig] = useState(false)
  const [nieuweSub, setNieuweSub] = useState('')
  const omschrijvingVeld = useRef<HTMLTextAreaElement>(null)

  // De taak komt als momentopname binnen. Voor de subtaken kijken we naar de
  // actuele versie, anders staat een net toegevoegde subtaak er niet bij.
  const actueel = taak ? (alleTaken.find((t) => t.id === taak.id) ?? taak) : undefined
  const herhaaltNu = leesHerhaling(actueel?.recurrence)

  // Wat er met "#klas", "volgende week donderdag" en "p1" in de titel gaat
  // gebeuren. Live, zodat je het ziet voordat je opslaat in plaats van erna.
  // Alleen bij een nieuwe taak: zie letterlijk() in titel.ts.
  const gelezen = useMemo(
    () => (taak ? letterlijk(titel) : leesTitel(titel, lijsten, labels)),
    [taak, titel, lijsten, labels],
  )

  // Bij openen het formulier vullen met de taak (of met de standaarden van de
  // pagina waar je vandaan komt).
  useEffect(() => {
    if (!open) return
    setTitel(taak?.title ?? '')
    setOmschrijving(taak?.description ?? '')
    setDatum(taak?.due_date ?? standaardDatum ?? '')
    setPrioriteit(taak?.priority ?? 4)
    setLijstId(taak?.list_id ?? standaardLijst ?? '')
    setGekozenLabels(taak?.labelIds ?? [])
    setNieuweSub('')
    setBezig(false)
  }, [open, taak, standaardLijst, standaardDatum])

  // Een omschrijving van tien regels in een venstertje van twee is niet te
  // lezen. Het veld groeit daarom mee met wat erin staat, tot het bijna een
  // half scherm vult; daarna schuift het van binnen en blijven de knoppen
  // eronder bereikbaar.
  useLayoutEffect(() => {
    const el = omschrijvingVeld.current
    if (!open || !el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [open, omschrijving])

  useEffect(() => {
    if (!open) return
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') opSluiten()
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [open, opSluiten])

  if (!open) return null

  async function opslaan(e: FormEvent) {
    e.preventDefault()
    if (!gelezen.titel.trim()) return
    setBezig(true)

    // Wat in de titel staat wint van de velden eronder: dat heb je net
    // getypt, de velden stonden er misschien al vanaf het openen.
    const velden = {
      title: gelezen.titel,
      description: omschrijving.trim() || null,
      due_date: gelezen.datum ?? (datum || null),
      priority: gelezen.prioriteit ?? prioriteit,
      list_id: gelezen.lijst ? gelezen.lijst.id : lijstId || null,
    }

    const alleLabels = [...new Set([...gekozenLabels, ...gelezen.labels.map((l) => l.id)])]

    if (taak) await taakBijwerken(taak.id, velden, alleLabels)
    else
      await taakToevoegen({
        ...velden,
        labelIds: alleLabels,
        recurrence: herhalingVoorOpslag(gelezen),
      })

    setBezig(false)
    opSluiten()
  }

  async function subToevoegen() {
    if (!actueel || !nieuweSub.trim()) return
    await taakToevoegen({
      title: nieuweSub,
      parent_id: actueel.id,
      list_id: actueel.list_id,
    })
    setNieuweSub('')
  }

  function labelWisselen(id: string) {
    setGekozenLabels((huidig) =>
      huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id],
    )
  }

  async function lijstMakenVoor(naam: string) {
    const nieuw = await lijstToevoegen(naam, volgendeKleur(lijsten.length))
    // De tag in de titel vindt de lijst hierna vanzelf; dit is alleen voor het
    // geval de naam net anders geschreven is dan de tag.
    if (nieuw) setLijstId(nieuw.id)
  }

  const uitTitel =
    gelezen.lijst !== null ||
    gelezen.labels.length > 0 ||
    gelezen.datum !== null ||
    gelezen.prioriteit !== null
  const datumVast = gelezen.datum !== null
  const prioriteitVast = gelezen.prioriteit !== null
  const kanOpslaan = gelezen.titel.trim().length > 0 && !bezig

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/40 sm:items-start sm:p-4 sm:pt-[10vh]">
      <button aria-label="Sluiten" className="fixed inset-0 -z-10" onClick={opSluiten} />

      <form
        onSubmit={opslaan}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="p-5">
          <Titelveld
            waarde={titel}
            opWijzigen={setTitel}
            stukken={gelezen.stukken}
            placeholder="Wat moet er gebeuren? Bijv. Verslagen nakijken vrijdag p2 #klas"
          />
          <textarea
            ref={omschrijvingVeld}
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Omschrijving (optioneel)"
            rows={2}
            className="mt-2 max-h-[45dvh] w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed outline-none placeholder:text-ink-faint sm:text-sm"
          />

          {(uitTitel || gelezen.onbekend.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs">
              {uitTitel && (
                <span className="text-ink-soft">
                  Wordt opgeslagen als <span className="font-medium text-ink">{gelezen.titel}</span>
                </span>
              )}
              {gelezen.datum && (
                <span className="font-medium text-brand">🗓️ {toonDatum(gelezen.datum)}</span>
              )}
              {gelezen.herhaling && (
                <span className="font-medium text-success">
                  🔁 {toonHerhaling(gelezen.herhaling)}
                </span>
              )}
              {gelezen.prioriteit && (
                <span
                  className="font-medium"
                  style={{ color: kleurVan(gelezen.prioriteit) }}
                >
                  ⚑ {naamVan(gelezen.prioriteit)}
                </span>
              )}
              {gelezen.lijst && (
                <span
                  className="rounded-full px-2 py-0.5 font-medium text-white"
                  style={{ background: gelezen.lijst.color }}
                >
                  {gelezen.lijst.name}
                </span>
              )}
              {gelezen.labels.map((lb) => (
                <span key={lb.id} className="font-medium" style={{ color: lb.color }}>
                  #{lb.name}
                </span>
              ))}
              {gelezen.onbekend.map((naam) => (
                <button
                  key={naam}
                  type="button"
                  onClick={() => void lijstMakenVoor(naam)}
                  className="rounded-full border border-dashed border-line px-2 py-0.5 text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  Lijst "{naam}" maken
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={gelezen.datum ?? datum}
              onChange={(e) => setDatum(e.target.value)}
              disabled={datumVast}
              title={datumVast ? 'Vastgezet door de datum in de titel' : undefined}
              className={`${VELD} disabled:opacity-60`}
            />
            {!datumVast && (
              <>
                <SnelleDatum label="Vandaag" opKlik={() => setDatum(vandaag())} />
                <SnelleDatum label="Morgen" opKlik={() => setDatum(overDagen(1))} />
                <SnelleDatum label="Volgende week" opKlik={() => setDatum(overDagen(7))} />
                {datum && <SnelleDatum label="Wissen" opKlik={() => setDatum('')} />}
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={gelezen.prioriteit ?? prioriteit}
              onChange={(e) => setPrioriteit(Number(e.target.value) as Priority)}
              disabled={prioriteitVast}
              title={prioriteitVast ? `Vastgezet door p${gelezen.prioriteit} in de titel` : undefined}
              className={`${VELD} disabled:opacity-60`}
            >
              {PRIORITEITEN.map((p) => (
                <option key={p.waarde} value={p.waarde}>
                  Prioriteit: {p.naam}
                </option>
              ))}
            </select>

            <select
              value={gelezen.lijst ? gelezen.lijst.id : lijstId}
              onChange={(e) => setLijstId(e.target.value)}
              disabled={gelezen.lijst !== null}
              title={gelezen.lijst ? `Vastgezet door #${gelezen.lijst.name} in de titel` : undefined}
              className={`${VELD} disabled:opacity-60`}
            >
              <option value="">Inbox (geen lijst)</option>
              {lijsten.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {herhaaltNu && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs">
              <span className="font-medium text-success">🔁 Herhaalt {toonHerhaling(herhaaltNu)}</span>
              <span className="text-ink-faint">
                Afvinken schuift hem door naar de volgende keer.
              </span>
              <button
                type="button"
                onClick={() => void taakBijwerken(actueel!.id, { recurrence: null })}
                className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-ink-soft transition hover:bg-danger/10 hover:text-danger"
              >
                Stoppen
              </button>
            </p>
          )}

          {/* Alleen bij een taak die al bestaat: een subtaak heeft een ouder
              nodig, en die is er pas na het opslaan. */}
          {actueel && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-xs font-medium text-ink-soft">
                Subtaken{' '}
                <span className="text-ink-faint">
                  {actueel.subtasks.filter((s) => s.completed_at).length}/{actueel.subtasks.length}
                </span>
              </p>

              <div className="space-y-1">
                {actueel.subtasks.map((s) => (
                  <div key={s.id} className="group/sub flex items-center gap-2.5">
                    <Vinkje
                      aan={s.completed_at !== null}
                      kleur="#94a3b8"
                      klein
                      opKlik={() => void taakAfvinken(s.id, s.completed_at === null)}
                    />
                    <span
                      className={[
                        'flex-1 text-sm',
                        s.completed_at ? 'text-ink-faint line-through' : 'text-ink-soft',
                      ].join(' ')}
                    >
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => void taakVerwijderen(s.id)}
                      aria-label="Subtaak verwijderen"
                      className="grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition hover:text-danger sm:size-6 sm:opacity-0 sm:group-hover/sub:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Een subtaak wordt meteen opgeslagen, net als in de lijst;
                    daarom een eigen knop en geen tweede formulier in dit
                    formulier - dat mag niet van de browser. */}
                <div className="flex items-center gap-2.5 pt-1">
                  <span className="size-[18px] shrink-0 rounded-full border border-dashed border-line" />
                  <input
                    value={nieuweSub}
                    onChange={(e) => setNieuweSub(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      void subToevoegen()
                    }}
                    placeholder="Subtaak toevoegen…"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-ink-faint sm:text-sm"
                  />
                  {nieuweSub.trim() && (
                    <button
                      type="button"
                      onClick={() => void subToevoegen()}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand-soft"
                    >
                      Toevoegen
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {labels.map((lb) => {
                const aan =
                  gekozenLabels.includes(lb.id) || gelezen.labels.some((t) => t.id === lb.id)
                return (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => labelWisselen(lb.id)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-xs transition sm:py-1',
                      aan ? 'border-transparent text-white' : 'border-line text-ink-soft',
                    ].join(' ')}
                    style={aan ? { background: lb.color } : undefined}
                  >
                    #{lb.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button
            type="button"
            onClick={opSluiten}
            className="rounded-lg px-4 py-2.5 text-sm text-ink-soft transition hover:bg-surface-muted sm:py-2"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!kanOpslaan}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:py-2"
          >
            {taak ? 'Opslaan' : 'Taak toevoegen'}
          </button>
        </div>
      </form>
    </div>
  )
}

function kleurVan(waarde: Priority): string {
  return PRIORITEITEN.find((p) => p.waarde === waarde)?.kleur ?? '#94a3b8'
}

function naamVan(waarde: Priority): string {
  return PRIORITEITEN.find((p) => p.waarde === waarde)?.naam ?? ''
}

function SnelleDatum({ label, opKlik }: { label: string; opKlik: () => void }) {
  return (
    <button
      type="button"
      onClick={opKlik}
      className="rounded-lg border border-line px-2.5 py-2 text-xs text-ink-soft transition hover:border-brand hover:text-brand sm:py-1.5"
    >
      {label}
    </button>
  )
}
