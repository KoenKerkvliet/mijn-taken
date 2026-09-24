"""Maakt alle iconen in public/ uit scripts/logo.png.

Het logo is doorzichtig. Een app-icoon mag dat niet zijn - iOS maakt van
doorzichtig zwart, Android een grijs vlak - dus die krijgen een zachte lila
achtergrond. De favicon blijft wel doorzichtig: in een tabblad hoort geen
blok om het logo heen.

    python scripts/maak-iconen.py

Heeft Pillow nodig (pip install pillow).
"""

from pathlib import Path

from PIL import Image

HIER = Path(__file__).parent
PUBLIC = HIER.parent / "public"

# Licht genoeg om het witte blad te laten staan, paars genoeg om bij de rest
# van de app te horen.
ACHTERGROND = (237, 233, 254, 255)

logo = Image.open(HIER / "logo.png").convert("RGBA")


def op_vlak(schaal_logo: float, maat: int) -> Image.Image:
    """Het logo op de achtergrond, `schaal_logo` van de breedte groot."""
    groot = 1024
    vlak = Image.new("RGBA", (groot, groot), ACHTERGROND)
    zijde = round(groot * schaal_logo)
    klein = logo.resize((zijde, zijde), Image.LANCZOS)
    vlak.alpha_composite(klein, ((groot - zijde) // 2, (groot - zijde) // 2))
    return vlak.resize((maat, maat), Image.LANCZOS).convert("RGB")


# Gewone iconen. iOS rondt de hoeken zelf af, Android ook als het wil.
op_vlak(0.78, 512).save(PUBLIC / "icoon-512.png", optimize=True)
op_vlak(0.78, 192).save(PUBLIC / "icoon-192.png", optimize=True)
op_vlak(0.78, 180).save(PUBLIC / "apple-touch-icon.png", optimize=True)

# Maskable: Android knipt er een cirkel, druppel of squircle uit. Alles wat
# ertoe doet moet binnen de cirkel van 40% van de breedte vallen. Het logo is
# vrijwel vierkant, dus zijn halve diagonaal moet daarbinnen passen.
op_vlak(0.8 / 2**0.5 * 0.98, 512).save(PUBLIC / "icoon-maskable-512.png", optimize=True)

# Favicon: doorzichtig en zo groot mogelijk, want in een tabblad is 32 pixels
# alles wat er is.
for maat in (32, 64):
    logo.resize((maat, maat), Image.LANCZOS).save(PUBLIC / f"favicon-{maat}.png", optimize=True)

print("iconen bijgewerkt in", PUBLIC)
