<#
.SYNOPSIS
  Android performance audit: gfxinfo / meminfo / cpuinfo / startup / logcat around Maestro flows.

.DESCRIPTION
  Resets gfxinfo, captures before/after metrics, runs core and/or map Maestro flows,
  evaluates acceptance thresholds, and exits non-zero when medians miss budget.

.PARAMETER PackageName
  Android applicationId (default: com.eamonsdiary.droneweather)

.PARAMETER Suite
  Which flows to run: Core (default), Map, All, or Full (legacy combined journey).

.PARAMETER Runs
  Number of timed runs per flow; medians are computed across runs (default: 3)

.PARAMETER Device
  Optional adb serial (-s)

.PARAMETER BaselineStartupMs
  Optional prior cold-start median for ≤10% regression check.

.PARAMETER BaselinePssMb
  Optional prior steady PSS median for ≤10% regression check.

.EXAMPLE
  .\scripts\android-perf-audit.ps1 -Suite Core
#>
[CmdletBinding()]
param(
    [string]$PackageName = 'com.eamonsdiary.droneweather',
    [ValidateSet('Core', 'Map', 'All', 'Full')]
    [string]$Suite = 'Core',
    [int]$Runs = 3,
    [string]$Device = '',
    [Nullable[double]]$BaselineStartupMs = $null,
    [Nullable[double]]$BaselinePssMb = $null
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$Thresholds = @{
    JankyPctMax   = 5.0
    P95MsMax      = 20
    FrameMsMax    = 50
    RegressMax    = 0.10
}

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
    } else {
        @{ count = $null; pct = $null }
    }

    $p50 = if ($Dump -match '50th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    $p90 = if ($Dump -match '90th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    $p95 = if ($Dump -match '95th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }
    $p99 = if ($Dump -match '99th percentile:\s*(\d+)ms') { [int]$Matches[1] } else { $null }

    $framesOver50 = 0
    $histogramMatched = $false

    # Prefer HISTOGRAM: 5ms=10 16ms=4 50ms=2 100ms=1
    if ($Dump -match 'HISTOGRAM:\s*([^\r\n]+)') {
        $histogramMatched = $true
        $buckets = [regex]::Matches($Matches[1], '(\d+)ms=(\d+)')
        foreach ($bucket in $buckets) {
            $ms = [int]$bucket.Groups[1].Value
            $count = [int]$bucket.Groups[2].Value
            if ($ms -gt $Thresholds.FrameMsMax) {
                $framesOver50 += $count
            }
        }
    } else {
        # Fallback: "50-60ms: N" / "50ms-60ms: N" style lines
        $rangeBuckets = [regex]::Matches(
            $Dump,
            '(?im)^\s*(\d+)\s*(?:ms)?\s*[-–]\s*(\d+)\s*ms\s*[:=]\s*(\d+)'
        )
        if ($rangeBuckets.Count -gt 0) {
            $histogramMatched = $true
            foreach ($bucket in $rangeBuckets) {
                $low = [int]$bucket.Groups[1].Value
                $count = [int]$bucket.Groups[3].Value
                if ($low -ge $Thresholds.FrameMsMax) {
                    $framesOver50 += $count
                }
            }
        }
    }

    return [pscustomobject]@{
        jankyCount     = $janky.count
        jankyPct       = $janky.pct
        p50Ms          = $p50
        p90Ms          = $p90
        p95Ms          = $p95
        p99Ms          = $p99
        framesOver50Ms = $(if ($histogramMatched) { $framesOver50 } else { $null })
        histogramFound = $histogramMatched
        raw            = $Dump
    }
}

function Get-MemPssMb {
    param([string]$Dump)

    # App Summary TOTAL (PSS) — most reliable across API levels.
    if ($Dump -match '(?ms)App Summary.*?TOTAL:\s+(\d+)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    if ($Dump -match 'TOTAL PSS:\s+(\d+)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    # Last resort: last TOTAL line (still PSS, not RSS).
    $totals = [regex]::Matches($Dump, '(?m)^\s*TOTAL\s+(\d+)')
    if ($totals.Count -gt 0) {
        return [math]::Round([double]$totals[$totals.Count - 1].Groups[1].Value / 1024, 2)
    }
    return $null
}

function Get-MemRssMb {
    param([string]$Dump)

    # Only accept explicitly labeled RSS. Do not scrape TOTAL columns —
    # those are PSS / private-dirty / private-clean / swap, not RSS.
    if ($Dump -match 'TOTAL RSS:\s+(\d+)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    if ($Dump -match 'Rss Total:\s+(\d+)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    if ($Dump -match '(?im)^\s*RSS:\s+(\d+)\s*($|K)') {
        return [math]::Round([double]$Matches[1] / 1024, 2)
    }
    return $null
}

function Get-Median {
    param(
        # Use object[] so PowerShell does not coerce $null entries to 0.0
        [AllowNull()]
        [object[]]$Values
    )
    $numeric = [System.Collections.Generic.List[double]]::new()
    foreach ($value in @($Values)) {
        if ($null -eq $value) { continue }
        if ($value -isnot [ValueType]) { continue }
        [void]$numeric.Add([double]$value)
    }
    if ($numeric.Count -eq 0) { return $null }
    $sorted = @($numeric | Sort-Object)
    $mid = [int][math]::Floor(($sorted.Count - 1) / 2)
    if ($sorted.Count % 2 -eq 1) { return [double]$sorted[$mid] }
    return ([double]$sorted[$mid] + [double]$sorted[$mid + 1]) / 2
}

function Get-FlowPathForSuite {
    param([string]$Name)
    switch ($Name) {
        'Core' { return 'maestro/performance-core.yaml' }
        'Map' { return 'maestro/performance-map.yaml' }
        'Full' { return 'maestro/performance.yaml' }
        default { throw "Unknown suite flow: $Name" }
    }
}

function Invoke-AuditFlow {
    param(
        [string]$FlowName,
        [string]$RelativeFlowPath,
        [int]$RunCount
    )

    $flowFull = Join-Path $Root $RelativeFlowPath
    if (-not (Test-Path $flowFull)) {
        throw "Maestro flow not found: $flowFull"
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outDir = Join-Path $Root ".expo/perf-audit-$FlowName-$stamp"
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null

    Write-Host "`n######## Suite: $FlowName ########"
    Write-Host "Flow: $RelativeFlowPath"
    Write-Host "Runs: $RunCount"
    Write-Host "Output: $outDir"

    $runResults = @()

    for ($i = 1; $i -le $RunCount; $i++) {
        Write-Host "`n=== $FlowName run $i / $RunCount ==="

        Invoke-Adb shell am force-stop $PackageName | Out-Null
        Start-Sleep -Seconds 1
        Invoke-Adb shell dumpsys gfxinfo $PackageName reset | Out-Null

        $logcatPath = Join-Path $outDir "run-$i-logcat.txt"
        $adbArgs = @()
        if ($Device) { $adbArgs += @('-s', $Device) }
        $adbArgs += @(
            'logcat', '-v', 'time', '*:S',
            'ReactNative:V', 'ReactNativeJS:V', 'Expo:V', 'AndroidRuntime:E'
        )
        $logcatProc = Start-Process -FilePath 'adb' -ArgumentList $adbArgs `
            -RedirectStandardOutput $logcatPath -NoNewWindow -PassThru

        $startupBefore = Get-Date
        Invoke-Adb shell am start -W -n "$PackageName/.MainActivity" 2>$null |
            Tee-Object -FilePath (Join-Path $outDir "run-$i-startup.txt") | Out-Null
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
        $maestroLog = Join-Path $outDir "run-$i-maestro.txt"
        # Capture Maestro stdout/stderr so it cannot pollute function return values.
        & maestro test $flowFull *>&1 |
            Tee-Object -FilePath $maestroLog |
            Out-Null
        $maestroExit = $LASTEXITCODE
        if ($maestroExit -ne 0) {
            Write-Warning "Maestro exited with code $maestroExit"
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
        $pssBefore = Get-MemPssMb $memBefore
        $pssAfter = Get-MemPssMb $memAfter
        $rssBefore = Get-MemRssMb $memBefore
        $rssAfter = Get-MemRssMb $memAfter

        $runResults += [pscustomobject]@{
            run            = $i
            startupMs      = $startupMs
            jankyPct       = $gfx.jankyPct
            jankyCount     = $gfx.jankyCount
            p95Ms          = $gfx.p95Ms
            p99Ms          = $gfx.p99Ms
            framesOver50Ms = $gfx.framesOver50Ms
            histogramFound = $gfx.histogramFound
            pssBeforeMb    = $pssBefore
            pssAfterMb     = $pssAfter
            rssBeforeMb    = $rssBefore
            rssAfterMb     = $rssAfter
            maestroExit    = $maestroExit
        }

        Write-Host ("Janky={0}% p95={1}ms frames>50ms={2} PSS={3}→{4} MiB RSS={5}→{6} MiB startup~{7}ms" -f `
            $gfx.jankyPct, $gfx.p95Ms, $gfx.framesOver50Ms, `
            $pssBefore, $pssAfter, $rssBefore, $rssAfter, $startupMs)
    }

    $medianJanky = Get-Median -Values @($runResults | ForEach-Object { $_.jankyPct })
    $medianP95 = Get-Median -Values @($runResults | ForEach-Object { $_.p95Ms })
    $medianStartup = Get-Median -Values @($runResults | ForEach-Object { $_.startupMs })
    $medianPssAfter = Get-Median -Values @($runResults | ForEach-Object { $_.pssAfterMb })

    $metricKeys = @('jankyPct', 'p95Ms', 'startupMs', 'pssAfterMb')
    $metricsPresent = $runResults.Count -gt 0
    foreach ($key in $metricKeys) {
        foreach ($run in $runResults) {
            if ($null -eq $run.$key) {
                $metricsPresent = $false
                break
            }
        }
        if (-not $metricsPresent) { break }
    }
    $maxFramesOver50 = (
        @($runResults | ForEach-Object { $_.framesOver50Ms }) |
            Where-Object { $_ -ne $null } |
            Measure-Object -Maximum
    ).Maximum
    if ($null -eq $maxFramesOver50) { $maxFramesOver50 = $null }
    $histogramsComplete = -not (
        $runResults | Where-Object { -not $_.histogramFound }
    )
    $maestroAllOk = -not (
        $runResults | Where-Object { $_.maestroExit -ne 0 }
    )

    $checks = [ordered]@{
        maestroExit = @{
            pass  = [bool]$maestroAllOk
            value = @($runResults | ForEach-Object { $_.maestroExit }) -join ','
            limit = 'all runs exit 0'
        }
        metricsPresent = @{
            pass  = [bool]$metricsPresent
            value = @{
                medianJankyPct  = $medianJanky
                medianP95Ms     = $medianP95
                medianStartupMs = $medianStartup
                medianPssAfterMb = $medianPssAfter
            }
            limit = 'janky%, p95, startup, and PSS present (nulls fail)'
        }
        jankyPct   = @{
            pass  = ($null -ne $medianJanky -and $medianJanky -lt $Thresholds.JankyPctMax)
            value = $medianJanky
            limit = "<$($Thresholds.JankyPctMax)%"
        }
        p95Ms      = @{
            pass  = ($null -ne $medianP95 -and $medianP95 -le $Thresholds.P95MsMax)
            value = $medianP95
            limit = "<=$($Thresholds.P95MsMax)ms"
        }
        framesOver50Ms = @{
            pass  = (
                [bool]$histogramsComplete -and
                $null -ne $maxFramesOver50 -and
                $maxFramesOver50 -le 0
            )
            value = @{
                maxFramesOver50Ms = $maxFramesOver50
                histogramsComplete = [bool]$histogramsComplete
            }
            limit = 'histogram present every run; 0 frames >50ms in every run'
        }
    }

    if ($null -ne $BaselineStartupMs) {
        $startupReg = if ($null -ne $medianStartup -and $BaselineStartupMs -gt 0) {
            ($medianStartup - [double]$BaselineStartupMs) / [double]$BaselineStartupMs
        } else { $null }
        $checks.startupRegression = @{
            pass  = ($null -ne $startupReg -and $startupReg -le $Thresholds.RegressMax)
            value = $startupReg
            limit = "<=$($Thresholds.RegressMax) vs baseline $BaselineStartupMs ms"
        }
    }

    if ($null -ne $BaselinePssMb) {
        $pssReg = if ($null -ne $medianPssAfter -and $BaselinePssMb -gt 0) {
            ($medianPssAfter - [double]$BaselinePssMb) / [double]$BaselinePssMb
        } else { $null }
        $checks.pssRegression = @{
            pass  = ($null -ne $pssReg -and $pssReg -le $Thresholds.RegressMax)
            value = $pssReg
            limit = "<=$($Thresholds.RegressMax) vs baseline $BaselinePssMb MiB PSS"
        }
    }

    $passed = -not ($checks.Values | Where-Object { -not $_.pass })

    $summary = [pscustomobject]@{
        packageName         = $PackageName
        suite               = $FlowName
        flow                = $RelativeFlowPath
        runs                = $RunCount
        medianJankyPct      = $medianJanky
        medianP95Ms         = $medianP95
        medianStartupMs     = $medianStartup
        medianPssAfterMb    = $medianPssAfter
        maxFramesOver50Ms   = $maxFramesOver50
        histogramsComplete  = [bool]$histogramsComplete
        maestroAllOk        = [bool]$maestroAllOk
        acceptance          = $Thresholds
        checks              = $checks
        passed              = $passed
        runsDetail          = $runResults
        outputDir           = $outDir
    }

    $summaryJson = Join-Path $outDir 'summary.json'
    $summary | ConvertTo-Json -Depth 8 | Set-Content $summaryJson
    ($summary | Format-List | Out-String) |
        Set-Content (Join-Path $outDir 'summary.txt')

    Write-Host "`n=== $FlowName median summary ==="
    Write-Host ("janky%={0}  p95ms={1}  maxFrames>50ms={2}  histOk={3}  startupMs={4}  pssAfterMb={5}" -f `
        $medianJanky, $medianP95, $maxFramesOver50, $histogramsComplete, $medianStartup, $medianPssAfter)
    Write-Host "Wrote $summaryJson"
    if ($passed) {
        Write-Host "ACCEPTANCE: PASS ($FlowName)" -ForegroundColor Green
    } else {
        Write-Host "ACCEPTANCE: FAIL ($FlowName)" -ForegroundColor Red
        foreach ($key in $checks.Keys) {
            $check = $checks[$key]
            if (-not $check.pass) {
                $valueText = if ($check.value -is [hashtable] -or $check.value -is [pscustomobject]) {
                    ($check.value | ConvertTo-Json -Compress)
                } else {
                    "$($check.value)"
                }
                Write-Host ("  - {0}: value={1} limit={2}" -f $key, $valueText, $check.limit)
            }
        }
    }

    # Comma operator prevents PowerShell from enumerating / merging pipeline junk.
    return , $summary
}

$flowsToRun = @()
switch ($Suite) {
    'Core' { $flowsToRun = @('Core') }
    'Map' { $flowsToRun = @('Map') }
    'Full' { $flowsToRun = @('Full') }
    'All' { $flowsToRun = @('Core', 'Map') }
}

Write-Host "Package: $PackageName"
Write-Host "Suite: $Suite"

$results = [System.Collections.Generic.List[object]]::new()
foreach ($flowName in $flowsToRun) {
    $relative = Get-FlowPathForSuite $flowName
    $suiteSummary = Invoke-AuditFlow -FlowName $flowName -RelativeFlowPath $relative -RunCount $Runs
    if ($suiteSummary -is [array]) {
        $suiteSummary = $suiteSummary | Where-Object { $_ -is [pscustomobject] -and $_.PSObject.Properties['passed'] } | Select-Object -Last 1
    }
    if ($null -eq $suiteSummary -or $null -eq $suiteSummary.passed) {
        Write-Error "Audit suite '$flowName' did not return a structured summary."
        exit 2
    }
    [void]$results.Add($suiteSummary)
}

$allPassed = -not ($results | Where-Object { -not $_.passed })
Write-Host "`n======== OVERALL: $(if ($allPassed) { 'PASS' } else { 'FAIL' }) ========"

if (-not $allPassed) {
    exit 1
}
exit 0
