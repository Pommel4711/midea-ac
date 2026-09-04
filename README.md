# KB35 Midea ESPHome-Paket & Dashboard

Ein einzelnes, GitHub-fähiges Projekt für die Kältebringer
**KB35-12000BTU**: ein ESPHome-Remote-Package für den ESP und eine passende
Home-Assistant-Oberfläche. Es ist **keine HACS-Integration**.

Das ESPHome-Paket folgt bewusst der Pommel-Struktur: Die individuelle
Geräte-YAML bleibt klein und lädt `packages/kb35_core.yaml` plus die externe
Komponente aus deinem GitHub-Repository. Der ESP braucht dazu ESP-IDF und
spricht direkt Midea-UART mit 9600 8N1 und Controller-Protokoll `0x02`.

Die Dashboard-Karte bietet:

- Umschaltbares Rad für **Solltemperatur (16–30 °C)** und **Lüfter (0–100 %)**
- Lüfter-Preset **Auto** (KB35-Protokollwert 102)
- Innen- und Außentemperatur direkt oberhalb des Rads
- Einen nach oben gleitenden **Schnellauswahl-Bogen**, passend zur SmartKey-App
- Temperaturverlauf und Kommunikations-/Fehlerdiagnose

Pommel/TCL ist ausschließlich eine Strukturreferenz. Sein UART-Protokoll wird
nicht verwendet.

## Was wird gepusht?

**Das gesamte Verzeichnis `kb35-climate-dashboard` ist das eine Repository.**
Es enthält die ESPHome-Komponente, das Package, die Musterkonfiguration und
das Dashboard. Nach dem Anlegen eines leeren GitHub-Repositories:

```powershell
cd "C:\Users\Philipp\Documents\Arduino\Home Assistant\klimaanlagen\kb35-climate-dashboard"
git remote add origin https://github.com/DEIN-GITHUB-NAME/kb35-midea-esphome.git
git push -u origin main
```

Danach muss in [`KB35-Conditioner.yaml`](KB35-Conditioner.yaml) nur noch
`kb35_repository_url` auf genau diese GitHub-Adresse gesetzt werden.

## ESPHome einrichten

1. Kopiere [`KB35-Conditioner.yaml`](KB35-Conditioner.yaml) in deinen
   ESPHome-Konfigurationsordner.
2. Setze GitHub-URL, WLAN/API/OTA-Secrets und die beiden UART-GPIOs.
3. Wähle dein Board; die Vorlage ist ESP32-S3/ESP-IDF. Für C6 ersetze den
   Board-Wert durch `esp32-c6-devkitc-1` und behalte `type: esp-idf`.
4. Kompiliere und flashe in ESPHome. Das Paket erzeugt unter **einem Gerät**:
   Climate, Prozentlüfter, Boost, Sleep, Frostschutz, Piepton,
   Leistungsbegrenzung, Innen-/Außentemperatur, Fehlercode und Kommunikation.
5. `web_server: version: 3` ist im Paket bereits aktiv. Damit bietet der ESP
   zusätzlich eine funktionale Geräteoberfläche im Browser; die große
   Kreisoberfläche ist die Home-Assistant-Karte.

Remote-Packages und externe Komponenten sind die dafür vorgesehene
ESPHome-Mechanik. Die Konfiguration folgt der aktuellen
[ESPHome-Package-Dokumentation](https://esphome.io/components/packages/) und
[External-Components-Dokumentation](https://esphome.io/components/external_components/).

## Home-Assistant-Dashboard installieren

1. Kopiere `kb35-climate-dashboard-card.js` nach
   `/config/www/kb35-climate-dashboard-card.js`.
2. Kopiere `dashboard/kb35-klimaanlage.yaml` nach
   `/config/lovelace/kb35-klimaanlage.yaml`.
3. Übernimm den passenden Teil aus
   [`configuration-snippet.yaml`](configuration-snippet.yaml) in
   `/config/configuration.yaml`. Falls `lovelace:` bereits existiert, diesen
   Block nicht doppelt anlegen, sondern nur ergänzen.
4. Passe in `dashboard/kb35-klimaanlage.yaml` alle Beispiel-Entitäts-IDs an
   die IDs deines ESPHome-Geräts an.
5. Home Assistant neu starten; bei `resource_mode: yaml` danach die Ressourcen
   neu laden. Das Dashboard erscheint als **Klimaanlage** in der Seitenleiste.

Die YAML-Dashboard- und Ressourcen-Konfiguration entspricht der aktuellen
[Home-Assistant-Dokumentation](https://www.home-assistant.io/dashboards/dashboards/).

## Bedienung

Die beiden Tabs oberhalb des Rads schalten den Bedienfokus um:

- **Temperatur:** Rad ziehen oder `−`/`+` drücken. Gesendet wird
  `climate.set_temperature` in ganzen Gradschritten.
- **Lüfter:** Rad ziehen oder `−`/`+` drücken. Gesendet wird
  `fan.set_percentage`; mit **Auto** wird das konfigurierbare Preset `Auto`
  gewählt.

Unter dem Rad öffnet **Schnellauswahl** ein von unten hochfahrendes Bedienblatt,
wie in der originalen SmartKey-App. Es enthält Lüfter, beide Swing-Achsen,
Gear, Boost, Sleep, Frostschutz und die weiteren Funktionsplätze. Nicht durch
KB35-Mitschnitte gedeckte Punkte bleiben sichtbar, aber bewusst deaktiviert.
Das Bedienblatt enthält auch die Auswahlfelder für Betriebsart, Swing,
Leistungsbegrenzung und den optionalen Piepton. Frostschutz lässt sich nur im
Heizmodus aktivieren.

## Entitäten

Alle Zuordnungen stehen zentral am Anfang von
[`dashboard/kb35-klimaanlage.yaml`](dashboard/kb35-klimaanlage.yaml). Damit
bleibt die Karte auch dann unverändert, wenn ESPHome nach der Installation
abweichende Entity IDs erzeugt. Der vollständige Vertrag ist in
[docs/ENTITY-CONTRACT.md](docs/ENTITY-CONTRACT.md) dokumentiert.

## Funktionsstand

| Fertig implementiert | Bewusst noch deaktiviert |
| --- | --- |
| Ein/Aus, Auto, Kühlen, Entfeuchten, Heizen, Nur Lüfter | LED-Display-Toggle |
| Solltemperatur 16–30 °C, Innen- und Außentemperatur | Schnellstart |
| Lüfter 0–100 % und `Auto` (102) | Feste Luftrichtungen |
| Vertikal-/Horizontal-Swing, Boost, Sleep, Frostschutz | Schlafkurve mit Dauer |
| Gear: Normal / 75 % / 50 %, Piepton | Nativer Zeitplan |

Die rechte Spalte bleibt in der Schnellauswahl sichtbar, ist aber absichtlich
nicht anklickbar. Welche KB35-Daten dafür noch fehlen, steht in
[docs/OPEN_PROTOCOL_QUESTIONS.md](docs/OPEN_PROTOCOL_QUESTIONS.md).

## Änderungen aus Referenzen erst analysieren

Der Auftrag soll bewusst nicht unbemerkt Fremdcode übernehmen. Verwende vor
einem Update:

```powershell
./scripts/analyze-upstream.ps1 -Fetch
```

Der Befehl aktualisiert ausschließlich den lokalen Klon unter
`../references/pommel-tclac` und schreibt einen Vergleich nach
`reports/upstream-analysis.md`. Er merged oder kopiert nichts in dieses
Projekt. Danach kann die Änderung anhand des Berichts bewertet und bei Bedarf
gezielt übernommen werden. Bereits übernommene Änderungen gehören in
[CHANGELOG.md](CHANGELOG.md).

## Prüfung

`tests/test_protocol_vectors.py` prüft die übergebenen Frame- und Bitvektoren.
GitHub Actions validiert und kompiliert die echte ESPHome-Komponente für
ESP32-S3 und ESP32-C6 jeweils mit ESP-IDF. Die lokale Vollkompilierung ist auf
diesem Rechner nicht möglich, weil nur Python 3.10 installiert ist, ESPHome
2026.8.2 aber Python 3.12 verlangt.
