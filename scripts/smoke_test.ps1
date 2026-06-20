$ErrorActionPreference = 'Stop'

Push-Location "$PSScriptRoot\..\services\api"
try {
    $env:PYTHONDONTWRITEBYTECODE = '1'
    python -m pytest -q -p no:cacheprovider --basetemp C:\tmp\voiceturk-tests
} finally {
    Pop-Location
}

Push-Location "$PSScriptRoot\..\apps\web"
try {
    pnpm run typecheck
    pnpm run build
} finally {
    Pop-Location
}
