# Mijn taken

Persoonlijk taakprogramma: React + Vite + TypeScript + Tailwind, met Supabase
voor inloggen en opslag. Draait als statische site op GitHub Pages.

Registreren kan niet. Accounts worden met de hand aangemaakt in het Supabase-
dashboard; de startpagina is alleen een inlogscherm.

## Wat er in zit

- **Vandaag** - achterstallige taken, wat vandaag afloopt, en cijfers over open,
  achterstallig en afgerond werk (inclusief een weekgrafiek).
- **Binnenkort** - de komende zeven dagen, dag voor dag.
- **Lijsten** - eigen lijsten met kleur; taken zonder lijst staan in de inbox.
- **Labels** - dwars door lijsten heen filteren.
- **Taken** - omschrijving, datum, prioriteit (1-4), subtaken en labels.

Projecten zitten nog niet in de UI; het schema laat ruimte om ze later boven
lijsten te hangen.

## Eenmalig instellen

1. **Supabase-project** aanmaken (regio West EU).
2. **Schema** draaien: de inhoud van `supabase/migrations/0001_init.sql` in de
   SQL-editor plakken en uitvoeren.
3. **Registratie uitzetten**: Authentication -> Sign In / Providers ->
   "Allow new users to sign up" uit.
4. **Account aanmaken**: Authentication -> Users -> Add user, met
   "Auto confirm user" aan.
5. **Sleutels invullen** in `.env.local`:

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```

6. **Dezelfde twee** als *Variables* (niet Secrets) zetten in de GitHub-repo
   onder Settings -> Secrets and variables -> Actions -> Variables.
7. **Pages aanzetten**: Settings -> Pages -> Source: GitHub Actions.

## Lokaal draaien

```bash
npm install
npm run dev
```

## Deploy

Elke push naar `main` bouwt en publiceert via
`.github/workflows/deploy.yml`. De workflow kopieert `index.html` naar
`404.html`, anders geeft een directe link naar bijvoorbeeld `/binnenkort` een
404 op GitHub Pages.

Staat de site op een subpad (`gebruiker.github.io/mijn-taken`), dan moet
`base` in `vite.config.ts` gelijk zijn aan dat subpad. Bij een eigen domein
wordt dat `'/'`.

## Beveiliging

Alle tabellen staan onder row level security: je ziet en wijzigt uitsluitend
rijen met jouw `user_id`. De publishable key mag dus gewoon in de repo en in de
gebouwde bestanden staan - de `service_role` key hoort daar nooit.
