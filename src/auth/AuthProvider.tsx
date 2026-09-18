import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  bezigMetLaden: boolean
  /** De naam die je zelf hebt ingevuld, anders het stuk voor de @. */
  naam: string
  inloggen: (email: string, wachtwoord: string) => Promise<void>
  uitloggen: () => Promise<void>
  naamOpslaan: (naam: string) => Promise<void>
  wachtwoordWijzigen: (huidig: string, nieuw: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [bezigMetLaden, setBezigMetLaden] = useState(true)

  useEffect(() => {
    // getSession() leest de opgeslagen sessie; onAuthStateChange vangt daarna
    // inloggen, uitloggen en het verversen van het token op.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setBezigMetLaden(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nieuw) => {
      setSession(nieuw)
      setBezigMetLaden(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function inloggen(email: string, wachtwoord: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: wachtwoord,
    })
    if (error) throw error
  }

  async function uitloggen() {
    await supabase.auth.signOut()
  }

  /** In user_metadata en niet in een eigen tabel: het is één veld dat bij je
   *  account hoort, en zo blijft het schema zoals het was. */
  async function naamOpslaan(naam: string) {
    const { error } = await supabase.auth.updateUser({ data: { naam: naam.trim() } })
    if (error) throw error
  }

  /** Eerst opnieuw inloggen met het huidige wachtwoord. Supabase vraagt er
   *  niet om, maar zonder die controle kan iedereen die even bij een open
   *  laptop komt het wachtwoord veranderen. */
  async function wachtwoordWijzigen(huidig: string, nieuw: string) {
    const email = session?.user.email
    if (!email) throw new Error('Je bent niet ingelogd.')

    const { error: controle } = await supabase.auth.signInWithPassword({
      email,
      password: huidig,
    })
    if (controle) throw new Error('Het huidige wachtwoord klopt niet.')

    const { error } = await supabase.auth.updateUser({ password: nieuw })
    if (error) throw error
  }

  const naam =
    (session?.user.user_metadata?.naam as string | undefined)?.trim() ||
    (session?.user.email ?? '').split('@')[0]

  return (
    <AuthContext.Provider
      value={{ session, bezigMetLaden, naam, inloggen, uitloggen, naamOpslaan, wachtwoordWijzigen }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth buiten AuthProvider gebruikt')
  return ctx
}
