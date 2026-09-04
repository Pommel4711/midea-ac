# Changelog

Dieses Protokoll beschreibt ausschließlich Änderungen, die bereits bewusst in
dieses Dashboard übernommen wurden. Ein Referenz-Update wird erst nach einer
Analyse und einer ausdrücklichen Entscheidung eingetragen.

## [Unreleased]

### Hinzugefügt

- Ein ESPHome-Remote-Package mit externer, ESP-IDF-fähiger KB35-Midea-Komponente.
- Native Klima-Lüftermodi Auto/Niedrig/Mittel/Hoch zusätzlich zum exakten
  nativen Prozentlüfter.
- Innen- und Außentemperatur, Diagnose, Boost, Sleep, Frostschutz und Gear als
  automatisch erkannte ESPHome-Entitäten.
- CI für ESP32-S3/C6 mit ESP-IDF sowie getestete Protokollvektoren.
- Reiner Analyse-Workflow für das Pommel/TCL-Referenzrepository.

### Geändert

- Bedienung auf die Standard-Home-Assistant-Entitäten umgestellt: keine
  benutzerdefinierte Lovelace-Karte, keine Ressourceninstallation und kein
  Dashboard-YAML mehr erforderlich.
- Die frühere Kreisoberfläche als vollständig getrennte, manuell aktivierbare
  Option unter `optional-custom-dashboard/` bereitgestellt.
