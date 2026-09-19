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
    <div className="flex min-h-0 flex-1 flex-col">
      <Menu opNieuweTaak={() => nieuweTaak()} alsPagina />
    </div>
  )
}
