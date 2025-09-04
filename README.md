# Animated Animal Atlas

Explore a highly animated website of animals with images and sounds, organized into categories: Amphibians, Mammals, Birds, Reptiles, Fish, and Insects.

Quick start:

1. Open `index.html` in a browser.
2. Use the category bar to filter animals.
3. Click a card to view details and play sounds. Use the sound toggle in the header to mute/unmute.

Notes:
- The previous 3D sphere implementation has been removed. Use `index.html` instead.
- Remote images and sounds are loaded from Wikipedia and Pixabay; a short synthesized tone plays if any sound URL fails.

Directories:
- `assets/animals.json` – animal data used by the site
- `assets/app.js` – UI logic and animations (no three.js)
- `assets/style.css` – styles and motion effects