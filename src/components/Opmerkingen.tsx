import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskComment } from '../lib/types'
import { toonAfgerond } from '../lib/dates'

/** Opmerkingen bij een taak, onderaan het taakvenster. Ze worden pas
 *  opgehaald als je de taak opent: op een kaart of in een lijst staan ze
 *  nergens, dus meeladen met alle taken zou alleen maar wachten zijn.
 *
 *  Net als een subtaak wordt een opmerking meteen opgeslagen, los van de
 *  knop Opslaan onderaan het venster. */
export function Opmerkingen({ taakId }: { taakId: string }) {
  const [opmerkingen, setOpmerkingen] = useState<TaskComment[]>([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState<string | null>(null)
  const [nieuw, setNieuw] = useState('')
  const [bezig, setBezig] = useState(false)
  const veld = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let weg = false
    setLaden(true)
    void supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taakId)
      .order('created_at')
      .then(({ data, error }) => {
        if (weg) return
        setLaden(false)
        if (error) setFout(leesbaar(error.message))
        else setOpmerkingen(data ?? [])
      })
    return () => {
      weg = true
    }
  }, [taakId])

  // Meegroeien met wat je typt, net als de omschrijving.
  useEffect(() => {
    const el = veld.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [nieuw])

  async function plaatsen() {
    const tekst = nieuw.trim()
    if (!tekst || bezig) return
    setBezig(true)
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: taakId, body: tekst })
      .select()
      .single()
    setBezig(false)
    if (error) {
      setFout(leesbaar(error.message))
      return
    }
    setFout(null)
    setOpmerkingen((huidig) => [...huidig, data])
    setNieuw('')
  }

  async function verwijderen(id: string) {
    const vorige = opmerkingen
    setOpmerkingen((huidig) => huidig.filter((o) => o.id !== id))
    const { error } = await supabase.from('task_comments').delete().eq('id', id)
    if (error) {
      setOpmerkingen(vorige)
      setFout(leesbaar(error.message))
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium text-ink-soft">
        Opmerkingen{' '}
        {opmerkingen.length > 0 && <span className="text-ink-faint">{opmerkingen.length}</span>}
      </p>

      {fout && <p className="mb-2 text-xs text-danger">{fout}</p>}

      {!laden && opmerkingen.length > 0 && (
        <ul className="mb-2 space-y-2">
          {opmerkingen.map((o) => (
            <li key={o.id} className="group/opm rounded-lg bg-surface-muted px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-ink-faint">
                <span>{toonAfgerond(o.created_at)}</span>
                <button
                  type="button"
                  onClick={() => void verwijderen(o.id)}
                  aria-label="Opmerking verwijderen"
                  className="ml-auto grid size-7 place-items-center rounded-md transition hover:text-danger sm:size-5 sm:opacity-0 sm:group-hover/opm:opacity-100"
                >
                  ×
                </button>
              </div>
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{o.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={veld}
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          onKeyDown={(e) => {
            // Enter is een nieuwe regel, zoals in elk tekstvak. Met Ctrl of
            // Cmd erbij gaat hij weg, net als in een chat op de computer.
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void plaatsen()
            }
          }}
          placeholder="Opmerking toevoegen…"
          rows={1}
          maxLength={5000}
          className="max-h-48 min-w-0 flex-1 resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-base outline-none placeholder:text-ink-faint focus:border-brand sm:text-sm"
        />
        {nieuw.trim() && (
          <button
            type="button"
            onClick={() => void plaatsen()}
            disabled={bezig}
            className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Plaatsen
          </button>
        )}
      </div>
    </div>
  )
}

function leesbaar(melding: string): string {
  if (melding.includes('task_comments'))
    return 'Opmerkingen kunnen pas als migratie 0005 in Supabase is uitgevoerd.'
  return melding
}
