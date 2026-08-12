import os

with open('index.html', 'r') as f:
    html = f.read()

target1 = "if (menuSave) menuSave.innerHTML = '☁️ Save to Cloud';"
replace1 = "if (menuSave) menuSave.innerHTML = 'Save to Cloud';"

target2 = "if (menuSave) menuSave.innerHTML = '💾 Save Project';"
replace2 = "if (menuSave) menuSave.innerHTML = 'Save Project';"

if target1 in html and target2 in html:
    html = html.replace(target1, replace1)
    html = html.replace(target2, replace2)
    print("Patched save icon in menu")

with open('index.html', 'w') as f:
    f.write(html)
