import re

with open('src/components/EncryptionResults.tsx', 'r') as f:
    text = f.read()

# simple count of <div and </div
print("<div", text.count("<div"))
print("</div", text.count("</div"))
print("<span", text.count("<span"))
print("</span", text.count("</span"))
print("<button", text.count("<button"))
print("</button", text.count("</button"))
