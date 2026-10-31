# mcloud - one-line theme installer for Windows.
#
#   iwr -useb https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.ps1 | iex
#   & ([scriptblock]::Create((iwr -useb https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.ps1))) -Uninstall
#
# Installs only the theme; Spicetify must already be installed. Downloads the
# theme into Spicetify's Themes folder, selects it and applies it. Running it
# again updates the theme.
#
# Keep this file pure ASCII: Windows PowerShell 5.1 reads BOM-less files as
# ANSI, and a BOM breaks `iwr | iex`. Turkish text goes through T with \u escapes.
param(
  [switch]$Uninstall,
  [string]$Ref = $(if ($env:MCLOUD_REF) { $env:MCLOUD_REF } else { 'main' })
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# Spicetify prints UTF-8; decode it as such and let the console show Turkish letters.
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$Repo = if ($env:MCLOUD_REPO) { $env:MCLOUD_REPO } else { 'bulutakbulutt/mcloud' }
$Theme = 'AppleMusicMac'
$Scheme = 'Dark'
$Files = 'theme.js', 'user.css', 'color.ini'

function T([string]$Text) { [regex]::Unescape($Text) }
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

# Spicetify's own error output explains failures best; show only the last attempt.
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
  Write-Fail (T 'PowerShell''i y\u00f6netici olarak de\u011fil, normal kullan\u0131c\u0131 olarak a\u00e7\u0131n; Spicetify y\u00f6netici modunda \u00e7al\u0131\u015fmay\u0131 reddeder.')
}

$script:Spicetify = Find-Spicetify
if (-not $script:Spicetify) {
  Write-Fail (T 'Spicetify bulunamad\u0131. \u00d6nce Spicetify''\u0131 kurun: https://spicetify.app/docs/getting-started')
}
Write-Ok "Spicetify: $(Invoke-Spicetify -v | Select-Object -Last 1)"

$config = Invoke-Spicetify -c | Where-Object { $_ -like '*config-xpui.ini' } | Select-Object -Last 1
$configDir = if ($config) { Split-Path -Parent $config } else { Join-Path $env:APPDATA 'spicetify' }
$themeDir = Join-Path $configDir "Themes\$Theme"
# The theme settings mcloud replaced, so -Uninstall can put them back.
$stateFile = Join-Path $themeDir 'previous.ini'

function Get-Setting([string]$Key) { "$(Invoke-Spicetify config $Key | Select-Object -Last 1)".Trim() }
function Get-Saved([string]$Key) {
  if (-not (Test-Path -LiteralPath $stateFile)) { return '' }
  $line = Get-Content -LiteralPath $stateFile | Where-Object { $_ -like "$Key=*" } | Select-Object -Last 1
  if ($line) { $line.Substring($Key.Length + 1).Trim() } else { '' }
}
function Or([string]$Value, [string]$Default) { if ($Value) { $Value } else { $Default } }

if ($Uninstall) {
  Write-Step (T 'mcloud kald\u0131r\u0131l\u0131yor...')
  if ((Get-Setting current_theme) -eq $Theme) {
    $prevTheme = Get-Saved current_theme; $prevScheme = Get-Saved color_scheme
    # Marketplace installs its themes only while its placeholder theme is selected.
    if (-not $prevTheme -and (Test-Path -LiteralPath (Join-Path $configDir 'Themes\marketplace'))) { $prevTheme = 'marketplace'; $prevScheme = '' }
    Invoke-Spicetify config current_theme (Or $prevTheme ' ') color_scheme (Or $prevScheme ' ') `
      inject_css (Or (Get-Saved inject_css) '1') inject_theme_js (Or (Get-Saved inject_theme_js) '0') | Out-Null
    if ($prevTheme) { Write-Ok ((T '\u00d6nceki tema geri y\u00fcklendi: ') + $prevTheme) }
  }
  if (Test-Path -LiteralPath $themeDir) { Remove-Item -LiteralPath $themeDir -Recurse -Force }
  if (-not (Invoke-Apply)) { Write-Fail (T 'Spicetify uygulanamad\u0131. Yukar\u0131daki \u00e7\u0131kt\u0131y\u0131 kontrol edin.') }
  Write-Ok (T 'mcloud kald\u0131r\u0131ld\u0131.')
  return
}

# Run from a clone: use the local files instead of downloading.
$source = if ($PSCommandPath -and (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $PSCommandPath) 'theme.js'))) {
  Split-Path -Parent $PSCommandPath
}

$staging = Join-Path ([IO.Path]::GetTempPath()) ("mcloud-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $staging | Out-Null
try {
  if ($source) {
    Write-Step ((T 'Yerel dosyalar kullan\u0131l\u0131yor: ') + $source)
    foreach ($file in $Files) { Copy-Item -LiteralPath (Join-Path $source $file) -Destination $staging }
  }
  else {
    # raw.githubusercontent.com caches a branch for minutes; pin its current commit so a fresh push installs at once.
    $pin = $Ref
    try {
      $sha = (Invoke-WebRequest -UseBasicParsing -Headers @{ Accept = 'application/vnd.github.sha' } -Uri "https://api.github.com/repos/$Repo/commits/$Ref").Content
      if ($sha -is [byte[]]) { $sha = [Text.Encoding]::ASCII.GetString($sha) }
      if ("$sha".Trim() -match '^[0-9a-f]{40}$') { $pin = "$sha".Trim() }
    }
    catch {}
    $label = if ($pin -ne $Ref) { "$Repo@$Ref, commit $($pin.Substring(0, 7))" } else { "$Repo@$Ref" }
    Write-Step ((T 'Tema indiriliyor') + " ($label)...")
    foreach ($file in $Files) {
      Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$Repo/$pin/$file" -OutFile (Join-Path $staging $file)
    }
  }
  New-Item -ItemType Directory -Path $themeDir -Force | Out-Null
  # Updating over mcloud keeps the settings saved by the first install.
  if ((Get-Setting current_theme) -ne $Theme) {
    $state = foreach ($key in 'current_theme', 'color_scheme', 'inject_css', 'inject_theme_js') { "$key=$(Get-Setting $key)" }
    [IO.File]::WriteAllLines($stateFile, [string[]]$state)
  }
  foreach ($file in $Files) { Copy-Item -LiteralPath (Join-Path $staging $file) -Destination $themeDir -Force }
}
finally {
  Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Ok ((T 'Tema dosyalar\u0131: ') + $themeDir)

Write-Step (T 'Spicetify ayarlan\u0131yor...')
Invoke-Spicetify config current_theme $Theme color_scheme $Scheme inject_css 1 inject_theme_js 1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail (T 'Spicetify ayarlar\u0131 yaz\u0131lamad\u0131.') }

Write-Step (T 'Spotify''a uygulan\u0131yor (Spotify yeniden ba\u015flayacak)...')
if (-not (Invoke-Apply)) {
  Write-Fail (T 'Spicetify uygulanamad\u0131. Spotify''\u0131n en az bir kez a\u00e7\u0131l\u0131p kapat\u0131ld\u0131\u011f\u0131ndan emin olup tekrar deneyin. Microsoft Store s\u00fcr\u00fcm\u00fc desteklenmez; spotify.com s\u00fcr\u00fcm\u00fcn\u00fc kullan\u0131n.')
}

Write-Ok (T 'mcloud kuruldu. Ayarlar: sol alttaki profil veya Spotify''\u0131n profil men\u00fcs\u00fc -> mcloud.')
Write-Host (T '    S\u00f6z d\u00fc\u011fmeleri i\u00e7in Spicy Lyrics eklentisini Spicetify Marketplace \u00fczerinden kurun.')
