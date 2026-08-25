# Remind once per source-change-set to sync docs, then stay silent.
# Native PowerShell 7 equivalent of stop-docs-sync.sh for Copilot on Windows.

param([string]$Runtime = "")

[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)

function Invoke-GitWithInput {
    param(
        [string[]]$Arguments,
        [string]$InputText = ""
    )

    try {
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = "git"
        $startInfo.WorkingDirectory = (Get-Location).Path
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        foreach ($argument in $Arguments) {
            $startInfo.ArgumentList.Add($argument)
        }

        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) {
            return [pscustomobject]@{ ExitCode = 1; Output = "" }
        }
        $process.StandardInput.Write($InputText)
        $process.StandardInput.Close()
        $output = $process.StandardOutput.ReadToEnd()
        $process.WaitForExit()
        return [pscustomobject]@{ ExitCode = $process.ExitCode; Output = $output }
    } catch {
        return [pscustomobject]@{ ExitCode = 1; Output = "" }
    }
}

try {
    $statusLines = @(& git status --porcelain 2>$null)
} catch {
    exit 0
}
if ($LASTEXITCODE -ne 0) {
    exit 0
}

$changedPaths = [System.Collections.Generic.List[string]]::new()
foreach ($statusLine in $statusLines) {
    if ($statusLine -match "^.{1,3}(docs/|PROGRESS\.md)") {
        continue
    }
    if ($statusLine -notmatch "\.(ts|tsx|js|jsx|json|sh|yml|yaml|sql|prisma|html|css)$") {
        continue
    }

    $changedPath = $statusLine -replace "^.{3}", ""
    $changedPath = $changedPath -replace "^.* -> ", ""
    $changedPaths.Add($changedPath)
}

if ($changedPaths.Count -eq 0) {
    exit 0
}

$orderedPaths = $changedPaths.ToArray()
[Array]::Sort($orderedPaths, [StringComparer]::Ordinal)
$uniquePaths = [System.Collections.Generic.List[string]]::new()
foreach ($changedPath in $orderedPaths) {
    if ($uniquePaths.Count -eq 0 -or $uniquePaths[$uniquePaths.Count - 1] -cne $changedPath) {
        $uniquePaths.Add($changedPath)
    }
}
$changed = [string]::Join([char]10, $uniquePaths)

$markerResult = Invoke-GitWithInput @("rev-parse", "--git-path", ".docs-sync-reminded")
if ($markerResult.ExitCode -ne 0) {
    exit 0
}
$marker = $markerResult.Output.TrimEnd([char[]]@(13, 10))
if ([string]::IsNullOrEmpty($marker)) {
    exit 0
}
if (-not [IO.Path]::IsPathRooted($marker)) {
    $marker = Join-Path (Get-Location).Path $marker
}

$hashResult = Invoke-GitWithInput @("hash-object", "--stdin") $changed
$hash = if ($hashResult.ExitCode -eq 0) { $hashResult.Output.TrimEnd([char[]]@(13, 10)) } else { "" }
if ((Test-Path -LiteralPath $marker -PathType Leaf) -and [IO.File]::ReadAllText($marker) -ceq $hash) {
    exit 0
}

[IO.File]::WriteAllText($marker, $hash, [Text.UTF8Encoding]::new($false))
$reason = "DOCS SYNC: re-read AGENTS.md § Documentation Sync before stopping if this turn changed code, added a pattern, modified source or config, or introduced a new behaviour. Update PROGRESS.md and any affected docs/ files in the same change."
if ($Runtime -eq "copilot") {
    [Console]::Out.WriteLine((@{ decision = "block"; reason = $reason } | ConvertTo-Json -Compress))
    exit 0
}

[Console]::Error.WriteLine($reason)
exit 2
