import re

with open('index.html', 'r') as f:
    html = f.read()

# Find all document.getElementById('...') regardless of addEventListener
matches = re.findall(r"document\.getElementById\('([^']+)'\)", html)

missing = []
for id in matches:
    if f'id="{id}"' not in html and f"id='{id}'" not in html:
        missing.append(id)

print(set(missing))
