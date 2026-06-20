$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\.."
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { Write-Output 'SKIP: root .env is missing'; exit 0 }

foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([^#][^=]*)=(.*)$') {
        $name = $Matches[1].Trim(); $value = $Matches[2].Trim().Trim('"').Trim("'")
        if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}
if ($env:OBJECT_STORAGE_PROVIDER -ne 'minio') { Write-Output 'SKIP: OBJECT_STORAGE_PROVIDER is not minio'; exit 0 }

$api = if ($env:API_BASE_URL) { $env:API_BASE_URL.TrimEnd('/') } else { 'http://localhost:8000' }
function Invoke-Json([string]$Method, [string]$Uri, $Body = $null, [int]$Timeout = 20) {
    $params = @{ Method = $Method; Uri = $Uri; TimeoutSec = $Timeout }
    if ($null -ne $Body) { $params.ContentType = 'application/json'; $params.Body = ($Body | ConvertTo-Json -Depth 8) }
    Invoke-RestMethod @params
}

Write-Output '1/7 backend health'
$health = Invoke-Json GET "$api/health" -Timeout 10
if ($health.status -ne 'ok') { throw 'Backend health failed' }
Write-Output '2/7 storage health'
$storage = Invoke-Json GET "$api/debug/storage/health" -Timeout 20
if (-not $storage.can_put_object -or -not $storage.can_generate_presigned_put) { throw "Storage health failed: $($storage | ConvertTo-Json -Compress)" }

$campaign = Invoke-Json POST "$api/campaigns" @{
    buyer_id = 'user_001'; name = "Storage Smoke $([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"; domain = 'ecommerce_cskh'
    target_emotions = @('neutral'); script_lines = @(@{ transcript = 'Kiem tra trang thai don hang.'; intent = 'order_status'; context_brief = 'Storage smoke test.' })
}
Invoke-Json POST "$api/campaigns/$($campaign.campaign_id)/generate-items" | Out-Null
Invoke-Json POST "$api/campaigns/$($campaign.campaign_id)/activate" | Out-Null
$session = Invoke-Json POST "$api/recording-sessions/start" @{ campaign_id = $campaign.campaign_id; contributor_id = 'user_001' }
$action = Invoke-Json GET "$api/recording-sessions/$($session.session_id)/next-action"
if ($action.action -ne 'START_ITEM') { throw "Expected START_ITEM, got $($action.action)" }

# Generate 1.3 seconds of 16-bit mono PCM WAV without external tools.
$rate = 16000; $frames = [int]($rate * 1.3); $stream = New-Object System.IO.MemoryStream; $writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([Text.Encoding]::ASCII.GetBytes('RIFF')); $writer.Write([int](36 + $frames * 2)); $writer.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt ')); $writer.Write([int]16); $writer.Write([int16]1); $writer.Write([int16]1); $writer.Write([int]$rate); $writer.Write([int]($rate * 2)); $writer.Write([int16]2); $writer.Write([int16]16); $writer.Write([Text.Encoding]::ASCII.GetBytes('data')); $writer.Write([int]($frames * 2))
for ($i = 0; $i -lt $frames; $i++) { $writer.Write([int16](7000 * [Math]::Sin(2 * [Math]::PI * 220 * $i / $rate))) }
$writer.Flush(); $wav = $stream.ToArray(); $writer.Dispose(); $stream.Dispose()

Write-Output '3/7 upload init'
$slot = Invoke-Json POST "$api/audio/uploads/init" @{ session_id = $session.session_id; item_id = $action.item.item_id; filename = 'recording.wav'; content_type = 'audio/wav'; size_bytes = $wav.Length } -Timeout 10
Write-Output "4/7 presigned PUT host=$(([Uri]$slot.upload_url).Authority) bytes=$($wav.Length)"
Invoke-WebRequest -Method PUT -Uri $slot.upload_url -ContentType 'audio/wav' -Body $wav -TimeoutSec 30 -UseBasicParsing | Out-Null
Write-Output '5/7 upload complete + FastCheck'
$result = Invoke-Json POST "$api/audio/uploads/complete" @{ upload_id = $slot.upload_id; session_id = $session.session_id; item_id = $action.item.item_id; object_key = $slot.object_key; client_metrics = @{ duration_ms = 1300; rms_dbfs = -16; peak_dbfs = -13; silence_ratio = 0; clipping_ratio = 0 } } -Timeout 20
if ($result.action -notin @('CONTINUE_NEXT', 'RETAKE_NOW')) { throw "FastCheck did not return a terminal action: $($result | ConvertTo-Json -Compress)" }
Write-Output "6/7 terminal FastCheck action=$($result.action) reason=$($result.reason_code)"
$next = Invoke-Json GET "$api/recording-sessions/$($session.session_id)/next-action" -Timeout 10
Write-Output "7/7 next-action=$($next.action)"
Write-Output 'STORAGE_UPLOAD_SMOKE_PASSED'
