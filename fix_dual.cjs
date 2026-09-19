const fs = require('fs');
let content = fs.readFileSync('src/components/DualTranslator.tsx', 'utf8');
content = content.replace(/      \)\}\n  \);\n\}/, '      )}\n    </div>\n  );\n}');
fs.writeFileSync('src/components/DualTranslator.tsx', content);
