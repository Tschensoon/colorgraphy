"""Bereitet die Fotos im Ordner fotos/ für die Website auf.

Für jedes neue oder geänderte JPG:
- liest Brennweite, Blende, Belichtungszeit und ISO aus den EXIF-Daten,
- dreht das Bild richtig herum und verkleinert es auf max. 2000 px (lange Kante),
- speichert es ohne jegliche Metadaten (kein Name, kein GPS, keine Seriennummer) zurück nach fotos/,
- legt eine kleine Vorschau in vorschau/ an.
Gelöschte Fotos verschwinden samt Vorschau aus gallery.json.
Am Ende steht alles in gallery.json, neueste Fotos zuerst.
"""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
FOTOS = ROOT / "fotos"
VORSCHAU = ROOT / "vorschau"
GALERIE = ROOT / "gallery.json"
GROSS = 2000
KLEIN = 800

# Kleine Wörter, die im Titel kleingeschrieben bleiben
KLEINWOERTER = {"am", "an", "auf", "aus", "bei", "beim", "der", "die", "das", "den", "dem", "des",
                "ein", "eine", "einem", "einer", "für", "gegen", "hinter", "im", "in", "ins", "mit",
                "nach", "neben", "ohne", "über", "um", "und", "oder", "unter", "vom", "von", "vor",
                "zu", "zum", "zur", "zwischen", "bis", "durch"}


def titel(dateiname):
    stamm = Path(dateiname).stem
    woerter = [w for w in re.split(r"[-_\s]+", stamm) if w]
    if any(c.isupper() for c in stamm):
        return " ".join(woerter)
    return " ".join(w if i and w in KLEINWOERTER else w[:1].upper() + w[1:] for i, w in enumerate(woerter))


def zahl(wert):
    try:
        return wert[0] / wert[1] if isinstance(wert, tuple) else float(wert)
    except (ValueError, ZeroDivisionError, TypeError):
        return None


def exif_werte(img):
    exif = img.getexif()
    sub = exif.get_ifd(0x8769)
    werte = {}
    mm = zahl(sub.get(0x920A))
    if mm:
        werte["mm"] = f"{mm:.0f} mm"
    blende = zahl(sub.get(0x829D))
    if blende:
        werte["blende"] = f"f/{blende:.1f}".replace(".0", "")
    zeit = zahl(sub.get(0x829A))
    if zeit:
        werte["zeit"] = f"1/{round(1 / zeit)} s" if zeit < 1 else f"{zeit:g} s"
    iso = sub.get(0x8827)
    if isinstance(iso, tuple):
        iso = iso[0] if iso else None
    if iso:
        werte["iso"] = f"ISO {int(iso)}"
    return werte


def ohne_metadaten(img):
    """Baut das Bild aus reinen Pixeln neu auf. Nur das Farbprofil bleibt erhalten."""
    icc = img.info.get("icc_profile")
    sauber = Image.frombytes("RGB", img.size, img.convert("RGB").tobytes())
    return sauber, ({"icc_profile": icc} if icc else {})


def speichern(img, ziel, kante, extra):
    kopie = img.copy()
    kopie.thumbnail((kante, kante), Image.LANCZOS)
    kopie.save(ziel, "JPEG", quality=85, optimize=True, progressive=True, **extra)
    return kopie.size


def pruefsumme(pfad):
    return hashlib.sha256(pfad.read_bytes()).hexdigest()


def main():
    FOTOS.mkdir(exist_ok=True)
    VORSCHAU.mkdir(exist_ok=True)
    alt = {}
    if GALERIE.exists():
        alt = {e["datei"]: e for e in json.loads(GALERIE.read_text(encoding="utf-8"))}

    jetzt = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    eintraege = []
    for pfad in sorted(FOTOS.iterdir()):
        if not pfad.is_file() or pfad.suffix.lower() not in (".jpg", ".jpeg"):
            continue
        name = pfad.name
        bisher = alt.get(name)
        if bisher and bisher.get("sha") == pruefsumme(pfad) and (VORSCHAU / name).exists():
            eintraege.append(bisher)
            continue

        with Image.open(pfad) as roh:
            werte = exif_werte(roh)
            gedreht = ImageOps.exif_transpose(roh)
            sauber, extra = ohne_metadaten(gedreht)
        breite, hoehe = speichern(sauber, pfad, GROSS, extra)
        speichern(sauber, VORSCHAU / name, KLEIN, extra)
        if bisher and not werte:
            werte = bisher.get("exif", {})
        eintrag = {
            "datei": name,
            "titel": titel(name),
            "exif": werte,
            "breite": breite,
            "hoehe": hoehe,
            "hinzugefuegt": bisher["hinzugefuegt"] if bisher else jetzt,
            "sha": pruefsumme(pfad),
        }
        eintraege.append(eintrag)
        print(f"verarbeitet: {name} ({breite}×{hoehe}) {werte}")

    behalten = {e["datei"] for e in eintraege}
    for vorschau in VORSCHAU.iterdir():
        if vorschau.suffix.lower() in (".jpg", ".jpeg") and vorschau.name not in behalten:
            vorschau.unlink()
            print(f"entfernt: {vorschau.name}")

    eintraege.sort(key=lambda e: (e["hinzugefuegt"], e["datei"]), reverse=True)
    GALERIE.write_text(json.dumps(eintraege, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
