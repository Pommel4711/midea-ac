# Verdrahtung und Rahmen erfassen

## Vor dem ersten Steuerungsversuch

Der Original-SmartKey und der ESP dürfen nie gleichzeitig auf dieselbe
Empfangsleitung der Klimaanlage senden. Für das Aufzeichnen bleibt der
Original-SmartKey angeschlossen und der Sniffer liest beide Datenleitungen nur
parallel mit. Für den späteren Betrieb wird der Original-SmartKey abgezogen und
der ESP übernimmt beide Leitungen.

Die Vorlage [kb35-uart-sniffer.yaml](../examples/kb35-uart-sniffer.yaml) ist
ein reiner Empfänger auf GPIO17 (Leitung A) und GPIO18 (Leitung B). Auf der
Weboberfläche zeigt sie fortlaufend die letzten Rahmen und führt durch eine
feste Capture-Reihenfolge. Vor der jeweiligen Aktion in der Original-App einmal
**Aktuelle Aktion markieren** drücken. Danach erscheint die nächste Aktion;
kein Dropdown und kein zusätzlicher Marker-Button sind nötig.

## RX/TX eindeutig zuordnen

Die Zuordnung erfolgt über die Rahmen, nicht über die Bezeichnung A oder B:

| Im Sniffer sichtbar | Bedeutung | Anschluss im Steuerprofil |
| --- | --- | --- |
| `AA 21 AC … 02 03 41 …` | Original-SmartKey → Innengerät | diese Leitung an ESP **TX** |
| `AA 28 AC … 02 03 C0 …` | Innengerät → Original-SmartKey | diese Leitung an ESP **RX** |

Die Vorlage verwendet zunächst `uart_rx: GPIO18` und `uart_tx: GPIO17`. Das ist
nur richtig, wenn der C0-Status auf Leitung B/GPIO18 und die 41-Anfrage auf
Leitung A/GPIO17 erscheint. Falls die Sniffer-Ausgabe das Gegenteil zeigt,
müssen die beiden Pins in der Geräte-YAML getauscht werden.

ESP-GND und GND des Klimaanlagenanschlusses müssen verbunden sein. Beim
Steuerprofil wird die ESP-TX-Leitung ausschließlich mit dem RX des
Innengeräts verbunden; die ESP-RX-Leitung ausschließlich mit dessen TX.

## Pegel prüfen

Der ESP32-S3 arbeitet mit 3,3 V. Miss vor dem Verbinden die Ruhespannung jeder
Datenleitung gegen GND. Liegt sie über 3,6 V, darf sie nicht direkt an einen
ESP-GPIO: Für den Weg Klimaanlage-TX → ESP-RX ist dann ein 5-V-zu-3,3-V-
Pegelwandler oder Spannungsteiler nötig. Für den Weg ESP-TX → Klimaanlage-RX
reicht 3,3 V nur, wenn der Empfänger dies als HIGH akzeptiert; falls keine
Antwort kommt, ist ein 3,3-V-zu-5-V-Puffer wie ein 74HCT125 die verlässliche
Variante. Ein üblicher bidirektionaler I²C-BSS138-Wandler ist für UART nicht
die erste Wahl.

Die ESP32-S3-GPIOs werden mit 3,3 V betrieben; Espressif dokumentiert den
Chipbetrieb mit 3,0 bis 3,6 V. Siehe die
[ESP32-S3-Hardwarehinweise](https://docs.espressif.com/projects/esp-techpedia/en/latest/esp-friends/get-started/try-firmware/try-firmware-hardware/esp32s3.html).

## Diagnose im Steuerprofil

Nach dem nächsten Flashen enthält die ESP-Weboberfläche unter **Temperaturen &
Diagnose** einen Button **Status abfragen** sowie diese drei Werte:

| Anzeige | Aussage |
| --- | --- |
| Letzter gesendeter UART-Rahmen | Der ESP hat wirklich auf seiner TX-Leitung gesendet. |
| Letzter empfangener UART-Rahmen | Die RX-Leitung liefert Daten. |
| UART-Status | Unterscheidet Antwort, Prüfungsfehler und Zwei-Sekunden-Timeout. |

Wenn nach **Status abfragen** ein TX-Rahmen erscheint, aber nach zwei Sekunden
kein RX-Rahmen, sind TX/RX vertauscht, GND fehlt oder der TX-Pegel wird vom
Innengerät nicht akzeptiert. Erscheint ein RX-Rahmen mit CRC-/Checksumme-
Hinweis, benötigen wir diesen vollständigen Rahmen unverändert aus der
Weboberfläche oder dem ESPHome-Log.
