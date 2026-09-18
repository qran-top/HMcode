import { PRESET_TABLES, ARABIC_PRESETS, NOORANI_PRESETS } from './src/cipherData.ts';

console.log("PRESET_TABLES:");
Object.keys(PRESET_TABLES).forEach(k => console.log(k, PRESET_TABLES[k as keyof typeof PRESET_TABLES].name));
console.log("\nARABIC_PRESETS:");
Object.keys(ARABIC_PRESETS).forEach(k => console.log(k, ARABIC_PRESETS[k].name));
console.log("\nNOORANI_PRESETS:");
Object.keys(NOORANI_PRESETS).forEach(k => console.log(k, NOORANI_PRESETS[k].name));
