// Mijn taken als connector: een MCP-server waarmee Claude taken kan opzoeken,
// aanmaken en afvinken. Draait als Supabase Edge Function naast de database
// die de app zelf ook gebruikt.
//
// Alles wat over het protocol gaat staat in protocol.ts en is daar los te
// testen; dit bestand is de schil eromheen: binnenkomen, wie ben je, en de
// echte tabellen.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { behandel, type Gegevens, type Taak } from './protocol.ts'

const url = Deno.env.get('SUPABASE_URL')!
const sleutel = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TOKEN = Deno.env.get('MCP_TOKEN') ?? ''
const GEBRUIKER = Deno.env.get('MCP_USER_ID') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

/** De service-sleutel gaat langs row level security heen. Daarom filtert elke
 *  vraag hieronder met de hand op user_id: dat is hier de enige muur die er
 *  nog staat, dus die moet overal om heen. */
function gegevens(db: SupabaseClient): Gegevens {
  const mijn = <T>(vraag: T): T =>
    (vraag as unknown as { eq: (k: string, v: string) => T }).eq('user_id', GEBRUIKER)

  return {
    async lijsten() {
      const { data, error } = await mijn(db.from('lists').select('id, name, color')).order(
        'position',
      )
      if (error) throw new Error(error.message)
      return data ?? []
    },

    async labels() {
      const { data, error } = await mijn(db.from('labels').select('id, name')).order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },

    async taken(filter) {
      let vraag = mijn(db.from('tasks').select('*')).is('parent_id', null)

      if (filter.status === 'open') vraag = vraag.is('completed_at', null)
      if (filter.status === 'afgerond') vraag = vraag.not('completed_at', 'is', null)
      if (filter.lijstId) vraag = vraag.eq('list_id', filter.lijstId)
      if (filter.vanaf) vraag = vraag.gte('due_date', filter.vanaf)
      if (filter.tot) vraag = vraag.lte('due_date', filter.tot)
      if (filter.zoekterm) {
        const term = filter.zoekterm.replace(/[%,()]/gu, ' ')
        vraag = vraag.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
      }

      const { data, error } = await vraag
        .order('due_date', { nullsFirst: false })
        .limit(filter.limiet ?? 50)
      if (error) throw new Error(error.message)

      let taken = (data ?? []) as Taak[]

      // Op label filteren gaat via de koppeltabel; dat is een tweede vraag
      // waard in plaats van een join die het geheel onleesbaar maakt.
      if (filter.labelId) {
        const { data: koppels, error: koppelFout } = await mijn(
          db.from('task_labels').select('task_id'),
        ).eq('label_id', filter.labelId)
        if (koppelFout) throw new Error(koppelFout.message)
        const raak = new Set((koppels ?? []).map((k: { task_id: string }) => k.task_id))
        taken = taken.filter((t) => raak.has(t.id))
      }

      return taken
    },

    async taak(id) {
      const { data, error } = await mijn(db.from('tasks').select('*')).eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      return (data as Taak | null) ?? null
    },

    async subtaken(ouderIds) {
      if (ouderIds.length === 0) return []
      const { data, error } = await mijn(db.from('tasks').select('*'))
        .in('parent_id', ouderIds)
        .order('created_at')
      if (error) throw new Error(error.message)
      return (data ?? []) as Taak[]
    },

    async taakToevoegen(invoer) {
      const { labelIds = [], ...velden } = invoer
      const { data, error } = await db
        .from('tasks')
        .insert({ ...velden, user_id: GEBRUIKER })
        .select()
        .single()
      if (error) throw new Error(error.message)

      if (labelIds.length > 0) {
        const { error: koppelFout } = await db
          .from('task_labels')
          .insert(labelIds.map((label_id) => ({ task_id: data.id, label_id, user_id: GEBRUIKER })))
        if (koppelFout) throw new Error(koppelFout.message)
      }
      return data as Taak
    },

    async taakBijwerken(id, wijziging) {
      const { data, error } = await mijn(db.from('tasks').update(wijziging))
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Taak
    },

    async taakAfvinken(id, klaar) {
      const { data, error } = await mijn(
        db.from('tasks').update({ completed_at: klaar ? new Date().toISOString() : null }),
      )
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Taak
    },
  }
}

Deno.serve(async (verzoek) => {
  if (verzoek.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!TOKEN || !GEBRUIKER) {
    return new Response('MCP_TOKEN of MCP_USER_ID ontbreekt op de server.', {
      status: 500,
      headers: CORS,
    })
  }

  // De sleutel mag in de Authorization-header of in de url. Dat tweede is er
  // omdat niet elke plek waar je een connector toevoegt een eigen header laat
  // instellen; zie de README voor wat dat betekent.
  const adres = new URL(verzoek.url)
  const meegegeven =
    verzoek.headers.get('authorization')?.replace(/^Bearer\s+/iu, '') ?? adres.searchParams.get('k')

  if (!veiligGelijk(meegegeven ?? '', TOKEN)) {
    return new Response('Geen toegang.', { status: 401, headers: CORS })
  }

  if (verzoek.method !== 'POST') {
    return new Response('Stuur een JSON-RPC-bericht met POST.', { status: 405, headers: CORS })
  }

  const db = createClient(url, sleutel, { auth: { persistSession: false } })
  const binnen = await verzoek.json()

  // Een client mag meerdere berichten in één keer sturen.
  const berichten = Array.isArray(binnen) ? binnen : [binnen]
  const antwoorden = []
  for (const bericht of berichten) {
    const antwoord = await behandel(bericht, gegevens(db))
    if (antwoord) antwoorden.push(antwoord)
  }

  // Alleen meldingen erin: dan hoort er niets terug te komen.
  if (antwoorden.length === 0) return new Response(null, { status: 202, headers: CORS })

  return new Response(JSON.stringify(Array.isArray(binnen) ? antwoorden : antwoorden[0]), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})

/** Vergelijken zonder bij de eerste verkeerde letter te stoppen: anders
 *  verraadt de tijd die het kost hoeveel tekens er al klopten. */
function veiligGelijk(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let verschil = 0
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return verschil === 0
}
