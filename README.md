<div align="center">

# mcloud

**A [Spicetify](https://spicetify.app) theme that makes Spotify look like Apple Music.**

A persistent sidebar, a floating player, a cover-art library view and Spicy Lyrics integration.

<img width="1254" height="1254" alt="Unknown" src="https://github.com/user-attachments/assets/5dfe8c2c-c5fa-4b0d-8bb3-d43596734af8" />


</div>

> [!NOTE]
> The theme's own menus and messages follow Spotify's language: Turkish when Spotify is in Turkish, English otherwise. Pick one yourself under **mcloud → Language** (*Dil*).

## Installation

[Spicetify](https://spicetify.app/docs/getting-started) must already be installed. The install command does not install Spicetify; it only installs the theme.

**macOS / Linux**

```sh
curl -fsSL https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.sh | sh
```

**Windows** (PowerShell, *not* run as administrator)

```powershell
iwr -useb https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.ps1 | iex
```

The script:

1. Checks that Spicetify is installed. If it isn't, it tells you what to do and stops.
2. Downloads `theme.js`, `user.css` and `color.ini` into Spicetify's `Themes/AppleMusicMac` folder.
3. Selects the theme (with `inject_css` and `inject_theme_js` on) and runs `spicetify apply`, taking a backup first if needed.

> [!TIP]
> The lyrics buttons work with the [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) extension, which you can install from the Spicetify Marketplace.

## Features

- **Apple Music layout:** A persistent left sidebar with red icons, your profile in the bottom-left corner, and Home as the start page.
- **Apple Music player:** Grows with the window up to 700 pixels, then stays centred over the content. The glass picks up the colour of the page underneath. The centre shows the album artwork, the song title and a scrolling "Artist — Album" line.
  - The thin progress bar along the bottom is always clickable. On hover it thickens, shows elapsed and remaining time, and the digits roll as they change, just like Apple Music.
  - Hovering the artwork reveals a full-screen button.
  - ☆ adds the song to Liked Songs. The "…" menu lets you go to the album or artist and copy a link.
- **Artist pages:** Redrawn in the Apple Music style.
  - Full-width artist image, a large name, and play and follow buttons.
  - Latest Release and Top Songs side by side, followed by shelves for Albums, Singles & EPs, Upcoming Concerts, Appears On and Similar Artists.
  - The whole window takes on the artist's colour.
  - To switch to Spotify's own page, choose *Open Spotify's Page* (*Spotify Sayfasında Aç*) from the "…" menu in the top right.
- **Library:** Your playlists, albums and artists, shown with their artwork. Filter by name, and sort by library order or A–Z.
- **Playlists in the sidebar:** Your pinned playlists and folders, then the five you played most recently (pick how many under *mcloud*), as in Spotify's own sidebar sorted by Recents. A speaker marks the one playing. The **+** next to *Playlists* makes a new playlist or folder: name it in place and press <kbd>Enter</kbd>. When a playlist you play moves up, its row slides into place. *Show All* at the end opens the full list; while it is open, *Show Less* sits on the *Playlists* heading, which stays at the top of the sidebar.
- **Track numbers:** Hide the numbers beside songs in playlists and albums from Spotify's own *Columns* menu above the track list (*Track number*) or under *mcloud*. Titles move into their place, and the play button shows over the artwork.
- **Spicy Lyrics:** Toggle lyrics and go full screen right from the player.
- **Accent colour:** Red, pink, orange, yellow, green, teal, blue, purple or Spotify green.
- **Typeface:** On macOS the theme uses Apple's own SF Pro. On Windows and Linux it uses Inter, embedded in the theme, so nothing is downloaded from the internet.
- **Lightweight:** Only the artwork on screen is loaded. Off-screen artwork is released, and background work pauses while the window is hidden.

## Settings

Click **your profile** in the bottom-left corner to pick an accent colour or open your Spotify profile and settings. More settings live under Spotify's **profile menu (top right) → mcloud**:

| Setting | Description |
| --- | --- |
| *Artwork in player* (*Oynatıcıda albüm kapağı*) | Shows the current track's artwork in the player. |
| *Liquid Glass player* (*Liquid Glass oynatıcı*) | A macOS 26-style glass effect: the page behind refracts along the player's edges. Turn it off to go back to classic frosted glass. |
| *Glass effect: Full / Balanced / Eco* (*Cam efekti: Tam / Dengeli / Eko*) | **Balanced** (default) uses the real glass everywhere except the Spicy Lyrics page, where its background redraws every frame and the glass would be redrawn with it; there the surfaces keep the glass look without the blur. **Full** keeps the real glass there too and works the GPU hard. **Eco** swaps the glass and blur effects for solid surfaces everywhere. |
| *Recent playlists: None / 3 / 5 / 10 / 20* (*Son listeler: …*) | How many recently played playlists the sidebar lists under your pinned ones (default 5). Fewer keeps the sidebar calm; more saves clicks. *Show All* still lists every playlist. |
| *Track numbers* (*Parça numaraları*) | Shows the numbers beside songs in playlists and albums (on by default). The same switch is in Spotify's *Columns* menu above the track list, as *Track number*. |
| *Colour: …* (*Renk: …*) | Changes the accent colour. |
| *Language: …* (*Dil: …*) | *Automatic* follows Spotify's language; *English* or *Türkçe* fixes it. Spotify reloads to apply it. |

Settings are stored on this computer and survive Spotify restarts.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Click / drag the progress bar | Seeks to that point in the song. |
| Drag the sidebar's right edge | Widens or narrows the sidebar. Double-click to reset it. |
| Scroll wheel over the volume icon | Changes volume in perceptual (exponential / audio-taper) steps that match how we hear. |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>F</kbd> (in the library) | Focuses the filter box. |
| <kbd>Esc</kbd> (in the filter box) | Clears the filter. |

## Updating and uninstalling

To update, run the install command again. If the theme disappears after a Spotify update, running the same command is all you need.

To uninstall:

```sh
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.sh | sh -s -- --uninstall
```

```powershell
# Windows
& ([scriptblock]::Create((iwr -useb https://raw.githubusercontent.com/bulutakbulutt/mcloud/main/install.ps1))) -Uninstall
```

To install a specific version, use `--ref <tag>` (`-Ref <tag>` on Windows).

<details>
<summary><b>Manual installation</b></summary>

Copy `theme.js`, `user.css` and `color.ini` into Spicetify's theme folder:

| System | Folder |
| --- | --- |
| macOS / Linux | `~/.config/spicetify/Themes/AppleMusicMac/` |
| Windows | `%APPDATA%\spicetify\Themes\AppleMusicMac\` |

Then run:

```sh
spicetify config current_theme AppleMusicMac color_scheme Dark inject_css 1 inject_theme_js 1
spicetify apply
```

</details>

## Troubleshooting

<details>
<summary><b>Spotify updated and the theme is gone</b></summary>

Run the install command again. If needed, the script also tries `spicetify backup apply` or `spicetify restore backup apply`.
</details>

<details>
<summary><b>"Permission denied" on Linux</b></summary>

Spicetify needs write access to Spotify's folder. The script detects this and prints the commands you need, usually:

```sh
sudo chmod a+wr /usr/share/spotify
sudo chmod a+wr -R /usr/share/spotify/Apps
```

Spotify installed through Snap does not work with Spicetify. Use the Flatpak, AUR or spotify.com package instead.
</details>

<details>
<summary><b>Spicetify doesn't work on Windows</b></summary>

The Microsoft Store version of Spotify is not supported; install the one from [spotify.com](https://www.spotify.com/download/windows/). Don't run PowerShell as administrator.
</details>

<details>
<summary><b>"Spicy Lyrics henüz hazır değil" (Spicy Lyrics isn't ready yet)</b></summary>

Spicy Lyrics is either not installed or hasn't loaded yet. Install the extension from the Marketplace and wait for Spotify to finish loading.
</details>

## Compatibility

Built on macOS with Spotify 1.3.6.1921 and Spicetify 2.46.2. The install scripts work on macOS, Linux and Windows, but the theme has been tested most on macOS. Spotify UI updates may require adjustments; if you run into a problem, please [open an issue](https://github.com/bulutakbulutt/mcloud/issues) with your Spotify and Spicetify versions.

## License

mcloud is free and open source under the [MIT License](LICENSE). The embedded Inter typeface keeps its own licence, the [SIL Open Font License](licenses/Inter-OFL.txt).

## Special thanks

Thanks to the Spicetify community for providing such a great platform.
Thanks also to emribilemir and f0rknturkoglu for their contributions.

This is not an official project and is not affiliated with Apple or Spotify. The theme uses Spotify content.
