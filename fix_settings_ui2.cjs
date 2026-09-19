const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

content = content.replace(
  /onClick=\{\(\) => startEdit\(preset\.id, preset\.name, 'arabic'\)\}/g,
  (match, offset, str) => {
    // If it's in the Noorani section (which has Key icon / "إدارة توزيعات أحرف التشفير"), change it to 'noorani'
    // Let's just find the second occurrence and replace it.
    return match;
  }
);
// Actually, it's easier to just do a string replace on the second occurrence.
let firstIndex = content.indexOf("startEdit(preset.id, preset.name, 'arabic')");
let secondIndex = content.indexOf("startEdit(preset.id, preset.name, 'arabic')", firstIndex + 1);
if (secondIndex !== -1) {
  content = content.substring(0, secondIndex) + "startEdit(preset.id, preset.name, 'noorani')" + content.substring(secondIndex + "startEdit(preset.id, preset.name, 'arabic')".length);
}

fs.writeFileSync('src/components/SettingsView.tsx', content);
