# mcloud - Windows için tek komutla kurulum.
#
#   iwr -useb https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.ps1 | iex
#   & ([scriptblock]::Create((iwr -useb https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.ps1))) -Uninstall
#
# Yalnızca temayı kurar; Spicetify'ın önceden kurulu olması gerekir. Tema
# dosyalarını Spicetify'ın Themes klasörüne indirir, temayı seçer ve uygular.
# Tekrar çalıştırmak temayı günceller.
param(
  [switch]$Uninstall,
  [string]$Ref = $(if ($env:MCLOUD_REF) { $env:MCLOUD_REF } else { 'main' })
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = if ($env:MCLOUD_REPO) { $env:MCLOUD_REPO } else { 'bulutakbulutt/mcloud' }
$Theme = 'AppleMusicMac'
$Scheme = 'Dark'
$Files = 'theme.js', 'user.css', 'color.ini'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "OK  $Text" -ForegroundColor Green }
function Write-Fail([string]$Text) { Write-Host "HATA $Text" -ForegroundColor Red; throw $Text }

function Find-Spicetify {
  $command = Get-Command spicetify -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($command) { return $command.Source }
  $local = Join-Path $env:LOCALAPPDATA 'spicetify\spicetify.exe'
  if (Test-Path -LiteralPath $local) { return $local }
  return $null
}

# Windows PowerShell 5.1 turns native stderr into terminating errors under 'Stop'.
function Invoke-Spicetify {
  $ErrorActionPreference = 'Continue'
  & $script:Spicetify @args 2>&1 | ForEach-Object { "$_" }
}

# Spicetify'ın kendi hata çıktısı en anlaşılır açıklamadır; yalnızca son denemeyi göster.
function Invoke-Apply {
  $output = $null
  foreach ($attempt in @(@('apply'), @('backup', 'apply'), @('restore', 'backup', 'apply'))) {
    $output = Invoke-Spicetify @attempt
    if ($LASTEXITCODE -eq 0) { return $true }
  }
  $output | ForEach-Object { Write-Host $_ }
  return $false
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Fail 'PowerShell''i yönetici olarak değil, normal kullanıcı olarak açın; Spicetify yönetici modunda çalışmayı reddeder.'
}

$script:Spicetify = Find-Spicetify
if (-not $script:Spicetify) {
  Write-Fail 'Spicetify bulunamadı. Önce Spicetify''ı kurun: https://spicetify.app/docs/getting-started'
}
Write-Ok "Spicetify: $(Invoke-Spicetify -v | Select-Object -Last 1)"

$config = Invoke-Spicetify -c | Where-Object { $_ -like '*config-xpui.ini' } | Select-Object -Last 1
$configDir = if ($config) { Split-Path -Parent $config } else { Join-Path $env:APPDATA 'spicetify' }
$themeDir = Join-Path $configDir "Themes\$Theme"

if ($Uninstall) {
  Write-Step 'mcloud kaldırılıyor...'
  if ((Invoke-Spicetify config current_theme | Select-Object -Last 1) -eq $Theme) {
    Invoke-Spicetify config current_theme ' ' color_scheme ' ' inject_theme_js 0 | Out-Null
  }
  if (Test-Path -LiteralPath $themeDir) { Remove-Item -LiteralPath $themeDir -Recurse -Force }
  if (-not (Invoke-Apply)) { Write-Fail 'Spicetify uygulanamadı. Yukarıdaki çıktıyı kontrol edin.' }
  Write-Ok 'mcloud kaldırıldı.'
  return
}

# install.ps1 bir klondan çalıştırıldığında indirmek yerine yerel dosyaları kullan.
$source = if ($PSCommandPath -and (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $PSCommandPath) 'theme.js'))) {
  Split-Path -Parent $PSCommandPath
}

$staging = Join-Path ([IO.Path]::GetTempPath()) ("mcloud-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $staging | Out-Null
try {
  if ($source) {
    Write-Step "Yerel dosyalar kullanılıyor: $source"
    foreach ($file in $Files) { Copy-Item -LiteralPath (Join-Path $source $file) -Destination $staging }
  }
  else {
    Write-Step "Tema indiriliyor ($Repo@$Ref)..."
    foreach ($file in $Files) {
      Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$Repo/$Ref/$file" -OutFile (Join-Path $staging $file)
    }
  }
  New-Item -ItemType Directory -Path $themeDir -Force | Out-Null
  foreach ($file in $Files) { Copy-Item -LiteralPath (Join-Path $staging $file) -Destination $themeDir -Force }
}
finally {
  Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Ok "Tema dosyaları: $themeDir"

Write-Step 'Spicetify ayarlanıyor...'
Invoke-Spicetify config current_theme $Theme color_scheme $Scheme inject_css 1 inject_theme_js 1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail 'Spicetify ayarları yazılamadı.' }

Write-Step 'Spotify''a uygulanıyor (Spotify yeniden başlayacak)...'
if (-not (Invoke-Apply)) {
  Write-Fail 'Spicetify uygulanamadı. Spotify''ın en az bir kez açılıp kapatıldığından emin olup tekrar deneyin. Microsoft Store sürümü desteklenmez; spotify.com sürümünü kullanın.'
}

Write-Ok 'mcloud kuruldu. Ayarlar: Spotify''da profil menüsü -> mcloud.'
Write-Host '    Söz düğmeleri için Spicy Lyrics eklentisini Spicetify Marketplace üzerinden kurun.'
