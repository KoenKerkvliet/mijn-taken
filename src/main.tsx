import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { leesThema, pasThemaToe } from './lib/thema'
import { AuthProvider } from './auth/AuthProvider'
import { Beveiligd } from './auth/Beveiligd'
import { TakenProvider } from './data/TakenProvider'
import { Layout } from './components/Layout'
import { Inloggen } from './pages/Inloggen'
import { Vandaag } from './pages/Vandaag'
import { Binnenkort } from './pages/Binnenkort'
import { Filterpagina } from './pages/Filterpagina'
import { Zoeken } from './pages/Zoeken'
import { Instellingen } from './pages/Instellingen'

// index.html zet het thema al voor de eerste tekening; dit zet ook de kleur
// van de statusbalk goed, die daar nog van de systeeminstelling uitging.
pasThemaToe(leesThema())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename volgt vite's base, zodat routes ook onder /mijn-taken/ kloppen. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <TakenProvider>
          <Routes>
            <Route path="/inloggen" element={<Inloggen />} />
            <Route
              element={
                <Beveiligd>
                  <Layout />
                </Beveiligd>
              }
            >
              <Route path="/" element={<Vandaag />} />
              <Route path="/binnenkort" element={<Binnenkort />} />
              <Route path="/zoeken" element={<Zoeken />} />
              <Route path="/instellingen" element={<Instellingen />} />
              <Route path="/inbox" element={<Filterpagina soort="inbox" />} />
              <Route path="/klaar" element={<Filterpagina soort="klaar" />} />
              <Route path="/lijst/:id" element={<Filterpagina soort="lijst" />} />
              <Route path="/label/:id" element={<Filterpagina soort="label" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TakenProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
