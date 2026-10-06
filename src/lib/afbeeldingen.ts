import { supabase } from './supabase'

export const BUCKET = 'task-images'

/** Langste zijde na verkleinen. Een telefoonfoto is zo 4000 pixels of meer en
 *  enkele megabytes; op een scherm is dit ruim voldoende om te lezen. */
const MAX_ZIJDE = 1600

/** Verkleint een foto en maakt er een JPEG van. Een GIF of PNG wordt dus ook
 *  een JPEG: voor een foto of screenshot bij een taak is dat prima, en het
 *  scheelt een factor tien in grootte. */
export async function verkleinAfbeelding(bestand: File): Promise<Blob> {
  // 'from-image' draait een foto die staand is genomen goed om; zonder dat
  // liggen telefoonfoto's op hun zij.
  const bitmap = await createImageBitmap(bestand, { imageOrientation: 'from-image' })
  const schaal = Math.min(1, MAX_ZIJDE / Math.max(bitmap.width, bitmap.height))
  const breedte = Math.round(bitmap.width * schaal)
  const hoogte = Math.round(bitmap.height * schaal)

  const canvas = document.createElement('canvas')
  canvas.width = breedte
  canvas.height = hoogte
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Deze browser kan de afbeelding niet verkleinen.')
  // JPEG kent geen doorzichtigheid; zonder witte ondergrond wordt dat zwart.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, breedte, hoogte)
  ctx.drawImage(bitmap, 0, 0, breedte, hoogte)
  bitmap.close()

  return new Promise((klaar, mislukt) =>
    canvas.toBlob(
      (blob) => (blob ? klaar(blob) : mislukt(new Error('Verkleinen van de afbeelding mislukte.'))),
      'image/jpeg',
      0.85,
    ),
  )
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
      await supabase.storage.from(BUCKET).remove(data.map((r) => r.path))
  } catch {
    // zie boven
  }
}
