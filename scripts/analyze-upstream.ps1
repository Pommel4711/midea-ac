<#!
.SYNOPSIS
  Erstellt einen Update-Bericht für das geklonte Pommel-Referenzrepository.

.DESCRIPTION
  Der Befehl ruft nur neue Referenzinformationen ab und erzeugt einen Bericht.
  Er übernimmt, kopiert oder merged niemals Änderungen in dieses Repository.
  Das TCL-Protokoll ist ausdrücklich nicht mit dem Midea-Protokoll kompatibel.
#>
[CmdletBinding()]
param(
  [string]$ReferencePath,
  [string]$BaselineFile,
  [string]$ReportPath,
  [switch]$Fetch
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ReferencePath)) {
  $ReferencePath = Join-Path (Split-Path -Parent $projectRoot) 'references\pommel-tclac'
}
if ([string]::IsNullOrWhiteSpace($BaselineFile)) {
  $BaselineFile = Join-Path $projectRoot '.upstream-baseline.json'
}
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $ReportPath = Join-Path $projectRoot 'reports\upstream-analysis.md'
}

function Get-GitValue {
  param([string[]]$Arguments)
  # The reference may have been cloned by another Windows account. Scope the
  # safe-directory exception to this one command instead of altering global Git
  # configuration.
  $result = & git -c "safe.directory=$ReferencePath" -C $ReferencePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Git-Befehl fehlgeschlagen: git -C `"$ReferencePath`" $($Arguments -join ' ')"
  }
  return ($result | Out-String).Trim()
}

if (-not (Test-Path (Join-Path $ReferencePath '.git'))) {
  throw "Referenzrepository nicht gefunden: $ReferencePath. Erst klonen, zum Beispiel: git clone --branch german https://github.com/Pommel4711/tclac.git references/pommel-tclac"
}
if (-not (Test-Path $BaselineFile)) {
  throw "Baseline-Datei fehlt: $BaselineFile"
}

$baseline = Get-Content -Raw $BaselineFile | ConvertFrom-Json

if ($Fetch) {
  Write-Host "Aktualisiere nur die Referenz (kein Merge, keine Übernahme) …"
  & git -c "safe.directory=$ReferencePath" -C $ReferencePath fetch --prune origin $baseline.branch
  if ($LASTEXITCODE -ne 0) { throw 'git fetch fehlgeschlagen.' }
}

$head = Get-GitValue @('rev-parse', 'HEAD')
$remoteRef = "origin/$($baseline.branch)"
$remote = Get-GitValue @('rev-parse', $remoteRef)
& git -c "safe.directory=$ReferencePath" -C $ReferencePath cat-file -e "$($baseline.commit)^{commit}" 2>$null
$baselineExists = $LASTEXITCODE -eq 0

$commitList = if ($baselineExists) {
  Get-GitValue @('log', '--oneline', "$($baseline.commit)..$remote")
} else {
  'Die gespeicherte Baseline ist im lokalen Klon nicht vorhanden. Vergleich nach dem nächsten vollständigen Fetch erneut ausführen.'
}
$stat = if ($baselineExists) {
  Get-GitValue @('diff', '--stat', "$($baseline.commit)..$remote")
} else { 'Nicht verfügbar.' }

$reportDirectory = Split-Path -Parent $ReportPath
New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
$timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss K')

@"
# Upstream-Analyse – Pommel4711/tclac

Erstellt: $timestamp

## Ergebnis

- Referenz: ``$($baseline.reference)`` / Branch ``$($baseline.branch)``
- Freigegebene Vergleichsbasis: ``$($baseline.commit)``
- Lokaler Referenzstand: ``$head``
- Remote-Referenzstand: ``$remote``
- Automatische Übernahme: **nie** – dieser Bericht ist ausschließlich eine Entscheidungsgrundlage.

## Neue Commits seit der Basis

    $commitList

## Geänderte Dateien (Statistik)

    $stat

## Entscheidungshilfe für KB35

1. Nur framework-neutrale ESPHome- oder Paket-Struktur prüfen.
2. **Keinen** TCL-UART-Parser oder TCL-Frame übernehmen: KB35 verwendet Midea UART mit Protokollbyte ``0x02``.
3. Eine konkrete Änderung erst nach einer inhaltlichen Prüfung übernehmen und dabei im Changelog dokumentieren.
"@ | Set-Content -Encoding utf8 $ReportPath

Write-Host "Analyse geschrieben: $ReportPath"
