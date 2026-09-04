# Native Entitäten: KB35 Midea → Home Assistant

Das Paket meldet ausschließlich Standard-ESPHome-Entitäten an Home Assistant.
Es gibt keine benutzerdefinierte Lovelace-Karte und keine HACS-Abhängigkeit.

| Entität | Native Bedienung | Werte |
| --- | --- | --- |
| `climate` | Thermostatkarte oder Mehr-Info | 16–30 °C, off/auto/cool/dry/heat/fan-only, Swing, Auto/Niedrig/Mittel/Hoch |
| `fan` | Fan-Mehr-Info | 0–100 %, Aus, Preset `Auto` (= Midea 102) |
| `switch` | Standard-Schalter | Boost, Sleep, Frostschutz, Piepton |
| `select` | Standard-Auswahl | Leistungsbegrenzung: Normal/75 %/50 % |
| `sensor` / `binary_sensor` | Gerätesensoren | Innen-/Außentemperatur, Fehlercode, Kommunikation |

Die Klimaentität fasst prozentuale Lüfterwerte auf die nativen Modi Niedrig
(1–33 %), Mittel (34–66 %) und Hoch (67–100 %) zusammen. Das ist nur eine
Anzeige-/Auswahlhilfe. Für einen beliebigen exakten Wert ist immer die native
`fan`-Entität maßgeblich.

Die Solltemperatur (16–30 °C) ist ein Attribut der Klimaentität. Innen- und
Außentemperatur sind separat gemeldete Messwerte und nicht die Solltemperatur.
Der vollständige profilabhängige Entitätssatz ist in `PROFILES.md` beschrieben.
