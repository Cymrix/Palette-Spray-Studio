import os

with open('index.html', 'r') as f:
    html = f.read()

target = """  function openThemeModal() {
    // Snapshot the current theme selection state before user modifications
    themeSnapshotBeforeOpening = JSON.parse(JSON.stringify(activeThemeState));

    const modal = document.getElementById('themeModal');
    modal.style.display = 'block';
    const popupRect = modal.getBoundingClientRect();
    modal.style.left = Math.max(10, (window.innerWidth - popupRect.width) / 2) + 'px';
    modal.style.top = Math.max(10, (window.innerHeight - popupRect.height) / 2) + 'px';
  }

  function closeThemeModal() {
    document.getElementById('themeModal').style.display = 'none';
    if (typeof closeHslColorPicker === 'function') {
      closeHslColorPicker();
    }
  }

  function cancelThemeChanges() {
    if (themeSnapshotBeforeOpening) {
      if (themeSnapshotBeforeOpening.type === 'preset' && themeSnapshotBeforeOpening.key) {
        applyTheme(themeSnapshotBeforeOpening.key);
      } else if (themeSnapshotBeforeOpening.type === 'custom_saved' && themeSnapshotBeforeOpening.id) {
        applyTheme('custom_' + themeSnapshotBeforeOpening.id);
      } else if (themeSnapshotBeforeOpening.type === 'custom_live' && themeSnapshotBeforeOpening.data) {
        applyTheme(themeSnapshotBeforeOpening.data, true);
      }
    }
    closeThemeModal();
  }"""

if target in html:
    html = html.replace(target, "")
    print("Removed unused theme modal functions")

with open('index.html', 'w') as f:
    f.write(html)
