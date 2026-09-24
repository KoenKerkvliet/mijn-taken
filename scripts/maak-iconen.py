"""Snijdt alle iconen in public/ uit scripts/logo.webp.

Eén bronafbeelding, alle formaten eruit: het app-icoon voor Android en iOS,
de 'maskable' variant die Android in zijn eigen vorm knipt, en de favicon.

    python scripts/maak-iconen.py

Heeft Pillow nodig (pip install pillow).
"""

from pathlib import Path

from PIL import Image, ImageDraw

HIER = Path(__file__).parent
PUBLIC = HIER.parent / "public"

bron = Image.open(HIER / "logo.webp").convert("RGB")
breedte, hoogte = bron.size
achtergrond = bron.getpixel((5, 5))


def inhoud(beeld: Image.Image) -> list[tuple[int, int]]:
    """Punten die niet de effen achtergrond zijn, om 't logo zelf te vinden."""
    px = beeld.load()
    punten = []
    for y in range(0, beeld.height, 2):
        for x in range(0, beeld.width, 2):
            kleur = px[x, y]
            if sum(abs(a - b) for a, b in zip(kleur, achtergrond)) > 40:
                punten.append((x, y))
    return punten


def schaal(beeld: Image.Image, maat: int) -> Image.Image:
    return beeld.resize((maat, maat), Image.LANCZOS)


# Gewone iconen: de afbeelding zoals hij is. iOS rondt de hoeken zelf af.
schaal(bron, 512).save(PUBLIC / "icoon-512.png", optimize=True)
schaal(bron, 192).save(PUBLIC / "icoon-192.png", optimize=True)
schaal(bron, 180).save(PUBLIC / "apple-touch-icon.png", optimize=True)

# Maskable: Android knipt er een cirkel, druppel of squircle uit. Alles wat
# ertoe doet moet binnen de cirkel van 40% van de breedte vallen; het logo
# krimpt daarom net genoeg en de rand wordt aangevuld met de achtergrond.
punten = inhoud(bron)
midden = breedte / 2
verste = max(((x - midden) ** 2 + (y - midden) ** 2) ** 0.5 for x, y in punten)
factor = min(1.0, 0.4 * breedte * 0.95 / verste)
klein = bron.resize((round(breedte * factor), round(hoogte * factor)), Image.LANCZOS)
maskable = Image.new("RGB", bron.size, achtergrond)
maskable.paste(klein, ((breedte - klein.width) // 2, (hoogte - klein.height) // 2))
schaal(maskable, 512).save(PUBLIC / "icoon-maskable-512.png", optimize=True)

# Favicon: in een tabblad is 32 pixels alles wat er is. Strak rond het logo
# uitgesneden, anders is het een paars vlakje met een stipje, en met ronde
# hoeken zodat het niet als een kaal blok naast de andere tabbladen staat.
xs = [x for x, _ in punten]
ys = [y for _, y in punten]
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
zijde = max(max(xs) - min(xs), max(ys) - min(ys)) * 1.12
uitsnede = bron.crop(
    (round(cx - zijde / 2), round(cy - zijde / 2), round(cx + zijde / 2), round(cy + zijde / 2))
)
for maat in (32, 64):
    groot = uitsnede.resize((maat * 4, maat * 4), Image.LANCZOS).convert("RGBA")
    masker = Image.new("L", groot.size, 0)
    ImageDraw.Draw(masker).rounded_rectangle(
        (0, 0, groot.width - 1, groot.height - 1), radius=round(groot.width * 0.22), fill=255
    )
    groot.putalpha(masker)
    groot.resize((maat, maat), Image.LANCZOS).save(PUBLIC / f"favicon-{maat}.png", optimize=True)

print("iconen bijgewerkt in", PUBLIC)
