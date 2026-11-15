# PULSE mania trainer

Browser rhythm trainer with a server-backed osu! beatmap catalog, durable R2 map storage, and Canvas/Web Audio gameplay.

Play at https://aflyingkelp.github.io/pulse-mania-trainer/.

## Hosting

The Dan packs section contains all 26 archives indexed from danreform.com's all-in-one collection, including Jack, Speed, Stamina and Tech v1/v2, main courses, samples, pre-v1 and extras. Pack imports stream only the selected ZIP byte range, inflate nested OSZ files, verify the published ZIP CRC, and store media and individual charts in R2. Chart summaries are browsable without downloading every chart into browser memory. The published archive index and source checksum are in `worker/dan-catalog.mjs`; browser scores are trainer practice results, not certified Dan clears.

GitHub Actions tests and publishes the frontend to GitHub Pages on pushes to main. Run `npm run build:pages` to generate the static `pages/` artifact. Project-relative workers and service-worker caches support the `/pulse-mania-trainer/` path.

Map search, no-video downloads, installed maps, cover images and audio use the public backend at https://pulse-mania-4k-arcade.a-flying-kelp.chatgpt.site. The backend allows browser API requests from https://aflyingkelp.github.io. The Pages frontend sends no credentials to it. No API keys or GitHub secrets are required by the frontend workflow. Local chart/skin imports, scores, settings and cached audio remain in browser storage for each origin.

## Run

Playfield columns default to 128 px (512 px for 4K), automatically fit the available screen, and can be resized in the pause menu. Scroll speed uses osu!lazer's 1–40 scale (`11485 / speed` milliseconds). Change it in Settings, in the gameplay toolbar, or with F3/F4 and Ctrl/Shift + plus/minus. Old pixel-speed preferences migrate once.

Requires Node.js 20+. From this directory:

    npm ci
    npm start

Open http://127.0.0.1:4187. The local server stores downloaded maps in work/server-cache. Frontend source is in web/; server API source is in worker/. fflate is vendored with its MIT license in web/vendor.

## Verify

    npm test
    npm run build

The tests cover .osu parsing, modes, invalid objects, mirrors, deterministic column randomization, long notes, scoring, misses, rate/offset math, section filtering, scroll velocities, custom windows, drill generation, timing statistics, backup ZIP assets, and replay reconstruction. A synthetic .osz fixture is generated in fixtures/ for import testing.

## Features

- Server-mediated osu!mania catalog search via Mino, numeric IDs and official osu! URLs, key/star/status filters, difficulty selector and audio previews.
- Server-side no-video archive fetching (osu.direct with hinai fallback), native mania extraction, SHA-256 asset storage, durable server library, cross-device chart sync, audio range streaming.
- Native osu!mania .osu/.osz import, 1–10K, audio and background assets; ZIP extraction in a worker.
- Browser-local IndexedDB chart/audio library, search, key filters, sorting, favorites and collections.
- Configurable lane bindings per key mode; global and chart offsets, tap calibration.
- 0.25–2.50x rate, optional browser pitch preservation, mirror/seeded column random/no holds.
- A/B practice, seek and loop, auto rate progression, map bookmarks, weakest section practice.
- Six generated pattern families with adjustable BPM, density, duration, keys and seed.
- Custom windows, trainer scoring, no fail, hit sounds, metronome, scroll speed, optional map SV.
- Bars/circles/diamonds, accent color, lane width, upscroll, receptor height, dim and HUD controls.
- Results with timing scatter, error histogram, per-lane accuracy, mean offset and UR.
- Local attempt history, reproducible input replays, JSON replay/settings import and replay/settings/history export.
- ZIP library backups containing chart/audio/background data, scores and preferences.

## Important limits

Independent trainer scoring, not official osu!/Quaver compatibility. Trainer profiles can auto-complete held tails; the lazer timing profile requires release and uses release lenience. Full runs and practice are stored separately; autoplay/replay playback do not save scores. Quaver formats, .osr, keysounds, storyboards, external skins, multiplayer, rankings, a chart editor is not implemented. Audio codec support, keyboard rollover and scheduling latency depend on the browser/device. Focus loss pauses gameplay. A/B practice excludes notes that cross its boundaries.

Local imports stay in the browser. Online maps are downloaded and extracted by the server, then stored in the Site R2 bucket. The server never receives local imports. Browser preferences, scores and replay data remain device-local. Backups of hosted charts retain their server asset references. Use the Back up library button to protect data from browser eviction. Import limits: 220 MB per selected file, 180 MB per expanded archive entry, 650 MB total expanded selected entries. Backups merge into the current library.

## Reference

osu! file format: https://osu.ppy.sh/wiki/en/Client/File_formats/osu_(file_format)
ZIP library: fflate, MIT, https://github.com/101arrowz/fflate

## Server build and verification

    npm install
    npm test
    npm run build

The deterministic build emits dist/server/index.js as a self-contained Worker ESM bundle with embedded frontend assets. .openai/hosting.json keeps the same Site identity and declares the BUCKET R2 binding. Local preview emulates that storage on disk.

Online server import limits: 28 MB compressed archive; 4 MB per .osu; 12 MB aggregate .osu data; 24 MB per referenced audio/image and 36 MB aggregate referenced assets; 100,000 notes per chart. Unsupported/non-mania objects and publisher-disabled downloads are not imported. Existing large local import limits still apply separately.

API tests exercise input validation, mania-only search normalization, cross-origin installation refusal, server extraction and storage, cached reinstalls, persistent catalog entries, audio byte ranges, missing assets, disabled downloads and missing storage. Live browser verification includes a real 4K set (2446622), played from hosted assets.

Provider references: https://catboy.best/docs ; https://osu.direct ; https://osu.ppy.sh/docs/index.html

## v4 receptors, lazer timing, and local media cache

Piano, minimal and circular receptor caps align with notes at the hit line. Height, note size, glow, colors and judgment position are configurable with a live preview and searchable categorized settings. The lazer timing profile follows ManiaHitWindows OD ranges and rate-aware floor rounding, uses a separate miss window and release-based tails with 1.5x lenience. Early body breaks reset combo and cap recovered tails to Meh. Official score/health/body tick parity is not claimed.

Downloaded server assets are checked against SHA-256 names and persisted in a separate IndexedDB media cache, with an LRU budget and explicit cleanup. The authenticated app shell can fall back to a cached copy during network failure; authentication pages, server authorization and API responses are never bypassed by the service worker. Access denial is not retried. Provider redirects are HTTPS-only and hostname-allowlisted. The Worker applies a same-origin CSP. These measures improve security and outage resilience, not immunity to provider or network blocks.

## v5 round notes, hollow receptors, skipping and legacy mania skins

Built-in circles now use equal X/Y radii. Hollow receptors match the selected note shape with no filled center. Empty lead-ins and long no-note breaks can be skipped with Tab (or Space if unbound), preserving session judgments/score/combo and two seconds of real-time reading space. Skips are serialized in replays.

Legacy .osk and ZIP skin import is available in Appearance. Per-keycount mania sections, custom/default column sprite mappings, @2x PNGs, animations, hold bodies (stretched or tiled), keys, stage art, judgments and normal-hitnormal samples are supported. Layout includes widths, spacing, hit position, flip flags, keys-under-notes and note scale. The trainer is not a full native skin engine: menus, fonts and non-mania modes are not replaced; unsupported fields are reported and stage bounds stay centered in the trainer. Skin packs persist locally in separate IndexedDB stores and are not yet part of library ZIP backups.

Security limits: skin paths cannot address other filesystem/network locations; extraction accepts raster images, ini, and audio only. PNG/JPEG dimensions are checked before decoding. Imported code and SVGs are not executed. Skin archives are limited to 80 MB compressed, 128 MB expanded, 16 MB per file, 2,000 files and 24 megapixels of decoded active sprites.
