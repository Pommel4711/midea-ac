# Noch benötigte KB35-Informationen

Die folgenden Punkte sind nicht geraten und daher bewusst noch nicht als
Sendebefehl aktiviert. Ein **kompletter Rohmitschnitt** (hexadezimal, inklusive
erstem `AA` und letztem Prüfsummenbyte) der jeweiligen App-Aktion genügt.

| Funktion aus dem Screenshot | Was vorhanden ist | Was für die Freischaltung fehlt |
| --- | --- | --- |
| LED | Statusfeld ist bekannt; das Kommando ist ein Toggle | Ein isolierter KB35-LED-An/Aus-Mitschnitt, damit nur exakt ein Toggle gesendet wird |
| Schnellstart | Kein KB35-Bit oder B0-Property genannt | Mitschnitt beim Ein- und Ausschalten |
| Luftrichtung | Vertikal/horizontaler **Swing** ist belegt | Mitschnitte für feste Klappenpositionen, falls die App damit mehr als Swing meint |
| Schlafkurve | `sleepMode` Ein/Aus ist belegt | Mitschnitt für Kurven-/Dauerwahl; bis dahin nur Sleep Ein/Aus |
| Zeitplan | Midea-Standard kennt Timerfelder | KB35-App-Mitschnitte für Ein-/Auszeit oder eine Entscheidung, Home-Assistant-Automationen zu verwenden |
| 0x63 Network Status | Als Anfrage beobachtet | Ein bestätigter Antwortmitschnitt, falls das Gerät Basissteuerung ohne ihn nicht akzeptiert |

## Prüfsummenhinweis

Der übergebene C0-Beispielrahmen endet auf `... 28 D4 62`. Seine CRC `D4` ist
konsistent, die in der Spezifikation verlangte Midea-Checksumme errechnet aber
`61` statt `62`. Der Treiber prüft absichtlich beides und verwirft daher diesen
Textvektor als echten Datenrahmen. Bitte für die erste Hardwareprüfung einen
unveränderten RX-Log aus dem SmartKey bereitstellen, falls der KB35 auf
GET_STATUS nicht antwortet.
