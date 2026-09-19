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
