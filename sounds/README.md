# Sounds folder

Place MP3 files here with the following names to enable audio playback:

- blue_jay.mp3
- owl.mp3
- tiger.mp3
- elephant.mp3

Notes:
- Files are referenced in `animals.json` as `sounds/<name>.mp3` and are loaded via `chrome.runtime.getURL`.
- If a sound file is missing, the extension will play a brief fallback beep so the UI remains responsive.

