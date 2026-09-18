import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { Laadscherm } from '../components/Laadscherm'

/** Alles achter het inlogscherm loopt hierlangs. */
export function Beveiligd({ children }: { children: ReactNode }) {
  const { session, bezigMetLaden } = useAuth()
  const locatie = useLocation()

  if (bezigMetLaden) return <Laadscherm />
  if (!session) return <Navigate to="/inloggen" replace state={{ vandaan: locatie.pathname }} />
  return <>{children}</>
}
