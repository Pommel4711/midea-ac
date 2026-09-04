# KB35 Climate Dashboard

Eine aufgeräumte, deutschsprachige Home-Assistant-Oberfläche für die
Kältebringer **KB35-12000BTU** mit Midea-UART-Anbindung. Sie zeigt eine große,
direkte Bedienung statt einer langen Standard-Entitätenliste:

- Umschaltbares Rad für **Solltemperatur (17–30 °C)** und **Lüfter (1–100 %)**
- Lüfter-Preset **Auto** (KB35-Protokollwert 102)
- Moduswahl, Swing und Leistungsbegrenzung als aufklappbare Auswahlfelder
- Schnelltasten für Display, Boost, Sleep und Frostschutz
- Temperaturverlauf und Kommunikations-/Fehlerdiagnose

Das Projekt ist absichtlich unabhängig von der ESPHome-Komponente. Es wird
fertig nutzbar, sobald der KB35-Midea-Treiber die in
[docs/ENTITY-CONTRACT.md](docs/ENTITY-CONTRACT.md) beschriebenen Entitäten
bereitstellt. Der mitgelieferte Pommel/TCL-Klon ist nur eine
Strukturreferenz – sein UART-Protokoll wird nicht verwendet.

## Installation

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

Unter dem Rad stehen die vier häufigen Sonderfunktionen. „Mehr Einstellungen“
enthält Dropdowns für Betriebsart, Swing und Leistungsbegrenzung sowie den
optionalen Piepton. Frostschutz lässt sich nur im Heizmodus aktivieren.

## Entitäten

Alle Zuordnungen stehen zentral am Anfang von
[`dashboard/kb35-klimaanlage.yaml`](dashboard/kb35-klimaanlage.yaml). Damit
bleibt die Karte auch dann unverändert, wenn ESPHome nach der Installation
abweichende Entity IDs erzeugt. Der vollständige Vertrag ist in
[docs/ENTITY-CONTRACT.md](docs/ENTITY-CONTRACT.md) dokumentiert.

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

## GitHub

Das Verzeichnis `kb35-climate-dashboard` ist ein eigenes Git-Repository. Nach
dem Anlegen eines leeren GitHub-Repositories kannst du es beispielsweise so
verbinden:

```powershell
git remote add origin https://github.com/DEIN-NAME/kb35-climate-dashboard.git
git push -u origin main
```

## Status

Die Benutzeroberfläche und der Integrationsvertrag sind fertig. Die Midea
UART-/ESPHome-Komponente ist ein separates Vorhaben und muss die echten
KB35-Mitschnitte (9600 8N1, `0x02`, `0x40`/`0x41`/`C0`, A0-Echo) umsetzen und
am Gerät bestätigen, bevor diese Karte die Anlage tatsächlich steuern kann.
