import os

with open('index.html', 'r') as f:
    html = f.read()

target_html = '<div class="hint" id="aboutWebglStatus" style="margin-top:4px;"></div>'
replace_html = '<div class="hint" style="margin-top:4px;">This app is free and open source</div>'

target_js = """    document.getElementById('aboutWebglStatus').textContent = pixiAvailable
      ? 'WebGL acceleration (stamp spray): Active'
      : 'WebGL acceleration (stamp spray): Unavailable — using the standard Canvas 2D path instead';"""

if target_html in html:
    html = html.replace(target_html, replace_html)
    print("Replaced HTML in about popup")
else:
    print("Could not find HTML target")

if target_js in html:
    html = html.replace(target_js, "")
    print("Removed JS setting webgl status")
else:
    print("Could not find JS target")

with open('index.html', 'w') as f:
    f.write(html)
