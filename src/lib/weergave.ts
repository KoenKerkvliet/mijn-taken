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

/** De omhulling van een pagina. Een lijst leest prettig op leesbreedte, een
 *  agenda wil een hele week kwijt, en een bord vult het scherm: alleen zo
 *  staat de schuifbalk onderaan in beeld in plaats van onder de langste
 *  kolom. */
export function paginaKlassen(weergave: Weergave): string {
  const basis = 'mx-auto w-full px-4 pt-6 sm:px-6'
  if (weergave === 'bord') return `${basis} flex min-h-0 max-w-none flex-1 flex-col`
  if (weergave === 'agenda') return `${basis} max-w-5xl pb-28 lg:pb-16`
  return `${basis} max-w-4xl pb-28 lg:pb-16`
}
