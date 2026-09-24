/** De MCP-kant van de connector: welke gereedschappen er zijn en wat ze doen.
 *
 *  Bewust los van Supabase en van Deno, met een `Gegevens`-schil ertussen.
 *  Zo is dit stuk te draaien en na te rekenen zonder iets te deployen - en dat
 *  is precies wat je wilt bij code die je verder alleen in de wolk ziet
 *  werken. index.ts plakt er de echte database aan vast. */

export interface Lijst {
  id: string
  name: string
  color: string
}

export interface Labeltje {
  id: string
  name: string
}

export interface Taak {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: number
  completed_at: string | null
  list_id: string | null
  duration_minutes?: number | null
  labelIds?: string[]
}

/** Alles wat de gereedschappen van de database nodig hebben. */
export interface Gegevens {
  lijsten(): Promise<Lijst[]>
  labels(): Promise<Labeltje[]>
  taken(filter: {
    zoekterm?: string
    lijstId?: string | null
    labelId?: string
    status?: 'open' | 'afgerond' | 'alles'
    vanaf?: string
    tot?: string
    limiet?: number
  }): Promise<Taak[]>
  taakToevoegen(invoer: {
    title: string
    description?: string | null
    due_date?: string | null
    priority?: number
    list_id?: string | null
    duration_minutes?: number | null
    labelIds?: string[]
  }): Promise<Taak>
  taakBijwerken(id: string, wijziging: Partial<Taak>): Promise<Taak>
  taakAfvinken(id: string, klaar: boolean): Promise<Taak>
}

interface Gereedschap {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

const DATUM = 'Datum als JJJJ-MM-DD. Reken "morgen" of "volgende week donderdag" zelf uit.'
const DUUR =
  'Hoe lang de taak naar schatting duurt, in minuten (1 tot 1440). "30m" is 30, "1u" is 60, "1u30m" is 90.'

export const GEREEDSCHAPPEN: Gereedschap[] = [
  {
    name: 'lijsten_en_labels',
    description:
      'Toont de lijsten en labels van Koen met hun namen. Roep dit aan voordat je een taak in een lijst zet of op een label filtert, zodat je de juiste naam gebruikt.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'taken_zoeken',
    description:
      'Zoekt taken. Zonder filters krijg je alles wat openstaat. Gebruik dit ook om te zien wat er vandaag of deze week moet gebeuren.',
    inputSchema: {
      type: 'object',
      properties: {
        zoekterm: { type: 'string', description: 'Komt voor in de titel of de omschrijving.' },
        lijst: { type: 'string', description: 'Naam van de lijst, bijvoorbeeld "Taken".' },
        label: { type: 'string', description: 'Naam van het label, zonder #.' },
        status: {
          type: 'string',
          enum: ['open', 'afgerond', 'alles'],
          description: 'Standaard "open".',
        },
        vanaf: { type: 'string', description: `Vroegste datum. ${DATUM}` },
        tot: { type: 'string', description: `Laatste datum. ${DATUM}` },
        limiet: { type: 'number', description: 'Hoeveel taken maximaal (standaard 50).' },
      },
    },
  },
  {
    name: 'taak_toevoegen',
    description: 'Maakt een nieuwe taak aan.',
    inputSchema: {
      type: 'object',
      properties: {
        titel: { type: 'string' },
        omschrijving: { type: 'string' },
        datum: { type: 'string', description: DATUM },
        prioriteit: {
          type: 'number',
          description: '1 is urgent, 2 hoog, 3 normaal, 4 laag (standaard 4).',
        },
        lijst: { type: 'string', description: 'Naam van een bestaande lijst.' },
        duur_minuten: { type: 'number', description: DUUR },
        labels: { type: 'array', items: { type: 'string' }, description: 'Namen van labels.' },
      },
      required: ['titel'],
    },
  },
  {
    name: 'taak_bijwerken',
    description:
      'Past een bestaande taak aan: titel, omschrijving, datum, prioriteit, lijst of duur.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Het id uit taken_zoeken.' },
        titel: { type: 'string' },
        omschrijving: { type: 'string' },
        datum: { type: 'string', description: `${DATUM} Geef "geen" om de datum weg te halen.` },
        prioriteit: { type: 'number' },
        lijst: { type: 'string' },
        duur_minuten: { type: 'number', description: `${DUUR} Geef 0 om hem weg te halen.` },
      },
      required: ['id'],
    },
  },
  {
    name: 'taak_afvinken',
    description: 'Vinkt een taak af, of zet hem weer open.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Het id uit taken_zoeken.' },
        klaar: { type: 'boolean', description: 'Standaard true; false zet hem weer open.' },
      },
      required: ['id'],
    },
  },
]

export interface Verzoek {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

export interface Antwoord {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

/** De hele JSON-RPC-afhandeling. `null` betekent: hier hoort geen antwoord op
 *  (een melding, geen vraag). */
export async function behandel(verzoek: Verzoek, db: Gegevens): Promise<Antwoord | null> {
  const id = verzoek.id ?? null

  // Een notificatie heeft geen id en verwacht geen antwoord.
  if (verzoek.method?.startsWith('notifications/')) return null

  try {
    switch (verzoek.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            // De versie van de client teruggeven: zo praten we mee in wat hij
            // kent, in plaats van hem onze voorkeur op te dringen.
            protocolVersion:
              (verzoek.params?.protocolVersion as string | undefined) ?? '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'mijn-taken', version: '1.0.0' },
          },
        }

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }

      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: GEREEDSCHAPPEN } }

      case 'tools/call': {
        const naam = verzoek.params?.name as string
        const invoer = (verzoek.params?.arguments ?? {}) as Record<string, unknown>
        const tekst = await voerUit(naam, invoer, db)
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: tekst }] } }
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Onbekende methode: ${verzoek.method}` },
        }
    }
  } catch (fout) {
    // Een mislukt gereedschap is geen protocolfout: de assistent hoort te
    // lezen wat er misging en het opnieuw te kunnen proberen.
    if (verzoek.method === 'tools/call') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Dat ging mis: ${uitleg(fout)}` }],
          isError: true,
        },
      }
    }
    return { jsonrpc: '2.0', id, error: { code: -32603, message: uitleg(fout) } }
  }
}

async function voerUit(
  naam: string,
  invoer: Record<string, unknown>,
  db: Gegevens,
): Promise<string> {
  switch (naam) {
    case 'lijsten_en_labels': {
      const [lijsten, labels] = await Promise.all([db.lijsten(), db.labels()])
      return JSON.stringify({
        lijsten: lijsten.map((l) => l.name),
        labels: labels.map((l) => l.name),
      })
    }

    case 'taken_zoeken': {
      const lijstId = invoer.lijst ? (await zoekLijst(db, String(invoer.lijst))).id : undefined
      const labelId = invoer.label ? (await zoekLabel(db, String(invoer.label))).id : undefined
      const taken = await db.taken({
        zoekterm: invoer.zoekterm ? String(invoer.zoekterm) : undefined,
        lijstId,
        labelId,
        status: (invoer.status as 'open' | 'afgerond' | 'alles') ?? 'open',
        vanaf: invoer.vanaf ? String(invoer.vanaf) : undefined,
        tot: invoer.tot ? String(invoer.tot) : undefined,
        limiet: typeof invoer.limiet === 'number' ? invoer.limiet : 50,
      })
      const lijsten = await db.lijsten()
      return JSON.stringify({
        aantal: taken.length,
        taken: taken.map((t) => ({
          id: t.id,
          titel: t.title,
          omschrijving: t.description,
          datum: t.due_date,
          prioriteit: t.priority,
          lijst: lijsten.find((l) => l.id === t.list_id)?.name ?? null,
          duur_minuten: t.duration_minutes ?? null,
          afgerond: t.completed_at !== null,
        })),
      })
    }

    case 'taak_toevoegen': {
      const titel = String(invoer.titel ?? '').trim()
      if (!titel) throw new Error('Een taak heeft een titel nodig.')

      const lijst = invoer.lijst ? await zoekLijst(db, String(invoer.lijst)) : null
      const labelIds: string[] = []
      for (const naam of (invoer.labels as string[] | undefined) ?? []) {
        labelIds.push((await zoekLabel(db, naam)).id)
      }

      const taak = await db.taakToevoegen({
        title: titel,
        description: invoer.omschrijving ? String(invoer.omschrijving) : null,
        due_date: datumOf(invoer.datum),
        priority: prioriteitOf(invoer.prioriteit),
        list_id: lijst?.id ?? null,
        // Alleen meesturen als er een is, net als in de app: zo werkt
        // toevoegen ook zolang migratie 0004 nog niet gedraaid is.
        ...(invoer.duur_minuten ? { duration_minutes: duurOf(invoer.duur_minuten) } : {}),
        labelIds,
      })
      return `Toegevoegd: "${taak.title}"${taak.due_date ? ` voor ${taak.due_date}` : ''}${
        lijst ? ` in ${lijst.name}` : ''
      }. id: ${taak.id}`
    }

    case 'taak_bijwerken': {
      const id = String(invoer.id ?? '')
      if (!id) throw new Error('Geef het id van de taak mee.')

      const wijziging: Partial<Taak> = {}
      if (invoer.titel !== undefined) wijziging.title = String(invoer.titel)
      if (invoer.omschrijving !== undefined) wijziging.description = String(invoer.omschrijving)
      if (invoer.datum !== undefined) {
        wijziging.due_date = String(invoer.datum).toLowerCase() === 'geen' ? null : datumOf(invoer.datum)
      }
      if (invoer.prioriteit !== undefined) wijziging.priority = prioriteitOf(invoer.prioriteit)
      if (invoer.duur_minuten !== undefined) {
        wijziging.duration_minutes =
          Number(invoer.duur_minuten) === 0 ? null : duurOf(invoer.duur_minuten)
      }
      if (invoer.lijst !== undefined) wijziging.list_id = (await zoekLijst(db, String(invoer.lijst))).id

      if (Object.keys(wijziging).length === 0) throw new Error('Er viel niets te wijzigen.')
      const taak = await db.taakBijwerken(id, wijziging)
      return `Bijgewerkt: "${taak.title}".`
    }

    case 'taak_afvinken': {
      const id = String(invoer.id ?? '')
      if (!id) throw new Error('Geef het id van de taak mee.')
      const klaar = invoer.klaar === undefined ? true : Boolean(invoer.klaar)
      const taak = await db.taakAfvinken(id, klaar)
      return klaar ? `Afgevinkt: "${taak.title}".` : `Weer opengezet: "${taak.title}".`
    }

    default:
      throw new Error(`Onbekend gereedschap: ${naam}`)
  }
}

/** Namen vergelijken zoals een mens ze bedoelt: hoofdletters en spaties doen
 *  er niet toe. Bestaat hij niet, dan noemen we wat er wel is - dan hoeft de
 *  assistent niet te raden. */
async function zoekLijst(db: Gegevens, naam: string): Promise<Lijst> {
  const lijsten = await db.lijsten()
  const treffer = lijsten.find((l) => plat(l.name) === plat(naam))
  if (!treffer) {
    throw new Error(
      `Er is geen lijst "${naam}". Bestaande lijsten: ${lijsten.map((l) => l.name).join(', ')}`,
    )
  }
  return treffer
}

async function zoekLabel(db: Gegevens, naam: string): Promise<Labeltje> {
  const labels = await db.labels()
  const schoon = naam.replace(/^#/u, '')
  const treffer = labels.find((l) => plat(l.name) === plat(schoon))
  if (!treffer) {
    throw new Error(
      `Er is geen label "${schoon}". Bestaande labels: ${labels.map((l) => l.name).join(', ')}`,
    )
  }
  return treffer
}

function plat(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase()
}

function datumOf(waarde: unknown): string | null {
  if (waarde === undefined || waarde === null || waarde === '') return null
  const tekst = String(waarde)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(tekst)) {
    throw new Error(`"${tekst}" is geen datum. Gebruik JJJJ-MM-DD.`)
  }
  return tekst
}

function prioriteitOf(waarde: unknown): number {
  if (waarde === undefined || waarde === null) return 4
  const n = Number(waarde)
  if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error('Prioriteit is 1, 2, 3 of 4.')
  return n
}

function duurOf(waarde: unknown): number {
  const n = Number(waarde)
  if (!Number.isInteger(n) || n < 1 || n > 1440) {
    throw new Error('Duur is een heel aantal minuten, van 1 tot 1440.')
  }
  return n
}

function uitleg(fout: unknown): string {
  return fout instanceof Error ? fout.message : String(fout)
}
