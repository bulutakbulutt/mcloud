#!/bin/sh
# mcloud — macOS ve Linux için tek komutla kurulum.
#
#   curl -fsSL https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.sh | sh
#   curl -fsSL https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.sh | sh -s -- --uninstall
#
# Yalnızca temayı kurar; Spicetify'ın önceden kurulu olması gerekir. Tema
# dosyalarını Spicetify'ın Themes klasörüne indirir, temayı seçer ve uygular.
# Tekrar çalıştırmak temayı günceller.
set -eu

REPO="${MCLOUD_REPO:-bulutakbulutt/mcloud}"
REF="${MCLOUD_REF:-main}"
THEME="AppleMusicMac"
SCHEME="Dark"
FILES="theme.js user.css color.ini"

if [ -t 1 ]; then
  bold=$(printf '\033[1m'); red=$(printf '\033[31m'); green=$(printf '\033[32m'); yellow=$(printf '\033[33m'); reset=$(printf '\033[0m')
else
  bold=''; red=''; green=''; yellow=''; reset=''
fi
step() { printf '%s==>%s %s\n' "$bold" "$reset" "$*"; }
ok() { printf '%s✓%s %s\n' "$green" "$reset" "$*"; }
warn() { printf '%s!%s %s\n' "$yellow" "$reset" "$*" >&2; }
die() { printf '%s✗ %s%s\n' "$red" "$*" "$reset" >&2; exit 1; }

usage() {
  cat <<EOF
Kullanım: install.sh [--uninstall] [--ref DAL|ETİKET]

  --uninstall   mcloud temasını kaldırır ve Spotify'ı varsayılan görünüme döndürür.
  --ref REF     Belirli bir dal, etiket veya commit'ten kurar (varsayılan: main).
  -h, --help    Bu yardımı gösterir.

Ortam değişkenleri: MCLOUD_REF, MCLOUD_REPO
EOF
}

action=install
while [ $# -gt 0 ]; do
  case "$1" in
    --uninstall) action=uninstall ;;
    --ref) [ $# -ge 2 ] || die "--ref bir değer bekliyor."; REF="$2"; shift ;;
    --ref=*) REF="${1#*=}" ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "Bilinmeyen seçenek: $1" ;;
  esac
  shift
done

[ "$(id -u)" -ne 0 ] || die "Bu betiği sudo/root olmadan çalıştırın; Spicetify root ile çalışmayı reddeder."
command -v curl >/dev/null 2>&1 || die "curl bulunamadı. Önce curl kurun."

tmp=$(mktemp -d "${TMPDIR:-/tmp}/mcloud.XXXXXX")
trap 'rm -rf "$tmp"' EXIT INT TERM

find_spicetify() {
  if command -v spicetify >/dev/null 2>&1; then command -v spicetify
  elif [ -x "$HOME/.spicetify/spicetify" ]; then printf '%s\n' "$HOME/.spicetify/spicetify"
  else return 1
  fi
}

# Spicetify'ın kendi hata çıktısı en anlaşılır açıklamadır; yalnızca son denemeyi göster.
apply_theme() {
  for attempt in "apply" "backup apply" "restore backup apply"; do
    # shellcheck disable=SC2086 # attempt is a fixed list of subcommands.
    if "$spicetify" $attempt >"$tmp/apply.log" 2>&1; then return 0; fi
  done
  cat "$tmp/apply.log" >&2
  return 1
}

linux_hints() {
  [ "$(uname -s)" = Linux ] || return 0
  if command -v snap >/dev/null 2>&1 && snap list spotify >/dev/null 2>&1; then
    warn "Snap ile kurulu Spotify, Spicetify ile çalışmaz. Flatpak, AUR veya spotify.com paketini kullanın."
  fi
  spotify_path=$("$spicetify" config spotify_path 2>/dev/null || true)
  if [ -n "$spotify_path" ] && [ -d "$spotify_path" ] && [ ! -w "$spotify_path" ]; then
    warn "Spicetify'ın Spotify klasörüne yazma izni yok: $spotify_path"
    printf '  Şu komutlarla izin verin ve kurulumu tekrar çalıştırın:\n'
    printf '    sudo chmod a+wr "%s"\n    sudo chmod a+wr -R "%s/Apps"\n' "$spotify_path" "$spotify_path"
  fi
}

spicetify=$(find_spicetify) || die "Spicetify bulunamadı. Önce Spicetify'ı kurun: https://spicetify.app/docs/getting-started"
ok "Spicetify: $("$spicetify" -v 2>/dev/null | tail -n 1)"

config=$("$spicetify" -c 2>/dev/null | grep 'config-xpui.ini' | tail -n 1 || true)
if [ -n "$config" ]; then config_dir=$(dirname "$config"); else config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"; fi
theme_dir="$config_dir/Themes/$THEME"

if [ "$action" = uninstall ]; then
  step "mcloud kaldırılıyor…"
  if [ "$("$spicetify" config current_theme 2>/dev/null || true)" = "$THEME" ]; then
    "$spicetify" config current_theme " " color_scheme " " inject_theme_js 0 >/dev/null
  fi
  rm -rf "$theme_dir"
  apply_theme || die "Spicetify uygulanamadı. Yukarıdaki çıktıyı kontrol edin."
  ok "mcloud kaldırıldı."
  exit 0
fi

# install.sh bir klondan çalıştırıldığında indirmek yerine yerel dosyaları kullan.
src=''
case "$0" in */install.sh|install.sh) [ -f "$(dirname "$0")/theme.js" ] && src=$(cd "$(dirname "$0")" && pwd) ;; esac

mkdir -p "$tmp/theme"
if [ -n "$src" ]; then
  step "Yerel dosyalar kullanılıyor: $src"
  for f in $FILES; do cp "$src/$f" "$tmp/theme/$f"; done
else
  step "Tema indiriliyor ($REPO@$REF)…"
  for f in $FILES; do
    curl -fsSL "https://raw.githubusercontent.com/$REPO/$REF/$f" -o "$tmp/theme/$f" || die "$f indirilemedi."
  done
fi

mkdir -p "$theme_dir"
for f in $FILES; do cp "$tmp/theme/$f" "$theme_dir/$f"; done
ok "Tema dosyaları: $theme_dir"

step "Spicetify ayarlanıyor…"
"$spicetify" config current_theme "$THEME" color_scheme "$SCHEME" inject_css 1 inject_theme_js 1 >/dev/null

step "Spotify'a uygulanıyor (Spotify yeniden başlayacak)…"
if ! apply_theme; then
  linux_hints
  die "Spicetify uygulanamadı. Spotify'ın en az bir kez açılıp kapatıldığından emin olup tekrar deneyin."
fi

ok "mcloud kuruldu. Ayarlar: sol alttaki profil veya Spotify'ın profil menüsü → mcloud."
printf '  Söz düğmeleri için Spicy Lyrics eklentisini Spicetify Marketplace üzerinden kurun.\n'
