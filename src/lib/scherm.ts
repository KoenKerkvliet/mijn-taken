import { useEffect, useState } from 'react'

/** Is dit een breed scherm? Dezelfde grens als Tailwinds `lg`, zodat CSS en
 *  JavaScript het over hetzelfde hebben.
 *
 *  Nodig omdat sommige dingen niet met CSS te regelen zijn: een pagina die op
 *  een breed scherm niet hoort te bestaan, moet echt doorsturen - verbergen is
 *  niet hetzelfde als er niet zijn. */
const BREED = '(min-width: 64rem)'

export function gebruikBreedScherm(): boolean {
  const [breed, setBreed] = useState(() => window.matchMedia(BREED).matches)

  useEffect(() => {
    const vraag = window.matchMedia(BREED)
    const luister = () => setBreed(vraag.matches)
    vraag.addEventListener('change', luister)
    return () => vraag.removeEventListener('change', luister)
  }, [])

  return breed
}

/** Het deel van het scherm dat je echt ziet: zonder het toetsenbord dat er op
 *  een telefoon overheen schuift.
 *
 *  `100dvh` helpt hier niet - dat blijft het hele scherm, ook als de helft
 *  onder een toetsenbord zit. visualViewport weet het wel, en daarmee kan een
 *  venster zich netjes bóven het toetsenbord zetten in plaats van eronder. */
export function gebruikZichtbaarVenster(): { hoogte: number; top: number } {
  const [maat, setMaat] = useState(() => ({
    hoogte: window.visualViewport?.height ?? window.innerHeight,
    top: window.visualViewport?.offsetTop ?? 0,
  }))

  useEffect(() => {
    const venster = window.visualViewport
    if (!venster) return

    const meet = () => setMaat({ hoogte: venster.height, top: venster.offsetTop })
    meet()
    venster.addEventListener('resize', meet)
    venster.addEventListener('scroll', meet)
    return () => {
      venster.removeEventListener('resize', meet)
      venster.removeEventListener('scroll', meet)
    }
  }, [])

  return maat
}
