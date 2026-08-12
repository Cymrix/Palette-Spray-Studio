import re

with open('index.html', 'r') as f:
    html = f.read()

# We look for something like:
# const/let varName = document.getElementById('something');
# varName.addEventListener

# Let's just find all .addEventListener and print the 5 lines before it if it's not a known safe object
lines = html.split('\n')
for i, line in enumerate(lines):
    if '.addEventListener(' in line:
        if 'document.addEventListener' in line or 'window.addEventListener' in line or 'document.getElementById' in line:
            continue
        if '?.addEventListener' in line:
            continue
        print(f"Line {i+1}: {line.strip()}")
        for j in range(max(0, i-3), i):
            print(f"   {lines[j].strip()}")
        print("-" * 40)
