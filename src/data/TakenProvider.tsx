import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Label, List, NewTask, Task, TaskWithMeta } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { leesCache, schrijfCache, wisCache } from '../lib/cache'

interface TakenState {
  lijsten: List[]
  labels: Label[]
  /** Alleen hoofdtaken; subtaken zitten in .subtasks van hun ouder. */
  taken: TaskWithMeta[]
  bezigMetLaden: boolean
  fout: string | null

  taakToevoegen: (invoer: NewTask) => Promise<void>
  taakBijwerken: (id: string, wijziging: Partial<Task>, labelIds?: string[]) => Promise<void>
  taakAfvinken: (id: string, klaar: boolean) => Promise<void>
  taakVerwijderen: (id: string) => Promise<void>
  /** Alleen de datum, met een meteen zichtbare verplaatsing: voor slepen. */
  taakVerzetten: (id: string, datum: string | null) => Promise<void>
  /** Een handvol taken in één keer naar dezelfde dag, zoals "Herplannen". */
  takenHerplannen: (ids: string[], datum: string) => Promise<void>

  lijstToevoegen: (naam: string, kleur: string) => Promise<List | null>
  lijstBijwerken: (id: string, wijziging: Partial<List>) => Promise<void>
  lijstVerwijderen: (id: string) => Promise<void>

  labelToevoegen: (naam: string, kleur: string) => Promise<Label | null>
  labelVerwijderen: (id: string) => Promise<void>
}

const TakenContext = createContext<TakenState | null>(null)

type Koppeling = { task_id: string; label_id: string }

/** Niet vaker dan eens per halve minuut opnieuw ophalen als je terugkomt op
 *  het tabblad. Even wegklikken en terugkomen hoort geen laadmoment te zijn. */
const VERS_GENOEG = 30_000

export function TakenProvider({ children }: { children: ReactNode }) {
  const { session, bezigMetLaden: sessieOnbekend } = useAuth()
  const [lijsten, setLijsten] = useState<List[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [ruweTaken, setRuweTaken] = useState<Task[]>([])
  const [koppelingen, setKoppelingen] = useState<Koppeling[]>([])
  const [bezigMetLaden, setBezigMetLaden] = useState(true)
  const [fout, setFout] = useState<string | null>(null)
  const [uitCache, setUitCache] = useState(false)
  const laatstGehaald = useRef(0)

  const herladen = useCallback(async () => {
    if (!session) return
    const [l, lb, t, tl] = await Promise.all([
      supabase.from('lists').select('*').order('position').order('created_at'),
      supabase.from('labels').select('*').order('name'),
      supabase.from('tasks').select('*').order('position').order('created_at'),
      supabase.from('task_labels').select('task_id, label_id'),
    ])

    const eersteFout = l.error ?? lb.error ?? t.error ?? tl.error
    if (eersteFout) {
      setFout(eersteFout.message)
      setBezigMetLaden(false)
      return
    }

    setFout(null)
    setUitCache(false)
    laatstGehaald.current = Date.now()
    setLijsten(l.data ?? [])
    setLabels(lb.data ?? [])
    setRuweTaken((t.data ?? []) as Task[])
    setKoppelingen(tl.data ?? [])
    setBezigMetLaden(false)
  }, [session])

  useEffect(() => {
    // Zolang de sessie nog opgehaald wordt, is "niet ingelogd" niet hetzelfde
    // als "uitgelogd". Wissen we hier te vroeg, dan gooien we de cache weg
    // vlak voordat we hem nodig hebben.
    if (sessieOnbekend) return

    if (!session) {
      setLijsten([])
      setLabels([])
      setRuweTaken([])
      setKoppelingen([])
      setBezigMetLaden(false)
      // Uitgelogd is uitgelogd: dan hoort er niets van je taken achter te
      // blijven op deze computer.
      wisCache()
      return
    }

    // Wat er de vorige keer stond, staat er meteen weer. Ondertussen wordt
    // alles opnieuw opgehaald en overschreven; je kijkt dus hooguit een
    // seconde naar iets ouds, in plaats van naar een leeg scherm.
    const bewaard = leesCache(session.user.id)
    if (bewaard) {
      setLijsten(bewaard.lijsten)
      setLabels(bewaard.labels)
      setRuweTaken(bewaard.taken)
      setKoppelingen(bewaard.koppelingen)
      setUitCache(true)
      setBezigMetLaden(false)
    } else {
      setBezigMetLaden(true)
    }

    void herladen()
  }, [session, sessieOnbekend, herladen])

  // Bijwerken gebeurt hierna in het klein: elke wijziging past de lijst hier
  // aan in plaats van alles opnieuw op te halen. Terugkomen op het tabblad is
  // het moment om te kijken of er elders iets veranderd is.
  useEffect(() => {
    if (!session) return
    function bijTerugkomst() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - laatstGehaald.current < VERS_GENOEG) return
      void herladen()
    }
    document.addEventListener('visibilitychange', bijTerugkomst)
    window.addEventListener('focus', bijTerugkomst)
    return () => {
      document.removeEventListener('visibilitychange', bijTerugkomst)
      window.removeEventListener('focus', bijTerugkomst)
    }
  }, [session, herladen])

  // Alles bewaren zodra het verandert, zodat het er bij de volgende keer
  // openen meteen staat.
  useEffect(() => {
    if (!session || bezigMetLaden) return
    schrijfCache(session.user.id, { lijsten, labels, taken: ruweTaken, koppelingen })
  }, [session, bezigMetLaden, lijsten, labels, ruweTaken, koppelingen])

  /** Platte rijen omzetten naar de boom die de UI toont. */
  const taken = useMemo<TaskWithMeta[]>(() => {
    const perTaak = new Map<string, string[]>()
    for (const k of koppelingen) {
      const bestaand = perTaak.get(k.task_id)
      if (bestaand) bestaand.push(k.label_id)
      else perTaak.set(k.task_id, [k.label_id])
    }

    const kinderen = new Map<string, Task[]>()
    for (const t of ruweTaken) {
      if (!t.parent_id) continue
      const bestaand = kinderen.get(t.parent_id)
      if (bestaand) bestaand.push(t)
      else kinderen.set(t.parent_id, [t])
    }

    return ruweTaken
      .filter((t) => !t.parent_id)
      .map((t) => ({
        ...t,
        labelIds: perTaak.get(t.id) ?? [],
        subtasks: kinderen.get(t.id) ?? [],
      }))
  }, [ruweTaken, koppelingen])

  const taakToevoegen = useCallback<TakenState['taakToevoegen']>(async (invoer) => {
    const { labelIds = [], ...velden } = invoer
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: velden.title.trim(),
        description: velden.description?.trim() || null,
        due_date: velden.due_date ?? null,
        priority: velden.priority ?? 4,
        list_id: velden.list_id ?? null,
        parent_id: velden.parent_id ?? null,
      })
      .select()
      .single()

    if (error) {
      setFout(error.message)
      return
    }

    // De rij komt terug zoals hij is opgeslagen, inclusief wat de database er
    // zelf van maakt. Daarmee kan hij er hier gewoon bij; opnieuw alles
    // ophalen levert precies dezelfde rij op.
    setRuweTaken((huidig) => [...huidig, data as Task])

    if (labelIds.length > 0) {
      const { error: koppelFout } = await supabase
        .from('task_labels')
        .insert(labelIds.map((label_id) => ({ task_id: data.id, label_id })))
      if (koppelFout) setFout(koppelFout.message)
      else {
        setKoppelingen((huidig) => [
          ...huidig,
          ...labelIds.map((label_id) => ({ task_id: data.id, label_id })),
        ])
      }
    }
  }, [])

  const taakBijwerken = useCallback<TakenState['taakBijwerken']>(
    async (id, wijziging, labelIds) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(wijziging)
        .eq('id', id)
        .select()
        .single()
      if (error) {
        setFout(error.message)
        return
      }
      setRuweTaken((huidig) => huidig.map((t) => (t.id === id ? (data as Task) : t)))

      if (labelIds) {
        // Simpelweg opnieuw zetten: bij een handjevol labels per taak is dat
        // goedkoper dan uitrekenen wat er precies veranderd is.
        const { error: wisFout } = await supabase.from('task_labels').delete().eq('task_id', id)
        if (wisFout) {
          setFout(wisFout.message)
          return
        }
        if (labelIds.length > 0) {
          const { error: koppelFout } = await supabase
            .from('task_labels')
            .insert(labelIds.map((label_id) => ({ task_id: id, label_id })))
          if (koppelFout) {
            setFout(koppelFout.message)
            return
          }
        }
        setKoppelingen((huidig) => [
          ...huidig.filter((k) => k.task_id !== id),
          ...labelIds.map((label_id) => ({ task_id: id, label_id })),
        ])
      }
    },
    [],
  )

  const taakAfvinken = useCallback<TakenState['taakAfvinken']>(
    async (id, klaar) => {
      const nieuw = klaar ? new Date().toISOString() : null
      // Meteen lokaal bijwerken; een vinkje dat een halve seconde nadenkt
      // voelt kapot.
      setRuweTaken((huidig) =>
        huidig.map((t) => (t.id === id ? { ...t, completed_at: nieuw } : t)),
      )
      const { error } = await supabase.from('tasks').update({ completed_at: nieuw }).eq('id', id)
      if (error) {
        setFout(error.message)
        await herladen()
      }
    },
    [herladen],
  )

  const taakVerwijderen = useCallback<TakenState['taakVerwijderen']>(async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setFout(error.message)
      return
    }
    // Subtaken gaan in de database mee (on delete cascade); hier dus ook.
    setRuweTaken((huidig) => {
      const weg = new Set([id, ...huidig.filter((t) => t.parent_id === id).map((t) => t.id)])
      setKoppelingen((k) => k.filter((x) => !weg.has(x.task_id)))
      return huidig.filter((t) => !weg.has(t.id))
    })
  }, [])

  const taakVerzetten = useCallback<TakenState['taakVerzetten']>(
    async (id, datum) => {
      // Net als bij het vinkje: de kaart hoort onder je vinger mee te gaan,
      // niet pas als Supabase antwoordt.
      setRuweTaken((huidig) => huidig.map((t) => (t.id === id ? { ...t, due_date: datum } : t)))
      const { error } = await supabase.from('tasks').update({ due_date: datum }).eq('id', id)
      if (error) {
        setFout(error.message)
        await herladen()
      }
    },
    [herladen],
  )

  const takenHerplannen = useCallback<TakenState['takenHerplannen']>(
    async (ids, datum) => {
      if (ids.length === 0) return
      setRuweTaken((huidig) =>
        huidig.map((t) => (ids.includes(t.id) ? { ...t, due_date: datum } : t)),
      )
      const { error } = await supabase.from('tasks').update({ due_date: datum }).in('id', ids)
      if (error) {
        setFout(error.message)
        await herladen()
      }
    },
    [herladen],
  )

  const lijstToevoegen = useCallback<TakenState['lijstToevoegen']>(
    async (naam, kleur) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({ name: naam.trim(), color: kleur, position: lijsten.length })
        .select()
        .single()
      if (error) {
        setFout(error.message)
        return null
      }
      setLijsten((huidig) => [...huidig, data])
      return data
    },
    [lijsten.length],
  )

  const lijstBijwerken = useCallback<TakenState['lijstBijwerken']>(async (id, wijziging) => {
    const { data, error } = await supabase
      .from('lists')
      .update(wijziging)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      setFout(error.message)
      return
    }
    setLijsten((huidig) => huidig.map((l) => (l.id === id ? data : l)))
  }, [])

  const lijstVerwijderen = useCallback<TakenState['lijstVerwijderen']>(async (id) => {
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (error) {
      setFout(error.message)
      return
    }
    // De taken blijven bestaan (list_id wordt null) en komen in de inbox.
    setLijsten((huidig) => huidig.filter((l) => l.id !== id))
    setRuweTaken((huidig) => huidig.map((t) => (t.list_id === id ? { ...t, list_id: null } : t)))
  }, [])

  const labelToevoegen = useCallback<TakenState['labelToevoegen']>(async (naam, kleur) => {
    const { data, error } = await supabase
      .from('labels')
      .insert({ name: naam.trim(), color: kleur })
      .select()
      .single()
    if (error) {
      setFout(error.message)
      return null
    }
    setLabels((huidig) => [...huidig, data].sort((a, b) => (a.name < b.name ? -1 : 1)))
    return data
  }, [])

  const labelVerwijderen = useCallback<TakenState['labelVerwijderen']>(async (id) => {
    const { error } = await supabase.from('labels').delete().eq('id', id)
    if (error) {
      setFout(error.message)
      return
    }
    setLabels((huidig) => huidig.filter((l) => l.id !== id))
    setKoppelingen((huidig) => huidig.filter((k) => k.label_id !== id))
  }, [])

  const waarde: TakenState = {
    lijsten,
    labels,
    taken,
    bezigMetLaden,
    // Mislukt het ophalen terwijl je naar bewaarde gegevens kijkt, dan hoort
    // erbij te staan dat het oud kan zijn.
    fout: fout && uitCache ? `${fout} Je ziet de gegevens van je vorige bezoek.` : fout,
    taakToevoegen,
    taakBijwerken,
    taakAfvinken,
    taakVerwijderen,
    taakVerzetten,
    takenHerplannen,
    lijstToevoegen,
    lijstBijwerken,
    lijstVerwijderen,
    labelToevoegen,
    labelVerwijderen,
  }

  return <TakenContext.Provider value={waarde}>{children}</TakenContext.Provider>
}

export function useTaken(): TakenState {
  const ctx = useContext(TakenContext)
  if (!ctx) throw new Error('useTaken buiten TakenProvider gebruikt')
  return ctx
}
