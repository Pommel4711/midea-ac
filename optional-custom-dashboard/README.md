# Optionales Custom-Dashboard

Dieser Ordner ist absichtlich **nicht** Teil der Standardinstallation. Der
ESPHome-Kern funktioniert vollständig ohne ihn: Home Assistant erkennt die
native Klima- und Lüfterentität automatisch.

Installiere diesen Ordner erst, wenn dir die Standard-Thermostatkarte und der
native Fan-Regler nicht mehr ausreichen. Es bleibt auch dann ohne HACS; die
Dateien werden nur manuell als Lovelace-Ressource eingebunden. Das ist eine
Custom-Card, keine Home-Assistant-Integration und ändert den ESPHome-Treiber
nicht.

## Später aktivieren

1. `kb35-climate-dashboard-card.js` nach
   `/config/www/kb35-climate-dashboard-card.js` kopieren.
2. `kb35-klimaanlage.yaml` nach
   `/config/lovelace/kb35-klimaanlage.yaml` kopieren.
3. Den passenden Teil aus `configuration-snippet.yaml` in
   `/config/configuration.yaml` ergänzen.
4. In `kb35-klimaanlage.yaml` die Beispiel-Entity-IDs durch die IDs deines
   automatisch erkannten ESPHome-Geräts ersetzen.
5. Home Assistant neu starten und die Lovelace-Ressourcen neu laden.

Die Karte bietet das Temperatur-/Lüfterrad, den von unten aufgleitenden
Schnellauswahl-Bereich, Innen-/Außentemperatur, Boost, Sleep, Frostschutz,
Swing und Leistungsbegrenzung. Nicht per KB35-Rohmitschnitt belegte Funktionen
bleiben sichtbar, aber gesperrt.
