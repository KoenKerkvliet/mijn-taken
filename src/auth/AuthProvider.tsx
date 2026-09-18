import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  bezigMetLaden: boolean
  inloggen: (email: string, wachtwoord: string) => Promise<void>
  uitloggen: () => Promise<void>
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

  return (
    <AuthContext.Provider value={{ session, bezigMetLaden, inloggen, uitloggen }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth buiten AuthProvider gebruikt')
  return ctx
}
