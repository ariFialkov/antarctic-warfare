# Antarctic Warfare

A whimsical 3D third-person shooter about warring factions of Antarctic animals, playable on desktop and mobile as an installable PWA.

No build step: it is a static site (vanilla ES modules + a vendored copy of three.js). All art is generated procedurally at load time.

**Play it:** https://arifialkov.github.io/antarctic-warfare/

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. To install as an app, host it over HTTPS (any static host, e.g. GitHub Pages) and use "Add to Home Screen" / "Install".

## Layout

| File | What it does |
| --- | --- |
| `js/data.js` | Factions, classes, weapons, map locations, Armoury (codex) text, bot names |
| `js/world.js` | Antarctica terrain from the planning-map outline: ice shelves, mountains, glaciers, rifts, crevasse fields, lakes, craters, pack ice, roads, ocean, sky, collision |
| `js/towns.js` | Settlements: faction architecture, landmarks, street furniture, harbours, perimeter walls |
| `js/scatter.js` | Wilderness dressing (wrecks, camps, huts, icebergs, road furniture), baked per map sector |
| `js/kit.js` | Bakes many primitives into single vertex-coloured meshes |
| `js/animals.js` | Skinned animal models: lofted bodies on skeletons, blended procedural animation, weapon-grip IK |
| `js/models.js` | Procedural weapons and vehicles |
| `js/game.js` | Renderer, characters, combat, bot AI, vehicles, camera |
| `js/modes.js` | Open World, Skirmish, Battle Royale and the outcome ("fate") system |
| `js/ui.js` | Menus, HUD, minimap, save slots (localStorage) |
| `js/input.js`, `js/audio.js` | Keyboard/mouse/touch input, synthesised sound |
| `sw.js`, `manifest.webmanifest` | PWA shell. Bump `VERSION` in `sw.js` on each release |

## How outcomes work

Every staked round has its result drawn before play starts by `rollFate()` in `js/modes.js`. The mode "directors" then steer the simulated battle so the visible result lands on the drawn one:

- **Skirmish**: win/lose is drawn (47.5% win, pays 2x). Bot accuracy/damage, reinforcements and fire missions keep the ticket race on a scripted curve.
- **Battle Royale**: final placement is drawn from a pay table. Eliminations run on a schedule; when the lobby reaches the drawn placement, hunters finish the player.
- **Open World sortie**: a hidden loot multiplier is drawn (crash-style, ~95% return). Reaching it summons bounty hunters; banking before then keeps the loot.

Opponents and teammates are bots. Odds and pay tables are constants at the top of `js/modes.js` and are shown to players under "How it works" in the menu. Coins are play money stored in the browser.
