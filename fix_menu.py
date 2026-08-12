import os

with open('index.html', 'r') as f:
    html = f.read()

target = "    closeMenu();"
replacement = "    closeFileMenu();"

if target in html:
    html = html.replace(target, replacement)
    print("Fixed closeMenu to closeFileMenu")
else:
    print("closeMenu not found")

with open('index.html', 'w') as f:
    f.write(html)
