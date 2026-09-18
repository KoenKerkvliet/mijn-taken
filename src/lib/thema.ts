/** Licht, donker, of wat je computer zelf al aangeeft.
 *
 *  De keuze staat in localStorage en niet bij je account: een thema hoort bij
 *  het scherm waar je naar kijkt. Op een telefoon in de zon wil je iets anders
 *  dan 's avonds achter een monitor, en dan is "volgt je account" juist lastig. */

export type Thema = 'systeem' | 'licht' | 'donker'

export const THEMAS: { waarde: Thema; naam: string; uitleg: string }[] = [
  { waarde: 'systeem', naam: 'Systeem', uitleg: 'Volgt de instelling van dit apparaat' },
  { waarde: 'licht', naam: 'Licht', uitleg: 'Altijd lichte achtergrond' },
  { waarde: 'donker', naam: 'Donker', uitleg: 'Altijd donkere achtergrond' },
]

export const THEMA_SLEUTEL = 'mijn-taken:thema'

export function leesThema(): Thema {
  try {
    const bewaard = localStorage.getItem(THEMA_SLEUTEL)
    if (bewaard === 'licht' || bewaard === 'donker' || bewaard === 'systeem') return bewaard
  } catch {
    // Privémodus of geblokkeerde opslag: dan het systeem volgen.
  }
  return 'systeem'
}

/** Zet het thema op <html>; de kleuren in index.css hangen aan dat kenmerk. */
export function pasThemaToe(thema: Thema): void {
  document.documentElement.dataset.thema = thema
  // De statusbalk van een geïnstalleerde app kleurt mee met deze meta.
  const donker =
    thema === 'donker' ||
    (thema === 'systeem' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', donker ? '#0d0f16' : '#f6f7fb')
    meta.removeAttribute('media')
  }
}

export function bewaarThema(thema: Thema): void {
  try {
    localStorage.setItem(THEMA_SLEUTEL, thema)
  } catch {
    // Niet kunnen onthouden is jammer, maar geen reden om te stoppen.
  }
  pasThemaToe(thema)
}
