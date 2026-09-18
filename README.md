# Mijn taken

Persoonlijk taakprogramma: React + Vite + TypeScript + Tailwind, met Supabase
voor inloggen en opslag. Draait als statische site op GitHub Pages en is te
installeren als app op je telefoon.

Registreren kan niet. Accounts worden met de hand aangemaakt in het Supabase-
dashboard; de startpagina is alleen een inlogscherm.

## Wat er in zit

- **Vandaag** - achterstallige taken, wat vandaag afloopt, en cijfers over open,
  achterstallig en afgerond werk (inclusief een weekgrafiek). Staat er iets te
  laat, dan zet **Herplannen** de hele stapel in een keer op vandaag.
- **Binnenkort** - de komende zeven dagen, dag voor dag.
- **Zoeken** - door titels, omschrijvingen, subtaken, lijstnamen en labels.
  Elk woord moet ergens raak zijn, dus je maakt een zoekopdracht scherper door
  door te typen.
- **Lijsten** - eigen lijsten met kleur; taken zonder lijst staan in de inbox.
- **Labels** - dwars door lijsten heen filteren.
- **Taken** - omschrijving, datum, prioriteit (1-4), subtaken en labels.

Projecten zitten nog niet in de UI; het schema laat ruimte om ze later boven
lijsten te hangen.

## Lijst, bord of agenda

Rechtsboven op elke pagina staat **Weergave**. Dezelfde taken, drie brillen:

- **Lijst** - alles onder elkaar, met kopjes per dag of per soort.
- **Bord** - kolommen naast elkaar. Sleep een kaart naar een andere kolom en de
  datum gaat mee; in "Geen datum" laten vallen haalt de datum er juist af.
- **Agenda** - een hele maand in beeld, met de gekozen dag eronder uitgeschreven.
  Slepen werkt hier ook, en taken zonder datum staan onder het raster klaar om
  ingepland te worden.

De keuze wordt per pagina onthouden (in `localStorage`, niet in de database):
op een telefoon wil je vaak iets anders zien dan op een breed scherm. Slepen is
trouwens muiswerk - op een touchscreen verzet je een datum via het taakvenster.

Op een breed scherm openen `q` een nieuwe taak en `/` de zoekpagina, zolang je
niet in een invoerveld staat.

## Snel koppelen met #

Typ je `Verslagen uitwerken #klas`, dan komt de taak in de lijst *Klas* te
staan en heet hij gewoon *Verslagen uitwerken*. De tag mag overal in de titel
staan.

- Hoofdletters, accenten en spaties maken niet uit: `#werkschool` vindt ook de
  lijst "Werk & school".
- Is er geen lijst met die naam, dan wordt er in de **labels** gezocht. De
  zijbalk toont labels al als `#naam`, dus dat is de enige andere zinnige
  uitleg van een `#`.
- Slaat een tag nergens op, dan blijft hij gewoon in de titel staan. Er wordt
  niet vanzelf een lijst aangemaakt - bij één tikfout zit je anders met een
  lijst "#klsa". In het venster staat wel een knop om de lijst alsnog te maken.
- Een `#lijst` in de titel gaat voor op de keuzelijst eronder; die staat dan
  op slot. Onder het titelveld zie je live wat er opgeslagen gaat worden.
- Een `#` midden in een woord telt niet mee, dus `C#-cursus` blijft heel.

## Installeren als app

De site is een PWA: op Android geeft Chrome "toevoegen aan startscherm", op
iOS doe je dat via Deel -> Zet op beginscherm. Daarna opent de app zonder
adresbalk, met een eigen icoon en twee snelkoppelingen (nieuwe taak,
binnenkort) onder een lange druk op het icoon.

De service worker bewaart alleen de schil van de app - html, css, javascript
en iconen. Taken komen altijd vers van Supabase. Zonder verbinding opent de
app dus wel, maar zie je geen taken; een afgevinkte taak die uit een cache
terugkomt is vervelender dan een eerlijke foutmelding.

De iconen in `public/` komen uit `scripts/maak-iconen.mjs`, dat dezelfde vorm
tekent als `favicon.svg`. Kleur veranderd? Dan `node scripts/maak-iconen.mjs`
draaien.

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

In `npm run dev` staat de service worker uit - die zit bij het herladen alleen
maar in de weg. De PWA test je met `npm run build && npm run preview`.

## Deploy

Elke push naar `main` bouwt en publiceert via
`.github/workflows/deploy.yml`. De workflow kopieert `index.html` naar
`404.html`, anders geeft een directe link naar bijvoorbeeld `/binnenkort` een
404 op GitHub Pages.

Staat de site op een subpad (`gebruiker.github.io/mijn-taken`), dan moet
`BASIS` in `vite.config.ts` gelijk zijn aan dat subpad. Bij een eigen domein
wordt dat `'/'`. Die ene constante voedt ook `start_url` en `scope` van het
manifest; staan die naast elkaar verkeerd, dan weigert de browser de app te
installeren.

## Beveiliging

Alle tabellen staan onder row level security: je ziet en wijzigt uitsluitend
rijen met jouw `user_id`. De publishable key mag dus gewoon in de repo en in de
gebouwde bestanden staan - de `service_role` key hoort daar nooit.
