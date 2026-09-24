import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { Priority, TaskWithMeta } from '../lib/types'
import {
  HERINNERING_STANDAARDTIJD,
  naarVelden,
  overDagen,
  toonDatum,
  uitVelden,
  vandaag,
} from '../lib/dates'
import { herhalingVoorOpslag, leesTitel, letterlijk } from '../lib/titel'
import { leesHerhaling, toonHerhaling } from '../lib/herhaling'
import { PRIORITEITEN } from '../lib/prioriteiten'
import { volgendeKleur } from '../lib/kleuren'
import { Titelveld } from './Titelveld'
import { gebruikZichtbaarVenster } from '../lib/scherm'
import { kaartLink, Vinkje } from './TaakRegel'
import { Opmerkingen } from './Opmerkingen'
import { leesDuur, toonDuur } from '../lib/duur'

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
  const [duurTekst, setDuurTekst] = useState('')
  const [herinneringDatum, setHerinneringDatum] = useState('')
  const [herinneringTijd, setHerinneringTijd] = useState('')
  const [locatie, setLocatie] = useState('')
  // Alleen op een telefoon ingeklapt, zie de knop "Meer opties" hieronder.
  const [meerOpen, setMeerOpen] = useState(false)
  const omschrijvingVeld = useRef<HTMLTextAreaElement>(null)
  const venster = gebruikZichtbaarVenster()

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
    setDuurTekst(taak?.duration_minutes ? toonDuur(taak.duration_minutes) : '')
    const herinnering = taak?.remind_at ? naarVelden(taak.remind_at) : null
    setHerinneringDatum(herinnering?.datum ?? '')
    setHerinneringTijd(herinnering?.tijd ?? '')
    setLocatie(taak?.location ?? '')
    // Een nieuwe taak begint ingeklapt; een bestaande open je juist om de
    // details te zien.
    setMeerOpen(Boolean(taak))
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
    // Ingeklapt is het veld onzichtbaar en meet het 0; bij uitklappen dus
    // opnieuw meten, anders blijft het een streepje.
  }, [open, omschrijving, meerOpen])

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
    const duur = gelezen.duur ?? duurVeld
    const herinnering = herinneringDatum ? uitVelden(herinneringDatum, herinneringTijd) : null
    const plek = locatie.trim() || null
    const velden = {
      title: gelezen.titel,
      description: omschrijving.trim() || null,
      due_date: gelezen.datum ?? (datum || null),
      priority: gelezen.prioriteit ?? prioriteit,
      list_id: gelezen.lijst ? gelezen.lijst.id : lijstId || null,
      // Alleen meesturen als er iets verandert: zolang migratie 0004 niet
      // gedraaid is, bestaat de kolom niet en zou elke wijziging stuklopen.
      ...(duur !== (taak?.duration_minutes ?? null) ? { duration_minutes: duur } : {}),
      // Hetzelfde voor 0005. Op het moment vergelijken en niet op de tekst:
      // de database schrijft "+00:00" waar de browser "Z" schrijft.
      ...(!zelfdeMoment(herinnering, taak?.remind_at ?? null) ? { remind_at: herinnering } : {}),
      ...(plek !== (taak?.location ?? null) ? { location: plek } : {}),
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

  // Altijd met een vraag, ook zonder subtaken: de knop staat in dezelfde
  // balk als Opslaan, en er is geen ongedaan maken.
  async function verwijderen() {
    if (!actueel) return
    const zeker = window.confirm(
      actueel.subtasks.length > 0
        ? `"${actueel.title}" verwijderen? De ${actueel.subtasks.length} subtaken gaan mee.`
        : `"${actueel.title}" verwijderen?`,
    )
    if (!zeker) return
    setBezig(true)
    await taakVerwijderen(actueel.id)
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

  const duurVeld = leesDuur(duurTekst)
  const duurFout = duurTekst.trim() !== '' && duurVeld === null
  const duurVast = gelezen.duur !== null

  const uitTitel =
    gelezen.duur !== null ||
    gelezen.lijst !== null ||
    gelezen.labels.length > 0 ||
    gelezen.datum !== null ||
    gelezen.prioriteit !== null
  const datumVast = gelezen.datum !== null
  const prioriteitVast = gelezen.prioriteit !== null

  // Op een telefoon schuift het toetsenbord het venster omhoog, en met alle
  // velden erbij verdween de titel dan boven in beeld. Bij een nieuwe taak
  // staat daarom alleen de titel open; de rest regel je meestal toch met
  // tags. Wat er ingeklapt al wel is ingevuld - zoals de dag of lijst van de
  // pagina waar je vandaan komt - staat op de knop, zodat het geen
  // verrassing is. Op een breed scherm is er ruimte genoeg en blijft alles
  // gewoon staan.
  const ingeklapt = meerOpen ? '' : 'hidden sm:block'
  const alIngevuld = [
    !datumVast && datum ? `🗓️ ${toonDatum(datum)}` : null,
    !gelezen.lijst && lijstId ? lijsten.find((l) => l.id === lijstId)?.name : null,
    !prioriteitVast && prioriteit !== 4 ? `⚑ ${naamVan(prioriteit)}` : null,
    !duurVast && duurVeld ? `⏱️ ${toonDuur(duurVeld)}` : null,
    ...labels
      .filter((lb) => gekozenLabels.includes(lb.id) && !gelezen.labels.includes(lb))
      .map((lb) => `#${lb.name}`),
    herinneringDatum ? '🔔' : null,
    locatie.trim() ? '📍' : null,
    omschrijving.trim() ? '📝' : null,
  ].filter(Boolean)

  const kanOpslaan = gelezen.titel.trim().length > 0 && !bezig && (duurVast || !duurFout)

  return (
    // Vastgezet op wat er van het scherm te zien is in plaats van op het hele
    // scherm: schuift het toetsenbord omhoog, dan schuift dit venster mee en
    // blijft het titelveld zichtbaar in plaats van eronder te verdwijnen.
    <div
      style={{ top: venster.top, height: venster.hoogte }}
      className="fixed inset-x-0 z-40 flex items-end justify-center overflow-y-auto bg-black/40 sm:items-start sm:p-4 sm:pt-[10vh]"
    >
      <button aria-label="Sluiten" className="fixed inset-0 -z-10" onClick={opSluiten} />

      <form
        onSubmit={opslaan}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-h-[92%] sm:rounded-2xl"
      >
        <div className="p-5">
          <Titelveld
            waarde={titel}
            opWijzigen={setTitel}
            stukken={gelezen.stukken}
            placeholder="Wat moet er gebeuren? Bijv. Nakijken vrijdag p2 /klas"
          />
          <textarea
            ref={omschrijvingVeld}
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Omschrijving (optioneel)"
            rows={2}
            className={`${ingeklapt} mt-2 max-h-[45dvh] w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed outline-none placeholder:text-ink-faint sm:text-sm`}
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
              {gelezen.duur && (
                <span className="font-medium text-ink-soft">⏱️ {toonDuur(gelezen.duur)}</span>
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

          <button
            type="button"
            onClick={() => setMeerOpen((v) => !v)}
            aria-expanded={meerOpen}
            className="mt-3 flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-sm text-ink-soft transition hover:text-brand sm:hidden"
          >
            <span className="shrink-0">{meerOpen ? 'Minder opties' : 'Meer opties'}</span>
            <span aria-hidden className={`shrink-0 transition ${meerOpen ? 'rotate-180' : ''}`}>
              ⌄
            </span>
            {!meerOpen && alIngevuld.length > 0 && (
              <span className="min-w-0 truncate text-xs text-ink-faint">
                {alIngevuld.join(' · ')}
              </span>
            )}
          </button>

          <div className={ingeklapt}>
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

              {/* Tekst en geen getalveld: je typt hier hetzelfde als in de
                  titel, 30m of 1u. */}
              <input
                value={duurVast ? toonDuur(gelezen.duur!) : duurTekst}
                onChange={(e) => setDuurTekst(e.target.value)}
                disabled={duurVast}
                placeholder="Duur: 30m, 1u"
                aria-label="Hoe lang duurt het"
                aria-invalid={duurFout && !duurVast}
                title={
                  duurVast
                    ? 'Vastgezet door de duur in de titel'
                    : duurFout
                      ? 'Gebruik m of u, bijvoorbeeld 5m, 30m, 1u of 1u30m'
                      : undefined
                }
                autoComplete="off"
                className={`${VELD} w-32 disabled:opacity-60 ${duurFout && !duurVast ? 'border-danger focus:border-danger' : ''}`}
              />
            </div>

            {/* Zonder tijd gaat de herinnering 's ochtends af; dat zegt het
                grijze tekstje erachter, anders is het een verrassing. */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-5 shrink-0 text-center" aria-hidden>
                🔔
              </span>
              <input
                type="date"
                value={herinneringDatum}
                onChange={(e) => setHerinneringDatum(e.target.value)}
                aria-label="Herinnering: dag"
                className={VELD}
              />
              <input
                type="time"
                value={herinneringTijd}
                onChange={(e) => setHerinneringTijd(e.target.value)}
                disabled={!herinneringDatum}
                aria-label="Herinnering: tijd"
                className={`${VELD} disabled:opacity-60`}
              />
              {herinneringDatum ? (
                <>
                  {!herinneringTijd && (
                    <span className="text-xs text-ink-faint">om {HERINNERING_STANDAARDTIJD}</span>
                  )}
                  <SnelleDatum
                    label="Wissen"
                    opKlik={() => {
                      setHerinneringDatum('')
                      setHerinneringTijd('')
                    }}
                  />
                </>
              ) : (
                <>
                  <SnelleDatum
                    label="Over 1 uur"
                    opKlik={() => {
                      const straks = naarVelden(new Date(Date.now() + 3_600_000).toISOString())
                      setHerinneringDatum(straks.datum)
                      setHerinneringTijd(straks.tijd)
                    }}
                  />
                  <SnelleDatum
                    label="Morgenochtend"
                    opKlik={() => {
                      setHerinneringDatum(overDagen(1))
                      setHerinneringTijd(HERINNERING_STANDAARDTIJD)
                    }}
                  />
                </>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="w-5 shrink-0 text-center" aria-hidden>
                📍
              </span>
              <input
                value={locatie}
                onChange={(e) => setLocatie(e.target.value)}
                placeholder="Locatie, bijv. een adres of plek"
                aria-label="Locatie"
                maxLength={200}
                autoComplete="off"
                className={`${VELD} min-w-0 flex-1`}
              />
              {locatie.trim() && (
                <a
                  href={kaartLink(locatie.trim())}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-xs text-ink-soft transition hover:border-brand hover:text-brand sm:py-1.5"
                >
                  Kaart ↗
                </a>
              )}
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

            {/* Net als subtaken: alleen bij een taak die al bestaat. */}
            {actueel && <Opmerkingen taakId={actueel.id} />}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          {taak && (
            <button
              type="button"
              onClick={() => void verwijderen()}
              disabled={bezig}
              className="mr-auto rounded-lg px-3 py-2.5 text-sm text-ink-soft transition hover:bg-danger/10 hover:text-danger disabled:opacity-50 sm:py-2"
            >
              Verwijderen
            </button>
          )}
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

function zelfdeMoment(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b
  return new Date(a).getTime() === new Date(b).getTime()
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
