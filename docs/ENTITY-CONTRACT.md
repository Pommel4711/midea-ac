# Entitätsvertrag: KB35 Midea → Dashboard

Dieses Dashboard enthält **keine UART- oder Protokoll-Logik**. Es steuert nur
Home-Assistant-Entitäten. Dadurch kann die Oberfläche bereits fertig sein,
während der separate ESPHome-Treiber für die Kältebringer KB35 entwickelt und
am Gerät verifiziert wird.

Die in `dashboard/kb35-klimaanlage.yaml` hinterlegten Entitäts-IDs sind
bewusst Beispielwerte. Vor der Installation müssen sie an die vom ESPHome-Gerät
tatsächlich angelegten IDs angepasst werden.

| Bedienung | Erwartete Entität / Aktion | KB35-Semantik |
| --- | --- | --- |
| Temperatur-Rad | `climate.set_temperature` | 17–30 °C, ganzzahlig |
| Betriebsart | `climate.set_hvac_mode` | `off`, `auto`, `cool`, `dry`, `heat`, `fan_only` |
| Lüfter-Rad | `fan.set_percentage` | Exakt 1–100 % |
| Lüfter-Auto | `fan.set_preset_mode` | Preset `Auto`, Midea-Wert 102 |
| Swing-Dropdown | `climate.set_swing_mode` | `off`, `vertical`, `horizontal`, `both` |
| Display, Boost, Sleep, Frostschutz | `switch.toggle` | Frostschutz nur im Heizmodus einschalten |
| Leistungsbegrenzung | `select.select_option` | `Normal`, `75 %`, `50 %` |

## Wichtige Grenzen

- Der Kartencode begrenzt Temperatur und Lüfter auf die genannten Werte.
- Das Einschalten von Frostschutz wird in der Oberfläche außerhalb von `heat`
  abgewiesen. Der ESPHome-Treiber muss dieselbe Prüfung ebenfalls erzwingen;
  die UI ist keine Sicherheitsgrenze.
- Das Display wird nur angezeigt, wenn der spätere Treiber den statusbasierten,
  bestätigten Toggle implementiert. Unbestätigte „Ratebefehle“ gehören nicht in
  dieses Dashboard.
- Ein nicht verfügbarer Switch oder Sensor wird unauffällig als `–` dargestellt,
  damit die Karte auch während der schrittweisen Inbetriebnahme nutzbar bleibt.

Die verwendeten Backend-Anforderungen stammen aus den mitgelieferten KB35-
Mitschnitten: Midea UART mit 9600 8N1, Controller-Protokollversion `0x02`,
Prozentlüfter (Auto = `102`) sowie dem gear/rate-select `50/75/100`.
