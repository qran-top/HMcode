import { PRESET_TABLES, ARABIC_PRESETS, NOORANI_PRESETS } from './src/cipherData.ts';

const PRESET_KEYS = Object.keys(PRESET_TABLES) as (keyof typeof PRESET_TABLES)[];
const ARABIC_KEYS = Object.keys(ARABIC_PRESETS);
const NOORANI_KEYS = Object.keys(NOORANI_PRESETS);

console.log("PRESET_KEYS:", PRESET_KEYS);
console.log("ARABIC_KEYS:", ARABIC_KEYS);
console.log("NOORANI_KEYS:", NOORANI_KEYS);
