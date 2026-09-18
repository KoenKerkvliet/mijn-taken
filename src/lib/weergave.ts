import { useCallback, useEffect, useState } from 'react'

/** Dezelfde taken, drie manieren om ernaar te kijken. De keuze hoort bij de
 *  pagina en niet bij de taken, dus hij staat in localStorage en niet in de
 *  database: op je telefoon wil je iets anders zien dan op een breed scherm. */
export type Weergave = 'lijst' | 'bord' | 'agenda'

export const WEERGAVEN: { waarde: Weergave; naam: string; icoon: string; uitleg: string }[] = [
  { waarde: 'lijst', naam: 'Lijst', icoon: '☰', uitleg: 'Alles onder elkaar' },
  { waarde: 'bord', naam: 'Bord', icoon: '▥', uitleg: 'Kolommen om in te slepen' },
  { waarde: 'agenda', naam: 'Agenda', icoon: '🗓', uitleg: 'Een maand in één oogopslag' },
]

const SLEUTEL = 'mijn-taken:weergave:'

function lees(pagina: string): Weergave {
  try {
    const opgeslagen = localStorage.getItem(SLEUTEL + pagina)
    if (opgeslagen === 'lijst' || opgeslagen === 'bord' || opgeslagen === 'agenda') {
      return opgeslagen
    }
  } catch {
    // Privémodus of geblokkeerde opslag: dan gewoon de lijst.
  }
  return 'lijst'
}

/** Onthoudt de weergave per pagina. "Binnenkort" mag dus op agenda staan
 *  terwijl een lijst gewoon een lijst blijft. */
export function useWeergave(pagina: string): [Weergave, (w: Weergave) => void] {
  const [weergave, setWeergave] = useState<Weergave>(() => lees(pagina))

  // Van lijst naar lijst navigeren hergebruikt hetzelfde component; zonder dit
  // zou de keuze van de vorige pagina blijven hangen.
  useEffect(() => {
    setWeergave(lees(pagina))
  }, [pagina])

  const kies = useCallback(
    (nieuw: Weergave) => {
      setWeergave(nieuw)
      try {
        localStorage.setItem(SLEUTEL + pagina, nieuw)
      } catch {
        // Niet kunnen onthouden is vervelend, maar geen reden om te stoppen.
      }
    },
    [pagina],
  )

  return [weergave, kies]
}

/** Hoe breed de pagina mag worden. Een lijst leest prettig op leesbreedte,
 *  maar een bord wil al zijn kolommen kwijt en een agenda een hele week. */
export function breedte(weergave: Weergave): string {
  if (weergave === 'bord') return 'max-w-none'
  if (weergave === 'agenda') return 'max-w-5xl'
  return 'max-w-4xl'
}
