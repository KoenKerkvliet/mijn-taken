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
- **Planning** - alles wat openstaat, uit alle lijsten door elkaar, op een
  bord. Waar een lijstpagina per lijst kijkt, kijkt deze pagina per moment: wat
  moet er deze week gebeuren, wat volgende week, en wat heeft nog geen dag. Met
  knopjes bovenaan filter je op lijst en label; die keuze blijft staan tot je
  hem wist.
- **Agenda** - al je taken in een maandoverzicht, uit alle lijsten samen.
- **Binnenkort** - de komende zeven dagen, dag voor dag. Staat niet meer in de
  zijbalk, maar `/binnenkort` werkt nog voor wie er een bladwijzer van had.
- **Zoeken** - door titels, omschrijvingen, subtaken, lijstnamen en labels.
  Elk woord moet ergens raak zijn, dus je maakt een zoekopdracht scherper door
  door te typen.
- **Lijsten** - eigen lijsten met kleur; taken zonder lijst staan in de inbox.
  Achter elke lijst in de zijbalk (en naast de titel van de lijstpagina) zitten
  drie puntjes: bewerken, omhoog, omlaag, archiveren en verwijderen.
- **Archief** - een lijst die je opbergt verdwijnt uit de zijbalk en zijn taken
  tellen nergens meer mee: niet in Vandaag, niet in de aantallen, niet in
  zoeken. Hij blijft wel bestaan en staat onderaan de zijbalk onder *Archief*,
  met één klik terug te halen. Weggooien is definitief, opbergen niet.
- **Labels** - dwars door lijsten heen filteren.
- **Taken** - omschrijving, datum, prioriteit (1-4), subtaken en labels.

Projecten zitten nog niet in de UI; het schema laat ruimte om ze later boven
lijsten te hangen.

## Instellingen

Onder je naam bovenaan de zijbalk zit **Instellingen**, met twee tabbladen:

- **Algemeen** - je naam (die staat daarna bovenaan de zijbalk in plaats van
  het begin van je e-mailadres) en je wachtwoord. Voor een nieuw wachtwoord
  moet je eerst je huidige invullen. Supabase vraagt daar niet om, maar zonder
  die controle kan iedereen die even bij een open laptop komt het wachtwoord
  veranderen. Het e-mailadres zelf is er niet te wijzigen.
- **Uiterlijk** - thema: systeem, licht of donker.

De naam staat in `user_metadata` van je account, niet in een eigen tabel: het
is één veld, en zo blijft het schema zoals het is. Het thema staat juist in
`localStorage`, dus per apparaat - op een telefoon in de zon wil je vaak iets
anders dan 's avonds achter een monitor. Het wordt gezet door een klein script
in `index.html`, voordat er iets getekend wordt; anders flitst een donkere app
eerst wit op.

## Lijst, bord of agenda

Rechtsboven op elke pagina staat **Weergave**. Dezelfde taken, drie brillen:

- **Lijst** - alles onder elkaar, met kopjes per dag of per soort.
- **Bord** - kolommen naast elkaar: over tijd, vandaag, morgen, deze week,
  volgende week, later, en wat geen datum heeft. De weken lopen mee met de
  kalender en niet met zeven dagen vanaf vandaag - deze week loopt tot en met
  zondag, volgende week is de maandag daarna tot en met de zondag erop. Anders
  valt "volgende week donderdag" op een vrijdag onder *deze* week, terwijl je
  hem net als volgende week hebt ingetypt. Sleep een kaart naar een andere
  kolom en de datum gaat mee; in "Geen datum" laten vallen haalt de datum er
  juist af.
  Lege kolommen blijven weg - behalve terwijl je sleept, want dan moet je er
  juist iets in kunnen laten vallen. De kolommen rekenen mee met de ruimte: op
  een telefoon één per scherm, en op een breed scherm passen er precies vier
  binnen het beeld. Het bord vult het scherm, zodat de schuifbalk onderaan in
  beeld staat en niet onder de langste kolom. Schuiven
  gaat met het muiswiel, of door het bord aan de achtergrond opzij te trekken.
- **Agenda** - een hele maand in beeld, met de gekozen dag eronder uitgeschreven.
  Slepen werkt hier ook, en taken zonder datum staan onder het raster klaar om
  ingepland te worden.

De keuze wordt per pagina onthouden (in `localStorage`, niet in de database):
op een telefoon wil je vaak iets anders zien dan op een breed scherm. Slepen is
trouwens muiswerk - op een touchscreen verzet je een datum via het taakvenster.

Op een breed scherm openen `q` een nieuwe taak en `/` de zoekpagina, zolang je
niet in een invoerveld staat.

## Datum en prioriteit gewoon intypen

Typ je `Verslagen uitwerken volgende week donderdag p1`, dan wordt dat een
taak *Verslagen uitwerken* op die donderdag met prioriteit Urgent. Wat er
herkend wordt krijgt meteen een kleurtje in het invoerveld, en eronder staat
wat er opgeslagen gaat worden - je ziet het dus voordat je opslaat.

Wat er begrepen wordt:

- `vandaag`, `morgen`, `overmorgen`
- een weekdag: `vrijdag` is de eerstvolgende vrijdag, en op een vrijdag is dat
  vandaag. Bedoel je de week erna, dan zeg je dat: `volgende week vrijdag`.
  `aanstaande dinsdag` en `komende dinsdag` mogen ook.
- `volgende week` zonder dag erachter is aanstaande maandag.
- een datum: `1 okt`, `1 oktober`, `1 oktober 2027`, `donderdag 1 oktober`,
  `3-10`, `15/11`. Zonder jaartal wordt het de eerstvolgende keer dat die dag
  langskomt; in december is `3 januari` dus volgend jaar.
- `over drie dagen`, `over 2 weken`, `over een maand`
- `p1` tot en met `p4` voor de prioriteit.

Er wordt niet op afkortingen als `ma` of `zo` gezocht: dat zijn ook gewone
woorden, en een taak die stilletjes een woord uit zijn titel kwijtraakt is
erger dan een datum die je zelf even aanklikt. Om dezelfde reden blijft
`Morgenoverleg` heel en wordt `Top3` niet als prioriteit gelezen. Bestaat een
datum niet (`31 februari`), dan gebeurt er niets.

Dit werkt bij het **maken** van een taak. Bewerk je een taak die er al is, dan
blijft de titel letterlijk staan - een oud "Rapport 5 mei bespreken" hoort niet
bij het eerste het beste bewerken ineens "Rapport bespreken" te worden. De
datum en prioriteit staan bij het bewerken gewoon in de velden eronder.

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

## Als connector in Claude

`supabase/functions/mcp/` is een MCP-server: daarmee kan Claude - in een
gesprek, in Cowork of in Code - je taken opzoeken, aanmaken, bijwerken en
afvinken. Hij draait als Edge Function naast dezelfde database die de app
gebruikt, dus je ziet wat Claude doet meteen in de app terug.

De protocolkant staat apart in `protocol.ts`, zonder Supabase en zonder Deno
eromheen. Dat is bewust: zo is het stuk dat je verder alleen in de wolk ziet
draaien hier na te rekenen met een namaakdatabase.

**Eenmalig klaarzetten** (Supabase CLI nodig):

```bash
# 1. Een sleutel verzinnen die alleen jij kent
openssl rand -hex 32

# 2. Die sleutel en je gebruikers-id als secrets zetten. Het id vind je in
#    Supabase onder Authentication -> Users.
supabase secrets set MCP_TOKEN=<de sleutel> MCP_USER_ID=<je user id>

# 3. Uitrollen
supabase functions deploy mcp
```

**Toevoegen in Claude**: instellingen -> connectors -> eigen connector, met als
adres:

```
https://<project>.supabase.co/functions/v1/mcp?k=<de sleutel>
```

De sleutel mag ook als `Authorization: Bearer <sleutel>`; hij staat in het
adres omdat niet elke plek waar je een connector toevoegt een eigen header
laat instellen. Houd dat adres dus net zo geheim als een wachtwoord - wie het
heeft, kan bij je taken. Lekt het toch, dan draai je stap 1 t/m 3 opnieuw en is
het oude adres meteen waardeloos.

Twee dingen om te weten. De functie gebruikt de `service_role`-sleutel en gaat
daarmee langs row level security heen; elke vraag filtert daarom met de hand op
`MCP_USER_ID`. En datums gaan als `JJJJ-MM-DD` over de lijn: "volgende week
donderdag" rekent Claude zelf uit, zodat de taalkant op één plek blijft (in de
app, bij het invoerveld).

## Op een telefoon

Op een smal scherm is het menu geen uitschuiflade maar een pagina: `/menu`,
waar de geïnstalleerde app ook op opent. Vanaf daar tik je een onderdeel aan
en dat opent als eigen scherm, met linksboven de weg terug. Op een breed
scherm bestaat die pagina niet - daar staat het menu al als zijbalk naast
alles, en stuurt `/menu` je door naar Vandaag.

Op het bord blijft er op een telefoon bewust 2rem over naast de kolom, zodat
de volgende er net zichtbaar naast steekt. Anders moet je maar raden of er
nog iets is.

## Installeren als app

De site is een PWA: op Android geeft Chrome "toevoegen aan startscherm", op
iOS doe je dat via Deel -> Zet op beginscherm. Daarna opent de app zonder
adresbalk, met een eigen icoon en twee snelkoppelingen (nieuwe taak,
binnenkort) onder een lange druk op het icoon.

De service worker bewaart alleen de schil van de app - html, css, javascript
en iconen, en nooit taken. Zonder verbinding opent de app dus wel, maar zie je
geen taken; een afgevinkte taak die uit een cache terugkomt zonder dat iets
dat rechtzet is vervelender dan een eerlijke foutmelding.

De app zelf bewaart wel wat er de vorige keer op het scherm stond (in
`localStorage`, zie `lib/cache.ts`). Bij het openen staat dat er meteen weer,
terwijl alles op de achtergrond opnieuw wordt opgehaald en overschreven. Je
kijkt dus hooguit een seconde naar iets ouds in plaats van naar een leeg
scherm - en anders dan bij de service worker staat de correctie altijd achter
de deur, want zonder verbinding kom je hier niet eens. Mislukt het ophalen
toch, dan staat dat in de foutmelding erbij. Bij uitloggen wordt het gewist.

Verder haalt de app niet meer bij elke wijziging alles opnieuw op: een taak
toevoegen, afvinken, verzetten of verwijderen past de lijst hier aan met wat
de database terugstuurt. Opnieuw ophalen gebeurt bij het openen en wanneer je
na een halve minuut of langer terugkomt op het tabblad.

De iconen in `public/` komen uit `scripts/maak-iconen.mjs`, dat dezelfde vorm
tekent als `favicon.svg`. Kleur veranderd? Dan `node scripts/maak-iconen.mjs`
draaien.

## Eenmalig instellen

1. **Supabase-project** aanmaken (regio West EU).
2. **Schema** draaien: de bestanden in `supabase/migrations/` op volgorde in de
   SQL-editor plakken en uitvoeren. Bij een bestaand project alleen de nieuwe;
   `0002_archiveren.sql` voegt de kolom toe die het archiveren van lijsten
   mogelijk maakt. Zolang die migratie niet gedraaid is, werkt de rest van de
   app gewoon en zegt alleen het archiveren dat het nog niet kan.
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
