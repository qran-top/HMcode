const fs = require('fs');

let content = fs.readFileSync('src/context/CipherLayersContext.tsx', 'utf8');

const arrArabic = content.match(/const updateSavedArabicPresetName = useCallback\(\(id: string, name: string\) => \{[\s\S]*?\}, \[\]\);/g);
if (arrArabic && arrArabic.length > 1) {
    for(let i=0; i<arrArabic.length-1; i++) {
        content = content.replace(arrArabic[i], '');
    }
}

const arrNoorani = content.match(/const updateSavedNooraniPresetName = useCallback\(\(id: string, name: string\) => \{[\s\S]*?\}, \[\]\);/g);
if (arrNoorani && arrNoorani.length > 1) {
    for(let i=0; i<arrNoorani.length-1; i++) {
        content = content.replace(arrNoorani[i], '');
    }
}

fs.writeFileSync('src/context/CipherLayersContext.tsx', content);
