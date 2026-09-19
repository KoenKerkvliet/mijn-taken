import { useMemo } from 'react'
import type { TaskWithMeta } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { isAchterstallig, startVanDeWeek, toISODate, vandaag } from '../lib/dates'

const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export function Statistieken({ taken }: { taken: TaskWithMeta[] }) {
  const { dagdoel } = useAuth()
  const cijfers = useMemo(() => {
    const vandaagISO = vandaag()
    const open = taken.filter((t) => !t.completed_at)

    // Afgerond per dag van deze week. completed_at is een moment; voor de
    // telling gaat het om de lokale dag waarop je het vinkje zette.
    const weekstart = startVanDeWeek()
    const perDag = Array.from({ length: 7 }, () => 0)
    let dezeWeek = 0
    let vandaagKlaar = 0

    for (const t of taken) {
      if (!t.completed_at) continue
      const dag = new Date(t.completed_at)
      const iso = toISODate(dag)
      if (iso === vandaagISO) vandaagKlaar++
      const index = Math.floor((dag.setHours(0, 0, 0, 0) - weekstart.getTime()) / 86_400_000)
      if (index >= 0 && index < 7) {
        perDag[index]++
        dezeWeek++
      }
    }

    return {
      open: open.length,
      teLaat: open.filter((t) => isAchterstallig(t.due_date)).length,
      vandaagKlaar,
      dezeWeek,
      perDag,
    }
  }, [taken])

  const hoogste = Math.max(...cijfers.perDag, 1)
  const dagVanVandaag = (new Date().getDay() + 6) % 7

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tegel label="Openstaand" waarde={cijfers.open} />
      <Tegel label="Achterstallig" waarde={cijfers.teLaat} alarm={cijfers.teLaat > 0} />
      <Dagdoel afgerond={cijfers.vandaagKlaar} doel={dagdoel} />

      <div className="col-span-2 rounded-xl border border-line bg-surface p-4 xl:col-span-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-ink-soft">Afgerond deze week</span>
          <span className="text-lg font-semibold tabular-nums">{cijfers.dezeWeek}</span>
        </div>

        {/* Eén reeks, dus één kleur en geen legenda; de titel zegt al wat je ziet. */}
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {cijfers.perDag.map((n, i) => (
            <div key={DAGEN[i]} className="flex flex-1 flex-col items-center gap-1">
              <div
                title={`${DAGEN[i]}: ${n} afgerond`}
                className="w-full rounded-t-[4px] bg-brand transition-all"
                style={{
                  height: `${Math.max((n / hoogste) * 100, n > 0 ? 8 : 3)}%`,
                  opacity: n === 0 ? 0.18 : i === dagVanVandaag ? 1 : 0.65,
                }}
              />
              <span
                className={[
                  'text-[10px]',
                  i === dagVanVandaag ? 'font-semibold text-ink' : 'text-ink-faint',
                ].join(' ')}
              >
                {DAGEN[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Wat je vandaag afvinkte, en hoever dat is richting je doel. Zonder doel
 *  (0) blijft het gewoon een telling: een balk zonder eindpunt zegt niets. */
function Dagdoel({ afgerond, doel }: { afgerond: number; doel: number }) {
  if (doel <= 0) return <Tegel label="Vandaag afgerond" waarde={afgerond} />

  const deel = Math.min(afgerond / doel, 1)
  const gehaald = afgerond >= doel

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-soft">Vandaag afgerond</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
        {afgerond}
        <span className="text-lg text-ink-faint"> / {doel}</span>
      </p>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={afgerond}
        aria-valuemin={0}
        aria-valuemax={doel}
        aria-label="Voortgang van je dagelijkse doel"
      >
        <div
          className={`h-full rounded-full transition-all ${gehaald ? 'bg-success' : 'bg-brand'}`}
          style={{ width: `${deel * 100}%` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] text-ink-faint">
        {gehaald
          ? afgerond > doel
            ? `Doel gehaald, en ${afgerond - doel} meer.`
            : 'Doel gehaald.'
          : `Nog ${doel - afgerond} te gaan.`}
      </p>
    </div>
  )
}

function Tegel({ label, waarde, alarm }: { label: string; waarde: number; alarm?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p
        className={[
          'mt-1.5 text-3xl font-semibold tracking-tight tabular-nums',
          alarm ? 'text-danger' : '',
        ].join(' ')}
      >
        {waarde}
      </p>
    </div>
  )
}
