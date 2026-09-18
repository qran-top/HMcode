import re

with open('src/components/EncryptionResults.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<span' in line and '/>' not in line and '</span' not in line:
        print(f"Line {i+1}: {line.strip()}")
