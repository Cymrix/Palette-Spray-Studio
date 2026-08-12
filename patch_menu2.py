import os

with open('index.html', 'r') as f:
    html = f.read()

menu_theme_target = """        <div class="menu-row" style="justify-content:space-between; gap: 12px;">
          <span>Theme</span>
          <select id="themeSelect" style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:4px;font-size:12px;padding:2px 4px;">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="midnight">Midnight</option>
            <option value="dracula">Dracula</option>
            <option value="monokai">Monokai</option>
            <option value="nord">Nord</option>
            <option value="solarized-dark">Solarized Dark</option>
            <option value="solarized-light">Solarized Light</option>
            <option value="synthwave">Synthwave</option>
            <option value="gruvbox">Gruvbox</option>
            <option value="emerald">Emerald</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <button class="menu-item" id="openThemeModalBtn">Theme Settings…</button>"""

if menu_theme_target in html:
    html = html.replace(menu_theme_target, "")
    print("Removed Theme from file menu")
else:
    print("Could not find theme in menu")
    
with open('index.html', 'w') as f:
    f.write(html)
