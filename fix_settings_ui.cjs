const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// Replace Tables UI
const tableUIRegex = /<h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate" title=\{tbl.name\}>\{tbl\.name\}<\/h4>/g;
content = content.replace(tableUIRegex, `
                      {editingId === tbl.id && editingType === 'table' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            className="flex-1 min-w-0 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-hidden dark:bg-stone-900 dark:border-indigo-700"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate" title={tbl.name}>{tbl.name}</h4>
                          <button onClick={() => startEdit(tbl.id, tbl.name, 'table')} className="p-1 text-stone-400 hover:text-indigo-600 rounded-lg"><Edit3 className="w-3 h-3" /></button>
                        </div>
                      )}
`.trim());

// Replace Arabic Presets UI
const arabicUIRegex = /<h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">\{preset\.name\}<\/h4>/g;
content = content.replace(arabicUIRegex, `
                      {editingId === preset.id && editingType === 'arabic' ? (
                        <div className="flex items-center gap-1 w-full mr-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            className="flex-1 min-w-0 px-2 py-1 text-sm border border-emerald-300 rounded-lg focus:outline-hidden dark:bg-stone-900 dark:border-emerald-700"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 overflow-hidden">
                          <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">{preset.name}</h4>
                          <button onClick={() => startEdit(preset.id, preset.name, 'arabic')} className="p-1 text-stone-400 hover:text-emerald-600 rounded-lg shrink-0"><Edit3 className="w-3 h-3" /></button>
                        </div>
                      )}
`.trim());

// Replace Noorani Presets UI
// Wait, the regex for arabic applies to Noorani as well because it's exactly the same string? Yes: `<h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">{preset.name}</h4>`
// Let's do it differently.
