with open('src/components/EncryptionResults.tsx', 'r') as f:
    lines = f.readlines()

# Insert </div> before the last )} of the combinations card block
# The block ends around line 857.
# Let's just insert it at index 857.
lines.insert(857, '      </div>\n')

with open('src/components/EncryptionResults.tsx', 'w') as f:
    f.writelines(lines)
