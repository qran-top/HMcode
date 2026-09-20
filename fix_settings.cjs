const fs = require('fs');

let content = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// 1. Add Edit3, X, Check to lucide-react imports
content = content.replace(
  "import { Sun, Moon, Download, Upload, Trash2, Database, Key, BookOpen, Settings } from 'lucide-react';",
  "import { Sun, Moon, Download, Upload, Trash2, Database, Key, BookOpen, Settings, Edit3, X, Check } from 'lucide-react';"
);

// 2. Add update functions to destructuring
content = content.replace(
  "deleteSavedNooraniPreset,",
  "deleteSavedNooraniPreset,\n    updateSavedTableName,\n    updateSavedArabicPresetName,\n    updateSavedNooraniPresetName,"
);

// 3. Add states
content = content.replace(
  "const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);",
  "const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);\n  const [editingId, setEditingId] = useState<string | null>(null);\n  const [editValue, setEditValue] = useState('');\n  const [editingType, setEditingType] = useState<'table' | 'arabic' | 'noorani' | null>(null);\n\n  const startEdit = (id: string, name: string, type: 'table' | 'arabic' | 'noorani') => {\n    setEditingId(id);\n    setEditValue(name);\n    setEditingType(type);\n  };\n\n  const saveEdit = () => {\n    if (!editValue.trim() || !editingId || !editingType) return;\n    if (editingType === 'table') updateSavedTableName(editingId, editValue);\n    if (editingType === 'arabic') updateSavedArabicPresetName(editingId, editValue);\n    if (editingType === 'noorani') updateSavedNooraniPresetName(editingId, editValue);\n    setEditingId(null);\n    setEditValue('');\n    setEditingType(null);\n  };\n"
);

fs.writeFileSync('src/components/SettingsView.tsx', content);
