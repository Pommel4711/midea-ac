# KB35-Protokollaudit

Stand: 2026-09-04. Diese Übersicht trennt bewusst zwischen den echten
SmartKey-Mitschnitten, dem dokumentierten Midea-`0x40`/`C0`-Format und
Funktionen, für die noch kein KB35-Sendeframe vorhanden ist.

| Funktion | Stand | Bytegenaue Grundlage |
| --- | --- | --- |
| UART, Rahmen, `0x02`, GET_STATUS | implementiert | KB35-Request `AA 21 … 02 03 41 …` |
| Ein/Aus, Modus, Zieltemperatur | implementiert | `C0` Daten 1 und 2; `0x40`-Set-Status |
| Lüfter 0–100 % und Auto | implementiert | `C0` Daten 3; Auto = `102` |
| Vertikal-/Horizontal-Swing | implementiert | `C0` Daten 7: `0x0C`, `0x03`, `0x0F` |
| Boost | implementiert | Daten 8 Bit `0x20` und Daten 10 Bit `0x02` |
| Sleep Ein/Aus | implementiert | Daten 10 Bit `0x01` |
| Frostschutz | implementiert | Daten 21 Bit `0x80`, nur Heizen |
| Leistungsbegrenzung 50/75 % | implementiert | `B0 02 48 00 01 32/4B …` aus KB35-Mitschnitten |
| Leistungsbegrenzung Normal | implementiert, noch einzeln bestätigen | Midea-Standardwert `0x64`/100, kein separater KB35-Mitschnitt |
| Piepton | implementiert als Konfiguration | `0x40` Daten 1 Bit `0x40`; betrifft die Bestätigung zukünftiger Befehle, kein vom Gerät gespeicherter Schalter |
| A0-Echo | implementiert | gültige `0x05/A0`-Rahmen werden unverändert gespiegelt |
| Innen-/Außentemperatur | implementiert, Hardwareabgleich offen | Daten 11/12 und Nachkommabits in Daten 15 |
| LED-Display | nicht steuerbar | Lesebit im Midea-Layout bekannt, KB35-Toggle-Sendeframe fehlt |
| Schnellstart | nicht implementiert | kein isolierter KB35-Sendeframe |
| Feste Luftrichtungen | nicht implementiert | Swing ist belegt; Positionswerte fehlen |
| Schlafkurven-Dauer | nicht implementiert | nur Sleep Ein/Aus ist belegt |
| Geräte-Zeitplan | nicht implementiert | Timerfelder existieren, KB35-App-Sendeframes fehlen |
| `0x63` Network Status | empfangen und geloggt | KB35-Antwortformat noch nicht bestätigt |
| B1-Eigenschaften / B5-Fähigkeiten | nicht ausgewertet | Basissteuerung benötigt sie nicht; KB35-Rückmeldungen liegen vor, Parser fehlt |

## Wichtige Einschränkung

Der vorliegende `C0`-Textmitschnitt hat eine gültige CRC, aber eine um eins
abweichende End-Checksumme (`… D4 62`, berechnet `61`). Deshalb akzeptiert der
Treiber ihn absichtlich nicht als echte Rückmeldung. Für die Hardwarefreigabe
braucht es mindestens einen unveränderten, vollständigen RX-Mitschnitt mit
gültiger CRC **und** Prüfsumme. Erst damit lassen sich Messwerte und die
Rückmeldung aller gesetzten Bits auf genau diesem KB35 endgültig bestätigen.
