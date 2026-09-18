import re

with open('src/components/EncryptionResults.tsx', 'r') as f:
    lines = f.readlines()

for i in range(len(lines)):
    line = lines[i]
    # match any line containing '={() => ' but ending abruptly after a variable name
    if '={() => ' in line and not line.rstrip().endswith('}') and not line.rstrip().endswith(';'):
        # Just append )} to the stripped line
        lines[i] = line.rstrip() + ')}\n'

with open('src/components/EncryptionResults.tsx', 'w') as f:
    f.writelines(lines)
