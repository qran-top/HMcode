const fs = require('fs');

let content = fs.readFileSync('src/context/CipherLayersContext.tsx', 'utf8');

// There are multiple declarations of updateSavedArabicPresetName. Let's find all blocks matching `const updateSavedArabicPresetName = useCallback...` and keep only the last one.
const arrArabic = content.match(/const updateSavedArabicPresetName = useCallback\(\(id: string, name: string\) => {[\s\S]*?}, \[\]\);/g);
if (arrArabic && arrArabic.length > 1) {
    // replace all but the last one with empty string
    for(let i=0; i<arrArabic.length-1; i++) {
        content = content.replace(arrArabic[i], '');
    }
}

const arrNoorani = content.match(/const updateSavedNooraniPresetName = useCallback\(\(id: string, name: string\) => {[\s\S]*?}, \[\]\);/g);
if (arrNoorani && arrNoorani.length > 1) {
    // replace all but the last one with empty string
    for(let i=0; i<arrNoorani.length-1; i++) {
        content = content.replace(arrNoorani[i], '');
    }
}

fs.writeFileSync('src/context/CipherLayersContext.tsx', content);
