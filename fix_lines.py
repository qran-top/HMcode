with open('src/components/EncryptionResults.tsx', 'r') as f:
    lines = f.readlines()

# Replace lines 856-859 (which are indices 855-858)
lines[856] = '        )}\n'
lines[857] = '      </div>\n'
lines[858] = '      )}\n'

with open('src/components/EncryptionResults.tsx', 'w') as f:
    f.writelines(lines)
