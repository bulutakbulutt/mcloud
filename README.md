# AppleMusicMac

Apple Music görünümünden esinlenen, macOS için Spicetify teması.

## Özellikler

- Kalıcı sol menü ve Ana Sayfa açılışı.
- Apple Music tarzında yüzen oynatıcı ve Spotify üst çubuğu.
- Hesaptaki liste, albüm ve sanatçı verilerini kullanan kitaplık.
- Kurulu Spicy Lyrics için söz aç/kapat ve tam ekran kontrolleri.
- Ekrana yakın kapakları yükleme, görünmeyen kapak kaynaklarını bırakma ve gizli pencerede arka plan işlerini durdurma.

## Kurulum

Spicetify kurulu olmalıdır. `theme.js`, `user.css` ve `color.ini` dosyalarını `~/.config/spicetify/Themes/AppleMusicMac/` klasörüne koyun.

```sh
spicetify config current_theme AppleMusicMac color_scheme Dark inject_css 1 inject_theme_js 1
spicetify apply
```

Spicy Lyrics düğmelerini kullanmak için eklentinin ayrıca kurulu olması gerekir.

## Uyumluluk

Spotify 1.3.6.1921 ve Spicetify 2.46.2 üzerinde hazırlandı. Spotify arayüz güncellemeleri uyarlama gerektirebilir. Bellek optimizasyonları temanın kendi işlerini azaltır; toplam Spotify RAM kullanımı için ölçülmüş bir tasarruf yüzdesi verilmemektedir.

Apple veya Spotify ile bağlantılı resmî bir proje değildir. Tema Spotify içeriğini kullanır.
