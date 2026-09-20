import re

with open('src/components/EncryptionResults.tsx', 'r') as f:
    text = f.read()

div_starts = len(re.findall(r'<div', text))
div_ends = len(re.findall(r'</div', text))
print(f"<div: {div_starts}, </div: {div_ends}")

# Let's write a simple script to find the mismatched div by tracking depth
# It's hard in Python with JSX, let's just use the compiler.
