# KB35 Midea ESPHome-Paket

Ein GitHub-fähiges, reines ESPHome-Projekt für die Kältebringer
**KB35-12000BTU**. Es erzeugt über die offizielle ESPHome-API automatisch
native Home-Assistant-Entitäten — **keine HACS-Integration, keine eigene Karte,
keine Lovelace-Ressource und kein YAML-Dashboard**.

Die Struktur lehnt sich an Pommel/TCL an: Eine kleine persönliche ESPHome-YAML
lädt `packages/kb35_core.yaml` und die externe KB35-Komponente direkt aus
diesem Repository. Das Gerät nutzt ESP-IDF sowie Midea-UART mit 9600 8N1 und
Controller-Protokoll `0x02`.

## Was erscheint automatisch in Home Assistant?

Sobald der ESP über die normale ESPHome-Integration online ist, erkennt Home
Assistant die Entitäten auf dem Gerät selbstständig:

| Native Entität | Bedienung in Home Assistant | KB35-Funktion |
| --- | --- | --- |
| **Klimaanlage** (`climate`) | Standard-Thermostatkarte / Mehr-Info | Ein/Aus, 16–30 °C, Auto, Kühlen, Entfeuchten, Heizen, Nur Lüfter, Swing sowie Auto/Niedrig/Mittel/Hoch für den Lüfter |
| **Lüfter** (`fan`) | Standard-Fan-Dialog / Mehr-Info | Exakte 0–100 %, Aus und Preset **Auto** (Midea-Wert `102`) |
| **Boost, Sleep, Frostschutz, Piepton** | Normale Schalter | Verifizierte KB35-Bits; Frostschutz nur im Heizmodus |
| **Leistungsbegrenzung** | Normale Auswahl | Normal, 75 %, 50 % |
| **Innen-, Außentemperatur, Kommunikation, Fehlercode** | Normale Sensoren | Status und Diagnose |

Die normale Klimaentität kennt technisch nur feste Lüftermodi, keine
stufenlose Prozent-Skala. Deshalb wird der exakte 0–100-%-Regler bewusst als
zusätzliche, automatisch angelegte Standard-`fan`-Entität bereitgestellt.
Damit bleibt alles nativ; es ist keinerlei Frontend-Installation erforderlich.

## Drei Steuerprofile

In `KB35-Conditioner.yaml` ist zunächst `kb35_profile: native` eingetragen.
Damit erscheinen nur die Standardklima- und Messentitäten. Vor dem Flashen
kannst du auf `native_plus` wechseln, um die verifizierten Zusatzfunktionen als
normale Home-Assistant-Entitäten freizugeben. `custom_dashboard` stellt den
gleichen vollständigen Satz für die spätere Kreis-Karte bereit. Die Details
stehen in [docs/PROFILES.md](docs/PROFILES.md).

## ESP-Weboberfläche

Jedes Profil enthält eine lokale ESPHome-Weboberfläche (Version 3)
mit Gruppen für Klima, Zusatzfunktionen und Diagnose. Sie läuft ohne Home
Assistant unter `http://<device-name>.local/` oder der Geräte-IP. Die
Weboberfläche hat auf Wunsch keine Anmeldung; den Webserver deshalb niemals
aus dem Heimnetz ins Internet weiterleiten.

## Optional: schöne Kreisoberfläche später

Wenn du später statt der Standard-Thermostatkarte wieder die Kreisoberfläche
mit Lüfterrad und hochfahrender Schnellauswahl möchtest, liegt sie vollständig
getrennt in [optional-custom-dashboard](optional-custom-dashboard/). Sie wird
nicht automatisch installiert und ist keine HACS-Integration. Du kannst daher
zunächst ausschließlich mit den nativen Entitäten starten und diese Erweiterung
später ohne Änderung am ESP nachrüsten.

## Inbetriebnahme

1. Erstelle dieses Verzeichnis als privates GitHub-Repository
   `Pommel4711/midea-ac` und pushe es.
2. Kopiere [KB35-Conditioner.yaml](KB35-Conditioner.yaml) in deinen
   ESPHome-Konfigurationsordner und nutze
   [secrets.example.yaml](secrets.example.yaml) als Vorlage.
3. Trage dort GitHub-URL, WLAN-/API-/OTA-/Web-Secrets und UART-Pins ein. Die
   Vorlage ist ESP32-S3/ESP-IDF; für C6 setze `board: esp32-c6-devkitc-1` und
   behalte ESP-IDF bei.
4. Kompiliere und flashe im ESPHome-Dashboard.
5. Öffne in Home Assistant das automatisch angelegte ESPHome-Gerät. Die
   Klima- und Lüfterentität können direkt in jedem Standard-Dashboard genutzt
   werden; die normale Thermostatkarte lässt sich dort über die Oberfläche
   hinzufügen.

Da das Repository privat ist, braucht der ESPHome-Host beim Kompilieren einen
GitHub-Fine-grained-Token mit Zugriff nur auf dieses Repository und der
Berechtigung **Contents: Read**. Trage ausschließlich diesen Token als
`github_read_token` in die nicht eingecheckte `secrets.yaml` ein; die
Repository-Adresse ist bereits fest in der Vorlage hinterlegt.

Die Funktionen basieren auf den offiziellen
[ESPHome-Package](https://esphome.io/components/packages/)- und
[External-Components](https://esphome.io/components/external_components/)-
Mechaniken. ESPHome stellt Klimaentitäten nativ über die API bereit; Home
Assistant dokumentiert die Standardbedienung in der
[Climate-Integration](https://www.home-assistant.io/integrations/climate/) und
der [Thermostatkarte](https://www.home-assistant.io/dashboards/thermostat/).

## Nicht geraten: noch fehlende KB35-Mitschnitte

LED-Display, Schnellstart, feste Luftrichtungen, Schlafkurven-Dauer und der
geräteinterne Zeitplan sind absichtlich nicht als Ratebefehl implementiert.
Die exakten benötigten Rohmitschnitte stehen in
[docs/OPEN_PROTOCOL_QUESTIONS.md](docs/OPEN_PROTOCOL_QUESTIONS.md).
Der vollständige Abgleich von implementierten und noch offenen KB35-Bits steht
in [docs/PROTOCOL_AUDIT.md](docs/PROTOCOL_AUDIT.md).

## Referenz-Updates nur analysieren

Vor Änderungen aus Pommel/TCL:

```powershell
./scripts/analyze-upstream.ps1 -Fetch
```

Der Befehl aktualisiert nur den lokalen Referenzklon und schreibt einen Bericht
nach `reports/upstream-analysis.md`. Er übernimmt nichts automatisch.

## Prüfung

`tests/test_protocol_vectors.py` testet die übergebenen Frame- und Bitvektoren.
GitHub Actions validiert und kompiliert die ESPHome-Komponente für ESP32-S3 und
ESP32-C6 jeweils mit ESP-IDF.
