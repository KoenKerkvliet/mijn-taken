import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Draait op GitHub Pages onder /mijn-taken/. Zodra er een eigen domein aan
// hangt wordt dit '/'.
const BASIS = '/mijn-taken/'

export default defineConfig({
  base: BASIS,
  plugins: [
    react(),
    VitePWA({
      // De service worker ververst zichzelf zodra er een nieuwe versie op
      // Pages staat. Geen "er is een update"-balk: dit is een app van één
      // gebruiker, die hoeft daar niet over na te denken.
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'favicon-64.png', 'apple-touch-icon.png'],

      manifest: {
        name: 'Mijn taken',
        short_name: 'Taken',
        description: 'Alles wat moet gebeuren, op één plek.',
        lang: 'nl',
        dir: 'ltr',
        start_url: `${BASIS}menu`,
        scope: BASIS,
        display: 'standalone',
        background_color: '#f6f7fb',
        theme_color: '#4f46e5',
        icons: [
          { src: 'icoon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icoon-512.png', sizes: '512x512', type: 'image/png' },
          // Android snijdt het icoon in de vorm van het systeem; 'maskable'
          // vult daarom tot de rand door met het logo in de veilige zone.
          {
            src: 'icoon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Nieuwe taak', short_name: 'Nieuw', url: `${BASIS}?nieuw=1` },
          { name: 'Planning', short_name: 'Planning', url: `${BASIS}planning` },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Zonder dit geeft een diepe link in de geïnstalleerde app een lege
        // pagina: de router leeft in index.html.
        navigateFallback: `${BASIS}index.html`,

        // Alleen de schil komt uit de cache. Taken zelf komen altijd vers van
        // Supabase - een afgevinkte taak die uit een cache terugkomt is erger
        // dan een foutmelding dat je offline bent.
        runtimeCaching: [],
      },

      devOptions: {
        // In dev zou een service worker vooral in de weg zitten bij het
        // herladen. Testen doe je met `npm run preview`.
        enabled: false,
      },
    }),
  ],
})
