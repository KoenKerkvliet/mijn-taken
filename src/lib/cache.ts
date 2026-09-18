import type { Label, List, Task } from './types'

/** Wat er bij het vorige bezoek op het scherm stond, zodat het er de volgende
 *  keer meteen weer staat. Puur om het wachten weg te nemen: er wordt altijd
 *  opnieuw opgehaald en overschreven, dus dit is nooit de waarheid - alleen
 *  het plaatje totdat de waarheid binnen is.
 *
 *  Dat is iets anders dan de service worker, die bewust géén taken bewaart:
 *  daar zou je zonder verbinding een afgevinkte taak terug kunnen zien komen
 *  zonder dat iets dat rechtzet. Hier staat de correctie altijd achter de
 *  deur, want zonder verbinding kom je hier niet eens. */

const SLEUTEL = 'mijn-taken:cache:v1'

export interface Momentopname {
  lijsten: List[]
  labels: Label[]
  taken: Task[]
  koppelingen: { task_id: string; label_id: string }[]
}

interface Bewaard extends Momentopname {
  gebruiker: string
}

export function leesCache(gebruiker: string): Momentopname | null {
  try {
    const ruw = localStorage.getItem(SLEUTEL)
    if (!ruw) return null
    const bewaard = JSON.parse(ruw) as Bewaard
    // Een andere gebruiker hoort de taken van de vorige niet te zien, ook niet
    // een halve seconde lang.
    if (bewaard.gebruiker !== gebruiker) return null
    if (!Array.isArray(bewaard.taken) || !Array.isArray(bewaard.lijsten)) return null
    return {
      lijsten: bewaard.lijsten,
      labels: bewaard.labels ?? [],
      taken: bewaard.taken,
      koppelingen: bewaard.koppelingen ?? [],
    }
  } catch {
    // Onleesbaar of geblokkeerd: dan gewoon wachten op de server.
    return null
  }
}

export function schrijfCache(gebruiker: string, inhoud: Momentopname): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify({ gebruiker, ...inhoud }))
  } catch {
    // Vol of geblokkeerd. Jammer, maar geen reden om iets te laten mislukken.
  }
}

export function wisCache(): void {
  try {
    localStorage.removeItem(SLEUTEL)
  } catch {
    // Zie hierboven.
  }
}
