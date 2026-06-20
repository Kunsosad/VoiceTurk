param(
    [string]$Endpoint = $(if ($env:S3_PUBLIC_BASE_URL) { $env:S3_PUBLIC_BASE_URL } else { 'http://localhost:9000' }),
    [string]$Bucket = $(if ($env:S3_BUCKET_NAME) { $env:S3_BUCKET_NAME } else { 'voiceturk-dev' }),
    [string]$AccessKey = $(if ($env:S3_ACCESS_KEY_ID) { $env:S3_ACCESS_KEY_ID } else { 'minioadmin' }),
    [string]$SecretKey = $(if ($env:S3_SECRET_ACCESS_KEY) { $env:S3_SECRET_ACCESS_KEY } else { 'minioadmin' })
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command mc -ErrorAction SilentlyContinue)) {
    throw 'MinIO client `mc` is required. Install it from https://min.io/docs/minio/windows/reference/minio-mc.html'
}

$corsFile = Join-Path ([System.IO.Path]::GetTempPath()) 'voiceturk-minio-cors.xml'
$cors = @'
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>http://localhost:3000</AllowedOrigin>
    <AllowedOrigin>http://127.0.0.1:3000</AllowedOrigin>
    <AllowedOrigin>http://localhost:5173</AllowedOrigin>
    <AllowedOrigin>http://127.0.0.1:5173</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>OPTIONS</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Content-Type</ExposeHeader>
  </CORSRule>
</CORSConfiguration>
'@

try {
    Set-Content -LiteralPath $corsFile -Value $cors -Encoding utf8
    mc alias set voiceturk-local $Endpoint $AccessKey $SecretKey
    mc mb --ignore-existing "voiceturk-local/$Bucket"
    mc cors set "voiceturk-local/$Bucket" $corsFile
    Write-Output "Configured CORS for $Endpoint/$Bucket"
} finally {
    Remove-Item -LiteralPath $corsFile -Force -ErrorAction SilentlyContinue
}
