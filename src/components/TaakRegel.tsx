import { useState } from 'react'
import { useTaken } from '../data/TakenProvider'
import type { TaskWithMeta } from '../lib/types'
import { isAchterstallig, toonDatum } from '../lib/dates'
import { PRIORITEITEN } from './TaakDialoog'

interface Props {
  taak: TaskWithMeta
  opBewerken: (taak: TaskWithMeta) => void
  /** Op een lijstpagina is de lijstnaam overbodige ruis. */
  toonLijst?: boolean
}

export function TaakRegel({ taak, opBewerken, toonLijst = true }: Props) {
  const { lijsten, labels, taakAfvinken, taakVerwijderen, taakToevoegen } = useTaken()
  const [subOpen, setSubOpen] = useState(false)
  const [nieuweSub, setNieuweSub] = useState('')

  const klaar = taak.completed_at !== null
  const lijst = lijsten.find((l) => l.id === taak.list_id)
  const kleur = PRIORITEITEN.find((p) => p.waarde === taak.priority)?.kleur ?? '#94a3b8'
  const eigenLabels = labels.filter((lb) => taak.labelIds.includes(lb.id))
  const subKlaar = taak.subtasks.filter((s) => s.completed_at).length
  const teLaat = !klaar && isAchterstallig(taak.due_date)

  async function subToevoegen(e: React.FormEvent) {
    e.preventDefault()
    if (!nieuweSub.trim()) return
    await taakToevoegen({ title: nieuweSub, parent_id: taak.id, list_id: taak.list_id })
    setNieuweSub('')
  }

  return (
    <li className="group border-b border-line last:border-b-0">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <Vinkje aan={klaar} kleur={kleur} opKlik={() => void taakAfvinken(taak.id, !klaar)} />

        <div className="min-w-0 flex-1">
          <button
            onClick={() => opBewerken(taak)}
            className="block w-full text-left text-sm leading-snug"
          >
            <span className={klaar ? 'text-ink-faint line-through' : ''}>{taak.title}</span>
          </button>

          {taak.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{taak.description}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {taak.due_date && (
              <span className={teLaat ? 'font-medium text-danger' : 'text-ink-soft'}>
                🗓️ {toonDatum(taak.due_date)}
              </span>
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
            {taak.subtasks.length > 0 && (
              <button
                onClick={() => setSubOpen((v) => !v)}
                className="text-ink-soft transition hover:text-brand"
              >
                ☑ {subKlaar}/{taak.subtasks.length} subtaken
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => setSubOpen((v) => !v)}
            title="Subtaken"
            className="grid size-7 place-items-center rounded-md text-ink-faint transition hover:bg-surface-muted hover:text-ink"
          >
            ⌄
          </button>
          <button
            onClick={() => void taakVerwijderen(taak.id)}
            title="Verwijderen"
            className="grid size-7 place-items-center rounded-md text-ink-faint transition hover:bg-danger/10 hover:text-danger"
          >
            ×
          </button>
        </div>
      </div>

      {subOpen && (
        <div className="space-y-1 pr-3 pb-3 pl-11">
          {taak.subtasks.map((s) => (
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
                onClick={() => void taakVerwijderen(s.id)}
                className="text-ink-faint opacity-0 transition group-hover/sub:opacity-100 hover:text-danger"
              >
                ×
              </button>
            </div>
          ))}

          <form onSubmit={subToevoegen} className="flex items-center gap-2.5 pt-1">
            <span className="size-[18px] shrink-0 rounded-full border border-dashed border-line" />
            <input
              value={nieuweSub}
              onChange={(e) => setNieuweSub(e.target.value)}
              placeholder="Subtaak toevoegen…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
          </form>
        </div>
      )}
    </li>
  )
}

function Vinkje({
  aan,
  kleur,
  opKlik,
  klein,
}: {
  aan: boolean
  kleur: string
  opKlik: () => void
  klein?: boolean
}) {
  const maat = klein ? 'size-[18px]' : 'size-5'
  return (
    <button
      onClick={opKlik}
      aria-pressed={aan}
      aria-label={aan ? 'Markeren als open' : 'Markeren als klaar'}
      className={[
        maat,
        'mt-0.5 grid shrink-0 place-items-center rounded-full border-2 transition',
      ].join(' ')}
      style={{ borderColor: kleur, background: aan ? kleur : 'transparent' }}
    >
      {aan && <span className="text-[10px] leading-none font-bold text-white">✓</span>}
    </button>
  )
}
