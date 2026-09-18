import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Laadscherm } from '../components/Laadscherm'

export function Inloggen() {
  const { session, bezigMetLaden, inloggen } = useAuth()
  const locatie = useLocation() as { state?: { vandaan?: string } }
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  if (bezigMetLaden) return <Laadscherm />
  if (session) return <Navigate to={locatie.state?.vandaan ?? '/'} replace />

  async function versturen(e: FormEvent) {
    e.preventDefault()
    setFout(null)
    setBezig(true)
    try {
      await inloggen(email, wachtwoord)
    } catch (err) {
      // Supabase geeft 'Invalid login credentials'; dat zegt een mens niets.
      const bericht = err instanceof Error ? err.message : 'Onbekende fout'
      setFout(
        bericht.toLowerCase().includes('invalid login')
          ? 'E-mailadres of wachtwoord klopt niet.'
          : bericht,
      )
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      {/* Linkerkant: alleen sfeer, verdwijnt op smalle schermen. */}
      <div className="relative hidden overflow-hidden bg-brand lg:block">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,.22), transparent 45%),' +
              'radial-gradient(circle at 80% 70%, rgba(0,0,0,.30), transparent 55%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 text-lg font-semibold">
              ✓
            </span>
            <span className="text-lg font-semibold tracking-tight">Mijn taken</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl leading-tight font-semibold tracking-tight">
              Alles wat moet gebeuren, op één plek.
            </h1>
            <p className="mt-4 text-white/80">
              Lijsten, labels, subtaken en een dagoverzicht dat laat zien wat er vandaag
              écht toe doet.
            </p>
          </div>
          <p className="text-sm text-white/60">Persoonlijke werkomgeving · toegang op uitnodiging</p>
        </div>
      </div>

      {/* Rechterkant: het formulier. */}
      <div className="flex items-center justify-center bg-canvas px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-lg font-semibold text-white">
              ✓
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Inloggen</h2>
          <p className="mt-1 text-sm text-ink-soft">Log in om verder te gaan met je taken.</p>

          <form onSubmit={versturen} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="jij@voorbeeld.nl"
              />
            </div>

            <div>
              <label htmlFor="wachtwoord" className="mb-1.5 block text-sm font-medium">
                Wachtwoord
              </label>
              <input
                id="wachtwoord"
                type="password"
                autoComplete="current-password"
                required
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="••••••••"
              />
            </div>

            {fout && (
              <p
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
              >
                {fout}
              </p>
            )}

            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {bezig ? 'Bezig met inloggen…' : 'Inloggen'}
            </button>
          </form>

          <p className="mt-8 text-xs text-ink-faint">
            Accounts worden handmatig aangemaakt. Registreren is niet mogelijk.
          </p>
        </div>
      </div>
    </div>
  )
}
