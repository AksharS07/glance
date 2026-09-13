# Privacy Policy — Glance Browser Extension

*Last updated: September 2026*

## Summary

Glance does not collect, store, or transmit any personal data. All data stays on your device.

---

## Data Collection

**Glance collects no user data.** The extension does not track you, profile you, or send any personal information to any server.

## External API Calls

To provide its features, Glance makes the following outbound requests **on your behalf**:

| Service | Purpose | Data Sent |
|---|---|---|
| lrclib.net | Fetch time-synced lyrics | Song title, artist name |
| LyricsPlus | Fetch time-synced lyrics (fallback) | Song title, artist name |
| iTunes Search API (apple.com) | Fetch high-resolution album artwork | Song title, artist name |
| Google Translate API | Romanize non-Latin lyrics (optional, on demand) | Lyrics text |

Only the song currently playing is ever referenced. No browsing history, user identity, or personal information is included in any of these requests.

## Local Storage

Glance uses `chrome.storage.local` to save your preferences on your own device:

- Island position on screen
- Feature toggles (lyrics, AMOLED mode, free placement)
- Focus Mode settings (blocklist, session lengths, strict mode)
- First-run onboarding state

This data never leaves your device.

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `tabs` | Find the active music tab; implement cross-tab PiP; redirect blocked tabs in Focus Mode |
| `scripting` | Send playback controls (play/pause/seek) to music platform UI elements |
| `storage` | Save user preferences locally |
| `alarms` | Pomodoro timer transitions and Bypass Once expiry |
| `declarativeNetRequestWithHostAccess` | Redirect blocked sites to the local blocked page during Focus Mode |
| `notifications` | Notify when a focus session or break ends |
| `host permissions` | Inject the island overlay and read media state on all pages |

## No Remote Code

Glance does not execute any remotely fetched code. All JavaScript is bundled within the extension package. External services are queried for data (lyrics, artwork, translations) only — never for executable code.

## Contact

For questions or concerns, open an issue at:  
**https://github.com/AksharS07/glance/issues**
