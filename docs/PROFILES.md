# Steuerprofile

Das Profil wird beim Bauen über die ESPHome-Substitution `kb35_profile`
gewählt. Danach muss der ESP neu kompiliert und geflasht werden. So meldet
Home Assistant immer genau den dazu passenden Entitätssatz.

| Wert | Home-Assistant-Entitäten | ESP-Weboberfläche | Gedacht für |
| --- | --- | --- | --- |
| `native` | Klima, Prozent-Lüfter, Innen-/Außentemperatur, Diagnose | Grundsteuerung und Messwerte | Start ohne Zusatzbedienung |
| `native_plus` | Alles aus `native` plus Boost, Sleep, Frostschutz, Piepton und Leistungsbegrenzung | Alle verifizierten Zusatzfunktionen | Vollständige Bedienung mit nativen Entitäten |
| `custom_dashboard` | Derselbe vollständige Entitätssatz wie `native_plus` | Alle verifizierten Zusatzfunktionen | Vorbereitung für die optionale Kreis-Karte |

`custom_dashboard` installiert absichtlich keine Home-Assistant-Oberfläche.
ESPHome kann Home Assistant keine JavaScript-Karte automatisch hinzufügen.
Nach der einmaligen manuellen Einrichtung der Dateien in
`optional-custom-dashboard/` kann die Karte aber ohne HACS mit diesem Profil
arbeiten.

Alle Profile enthalten die lokale ESPHome-Weboberfläche. Sie ist über
`http://<device-name>.local/` oder die IP-Adresse des ESP erreichbar und mit
den zwei `kb35_web_server_*`-Secrets geschützt. Den Webserver ausschließlich
im vertrauenswürdigen Heimnetz betreiben.

## Temperaturwerte

Die Solltemperatur der Klimaentität ist unabhängig von den Messwerten:

| Entität | Bedeutung | Protokollstand |
| --- | --- | --- |
| `Klimaanlage` → aktuelle Temperatur | Vom Innengerät gemessene Temperatur | Statusfeld 11 plus Nachkommabits in Feld 15 |
| `Innentemperatur (Innengerät)` | Derselbe, ausdrücklich sichtbare Messwert | Statusfeld 11 plus Nachkommabits in Feld 15 |
| `Außentemperatur (Außengerät)` | Vom Außengerät gemessene Temperatur | Statusfeld 12 plus Nachkommabits in Feld 15 |

Die Zuordnung folgt dem Midea-Statuslayout. Sie wird erst endgültig bestätigt,
wenn ein unverändertes, CRC-gültiges `C0`-Status-Telegramm des KB35 vorliegt;
siehe `OPEN_PROTOCOL_QUESTIONS.md`.
