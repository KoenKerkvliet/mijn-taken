import { supabase } from './supabase'
import type { TaskAttachment } from './types'

export const BUCKET = 'task-images'

/** Langste zijde na verkleinen. Een telefoonfoto is zo 4000 pixels of meer en
 *  enkele megabytes; op een scherm is dit ruim voldoende om te lezen. */
const MAX_ZIJDE = 1600

/** Het plaatje op de kaart. Dat is hooguit een paar honderd pixels breed, en
 *  een bord vol kaarten met elk een foto van 300 KB laadt traag. */
const MAX_ZIJDE_KLEIN = 480

/** Naast elk bestand staat een klein broertje, onder een naam die uit het pad
 *  volgt. Zo hoeft er geen extra kolom bij, en afbeeldingen van voor de
 *  miniaturen hebben er simpelweg geen. */
export function miniatuurPad(pad: string): string {
  return pad.replace(/\.jpg$/, '-klein.jpg')
}

function alsJpeg(bron: ImageBitmap, maxZijde: number, kwaliteit: number): Promise<Blob> {
  const schaal = Math.min(1, maxZijde / Math.max(bron.width, bron.height))
  const breedte = Math.round(bron.width * schaal)
  const hoogte = Math.round(bron.height * schaal)

  const canvas = document.createElement('canvas')
  canvas.width = breedte
  canvas.height = hoogte
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Deze browser kan de afbeelding niet verkleinen.')
  // JPEG kent geen doorzichtigheid; zonder witte ondergrond wordt dat zwart.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, breedte, hoogte)
  ctx.drawImage(bron, 0, 0, breedte, hoogte)

  return new Promise((klaar, mislukt) =>
    canvas.toBlob(
      (blob) => (blob ? klaar(blob) : mislukt(new Error('Verkleinen van de afbeelding mislukte.'))),
      'image/jpeg',
      kwaliteit,
    ),
  )
}

/** Maakt van een foto een verkleinde JPEG en een nog kleinere voor op de
 *  kaart. Een GIF of PNG wordt dus ook een JPEG: voor een foto of screenshot
 *  bij een taak is dat prima, en het scheelt een factor tien in grootte. */
async function verkleinAfbeelding(bestand: File): Promise<{ groot: Blob; klein: Blob }> {
  // 'from-image' draait een foto die staand is genomen goed om; zonder dat
  // liggen telefoonfoto's op hun zij.
  const bitmap = await createImageBitmap(bestand, { imageOrientation: 'from-image' })
  try {
    return {
      groot: await alsJpeg(bitmap, MAX_ZIJDE, 0.85),
      klein: await alsJpeg(bitmap, MAX_ZIJDE_KLEIN, 0.8),
    }
  } finally {
    bitmap.close()
  }
}

/** Verkleint, uploadt en legt de afbeelding vast bij de taak. Gooit een Error
 *  met een leesbare melding als er iets misgaat. */
export async function uploadAfbeelding(
  foto: File,
  taakId: string,
  gebruikerId: string,
): Promise<TaskAttachment> {
  const { groot, klein } = await verkleinAfbeelding(foto)
  const pad = `${gebruikerId}/${taakId}/${crypto.randomUUID()}.jpg`

  const { error: uploadFout } = await supabase.storage
    .from(BUCKET)
    .upload(pad, groot, { contentType: 'image/jpeg' })
  if (uploadFout) throw new Error(uploadFout.message)

  // De miniatuur is een gemak. Lukt hij niet, dan toont de kaart straks het
  // grote plaatje, en dat is geen reden om de hele upload af te blazen.
  await supabase.storage.from(BUCKET).upload(miniatuurPad(pad), klein, { contentType: 'image/jpeg' })

  const { data, error } = await supabase
    .from('task_attachments')
    .insert({ task_id: taakId, path: pad, name: foto.name.slice(0, 200) || null })
    .select()
    .single()
  if (error) {
    // Geen rij, dus de bestanden zouden voor altijd zwevend blijven.
    await supabase.storage.from(BUCKET).remove([pad, miniatuurPad(pad)])
    throw new Error(error.message)
  }
  return data
}

/** Haalt de bestanden van een taak en zijn subtaken uit Storage. Aanroepen
 *  vóór het verwijderen van de taak: daarna zijn de rijen met de paden weg.
 *  Faalt stil, want een taak weggooien mag nooit stuklopen op een ongebruikt
 *  bestand (en zolang migratie 0006 niet gedraaid is, is er ook niets op te
 *  ruimen). */
export async function ruimAfbeeldingenOp(taakId: string): Promise<void> {
  try {
    const { data: subtaken } = await supabase.from('tasks').select('id').eq('parent_id', taakId)
    const ids = [taakId, ...(subtaken ?? []).map((t) => t.id)]
    const { data } = await supabase.from('task_attachments').select('path').in('task_id', ids)
    if (data && data.length > 0)
      await supabase.storage.from(BUCKET).remove(data.flatMap((r) => [r.path, miniatuurPad(r.path)]))
  } catch {
    // zie boven
  }
}

/** Tijdelijke leeslinks voor een handvol bestanden, in één verzoek. */
export async function leeslinks(paden: string[], geldigSeconden: number) {
  const uit = new Map<string, string>()
  if (paden.length === 0) return uit
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paden, geldigSeconden)
  for (const d of data ?? []) if (d.path && d.signedUrl) uit.set(d.path, d.signedUrl)
  return uit
}
