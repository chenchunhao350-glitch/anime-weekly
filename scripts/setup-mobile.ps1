$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw '请先安装 Node.js 22 或更高版本，再重新开启手机访问。' }
$client = Join-Path (Get-Location) 'tools/cloudflared.exe'
if (-not (Test-Path -LiteralPath $client)) {
  New-Item -ItemType Directory -Force -Path 'tools' | Out-Null
  Write-Host '正在从 Cloudflare 官方 GitHub 下载连接工具…'
  $download = $client + '.download.exe'
  Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $download
  $signature = Get-AuthenticodeSignature -FilePath $download
  if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Cloudflare') { Remove-Item -LiteralPath $download; throw 'Cloudflare 客户端签名验证失败，已停止启动。' }
  Move-Item -LiteralPath $download -Destination $client -Force
}
& node scripts/mobile-access.mjs
exit $LASTEXITCODE
