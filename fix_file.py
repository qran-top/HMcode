import sys

def main():
    lines_to_fix = [634, 653, 660, 663, 666, 671, 676, 730, 790, 810, 828, 831, 875, 918, 946, 959]
    with open('src/components/EncryptionResults.tsx', 'r') as f:
        lines = f.readlines()
        
    for l in lines_to_fix:
        idx = l - 1
        if idx < len(lines):
            lines[idx] = lines[idx].rstrip() + ")}\n"
            
    with open('src/components/EncryptionResults.tsx', 'w') as f:
        f.writelines(lines)

if __name__ == '__main__':
    main()
