import { Navigate } from 'react-router-dom'
import { Menu } from '../components/Menu'
import { useSchil } from '../components/Layout'
import { gebruikBreedScherm } from '../lib/scherm'

/** Het menu als volledig scherm, voor op een telefoon. Op een breed scherm
 *  staat het al als zijbalk naast alles; daar heeft deze pagina geen reden van
 *  bestaan en gaan we door naar Vandaag. */
export function Menupagina() {
  const { nieuweTaak } = useSchil()
  const breed = gebruikBreedScherm()

  if (breed) return <Navigate to="/" replace />

  return (
    // De statusbalk van een telefoon (klok, accu, 5G) ligt óver de app heen:
    // viewport-fit=cover laat ons tot aan de rand tekenen, en deze marge houdt
    // de eerste regel daar weg. De zijbalk had die marge; bij het opsplitsen
    // is hij hier nodig.
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Menu opNieuweTaak={() => nieuweTaak()} alsPagina />
    </div>
  )
}
