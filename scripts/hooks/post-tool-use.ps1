# PostToolUse hook — auto-format and lint-fix after file writes/edits.
# Native PowerShell 7 equivalent of post-tool-use.sh for Copilot on Windows.

$inputData = [Console]::In.ReadToEnd()

try {
    $payload = $inputData | ConvertFrom-Json -ErrorAction Stop
} catch {
    exit 0
}

function Get-HookProperty {
    param(
        [object]$Object,
        [string[]]$Names
    )

    if ($null -eq $Object) {
        return $null
    }

    foreach ($name in $Names) {
        $property = $Object.PSObject.Properties[$name]
        if ($null -ne $property) {
            return $property.Value
        }
    }

    return $null
}

$toolInput = Get-HookProperty $payload @("tool_input", "toolInput", "toolArgs")
if ($null -eq $toolInput) {
    $toolInput = [pscustomobject]@{}
}

if ($toolInput -is [string]) {
    $rawInput = $toolInput
    try {
        $decoded = $rawInput | ConvertFrom-Json -ErrorAction Stop
        if ($null -ne $decoded -and $decoded -isnot [string]) {
            $toolInput = $decoded
        } else {
            $toolInput = [pscustomobject]@{ patch = $rawInput }
        }
    } catch {
        $toolInput = [pscustomobject]@{ patch = $rawInput }
    }
}

$filePaths = [System.Collections.Generic.List[string]]::new()
$directPath = Get-HookProperty $toolInput @("file_path", "filePath", "path")
if ($directPath -is [string] -and $directPath.Length -gt 0) {
    $filePaths.Add($directPath)
}

$patch = Get-HookProperty $toolInput @("command", "patch")
if ($patch -is [string]) {
    foreach ($match in [regex]::Matches($patch, "(?m)^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$")) {
        $filePaths.Add($match.Groups[1].Value.Trim())
    }
}

$prettierPattern = [regex]::new("\.(ts|tsx|js|jsx|json|md|css|yml|yaml|html)$", [System.Text.RegularExpressions.RegexOptions]::CultureInvariant)
$eslintPattern = [regex]::new("\.(ts|tsx|js|jsx)$", [System.Text.RegularExpressions.RegexOptions]::CultureInvariant)

foreach ($filePath in $filePaths) {
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        continue
    }

    if ($prettierPattern.IsMatch($filePath)) {
        try {
            & npx prettier --write $filePath 2>$null
        } catch {
            # Formatting intentionally degrades quietly, matching the POSIX hook.
        }
    }

    if ($eslintPattern.IsMatch($filePath)) {
        try {
            & npx eslint --fix $filePath 2>$null
        } catch {
            # Lint fixing intentionally degrades quietly, matching the POSIX hook.
        }
    }
}

exit 0
