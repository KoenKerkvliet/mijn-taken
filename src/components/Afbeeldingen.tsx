import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskAttachment } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { useTaken } from '../data/TakenProvider'
import { BUCKET, leeslinks, miniatuurPad, uploadAfbeelding } from '../lib/afbeeldingen'

/** Een uur is ruim genoeg om een taakvenster open te hebben; daarna haal je
 *  ze bij het volgende openen gewoon weer op. */
const LINK_GELDIG = 3600

type Links = Record<string, { klein: string; groot: string }>

/** Wat er in het raster staat: een al opgeslagen afbeelding, of een bestand
 *  dat wacht tot de nieuwe taak is opgeslagen. */
type Item = { sleutel: string; naam: string; klein?: string; groot?: string; weg: () => void }

interface Props {
  /** De taak waar het bij hoort. Leeg bij een taak die nog niet bestaat: dan
   *  blijven de bestanden in `wachtend` staan tot het venster ze uploadt. */
  taakId: string | null
  wachtend: File[]
  opWachtend: Dispatch<SetStateAction<File[]>>
}

/** Afbeeldingen bij een taak, onder de opmerkingen in het taakvenster. Net als
 *  opmerkingen worden ze pas opgehaald als je de taak opent, en meteen
 *  opgeslagen, los van de knop Opslaan onderaan het venster. Bij een nieuwe
 *  taak kan dat nog niet, want er is nog geen taak: daar kies je ze alvast en
 *  gaan ze mee als je de taak toevoegt.
 *
 *  Foto's worden in de browser verkleind voordat ze de deur uit gaan. */
export function Afbeeldingen({ taakId, wachtend, opWachtend }: Props) {
  const { session } = useAuth()
  const { omslagenVernieuwen } = useTaken()
  const gebruikerId = session?.user.id
  const [bijlagen, setBijlagen] = useState<TaskAttachment[]>([])
  const [links, setLinks] = useState<Links>({})
  const [laden, setLaden] = useState(taakId !== null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(0)
  const [groot, setGroot] = useState<string | null>(null)
  const kiezer = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!taakId) {
      setBijlagen([])
      setLaden(false)
      return
    }
    let weg = false
    setLaden(true)
    void (async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taakId)
        .order('created_at')
      if (weg) return
      if (error) {
        setLaden(false)
        setFout(leesbaar(error.message))
        return
      }
      const rijen = data ?? []
      const nieuweLinks = await linksVoor(rijen)
      if (weg) return
      setBijlagen(rijen)
      setLinks(nieuweLinks)
      setLaden(false)
    })()
    return () => {
      weg = true
    }
  }, [taakId])

  // Voorbeelden van de bestanden die nog moeten worden geüpload.
  const voorbeelden = useMemo(
    () => wachtend.map((f) => ({ bestand: f, url: URL.createObjectURL(f) })),
    [wachtend],
  )
  useEffect(
    () => () => {
      for (const v of voorbeelden) URL.revokeObjectURL(v.url)
    },
    [voorbeelden],
  )

  async function toevoegen(bestanden: File[]) {
    const fotos = bestanden.filter((b) => b.type.startsWith('image/'))
    if (fotos.length === 0) return
    setFout(null)

    if (!taakId) {
      opWachtend((huidig) => [...huidig, ...fotos])
      return
    }
    if (!gebruikerId) return
    setBezig((n) => n + fotos.length)

    // Een voor een: bij een foutje blijft wat wel gelukt is gewoon staan.
    for (const foto of fotos) {
      try {
        const rij = await uploadAfbeelding(foto, taakId, gebruikerId)
        const nieuweLinks = await linksVoor([rij])
        setLinks((huidig) => ({ ...huidig, ...nieuweLinks }))
        setBijlagen((huidig) => [...huidig, rij])
        void omslagenVernieuwen()
      } catch (e) {
        setFout(
          e instanceof Error && !(e instanceof DOMException)
            ? leesbaar(e.message)
            : `"${foto.name}" kon niet worden gelezen als afbeelding.`,
        )
      }
      setBezig((n) => n - 1)
    }
  }

  async function verwijderen(bijlage: TaskAttachment) {
    if (!window.confirm('Deze afbeelding verwijderen?')) return
    const vorige = bijlagen
    setBijlagen((huidig) => huidig.filter((b) => b.id !== bijlage.id))
    setGroot(null)
    const { error } = await supabase.from('task_attachments').delete().eq('id', bijlage.id)
    if (error) {
      setBijlagen(vorige)
      setFout(leesbaar(error.message))
      return
    }
    await supabase.storage.from(BUCKET).remove([bijlage.path, miniatuurPad(bijlage.path)])
    void omslagenVernieuwen()
  }

  // Een foto of screenshot uit het klembord plakken, zolang het taakvenster
  // open staat. Tekst plakken in een veld blijft gewoon werken: we kijken
  // alleen naar bestanden.
  useEffect(() => {
    function opPlakken(e: ClipboardEvent) {
      const bestanden = [...(e.clipboardData?.files ?? [])]
      if (bestanden.some((b) => b.type.startsWith('image/'))) {
        e.preventDefault()
        void toevoegen(bestanden)
      }
    }
    document.addEventListener('paste', opPlakken)
    return () => document.removeEventListener('paste', opPlakken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taakId, gebruikerId])

  function opKiezen(e: ChangeEvent<HTMLInputElement>) {
    const bestanden = [...(e.target.files ?? [])]
    // Leegmaken, anders gebeurt er niets als je dezelfde foto nog eens kiest.
    e.target.value = ''
    void toevoegen(bestanden)
  }

  const items: Item[] = [
    ...(laden ? [] : bijlagen).map((b) => ({
      sleutel: b.id,
      naam: b.name ?? '',
      klein: links[b.id]?.klein,
      groot: links[b.id]?.groot,
      weg: () => void verwijderen(b),
    })),
    ...voorbeelden.map((v, i) => ({
      sleutel: `wacht-${i}`,
      naam: v.bestand.name,
      klein: v.url,
      groot: v.url,
      weg: () => {
        setGroot(null)
        opWachtend((huidig) => huidig.filter((_, j) => j !== i))
      },
    })),
  ]
  const uitgelicht = items.find((i) => i.sleutel === groot)

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium text-ink-soft">
        Afbeeldingen {items.length > 0 && <span className="text-ink-faint">{items.length}</span>}
      </p>

      {fout && <p className="mb-2 text-xs text-danger">{fout}</p>}

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.sleutel}
            type="button"
            onClick={() => setGroot(item.sleutel)}
            aria-label={`Afbeelding vergroten${item.naam ? `: ${item.naam}` : ''}`}
            className="size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted transition hover:border-brand sm:size-24"
          >
            {item.klein && (
              <img
                src={item.klein}
                alt={item.naam}
                loading="lazy"
                className="size-full object-cover"
              />
            )}
          </button>
        ))}

        {Array.from({ length: bezig }, (_, i) => (
          <div
            key={i}
            aria-label="Bezig met uploaden"
            className="grid size-20 shrink-0 animate-pulse place-items-center rounded-lg border border-dashed border-line bg-surface-muted text-xs text-ink-faint sm:size-24"
          >
            …
          </div>
        ))}

        <button
          type="button"
          onClick={() => kiezer.current?.click()}
          className="grid size-20 shrink-0 place-items-center rounded-lg border border-dashed border-line text-center text-xs text-ink-soft transition hover:border-brand hover:text-brand sm:size-24"
        >
          <span>
            <span className="block text-xl leading-none" aria-hidden>
              +
            </span>
            Afbeelding
          </span>
        </button>
      </div>

      {/* Geen 'capture': op een telefoon biedt het systeem zelf de keuze
          tussen camera en fotobibliotheek. */}
      <input
        ref={kiezer}
        type="file"
        accept="image/*"
        multiple
        onChange={opKiezen}
        className="hidden"
      />

      {uitgelicht && (
        <Vergroting
          naam={uitgelicht.naam}
          link={uitgelicht.groot}
          opSluiten={() => setGroot(null)}
          opVerwijderen={uitgelicht.weg}
        />
      )}
    </div>
  )
}

function Vergroting({
  naam,
  link,
  opSluiten,
  opVerwijderen,
}: {
  naam: string
  link: string | undefined
  opSluiten: () => void
  opVerwijderen: () => void
}) {
  // Escape sluit alleen de afbeelding. Het taakvenster luistert ook naar
  // Escape; in de capture-fase vangen we hem eerst af, anders ging de taak
  // met de afbeelding mee dicht.
  useEffect(() => {
    function opToets(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      opSluiten()
    }
    window.addEventListener('keydown', opToets, true)
    return () => window.removeEventListener('keydown', opToets, true)
  }, [opSluiten])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal>
      <button aria-label="Sluiten" className="absolute inset-0" onClick={opSluiten} />
      <div className="relative z-10 flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={opVerwijderen}
          className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Verwijderen
        </button>
        <button
          type="button"
          onClick={opSluiten}
          aria-label="Sluiten"
          className="ml-auto grid size-10 place-items-center rounded-lg text-2xl text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="pointer-events-none relative z-10 grid min-h-0 flex-1 place-items-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {link && (
          <img
            src={link}
            alt={naam}
            className="pointer-events-auto max-h-full max-w-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  )
}

/** Tijdelijke leeslinks voor een handvol bijlagen: het kleine plaatje voor in
 *  het raster en het grote voor het vergroten. */
async function linksVoor(rijen: TaskAttachment[]): Promise<Links> {
  const perPad = await leeslinks(
    rijen.flatMap((r) => [r.path, miniatuurPad(r.path)]),
    LINK_GELDIG,
  )
  const uit: Links = {}
  for (const r of rijen) {
    const groot = perPad.get(r.path)
    // Van voor de miniaturen bestaat alleen het grote plaatje.
    if (groot) uit[r.id] = { groot, klein: perPad.get(miniatuurPad(r.path)) ?? groot }
  }
  return uit
}

function leesbaar(melding: string): string {
  if (melding.includes('task_attachments') || /bucket not found/i.test(melding))
    return 'Afbeeldingen kunnen pas als migratie 0006 in Supabase is uitgevoerd.'
  return melding
}
