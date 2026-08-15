# Dynamic Island for Web

A standalone Chrome Extension that brings an Apple-style Dynamic Island to every webpage, automatically syncing with background media tabs (like Apple Music, Spotify, or YouTube).

## Installation

This extension is provided as an unpacked directory.

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** using the toggle in the top right corner.
3. Click the **Load unpacked** button.
4. Select this folder (`chrome-dynamic-island`).

## Features
- Automatically floats at the top of every webpage you visit.
- Syncs metadata (Title, Artist, Artwork) from active media tabs.
- Extracts dominant colors from the album artwork to theme the island and glow.
- Provides playback controls (Play, Pause, Prev, Next, Seek).
- Fetches and displays time-synced lyrics inside a glassmorphic panel.
- Hides automatically when media stops playing or the mouse leaves the vicinity.

## Permissions Required
- `tabs` and `scripting` - Used by the background worker to find the active media tab and extract playback data without injecting heavy code into every tab.
- `<all_urls>` - Allows the visual Dynamic Island to appear on any page you visit.
