# Entitätsvertrag: KB35 Midea → Dashboard

Das Dashboard steuert nur Home-Assistant-Entitäten. Die Entitäten werden vom
im selben Repository enthaltenen ESPHome-Treiber erzeugt; UART-Frames bleiben
vom Frontend getrennt und werden ausschließlich im ESP verarbeitet.

Die in `dashboard/kb35-klimaanlage.yaml` hinterlegten Entitäts-IDs sind
bewusst Beispielwerte. Vor der Installation müssen sie an die vom ESPHome-Gerät
tatsächlich angelegten IDs angepasst werden.

| Bedienung | Erwartete Entität / Aktion | KB35-Semantik |
| --- | --- | --- |
| Temperatur-Rad | `climate.set_temperature` | KB35: 16–30 °C, ganzzahlig |
| Betriebsart | `climate.set_hvac_mode` | `off`, `auto`, `cool`, `dry`, `heat`, `fan_only` |
| Lüfter-Rad | `fan.set_percentage` | Exakt 0–100 %; 0 % ist Aus, 102 ist das separate Preset `Auto` |
| Lüfter-Auto | `fan.set_preset_mode` | Preset `Auto`, Midea-Wert 102 |
| Swing-Dropdown | `climate.set_swing_mode` | `off`, `vertical`, `horizontal`, `both` |
| Boost, Sleep, Frostschutz | `switch.toggle` | Frostschutz nur im Heizmodus einschalten |
| Innen-/Außentemperatur | Climate-Attribut / `sensor` | Werte von Innen- bzw. Außengerät |
| Leistungsbegrenzung | `select.select_option` | `Normal`, `75 %`, `50 %` |

## Wichtige Grenzen

- Der Kartencode begrenzt Temperatur und Lüfter auf die genannten Werte.
- Das Einschalten von Frostschutz wird in der Oberfläche außerhalb von `heat`
  abgewiesen. Der ESPHome-Treiber muss dieselbe Prüfung ebenfalls erzwingen;
  die UI ist keine Sicherheitsgrenze.
- LED, Schnellstart, feste Luftrichtung, Schlafkurve und Zeitplan bleiben bis
  zum passenden KB35-Mitschnitt sichtbar, aber deaktiviert. Unbestätigte
  Ratebefehle gehören nicht in dieses Dashboard.
- Ein nicht verfügbarer Switch oder Sensor wird unauffällig als `–` dargestellt,
  damit die Karte auch während der schrittweisen Inbetriebnahme nutzbar bleibt.

Die verwendeten Backend-Anforderungen stammen aus den mitgelieferten KB35-
Mitschnitten: Midea UART mit 9600 8N1, Controller-Protokollversion `0x02`,
Prozentlüfter (Auto = `102`) sowie dem gear/rate-select `50/75/100`.
