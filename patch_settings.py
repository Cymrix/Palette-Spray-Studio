import os

with open('index.html', 'r') as f:
    html = f.read()

# 1. Menu item
menu_target = """        <div class="menu-divider"></div>
        <button class="menu-item" id="aboutBtn">About</button>"""
menu_replace = """        <div class="menu-divider"></div>
        <button class="menu-item" id="appSettingsBtn">App Settings…</button>
        <button class="menu-item" id="aboutBtn">About</button>"""
if menu_target in html:
    html = html.replace(menu_target, menu_replace)
    print("Menu patched")

# 2. Modal HTML
modal_target = """  <!-- Theme Settings Movable/Resizable Modal -->"""
modal_replace = """  <!-- App Settings Movable/Resizable Modal -->
  <div class="color-edit-popup" id="appSettingsModal" style="display:none; width:280px; resize:both; overflow:auto; min-width:250px; min-height:150px; max-width:90vw; max-height:90vh; z-index:2200;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; cursor:move; padding-bottom:6px; border-bottom:1px solid var(--line);" id="appSettingsDragHandle">
      <div style="font-weight:600; font-size:12px; color:var(--text); display:flex; align-items:center; gap:6px;">⚙️ App Settings</div>
      <button class="btn small" id="appSettingsCloseBtn" style="padding:2px 6px; font-size:11px;">✕</button>
    </div>

    <label class="field" style="margin-top:0;">Tooltip Delay <span class="field-value" id="tooltipDelayVal">1.0s</span></label>
    <input type="range" id="tooltipDelaySlider" min="0" max="3" step="0.1" value="1.0">
    <div class="hint">How long to wait before showing a hover tooltip.</div>

    <div class="color-edit-actions" style="margin-top:16px;">
      <button class="btn small primary" id="appSettingsOkBtn">Done</button>
    </div>
  </div>

  <!-- Theme Settings Movable/Resizable Modal -->"""
if modal_target in html:
    html = html.replace(modal_target, modal_replace)
    print("Modal patched")

# 3. State & JS logic
state_target = """const APP_VERSION = 'v0.158'; // bump this on every deploy — shown only in the About popup"""
state_replace = """const APP_VERSION = 'v0.159'; // bump this on every deploy — shown only in the About popup

  let appSettings = { tooltipDelay: 1.0 };
  try {
    const savedSet = localStorage.getItem('pss_app_settings');
    if (savedSet) Object.assign(appSettings, JSON.parse(savedSet));
  } catch(e) {}
  
  function saveAppSettings() {
    localStorage.setItem('pss_app_settings', JSON.stringify(appSettings));
  }"""
if state_target in html:
    html = html.replace(state_target, state_replace)
    print("State patched")

# 4. JS Modal wiring
wiring_target = """  makePopupDraggable(document.getElementById('themeModal'), document.getElementById('themeModalDragHandle'));"""
wiring_replace = """  makePopupDraggable(document.getElementById('themeModal'), document.getElementById('themeModalDragHandle'));
  
  // App Settings Wiring
  const appSettingsModal = document.getElementById('appSettingsModal');
  const tooltipDelaySlider = document.getElementById('tooltipDelaySlider');
  const tooltipDelayVal = document.getElementById('tooltipDelayVal');
  
  function openAppSettings() {
    closeMenu();
    tooltipDelaySlider.value = appSettings.tooltipDelay;
    tooltipDelayVal.textContent = appSettings.tooltipDelay.toFixed(1) + 's';
    const rect = appSettingsModal.getBoundingClientRect();
    if (appSettingsModal.style.display === 'none' || !appSettingsModal.style.left) {
      appSettingsModal.style.left = Math.max(10, (window.innerWidth / 2) - 140) + 'px';
      appSettingsModal.style.top = Math.max(10, (window.innerHeight / 2) - 100) + 'px';
    }
    appSettingsModal.style.display = 'block';
  }
  
  function closeAppSettings() {
    appSettingsModal.style.display = 'none';
  }
  
  document.getElementById('appSettingsBtn').addEventListener('click', openAppSettings);
  document.getElementById('appSettingsCloseBtn').addEventListener('click', closeAppSettings);
  document.getElementById('appSettingsOkBtn').addEventListener('click', closeAppSettings);
  
  tooltipDelaySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    tooltipDelayVal.textContent = val.toFixed(1) + 's';
    appSettings.tooltipDelay = val;
    saveAppSettings();
  });
  
  makePopupDraggable(appSettingsModal, document.getElementById('appSettingsDragHandle'));"""
if wiring_target in html:
    html = html.replace(wiring_target, wiring_replace)
    print("Wiring patched")

# 5. Tooltip modification
tooltip_target = """      hoverTimer = setTimeout(() => {
        showTooltip(target, text);
      }, 3000);"""
tooltip_replace = """      hoverTimer = setTimeout(() => {
        showTooltip(target, text);
      }, appSettings.tooltipDelay * 1000);"""
if tooltip_target in html:
    html = html.replace(tooltip_target, tooltip_replace)
    print("Tooltip patched")

with open('index.html', 'w') as f:
    f.write(html)
