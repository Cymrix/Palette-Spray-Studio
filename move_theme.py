import os

with open('index.html', 'r') as f:
    html = f.read()

# 1. Remove "Theme Settings" button from the File Menu.
# 2. Extract theme content and place it in appSettingsModal
# 3. Update JS bindings

# Find the theme modal content
theme_start_str = "<!-- Theme Preset Select -->"
theme_end_str = "<!-- OK / Cancel Buttons -->"
theme_start_idx = html.find(theme_start_str)
theme_end_idx = html.find(theme_end_str)

theme_content = html[theme_start_idx:theme_end_idx]

# Remove the theme modal
theme_modal_start_str = '<!-- Theme Settings Movable/Resizable Modal -->'
theme_modal_end_str = '  <div class="topbar">'
theme_modal_start_idx = html.find(theme_modal_start_str)
theme_modal_end_idx = html.find(theme_modal_end_str)

html = html[:theme_modal_start_idx] + html[theme_modal_end_idx:]

# Put theme_content inside appSettingsModal
app_settings_modal_start = '    <div class="hint">How long to wait before showing a hover tooltip.</div>'
app_settings_modal_replace = app_settings_modal_start + '\n\n    <div style="border-top:1px solid var(--line); margin:12px 0; padding-top:10px;"></div>\n\n' + theme_content

html = html.replace(app_settings_modal_start, app_settings_modal_replace)

with open('index.html', 'w') as f:
    f.write(html)
print("Theme modal content moved")

