// Static game data: factions, classes, weapons, locations, codex.

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

export const FACTIONS = {
  penguins: {
    name: 'Penguins', tag: 'The Huddle', color: 0xff8a1f, css: '#ff8a1f', playable: true,
    hp: 100, land: 1.0, swim: 1.0,
    blurb: 'Disciplined inland army. Masters of snowball artillery and armour. Fast belly-sliders, strongest on the ice.',
    home: 'huddle',
  },
  seals: {
    name: 'Seals', tag: 'The Colony Teams', color: 0x23b8a8, css: '#23b8a8', playable: true,
    hp: 115, land: 0.92, swim: 1.35,
    blurb: 'Elite amphibious special forces. Small teams, drones, and surprise landings from the surf.',
    home: 'blubber',
  },
  orcas: {
    name: 'Orcas', tag: 'The Pod Armada', color: 0x7a5cff, css: '#7a5cff', playable: true,
    hp: 150, land: 0.8, swim: 1.6,
    blurb: 'Rulers of the sea. Heavy, slow on land, devastating firepower and echolocation-guided war machines.',
    home: 'blackfin',
  },
  walrus: {
    name: 'Walrus', tag: 'The Northern Tusk', color: 0xd9433b, css: '#d9433b', playable: false,
    hp: 170, land: 0.75, swim: 1.2,
    blurb: 'Mysterious invaders from the north aboard massive iceberg destroyers. The only navy that rivals the Orcas.',
  },
  albatross: {
    name: 'Albatross', tag: 'The Long Watch', color: 0xf2c230, css: '#f2c230', playable: false,
    hp: 80, land: 1.1, swim: 0.9,
    blurb: 'Loyal native birds circling the continent, ferrying supplies and watching for threats.',
  },
};

// type: semi | auto | shotgun | sniper | launcher | flame | melee
export const WEAPONS = {
  b22:     { name: 'Balloneige 22', type: 'semi', dmg: 24, rate: 4.2, mag: 15, reload: 1.5, speed: 150, spread: 0.012, range: 90, col: 0xffffff },
  b350:    { name: 'Balloneige 350', type: 'auto', dmg: 11, rate: 11, mag: 60, reload: 2.8, speed: 140, spread: 0.035, range: 80, col: 0xffffff },
  flurry:  { name: 'Flurry GL', type: 'launcher', dmg: 70, rate: 0.9, mag: 4, reload: 2.6, speed: 48, spread: 0.01, range: 110, blast: 6.5, col: 0xbfe6ff },
  icico:   { name: 'IciCo 50', type: 'sniper', dmg: 85, rate: 0.8, mag: 5, reload: 2.5, speed: 320, spread: 0.001, range: 220, col: 0x9fe8ff },
  krill:   { name: 'Krillspitter', type: 'auto', dmg: 8, rate: 15, mag: 30, reload: 1.3, speed: 120, spread: 0.05, range: 40, col: 0xff9e8a },
  freon:   { name: 'Freonese', type: 'flame', dmg: 5, rate: 20, mag: 120, reload: 3, speed: 34, spread: 0.12, range: 16, col: 0x8af2ff },
  icepick: { name: 'Icepick', type: 'melee', dmg: 55, rate: 2, mag: Infinity, reload: 0, range: 2.6, col: 0xd0f4ff },
  amph12:  { name: 'Amphibian 12', type: 'shotgun', dmg: 9, pellets: 8, rate: 1.6, mag: 6, reload: 2.2, speed: 110, spread: 0.07, range: 38, col: 0xf2e9c8 },
  sardine: { name: 'Sardine SMG', type: 'auto', dmg: 9, rate: 13, mag: 32, reload: 1.6, speed: 130, spread: 0.04, range: 55, col: 0xc8d8e8 },
  narwhal: { name: 'Narwhal LR', type: 'sniper', dmg: 80, rate: 0.9, mag: 5, reload: 2.4, speed: 300, spread: 0.001, range: 220, col: 0xfff4d6 },
  blubber: { name: 'Blubberbuss HMG', type: 'auto', dmg: 13, rate: 9, mag: 80, reload: 3.4, speed: 135, spread: 0.04, range: 85, col: 0xf2e9c8 },
  harpoon: { name: 'Harpoon RL', type: 'launcher', dmg: 80, rate: 0.7, mag: 2, reload: 3, speed: 60, spread: 0.008, range: 120, blast: 6, col: 0xffc16b },
  clam:    { name: 'Clamknife', type: 'melee', dmg: 50, rate: 2.2, mag: Infinity, reload: 0, range: 2.6, col: 0xf2e9c8 },
  rain:    { name: 'Rainmaker', type: 'auto', dmg: 16, rate: 8, mag: 70, reload: 3.2, speed: 150, spread: 0.035, range: 95, col: 0x7fd4ff },
  sonar:   { name: 'Ping Carbine', type: 'semi', dmg: 27, rate: 3.6, mag: 14, reload: 1.6, speed: 170, spread: 0.01, range: 100, col: 0xb69cff },
  riptide: { name: 'Riptide Mortar', type: 'launcher', dmg: 85, rate: 0.65, mag: 3, reload: 3, speed: 46, spread: 0.01, range: 120, blast: 7.5, col: 0x7fd4ff },
  spout:   { name: 'Spout Pistol', type: 'semi', dmg: 18, rate: 5.5, mag: 12, reload: 1.2, speed: 130, spread: 0.02, range: 50, col: 0x7fd4ff },
  brass:   { name: 'Brass Tail', type: 'melee', dmg: 75, rate: 1.3, mag: Infinity, reload: 0, range: 3.4, col: 0xe0b34a },
  finblade:{ name: 'Fin Blade', type: 'melee', dmg: 60, rate: 2.4, mag: Infinity, reload: 0, range: 3, col: 0xdfe8f2 },
  tusk:    { name: 'Tuskbreaker', type: 'shotgun', dmg: 10, pellets: 7, rate: 1.3, mag: 5, reload: 2.4, speed: 110, spread: 0.08, range: 36, col: 0xffe0c0 },
  floe:    { name: 'Floe Cannon', type: 'auto', dmg: 14, rate: 7, mag: 50, reload: 3, speed: 135, spread: 0.04, range: 85, col: 0xffb0a0 },
  quill:   { name: 'Quill Repeater', type: 'semi', dmg: 20, rate: 4.5, mag: 12, reload: 1.5, speed: 160, spread: 0.014, range: 95, col: 0xfff2a8 },
};

// special: grenade | strike | heal | dash
export const SPECIALS = {
  grenade: { name: 'Snowball Frag', cd: 9, icon: '💣' },
  strike:  { name: 'Fire Mission', cd: 28, icon: '🎯' },
  heal:    { name: 'Field Kit', cd: 18, icon: '✚' },
  dash:    { name: 'Belly Rush', cd: 7, icon: '💨' },
};

export const CLASSES = {
  penguins: [
    { id: 'rifleman', name: 'Rifleman', desc: 'Core manoeuvre element. Reliable Balloneige 22 and an Icepick.', w: ['b22', 'icepick'], special: 'grenade', hp: 1, speed: 1.05 },
    { id: 'autorifle', name: 'Automatic Rifleman', desc: 'Balloneige 350 for suppression and high-volume snow.', w: ['b350', 'krill'], special: 'dash', hp: 1.1, speed: 0.95 },
    { id: 'grenadier', name: 'Grenadier', desc: 'Flurry launcher lobs packed snow behind cover.', w: ['flurry', 'b22'], special: 'grenade', hp: 1, speed: 1 },
    { id: 'marksman', name: 'Marksman', desc: 'IciCo 50 icicle rail gun. The sniper of the Huddle.', w: ['icico', 'krill'], special: 'dash', hp: 0.9, speed: 1 },
    { id: 'commander', name: 'Tank Commander', desc: 'Freonese in hand, Avalanche battery on call.', w: ['freon', 'krill'], special: 'strike', strike: 'Avalanche Barrage', hp: 1.05, speed: 0.95 },
  ],
  seals: [
    { id: 'navigator', name: 'Navigator', desc: 'Leads the team in. Fast, sharp, shotgun up front.', w: ['amph12', 'sardine'], special: 'dash', hp: 1, speed: 1.1 },
    { id: 'breacher', name: 'Breacher', desc: 'Explosive forced entry. Urchin charges and buckshot.', w: ['amph12', 'clam'], special: 'grenade', hp: 1.1, speed: 1 },
    { id: 'sniper', name: 'Sniper', desc: 'Long-range overwatch with a Skua drone on call.', w: ['narwhal', 'sardine'], special: 'strike', strike: 'Skua Drone Strike', hp: 0.9, speed: 1 },
    { id: 'medic', name: 'Medic', desc: 'Trauma care under fire. Keeps the team swimming.', w: ['sardine', 'clam'], special: 'heal', hp: 1, speed: 1.05 },
    { id: 'heavy', name: 'Heavy Weapons Operator', desc: 'Blubberbuss HMG and Harpoon launcher.', w: ['blubber', 'harpoon'], special: 'grenade', hp: 1.15, speed: 0.9 },
  ],
  orcas: [
    { id: 'armoured', name: 'Armoured Orca', desc: 'A living tank. Smashes through lines with the Brass Tail.', w: ['rain', 'brass'], special: 'dash', hp: 1.3, speed: 0.9 },
    { id: 'gunner', name: 'Rainmaker Gunner', desc: 'Back-mounted .50 cal. Makes it rain.', w: ['rain', 'spout'], special: 'grenade', hp: 1, speed: 1 },
    { id: 'echo', name: 'Echo Operator', desc: 'Directs the unmanned fleet by echolocation. Giant Petrel on call.', w: ['sonar', 'spout'], special: 'strike', strike: 'Giant Petrel Bombing Run', hp: 0.95, speed: 1 },
    { id: 'tsunami', name: 'Tsunami Crew', desc: 'Portable Riptide mortar, little sibling of the Tsunami howitzer.', w: ['riptide', 'sonar'], special: 'heal', hp: 1, speed: 0.95 },
    { id: 'raider', name: 'Fin Blade Raider', desc: 'Close-quarters shock trooper.', w: ['spout', 'finblade'], special: 'dash', hp: 1.05, speed: 1.15 },
  ],
  walrus: [
    { id: 'tusker', name: 'Tusk Marine', desc: '', w: ['tusk', 'brass'], special: 'grenade', hp: 1, speed: 1 },
    { id: 'floegun', name: 'Floe Gunner', desc: '', w: ['floe', 'tusk'], special: 'grenade', hp: 1, speed: 0.95 },
  ],
  albatross: [
    { id: 'warden', name: 'Sky Warden', desc: '', w: ['quill', 'icepick'], special: 'dash', hp: 1, speed: 1.1 },
  ],
};

// Map locations. px/py are coordinates on the 1500x1109 planning map.
// size 1..3, landmark = unique set-piece, heritage = older faction architecture mixed in.
export const LOCATIONS = [
  { id: 'roost', name: "Wanderer's Roost", px: 165, py: 57, f: 'albatross', size: 1, landmark: 'spire', kind: 'Rookery' },
  { id: 'blubber', name: 'Blubber Point', px: 133, py: 194, f: 'seals', size: 3, landmark: 'lighthouse', kind: 'Fortress Harbour' },
  { id: 'flipper', name: 'Port Flipper', px: 93, py: 203, f: 'seals', size: 2, landmark: 'wreck', kind: 'Harbour' },
  { id: 'kelp', name: 'Kelpstead', px: 126, py: 249, f: 'seals', size: 2, landmark: 'hotspring', kind: 'Village' },
  { id: 'whisker', name: 'Whisker Wharf', px: 118, py: 286, f: 'seals', size: 1, landmark: 'skeleton', kind: 'Fishing Spot' },
  { id: 'barnacle', name: 'Barnacle Row', px: 157, py: 292, f: 'seals', size: 2, landmark: 'totem', kind: 'Town' },
  { id: 'drift', name: 'Driftwood Hollow', px: 229, py: 324, f: 'seals', size: 1, landmark: 'bonfire', kind: 'Lodge' },
  { id: 'danger', name: 'Danger Bay Lodge', px: 190, py: 398, f: 'seals', size: 2, landmark: 'bell', kind: 'Outpost' },
  { id: 'slippery', name: 'Slippery Alley', px: 272, py: 408, f: 'penguins', heritage: 'seals', size: 3, landmark: 'skijump', kind: 'Old Town' },
  { id: 'flurry', name: 'Fort Flurry', px: 224, py: 438, f: 'penguins', size: 2, landmark: 'castle', kind: 'Fortress' },
  { id: 'sealhenge', name: 'Sealhenge', px: 340, py: 384, f: 'penguins', heritage: 'seals', size: 1, landmark: 'henge', kind: 'Ancient Site' },
  { id: 'windbreak', name: 'Windbreak', px: 279, py: 478, f: 'penguins', size: 1, landmark: 'turbines', kind: 'Outpost' },
  { id: 'frostbite', name: 'Frostbite Junction', px: 350, py: 486, f: 'penguins', size: 2, landmark: 'clock', kind: 'Rail Town' },
  { id: 'coldfoot', name: 'Coldfoot', px: 378, py: 515, f: 'penguins', size: 1, landmark: 'snowman', kind: 'Village' },
  { id: 'slushford', name: 'Slushford', px: 431, py: 512, f: 'penguins', size: 2, landmark: 'market', kind: 'Market Town' },
  { id: 'berkner', name: 'Berkner Roost', px: 468, py: 354, f: 'penguins', size: 2, landmark: 'radar', kind: 'Island Base' },
  { id: 'huddle', name: 'Huddle City', px: 455, py: 442, f: 'penguins', size: 3, landmark: 'ferris', kind: 'Capital' },
  { id: 'pebble', name: 'Pebble Market', px: 496, py: 481, f: 'penguins', size: 2, landmark: 'statue', kind: 'Town' },
  { id: 'gate', name: "Emperor's Gate", px: 526, py: 425, f: 'penguins', size: 2, landmark: 'arch', kind: 'Garrison' },
  { id: 'krillx', name: 'The Krill Exchange', px: 617, py: 99, f: 'penguins', size: 2, landmark: 'market', kind: 'Trading Post' },
  { id: 'aurora', name: 'Aurora Station', px: 946, py: 133, f: 'penguins', size: 2, landmark: 'observatory', kind: 'Research Base' },
  { id: 'snowglobe', name: 'Snowglobe', px: 968, py: 184, f: 'penguins', size: 1, landmark: 'globe', kind: 'Village' },
  { id: 'tuskfall', name: 'Tuskfall Landing', px: 1079, py: 195, f: 'walrus', size: 2, landmark: 'dreadnought', kind: 'Invasion Beachhead' },
  { id: 'redfloe', name: 'Red Floe Berth', px: 1117, py: 251, f: 'walrus', size: 2, landmark: 'dreadnought', kind: 'Iceberg Dock' },
  { id: 'amery', name: 'Amery Deep', px: 1164, py: 368, f: 'orcas', size: 2, landmark: 'crystals', kind: 'Sea Outpost' },
  { id: 'straitguard', name: 'Strait Guard', px: 246, py: 600, f: 'penguins', size: 2, landmark: 'battery', kind: 'Artillery Fort' },
  { id: 'westwatch', name: 'Westwatch', px: 244, py: 640, f: 'seals', size: 1, landmark: 'lighthouse', kind: 'Watchtower' },
  { id: 'chinstrap', name: 'Chinstrap Landing', px: 300, py: 621, f: 'penguins', size: 2, landmark: 'windmill', kind: 'Harbour Village' },
  { id: 'blackfin', name: 'Blackfin Harbour', px: 317, py: 702, f: 'orcas', size: 3, landmark: 'leviathan', kind: 'Fleet Capital' },
  { id: 'podhaven', name: 'Podhaven', px: 338, py: 751, f: 'orcas', size: 2, landmark: 'ribs', kind: 'Town' },
  { id: 'breach', name: 'Breach Bay', px: 346, py: 794, f: 'orcas', size: 1, landmark: 'crystals', kind: 'Fishing Grounds' },
  { id: 'echo', name: 'Echo Docks', px: 416, py: 818, f: 'orcas', size: 2, landmark: 'sonar', kind: 'Drone Yard' },
  { id: 'calver', name: "Calver's Rest", px: 491, py: 836, f: 'orcas', size: 2, landmark: 'calver', kind: 'Siege Works' },
  { id: 'maw', name: 'Maw of Ross', px: 586, py: 809, f: 'orcas', size: 2, landmark: 'ribs', kind: 'Fortress' },
  { id: 'rossisle', name: 'Smoking Isle', px: 730, py: 848, f: 'penguins', heritage: 'orcas', size: 2, landmark: 'volcano', kind: 'Island Garrison' },
  { id: 'petrel', name: 'Petrel Launch', px: 805, py: 986, f: 'orcas', size: 2, landmark: 'airfield', kind: 'Bomber Base' },
  { id: 'gale', name: 'Gale Nest', px: 978, py: 983, f: 'albatross', size: 1, landmark: 'spire', kind: 'Rookery' },
  { id: 'pole', name: 'The Pole', px: 667, py: 555, f: 'penguins', size: 2, landmark: 'pole', kind: 'Monument Outpost' },
  { id: 'shrine', name: 'The Unreachable Shrine', px: 938, py: 712, f: 'albatross', size: 1, landmark: 'monolith', kind: 'Mystery' },
];

export const BOT_NAMES = [
  'xX_Waddle_Xx', 'FrostByte', 'krill_bill', 'SirFlopsALot', 'IceIceBaby99', 'Blubberino', 'TuxedoMask', 'pingu_fan42',
  'SnowDaddy', 'ColdShoulder', 'FinDiesel', 'OrcaStrated', 'SealTeam6ix', 'happy_feetz', 'NoKrillNoThrill', 'Brrrrito',
  'GlacierGlock', 'chillbro', 'FlipperSnipes', 'AntarcticAce', 'N0rthPole_L', 'ShiverMeTimbrs', 'Sn0wCone', 'BigBelugaEnergy',
  'pebble_giver', 'IcyHot', 'TheRealPingu', 'slippy.exe', 'WhaleHello', 'MackerelMike', 'DeepFreeze', 'ZeroKelvin',
  'squidlover', 'EmperorNero', 'Rockhopper_R', 'gentoo_linux', 'BlowholeBandit', 'CodCommander', 'Adelie_A', 'FishSlap',
  'sub_zero_', 'PolarOpposite', 'TobogganTed', 'snowproblem', 'IglooIan', 'haddockhadit', 'TunaTurner', 'Mr_Popper',
  'frozenpeas', 'NippyNoodle', 'bergmeister', 'sleetstreet', 'ChumBucket', 'WalrusWhsprr', 'Kowalski', 'Skipp3r', 'riko_boom', 'Pr1vate',
];

export const CODEX = [
  { f: 'penguins', cat: 'Vehicles', items: [
    ['Waddle Technical', 'Super fast, lightweight, fuel-efficient snowmobile. Everyone just calls it the "Waddle".'],
    ['Abominable Snowman MLRS', 'Rocket-artillery vehicle capable of saturating large areas with packed snow.'],
    ['Icecrawler IFV', 'Low, wide tracked vehicle carrying a full huddle of infantry.'],
    ['P1 Emperor', 'Crown jewel of the penguin army. Heavy armour, climbs rugged ice dunes, massive snowball gun.'],
    ['P2 Gentoo', 'Smaller, more mobile medium tank. Drivable in the open world.'],
    ['P4 Rockhopper', 'Older generation tank. Bounces more than it should.'],
    ['Pebble Skiff', 'Inflatable dinghy for shore raids. Named after the traditional courting gift.'],
    ['Floebreaker Schooner', 'Twin-mast patrol schooner with a reinforced ice-cutting prow.'],
    ['Katabatic-class Corvette', 'Fast escort warship named for the winds that scream off the plateau.'],
  ] },
  { f: 'penguins', cat: 'Artillery', items: [
    ['Blizzard', 'Snowball mortar. Light, quick, everywhere.'],
    ['Avalanche', 'Primary long-range snowball artillery. Easy to reload, reliably accurate, lasts forever.'],
    ['Hailstorm', 'High-powered mid-range iceball artillery. Deadly when it works; famously temperamental.'],
  ] },
  { f: 'penguins', cat: 'Handheld', items: [
    ['Balloneige 22', 'Semi-automatic, carbon-powered hardened-snowball gun. Standard infantry carry.'],
    ['Balloneige 350', 'Automatic, mountable hardened-snowball machine gun.'],
    ['Freonese', 'Freonthrower. Freezes what it touches.'],
    ['IciCo 50', 'Long-distance .50 cal sharpened-icicle rail gun.'],
    ['Icepick', 'Slender combat knife. Digs into ice and thick blubber alike.'],
    ['Krillspitter', 'Ice-shard PDW for vehicle crews and tunnel fighting.'],
    ['Flurry GL', 'Break-action grenade launcher lobbing packed-snow charges.'],
  ] },
  { f: 'penguins', cat: 'Specials', items: [
    ['Huddle Formation', 'Infantry lock flippers and rotate the outer rank, shrugging off storms and suppressing fire.'],
    ['Toboggan Charge', 'Mass belly-slide assault downhill. Terrifying, slightly adorable.'],
  ] },
  { f: 'seals', cat: 'Vehicles', items: [
    ['Mako', 'Super fast FPV waterborne suicide drone that skims the surface.'],
    ['Manta SDV', 'Submersible swimmer delivery vehicle. Main transport for waterborne Seal teams.'],
    ['Sandpiper Buggy', 'Stripped-down beach assault buggy with balloon tyres.'],
  ] },
  { f: 'seals', cat: 'Artillery', items: [
    ['Sea Urchin', 'Cluster mortar that scatters spiked sub-munitions over a beachhead.'],
    ['Conch 81', 'Shell-shaped breech-loading mortar. Sings before it lands.'],
  ] },
  { f: 'seals', cat: 'Handheld', items: [
    ['Amphibian 12', '12-gauge amphibious shotgun. Fires as well under water as above it.'],
    ['Sardine SMG', 'Compact, oily, and never jams.'],
    ['Narwhal LR', 'Tusk-barrelled long rifle for overwatch.'],
    ['Blubberbuss HMG', 'Crew-served heavy machine gun that one very determined seal can carry.'],
    ['Harpoon RL', 'Anti-armour rocket launcher.'],
    ['Clamknife', 'Opens clams. Opens other things.'],
  ] },
  { f: 'seals', cat: 'Specials', items: [
    ['Skua', 'Small reconnaissance/attack FPV drone named after a natural enemy of the penguin.'],
    ['Breathing Hole Insertion', 'Teams surface through pre-cut holes in the shelf ice, deep behind the line.'],
  ] },
  { f: 'orcas', cat: 'Vehicles', items: [
    ['Leviathan', '"The Floating Armada". One-of-a-kind flagship bristling with guns and missile defence, steered by echolocation.'],
    ['Remora', 'Unmanned escort gunboat that clings to the Leviathan\'s wake.'],
    ['Kelp Cutter', 'Fast unmanned minesweeper and blockade runner.'],
  ] },
  { f: 'orcas', cat: 'Artillery', items: [
    ['Tsunami', 'Massive back-mounted howitzer. The barrel pokes above the water; the rest stays submerged to cool, conceal and stabilise.'],
    ['Riptide Mortar', 'Man-portable (orca-portable) little sibling of the Tsunami.'],
  ] },
  { f: 'orcas', cat: 'Handheld', items: [
    ['Brass Tail', 'Weighted brass fluke-cap. One slap ends most arguments.'],
    ['Fin Blade', 'Razor edge fitted to the dorsal fin.'],
    ['Rainmaker', '.50 cal machine gun, back mountable.'],
    ['O110 Super-Calver', 'Massive laser tunnel-borer slung between four orcas. Calves the face off a glacier, fortress and all.'],
    ['Ping Carbine', 'Sonar-sighted carbine. Never loses a target.'],
  ] },
  { f: 'orcas', cat: 'Specials', items: [
    ['Giant Petrel', 'Large unmanned high-altitude bomber launched from sea. Reaches inland strongholds that used to out-range the pod.'],
    ['Armoured Orcas', 'Live swimming tanks that smash icebergs and dig into the coastline.'],
  ] },
  { f: 'walrus', cat: 'Fleet', items: [
    ['Iceberg Destroyer', 'A hollowed, armoured iceberg carrying gun decks and an entire tusk battalion.'],
    ['Tuskbreaker', 'Boarding shotgun.'],
    ['Floe Cannon', 'Deck gun cut down for shore parties.'],
  ] },
  { f: 'albatross', cat: 'Wings', items: [
    ['Quill Repeater', 'Light rifle carried on supply runs.'],
    ['Supply Drop', 'Crates from the mainlands, delivered wherever the wind allows.'],
  ] },
];
