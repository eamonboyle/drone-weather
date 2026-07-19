<#
.SYNOPSIS
  Android performance audit: gfxinfo / meminfo / cpuinfo / startup / logcat around a Maestro flow.

.DESCRIPTION
  Resets gfxinfo, captures before/after metrics, runs maestro/performance.yaml (or -FlowPath),
  and writes JSON + text reports under .expo/perf-audit-<timestamp>/.

.PARAMETER PackageName
  Android applicationId (default: com.eamonsdiary.droneweather)

.PARAMETER FlowPath
  Maestro flow relative to repo root (default: maestro/performance.yaml)

.PARAMETER Runs
  Number of timed runs; medians are computed across runs (default: 3)

.PARAMETER Device
  Optional adb serial (-s)

.EXAMPLE
  .\scripts\android-perf-audit.ps1
#>
[CmdletBinding()]
param(
    [string]$PackageName = 'com.eamonsdiary.droneweather',
    [string]$FlowPath = 'maestro/performance.yaml',
    [int]$Runs = 3,
    [string]$Device = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    if ($Device) {
        & adb -s $Device @Args
    } else {
        & adb @Args
    }
}

function Get-GfxSummary {
    param([string]$Dump)
    $janky = if ($Dump -match 'Janky frames:\s*(\d+)\s*\(([\d.]+)%\)') {
        @{ count = [int]$Matches[1]; pct = [double]$Matches[2] }
    } else { @{ count = $null; pct = $null } }
    $p50 = if ($Dump -match '50th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    $p90 = if ($Dump -match '90th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    $p95 = if ($Dump -match '95th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    $p99 = if ($Dump -match '99th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    return [pscustomobject]@{
        jankyCount = $janky.count
        jankyPct   = $janky.pct
        p50Ms      = $p50
        p90Ms      = $p90
        p95Ms      = $p95
        p99Ms      = $p99
        raw        = $Dump
    }
}

function Get-MemRssMb {
    param([string]$Dump)
    if ($Dump -match 'TOTAL\s+(\d+)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    if ($Dump -match 'TOTAL PSS:\s+(\d+)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    return $null
}

function Get-Median {
    param([double[]]$Values)
    $sorted = $Values | Where-Object { $_ -ne $null } | Sort-Object
    if (-not $sorted -or $sorted.Count -eq 0) { return $null }
    $mid = [int][math]::Floor(($sorted.Count - 1) / 2)
    if ($sorted.Count % 2 -eq 1) { return $sorted[$mid] }
    return ($sorted[$mid] + $sorted[$mid + 1]) / 2
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $Root ".expo/perf-audit-$stamp"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$flowFull = Join-Path $Root $FlowPath
if (-not (Test-Path $flowFull)) {
    throw "Maestro flow not found: $flowFull"
}

Write-Host "Package: $PackageName"
Write-Host "Flow: $FlowPath"
Write-Host "Runs: $Runs"
Write-Host "Output: $outDir"

$runResults = @()

for ($i = 1; $i -le $Runs; $i++) {
    Write-Host "`n=== Run $i / $Runs ==="

    Invoke-Adb shell am force-stop $PackageName | Out-Null
    Start-Sleep -Seconds 1
    Invoke-Adb shell dumpsys gfxinfo $PackageName reset | Out-Null

    $logcatPath = Join-Path $outDir "run-$i-logcat.txt"
    $logcatProc = Start-Process -FilePath 'adb' -ArgumentList @(
        $(if ($Device) { @('-s', $Device) } else { @() }) +
        @('logcat', '-v', 'time', '*:S', 'ReactNative:V', 'ReactNativeJS:V', 'Expo:V', 'AndroidRuntime:E')
    ) -RedirectStandardOutput $logcatPath -NoNewWindow -PassThru

    $startupBefore = Get-Date
    Invoke-Adb shell am start -W -n "$PackageName/.MainActivity" 2>$null |
        Tee-Object -FilePath (Join-Path $outDir "run-$i-startup.txt") | Out-Null
    # Fallback activity resolution for Expo
    if ($LASTEXITCODE -ne 0) {
        Invoke-Adb shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1 |
            Tee-Object -FilePath (Join-Path $outDir "run-$i-startup.txt") | Out-Null
    }
    $startupMs = [int]((Get-Date) - $startupBefore).TotalMilliseconds

    $memBefore = Invoke-Adb shell dumpsys meminfo $PackageName | Out-String
    $cpuBefore = Invoke-Adb shell dumpsys cpuinfo | Out-String
    Set-Content -Path (Join-Path $outDir "run-$i-meminfo-before.txt") -Value $memBefore
    Set-Content -Path (Join-Path $outDir "run-$i-cpuinfo-before.txt") -Value $cpuBefore

    Write-Host "Running Maestro flow..."
    & maestro test $flowFull
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Maestro exited with code $LASTEXITCODE"
    }

    $gfxDump = Invoke-Adb shell dumpsys gfxinfo $PackageName | Out-String
    $memAfter = Invoke-Adb shell dumpsys meminfo $PackageName | Out-String
    $cpuAfter = Invoke-Adb shell dumpsys cpuinfo | Out-String
    Set-Content -Path (Join-Path $outDir "run-$i-gfxinfo.txt") -Value $gfxDump
    Set-Content -Path (Join-Path $outDir "run-$i-meminfo-after.txt") -Value $memAfter
    Set-Content -Path (Join-Path $outDir "run-$i-cpuinfo-after.txt") -Value $cpuAfter

    if ($logcatProc -and -not $logcatProc.HasExited) {
        Stop-Process -Id $logcatProc.Id -Force -ErrorAction SilentlyContinue
    }

    $gfx = Get-GfxSummary $gfxDump
    $rssBefore = Get-MemRssMb $memBefore
    $rssAfter = Get-MemRssMb $memAfter

    $runResults += [pscustomobject]@{
        run          = $i
        startupMs    = $startupMs
        jankyPct     = $gfx.jankyPct
        jankyCount   = $gfx.jankyCount
        p95Ms        = $gfx.p95Ms
        p99Ms        = $gfx.p99Ms
        rssBeforeMb  = $rssBefore
        rssAfterMb   = $rssAfter
    }

    Write-Host ("Janky={0}% p95={1}ms RSS={2}→{3} MiB startup~{4}ms" -f `
        $gfx.jankyPct, $gfx.p95Ms, $rssBefore, $rssAfter, $startupMs)
}

$summary = [pscustomobject]@{
    packageName     = $PackageName
    flow            = $FlowPath
    runs            = $Runs
    medianJankyPct  = Get-Median ($runResults.jankyPct)
    medianP95Ms     = Get-Median ($runResults.p95Ms)
    medianStartupMs = Get-Median ($runResults.startupMs)
    medianRssAfter  = Get-Median ($runResults.rssAfterMb)
    acceptance = @{
        jankyPctMax   = 5
        p95MsMax      = 20
        frameMsMax    = 50
        startOrRssReg = 0.10
        note          = 'Compare medians to a prior baseline; reject >10% cold/warm-start or steady-RSS regression.'
    }
    runsDetail = $runResults
}

$summaryJson = Join-Path $outDir 'summary.json'
$summary | ConvertTo-Json -Depth 6 | Set-Content $summaryJson
$summary | Format-List | Out-String | Set-Content (Join-Path $outDir 'summary.txt')

Write-Host "`n=== Median summary ==="
Write-Host ("janky%={0}  p95ms={1}  startupMs={2}  rssAfterMb={3}" -f `
    $summary.medianJankyPct, $summary.medianP95Ms, $summary.medianStartupMs, $summary.medianRssAfter)
Write-Host "Wrote $summaryJson"
Write-Host "Acceptance targets: <5% janky, p95<=20ms, no frame >50ms in targeted interactions, <=10% start/RSS regression."
