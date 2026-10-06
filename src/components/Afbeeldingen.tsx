import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskAttachment } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { BUCKET, verkleinAfbeelding } from '../lib/afbeeldingen'

/** Een uur is ruim genoeg om een taakvenster open te hebben; daarna haal je
 *  ze bij het volgende openen gewoon weer op. */
const LINK_GELDIG = 3600

/** Afbeeldingen bij een taak, onder de opmerkingen in het taakvenster. Net als
 *  opmerkingen worden ze pas opgehaald als je de taak opent, en meteen
 *  opgeslagen, los van de knop Opslaan onderaan het venster.
 *
 *  Foto's worden in de browser verkleind voordat ze de deur uit gaan. */
export function Afbeeldingen({ taakId }: { taakId: string }) {
  const { session } = useAuth()
  const gebruikerId = session?.user.id
  const [bijlagen, setBijlagen] = useState<TaskAttachment[]>([])
  const [links, setLinks] = useState<Record<string, string>>({})
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(0)
  const [groot, setGroot] = useState<TaskAttachment | null>(null)
  const kiezer = useRef<HTMLInputElement>(null)

  useEffect(() => {
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

  async function toevoegen(bestanden: File[]) {
    const fotos = bestanden.filter((b) => b.type.startsWith('image/'))
    if (fotos.length === 0 || !gebruikerId) return
    setFout(null)
    setBezig((n) => n + fotos.length)

    // Een voor een: bij een foutje blijft wat wel gelukt is gewoon staan.
    for (const foto of fotos) {
      try {
        const blob = await verkleinAfbeelding(foto)
        const pad = `${gebruikerId}/${taakId}/${crypto.randomUUID()}.jpg`
        const { error: uploadFout } = await supabase.storage
          .from(BUCKET)
          .upload(pad, blob, { contentType: 'image/jpeg' })
        if (uploadFout) throw new Error(uploadFout.message)

        const { data, error } = await supabase
          .from('task_attachments')
          .insert({ task_id: taakId, path: pad, name: foto.name.slice(0, 200) || null })
          .select()
          .single()
        if (error) {
          // Geen rij, dus het bestand zou voor altijd zwevend blijven.
          await supabase.storage.from(BUCKET).remove([pad])
          throw new Error(error.message)
        }
        const nieuweLinks = await linksVoor([data])
        setLinks((huidig) => ({ ...huidig, ...nieuweLinks }))
        setBijlagen((huidig) => [...huidig, data])
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
    await supabase.storage.from(BUCKET).remove([bijlage.path])
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

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium text-ink-soft">
        Afbeeldingen{' '}
        {bijlagen.length > 0 && <span className="text-ink-faint">{bijlagen.length}</span>}
      </p>

      {fout && <p className="mb-2 text-xs text-danger">{fout}</p>}

      <div className="flex flex-wrap gap-2">
        {!laden &&
          bijlagen.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setGroot(b)}
              aria-label={`Afbeelding vergroten${b.name ? `: ${b.name}` : ''}`}
              className="size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted transition hover:border-brand sm:size-24"
            >
              {links[b.id] && (
                <img
                  src={links[b.id]}
                  alt={b.name ?? ''}
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

      {groot && (
        <Vergroting
          bijlage={groot}
          link={links[groot.id]}
          opSluiten={() => setGroot(null)}
          opVerwijderen={() => void verwijderen(groot)}
        />
      )}
    </div>
  )
}

function Vergroting({
  bijlage,
  link,
  opSluiten,
  opVerwijderen,
}: {
  bijlage: TaskAttachment
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
            alt={bijlage.name ?? ''}
            className="pointer-events-auto max-h-full max-w-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  )
}

/** Tijdelijke leeslinks voor een handvol bijlagen, in één verzoek. */
async function linksVoor(rijen: TaskAttachment[]): Promise<Record<string, string>> {
  if (rijen.length === 0) return {}
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      rijen.map((r) => r.path),
      LINK_GELDIG,
    )
  const perPad = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  const uit: Record<string, string> = {}
  for (const r of rijen) {
    const url = perPad.get(r.path)
    if (url) uit[r.id] = url
  }
  return uit
}

function leesbaar(melding: string): string {
  if (melding.includes('task_attachments') || /bucket not found/i.test(melding))
    return 'Afbeeldingen kunnen pas als migratie 0006 in Supabase is uitgevoerd.'
  return melding
}
