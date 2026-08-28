
(function(){
  const displayCanvas = document.getElementById('displayCanvas');
  const dctx = displayCanvas.getContext('2d', { willReadFrequently: true });
  const gridCanvas = document.getElementById('gridCanvas');
  const gctx = gridCanvas.getContext('2d', { willReadFrequently: true });
  const selectionCanvas = document.getElementById('selectionCanvas');
  const sctx = selectionCanvas.getContext('2d', { willReadFrequently: true });
  const cursorPreviewCanvas = document.getElementById('cursorPreviewCanvas');
  const colorHighlightCanvas = document.getElementById('colorHighlightCanvas');
  const pctx = cursorPreviewCanvas.getContext('2d', { willReadFrequently: true });
  function clearPreviewCanvas(){
    if(!pctx) return;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    pctx.clearRect(0, 0, effW + MARGIN_PX*2, effH + MARGIN_PX*2);
  }
  const modalPreviewCanvas = document.getElementById('modalPreviewCanvas');
  const mpctx = modalPreviewCanvas.getContext('2d', { willReadFrequently: true }); // dedicated overlay for popup live-previews
  // (Reduce Colors, Sharpen, etc.) — kept separate from pctx so a tool's cursor preview (which
  // clears/redraws pctx on every pointermove) can never clobber a modal preview mid-interaction
  const marginFadeCanvas = document.getElementById('marginFadeCanvas');
  const mfCtx = marginFadeCanvas.getContext('2d', { willReadFrequently: true });
  const canvasWrap = document.getElementById('canvasWrap');

  let W = 512, H = 512;
  {
    const urlParams = new URLSearchParams(window.location.search);
    const urlW = parseInt(urlParams.get('w'));
    const urlH = parseInt(urlParams.get('h'));
    if(urlW > 0 && urlH > 0){ W = urlW; H = urlH; }
  }
  const APP_VERSION = 'v0.328'; // bump this on every deploy — shown only in the About popup

  // Override window.alert to be iframe-safe and style-consistent
  window.alert = function(message) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '999999';
    modal.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    const box = document.createElement('div');
    box.style.background = '#1e1e24';
    box.style.border = '1px solid #ffca28';
    box.style.padding = '20px';
    box.style.borderRadius = '8px';
    box.style.width = '320px';
    box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    box.style.color = '#fff';
    
    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = '500';
    titleEl.style.fontSize = '0.95rem';
    titleEl.style.marginBottom = '16px';
    titleEl.style.color = '#fff';
    titleEl.style.lineHeight = '1.4';
    titleEl.textContent = message;
    box.appendChild(titleEl);
    
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.padding = '6px 18px';
    okBtn.style.background = '#ffca28';
    okBtn.style.border = 'none';
    okBtn.style.borderRadius = '4px';
    okBtn.style.color = '#1e1e24';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontWeight = '600';
    okBtn.style.fontSize = '0.85rem';
    
    const close = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };
    
    okBtn.addEventListener('click', close);
    btnRow.appendChild(okBtn);
    box.appendChild(btnRow);
    modal.appendChild(box);
    document.body.appendChild(modal);
    
    setTimeout(() => okBtn.focus(), 50);
  };

  // Safe custom prompt dialog returning a Promise
  function showCustomPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '999999';
      modal.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      const box = document.createElement('div');
      box.style.background = '#1e1e24';
      box.style.border = '1px solid #ffca28';
      box.style.padding = '20px';
      box.style.borderRadius = '8px';
      box.style.width = '320px';
      box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      box.style.color = '#fff';
      
      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '600';
      titleEl.style.fontSize = '1rem';
      titleEl.style.marginBottom = '12px';
      titleEl.style.color = '#ffca28';
      titleEl.textContent = message;
      box.appendChild(titleEl);
      
      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.style.width = '100%';
      input.style.padding = '8px 10px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid rgba(255,255,255,0.2)';
      input.style.background = 'rgba(0,0,0,0.3)';
      input.style.color = '#fff';
      input.style.fontSize = '0.9rem';
      input.style.outline = 'none';
      input.style.boxSizing = 'border-box';
      input.style.marginBottom = '16px';
      box.appendChild(input);
      
      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.justifyContent = 'flex-end';
      btnRow.style.gap = '10px';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '6px 14px';
      cancelBtn.style.background = 'rgba(255,255,255,0.1)';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.color = '#ccc';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.fontSize = '0.85rem';
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });
      btnRow.appendChild(cancelBtn);
      
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style.padding = '6px 14px';
      okBtn.style.background = '#ffca28';
      okBtn.style.border = 'none';
      okBtn.style.borderRadius = '4px';
      okBtn.style.color = '#1e1e24';
      okBtn.style.cursor = 'pointer';
      okBtn.style.fontWeight = '600';
      okBtn.style.fontSize = '0.85rem';
      
      const submit = () => {
        const val = input.value.trim();
        document.body.removeChild(modal);
        resolve(val || null);
      };
      
      okBtn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          resolve(null);
        }
      });
      
      btnRow.appendChild(okBtn);
      box.appendChild(btnRow);
      modal.appendChild(box);
      document.body.appendChild(modal);
      
      setTimeout(() => input.focus(), 50);
    });
  }

  let appSettings = { tooltipDelay: 1.0 };
  try {
    const savedSet = localStorage.getItem('pss_app_settings');
    if (savedSet) Object.assign(appSettings, JSON.parse(savedSet));
  } catch(e) {}
  
  function saveAppSettings() {
    localStorage.setItem('pss_app_settings', JSON.stringify(appSettings));
  }
  let layers = [];
  let activeLayer = 0;
  // ---------- Animation frames ----------
  // `layers`/`activeLayer`/`undoStack`/`redoStack` above always represent the CURRENT frame —
  // every existing function that reads/writes them keeps working unchanged. Switching frames
  // just swaps those four out for a different frame's saved copies.
  let frames = [];
  let currentFrameIndex = 0;
  let currentDragType = null; // 'layer', 'frame'
  let currentDragIndex = -1;
  let tlDrag = null; // { type: 'frame'|'layer', startIndex: number, insertAt: number }
  let frameIdCounter = 1;
  let layerIdCounter = 1;

  let blockFrameClick = false;
  let blockLayerClick = false;

  let activeDragGhost = null;
  function createListDragGhost(label, x, y) {
    if (activeDragGhost) activeDragGhost.remove();
    activeDragGhost = document.createElement('div');
    activeDragGhost.className = 'drag-ghost';
    activeDragGhost.style.position = 'fixed';
    activeDragGhost.style.zIndex = '999999';
    activeDragGhost.style.pointerEvents = 'none';
    activeDragGhost.style.background = 'var(--panel-2, #f3f4f6)';
    activeDragGhost.style.border = '2px solid var(--accent, #4f46e5)';
    activeDragGhost.style.padding = '6px 12px';
    activeDragGhost.style.borderRadius = '8px';
    activeDragGhost.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    activeDragGhost.style.color = 'var(--text, #111827)';
    activeDragGhost.style.fontSize = '12px';
    activeDragGhost.style.fontWeight = '500';
    activeDragGhost.style.display = 'flex';
    activeDragGhost.style.alignItems = 'center';
    activeDragGhost.style.gap = '8px';
    activeDragGhost.style.transform = 'translate(-50%, -50%)';
    activeDragGhost.textContent = label;
    document.body.appendChild(activeDragGhost);
    moveListDragGhost(x, y);
  }
  function moveListDragGhost(x, y) {
    if (activeDragGhost) {
      activeDragGhost.style.left = x + 'px';
      activeDragGhost.style.top = y + 'px';
    }
  }
  function removeListDragGhost() {
    if (activeDragGhost) {
      activeDragGhost.remove();
      activeDragGhost = null;
    }
  }
  // gif.js's worker script, embedded as base64 (avoids needing an external file) and turned
  // into a loadable blob: URL at runtime — this is how gif.js's `workerScript` option gets a
  // worker file to load when everything has to live in one HTML file.
  const GIF_WORKER_B64 = "Ly8gZ2lmLndvcmtlci5qcyAwLjIuMCAtIGh0dHBzOi8vZ2l0aHViLmNvbS9qbm9yZGJlcmcvZ2lmLmpzCihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09ImZ1bmN0aW9uIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcigiQ2Fubm90IGZpbmQgbW9kdWxlICciK28rIiciKTt0aHJvdyBmLmNvZGU9Ik1PRFVMRV9OT1RfRk9VTkQiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09ImZ1bmN0aW9uIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBOZXVRdWFudD1yZXF1aXJlKCIuL1R5cGVkTmV1UXVhbnQuanMiKTt2YXIgTFpXRW5jb2Rlcj1yZXF1aXJlKCIuL0xaV0VuY29kZXIuanMiKTtmdW5jdGlvbiBCeXRlQXJyYXkoKXt0aGlzLnBhZ2U9LTE7dGhpcy5wYWdlcz1bXTt0aGlzLm5ld1BhZ2UoKX1CeXRlQXJyYXkucGFnZVNpemU9NDA5NjtCeXRlQXJyYXkuY2hhck1hcD17fTtmb3IodmFyIGk9MDtpPDI1NjtpKyspQnl0ZUFycmF5LmNoYXJNYXBbaV09U3RyaW5nLmZyb21DaGFyQ29kZShpKTtCeXRlQXJyYXkucHJvdG90eXBlLm5ld1BhZ2U9ZnVuY3Rpb24oKXt0aGlzLnBhZ2VzWysrdGhpcy5wYWdlXT1uZXcgVWludDhBcnJheShCeXRlQXJyYXkucGFnZVNpemUpO3RoaXMuY3Vyc29yPTB9O0J5dGVBcnJheS5wcm90b3R5cGUuZ2V0RGF0YT1mdW5jdGlvbigpe3ZhciBydj0iIjtmb3IodmFyIHA9MDtwPHRoaXMucGFnZXMubGVuZ3RoO3ArKyl7Zm9yKHZhciBpPTA7aTxCeXRlQXJyYXkucGFnZVNpemU7aSsrKXtydis9Qnl0ZUFycmF5LmNoYXJNYXBbdGhpcy5wYWdlc1twXVtpXV19fXJldHVybiBydn07Qnl0ZUFycmF5LnByb3RvdHlwZS53cml0ZUJ5dGU9ZnVuY3Rpb24odmFsKXtpZih0aGlzLmN1cnNvcj49Qnl0ZUFycmF5LnBhZ2VTaXplKXRoaXMubmV3UGFnZSgpO3RoaXMucGFnZXNbdGhpcy5wYWdlXVt0aGlzLmN1cnNvcisrXT12YWx9O0J5dGVBcnJheS5wcm90b3R5cGUud3JpdGVVVEZCeXRlcz1mdW5jdGlvbihzdHJpbmcpe2Zvcih2YXIgbD1zdHJpbmcubGVuZ3RoLGk9MDtpPGw7aSsrKXRoaXMud3JpdGVCeXRlKHN0cmluZy5jaGFyQ29kZUF0KGkpKX07Qnl0ZUFycmF5LnByb3RvdHlwZS53cml0ZUJ5dGVzPWZ1bmN0aW9uKGFycmF5LG9mZnNldCxsZW5ndGgpe2Zvcih2YXIgbD1sZW5ndGh8fGFycmF5Lmxlbmd0aCxpPW9mZnNldHx8MDtpPGw7aSsrKXRoaXMud3JpdGVCeXRlKGFycmF5W2ldKX07ZnVuY3Rpb24gR0lGRW5jb2Rlcih3aWR0aCxoZWlnaHQpe3RoaXMud2lkdGg9fn53aWR0aDt0aGlzLmhlaWdodD1+fmhlaWdodDt0aGlzLnRyYW5zcGFyZW50PW51bGw7dGhpcy50cmFuc0luZGV4PTA7dGhpcy5yZXBlYXQ9LTE7dGhpcy5kZWxheT0wO3RoaXMuaW1hZ2U9bnVsbDt0aGlzLnBpeGVscz1udWxsO3RoaXMuaW5kZXhlZFBpeGVscz1udWxsO3RoaXMuY29sb3JEZXB0aD1udWxsO3RoaXMuY29sb3JUYWI9bnVsbDt0aGlzLm5ldVF1YW50PW51bGw7dGhpcy51c2VkRW50cnk9bmV3IEFycmF5O3RoaXMucGFsU2l6ZT03O3RoaXMuZGlzcG9zZT0tMTt0aGlzLmZpcnN0RnJhbWU9dHJ1ZTt0aGlzLnNhbXBsZT0xMDt0aGlzLmRpdGhlcj1mYWxzZTt0aGlzLmdsb2JhbFBhbGV0dGU9ZmFsc2U7dGhpcy5vdXQ9bmV3IEJ5dGVBcnJheX1HSUZFbmNvZGVyLnByb3RvdHlwZS5zZXREZWxheT1mdW5jdGlvbihtaWxsaXNlY29uZHMpe3RoaXMuZGVsYXk9TWF0aC5yb3VuZChtaWxsaXNlY29uZHMvMTApfTtHSUZFbmNvZGVyLnByb3RvdHlwZS5zZXRGcmFtZVJhdGU9ZnVuY3Rpb24oZnBzKXt0aGlzLmRlbGF5PU1hdGgucm91bmQoMTAwL2Zwcyl9O0dJRkVuY29kZXIucHJvdG90eXBlLnNldERpc3Bvc2U9ZnVuY3Rpb24oZGlzcG9zYWxDb2RlKXtpZihkaXNwb3NhbENvZGU+PTApdGhpcy5kaXNwb3NlPWRpc3Bvc2FsQ29kZX07R0lGRW5jb2Rlci5wcm90b3R5cGUuc2V0UmVwZWF0PWZ1bmN0aW9uKHJlcGVhdCl7dGhpcy5yZXBlYXQ9cmVwZWF0fTtHSUZFbmNvZGVyLnByb3RvdHlwZS5zZXRUcmFuc3BhcmVudD1mdW5jdGlvbihjb2xvcil7dGhpcy50cmFuc3BhcmVudD1jb2xvcn07R0lGRW5jb2Rlci5wcm90b3R5cGUuYWRkRnJhbWU9ZnVuY3Rpb24oaW1hZ2VEYXRhKXt0aGlzLmltYWdlPWltYWdlRGF0YTt0aGlzLmNvbG9yVGFiPXRoaXMuZ2xvYmFsUGFsZXR0ZSYmdGhpcy5nbG9iYWxQYWxldHRlLnNsaWNlP3RoaXMuZ2xvYmFsUGFsZXR0ZTpudWxsO3RoaXMuZ2V0SW1hZ2VQaXhlbHMoKTt0aGlzLmFuYWx5emVQaXhlbHMoKTtpZih0aGlzLmdsb2JhbFBhbGV0dGU9PT10cnVlKXRoaXMuZ2xvYmFsUGFsZXR0ZT10aGlzLmNvbG9yVGFiO2lmKHRoaXMuZmlyc3RGcmFtZSl7dGhpcy53cml0ZUxTRCgpO3RoaXMud3JpdGVQYWxldHRlKCk7aWYodGhpcy5yZXBlYXQ+PTApe3RoaXMud3JpdGVOZXRzY2FwZUV4dCgpfX10aGlzLndyaXRlR3JhcGhpY0N0cmxFeHQoKTt0aGlzLndyaXRlSW1hZ2VEZXNjKCk7aWYoIXRoaXMuZmlyc3RGcmFtZSYmIXRoaXMuZ2xvYmFsUGFsZXR0ZSl0aGlzLndyaXRlUGFsZXR0ZSgpO3RoaXMud3JpdGVQaXhlbHMoKTt0aGlzLmZpcnN0RnJhbWU9ZmFsc2V9O0dJRkVuY29kZXIucHJvdG90eXBlLmZpbmlzaD1mdW5jdGlvbigpe3RoaXMub3V0LndyaXRlQnl0ZSg1OSl9O0dJRkVuY29kZXIucHJvdG90eXBlLnNldFF1YWxpdHk9ZnVuY3Rpb24ocXVhbGl0eSl7aWYocXVhbGl0eTwxKXF1YWxpdHk9MTt0aGlzLnNhbXBsZT1xdWFsaXR5fTtHSUZFbmNvZGVyLnByb3RvdHlwZS5zZXREaXRoZXI9ZnVuY3Rpb24oZGl0aGVyKXtpZihkaXRoZXI9PT10cnVlKWRpdGhlcj0iRmxveWRTdGVpbmJlcmciO3RoaXMuZGl0aGVyPWRpdGhlcn07R0lGRW5jb2Rlci5wcm90b3R5cGUuc2V0R2xvYmFsUGFsZXR0ZT1mdW5jdGlvbihwYWxldHRlKXt0aGlzLmdsb2JhbFBhbGV0dGU9cGFsZXR0ZX07R0lGRW5jb2Rlci5wcm90b3R5cGUuZ2V0R2xvYmFsUGFsZXR0ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmdsb2JhbFBhbGV0dGUmJnRoaXMuZ2xvYmFsUGFsZXR0ZS5zbGljZSYmdGhpcy5nbG9iYWxQYWxldHRlLnNsaWNlKDApfHx0aGlzLmdsb2JhbFBhbGV0dGV9O0dJRkVuY29kZXIucHJvdG90eXBlLndyaXRlSGVhZGVyPWZ1bmN0aW9uKCl7dGhpcy5vdXQud3JpdGVVVEZCeXRlcygiR0lGODlhIil9O0dJRkVuY29kZXIucHJvdG90eXBlLmFuYWx5emVQaXhlbHM9ZnVuY3Rpb24oKXtpZighdGhpcy5jb2xvclRhYil7dGhpcy5uZXVRdWFudD1uZXcgTmV1UXVhbnQodGhpcy5waXhlbHMsdGhpcy5zYW1wbGUpO3RoaXMubmV1UXVhbnQuYnVpbGRDb2xvcm1hcCgpO3RoaXMuY29sb3JUYWI9dGhpcy5uZXVRdWFudC5nZXRDb2xvcm1hcCgpfWlmKHRoaXMuZGl0aGVyKXt0aGlzLmRpdGhlclBpeGVscyh0aGlzLmRpdGhlci5yZXBsYWNlKCItc2VycGVudGluZSIsIiIpLHRoaXMuZGl0aGVyLm1hdGNoKC8tc2VycGVudGluZS8pIT09bnVsbCl9ZWxzZXt0aGlzLmluZGV4UGl4ZWxzKCl9dGhpcy5waXhlbHM9bnVsbDt0aGlzLmNvbG9yRGVwdGg9ODt0aGlzLnBhbFNpemU9NztpZih0aGlzLnRyYW5zcGFyZW50IT09bnVsbCl7dGhpcy50cmFuc0luZGV4PXRoaXMuZmluZENsb3Nlc3QodGhpcy50cmFuc3BhcmVudCx0cnVlKX19O0dJRkVuY29kZXIucHJvdG90eXBlLmluZGV4UGl4ZWxzPWZ1bmN0aW9uKGltZ3Epe3ZhciBuUGl4PXRoaXMucGl4ZWxzLmxlbmd0aC8zO3RoaXMuaW5kZXhlZFBpeGVscz1uZXcgVWludDhBcnJheShuUGl4KTt2YXIgaz0wO2Zvcih2YXIgaj0wO2o8blBpeDtqKyspe3ZhciBpbmRleD10aGlzLmZpbmRDbG9zZXN0UkdCKHRoaXMucGl4ZWxzW2srK10mMjU1LHRoaXMucGl4ZWxzW2srK10mMjU1LHRoaXMucGl4ZWxzW2srK10mMjU1KTt0aGlzLnVzZWRFbnRyeVtpbmRleF09dHJ1ZTt0aGlzLmluZGV4ZWRQaXhlbHNbal09aW5kZXh9fTtHSUZFbmNvZGVyLnByb3RvdHlwZS5kaXRoZXJQaXhlbHM9ZnVuY3Rpb24oa2VybmVsLHNlcnBlbnRpbmUpe3ZhciBrZXJuZWxzPXtGYWxzZUZsb3lkU3RlaW5iZXJnOltbMy84LDEsMF0sWzMvOCwwLDFdLFsyLzgsMSwxXV0sRmxveWRTdGVpbmJlcmc6W1s3LzE2LDEsMF0sWzMvMTYsLTEsMV0sWzUvMTYsMCwxXSxbMS8xNiwxLDFdXSxTdHVja2k6W1s4LzQyLDEsMF0sWzQvNDIsMiwwXSxbMi80MiwtMiwxXSxbNC80MiwtMSwxXSxbOC80MiwwLDFdLFs0LzQyLDEsMV0sWzIvNDIsMiwxXSxbMS80MiwtMiwyXSxbMi80MiwtMSwyXSxbNC80MiwwLDJdLFsyLzQyLDEsMl0sWzEvNDIsMiwyXV0sQXRraW5zb246W1sxLzgsMSwwXSxbMS84LDIsMF0sWzEvOCwtMSwxXSxbMS84LDAsMV0sWzEvOCwxLDFdLFsxLzgsMCwyXV19O2lmKCFrZXJuZWx8fCFrZXJuZWxzW2tlcm5lbF0pe3Rocm93IlVua25vd24gZGl0aGVyaW5nIGtlcm5lbDogIitrZXJuZWx9dmFyIGRzPWtlcm5lbHNba2VybmVsXTt2YXIgaW5kZXg9MCxoZWlnaHQ9dGhpcy5oZWlnaHQsd2lkdGg9dGhpcy53aWR0aCxkYXRhPXRoaXMucGl4ZWxzO3ZhciBkaXJlY3Rpb249c2VycGVudGluZT8tMToxO3RoaXMuaW5kZXhlZFBpeGVscz1uZXcgVWludDhBcnJheSh0aGlzLnBpeGVscy5sZW5ndGgvMyk7Zm9yKHZhciB5PTA7eTxoZWlnaHQ7eSsrKXtpZihzZXJwZW50aW5lKWRpcmVjdGlvbj1kaXJlY3Rpb24qLTE7Zm9yKHZhciB4PWRpcmVjdGlvbj09MT8wOndpZHRoLTEseGVuZD1kaXJlY3Rpb249PTE/d2lkdGg6MDt4IT09eGVuZDt4Kz1kaXJlY3Rpb24pe2luZGV4PXkqd2lkdGgreDt2YXIgaWR4PWluZGV4KjM7dmFyIHIxPWRhdGFbaWR4XTt2YXIgZzE9ZGF0YVtpZHgrMV07dmFyIGIxPWRhdGFbaWR4KzJdO2lkeD10aGlzLmZpbmRDbG9zZXN0UkdCKHIxLGcxLGIxKTt0aGlzLnVzZWRFbnRyeVtpZHhdPXRydWU7dGhpcy5pbmRleGVkUGl4ZWxzW2luZGV4XT1pZHg7aWR4Kj0zO3ZhciByMj10aGlzLmNvbG9yVGFiW2lkeF07dmFyIGcyPXRoaXMuY29sb3JUYWJbaWR4KzFdO3ZhciBiMj10aGlzLmNvbG9yVGFiW2lkeCsyXTt2YXIgZXI9cjEtcjI7dmFyIGVnPWcxLWcyO3ZhciBlYj1iMS1iMjtmb3IodmFyIGk9ZGlyZWN0aW9uPT0xPzA6ZHMubGVuZ3RoLTEsZW5kPWRpcmVjdGlvbj09MT9kcy5sZW5ndGg6MDtpIT09ZW5kO2krPWRpcmVjdGlvbil7dmFyIHgxPWRzW2ldWzFdO3ZhciB5MT1kc1tpXVsyXTtpZih4MSt4Pj0wJiZ4MSt4PHdpZHRoJiZ5MSt5Pj0wJiZ5MSt5PGhlaWdodCl7dmFyIGQ9ZHNbaV1bMF07aWR4PWluZGV4K3gxK3kxKndpZHRoO2lkeCo9MztkYXRhW2lkeF09TWF0aC5tYXgoMCxNYXRoLm1pbigyNTUsZGF0YVtpZHhdK2VyKmQpKTtkYXRhW2lkeCsxXT1NYXRoLm1heCgwLE1hdGgubWluKDI1NSxkYXRhW2lkeCsxXStlZypkKSk7ZGF0YVtpZHgrMl09TWF0aC5tYXgoMCxNYXRoLm1pbigyNTUsZGF0YVtpZHgrMl0rZWIqZCkpfX19fX07R0lGRW5jb2Rlci5wcm90b3R5cGUuZmluZENsb3Nlc3Q9ZnVuY3Rpb24oYyx1c2VkKXtyZXR1cm4gdGhpcy5maW5kQ2xvc2VzdFJHQigoYyYxNjcxMTY4MCk+PjE2LChjJjY1MjgwKT4+OCxjJjI1NSx1c2VkKX07R0lGRW5jb2Rlci5wcm90b3R5cGUuZmluZENsb3Nlc3RSR0I9ZnVuY3Rpb24ocixnLGIsdXNlZCl7aWYodGhpcy5jb2xvclRhYj09PW51bGwpcmV0dXJuLTE7aWYodGhpcy5uZXVRdWFudCYmIXVzZWQpe3JldHVybiB0aGlzLm5ldVF1YW50Lmxvb2t1cFJHQihyLGcsYil9dmFyIGM9YnxnPDw4fHI8PDE2O3ZhciBtaW5wb3M9MDt2YXIgZG1pbj0yNTYqMjU2KjI1Njt2YXIgbGVuPXRoaXMuY29sb3JUYWIubGVuZ3RoO2Zvcih2YXIgaT0wLGluZGV4PTA7aTxsZW47aW5kZXgrKyl7dmFyIGRyPXItKHRoaXMuY29sb3JUYWJbaSsrXSYyNTUpO3ZhciBkZz1nLSh0aGlzLmNvbG9yVGFiW2krK10mMjU1KTt2YXIgZGI9Yi0odGhpcy5jb2xvclRhYltpKytdJjI1NSk7dmFyIGQ9ZHIqZHIrZGcqZGcrZGIqZGI7aWYoKCF1c2VkfHx0aGlzLnVzZWRFbnRyeVtpbmRleF0pJiZkPGRtaW4pe2RtaW49ZDttaW5wb3M9aW5kZXh9fXJldHVybiBtaW5wb3N9O0dJRkVuY29kZXIucHJvdG90eXBlLmdldEltYWdlUGl4ZWxzPWZ1bmN0aW9uKCl7dmFyIHc9dGhpcy53aWR0aDt2YXIgaD10aGlzLmhlaWdodDt0aGlzLnBpeGVscz1uZXcgVWludDhBcnJheSh3KmgqMyk7dmFyIGRhdGE9dGhpcy5pbWFnZTt2YXIgc3JjUG9zPTA7dmFyIGNvdW50PTA7Zm9yKHZhciBpPTA7aTxoO2krKyl7Zm9yKHZhciBqPTA7ajx3O2orKyl7dGhpcy5waXhlbHNbY291bnQrK109ZGF0YVtzcmNQb3MrK107dGhpcy5waXhlbHNbY291bnQrK109ZGF0YVtzcmNQb3MrK107dGhpcy5waXhlbHNbY291bnQrK109ZGF0YVtzcmNQb3MrK107c3JjUG9zKyt9fX07R0lGRW5jb2Rlci5wcm90b3R5cGUud3JpdGVHcmFwaGljQ3RybEV4dD1mdW5jdGlvbigpe3RoaXMub3V0LndyaXRlQnl0ZSgzMyk7dGhpcy5vdXQud3JpdGVCeXRlKDI0OSk7dGhpcy5vdXQud3JpdGVCeXRlKDQpO3ZhciB0cmFuc3AsZGlzcDtpZih0aGlzLnRyYW5zcGFyZW50PT09bnVsbCl7dHJhbnNwPTA7ZGlzcD0wfWVsc2V7dHJhbnNwPTE7ZGlzcD0yfWlmKHRoaXMuZGlzcG9zZT49MCl7ZGlzcD1kaXNwb3NlJjd9ZGlzcDw8PTI7dGhpcy5vdXQud3JpdGVCeXRlKDB8ZGlzcHwwfHRyYW5zcCk7dGhpcy53cml0ZVNob3J0KHRoaXMuZGVsYXkpO3RoaXMub3V0LndyaXRlQnl0ZSh0aGlzLnRyYW5zSW5kZXgpO3RoaXMub3V0LndyaXRlQnl0ZSgwKX07R0lGRW5jb2Rlci5wcm90b3R5cGUud3JpdGVJbWFnZURlc2M9ZnVuY3Rpb24oKXt0aGlzLm91dC53cml0ZUJ5dGUoNDQpO3RoaXMud3JpdGVTaG9ydCgwKTt0aGlzLndyaXRlU2hvcnQoMCk7dGhpcy53cml0ZVNob3J0KHRoaXMud2lkdGgpO3RoaXMud3JpdGVTaG9ydCh0aGlzLmhlaWdodCk7aWYodGhpcy5maXJzdEZyYW1lfHx0aGlzLmdsb2JhbFBhbGV0dGUpe3RoaXMub3V0LndyaXRlQnl0ZSgwKX1lbHNle3RoaXMub3V0LndyaXRlQnl0ZSgxMjh8MHwwfDB8dGhpcy5wYWxTaXplKX19O0dJRkVuY29kZXIucHJvdG90eXBlLndyaXRlTFNEPWZ1bmN0aW9uKCl7dGhpcy53cml0ZVNob3J0KHRoaXMud2lkdGgpO3RoaXMud3JpdGVTaG9ydCh0aGlzLmhlaWdodCk7dGhpcy5vdXQud3JpdGVCeXRlKDEyOHwxMTJ8MHx0aGlzLnBhbFNpemUpO3RoaXMub3V0LndyaXRlQnl0ZSgwKTt0aGlzLm91dC53cml0ZUJ5dGUoMCl9O0dJRkVuY29kZXIucHJvdG90eXBlLndyaXRlTmV0c2NhcGVFeHQ9ZnVuY3Rpb24oKXt0aGlzLm91dC53cml0ZUJ5dGUoMzMpO3RoaXMub3V0LndyaXRlQnl0ZSgyNTUpO3RoaXMub3V0LndyaXRlQnl0ZSgxMSk7dGhpcy5vdXQud3JpdGVVVEZCeXRlcygiTkVUU0NBUEUyLjAiKTt0aGlzLm91dC53cml0ZUJ5dGUoMyk7dGhpcy5vdXQud3JpdGVCeXRlKDEpO3RoaXMud3JpdGVTaG9ydCh0aGlzLnJlcGVhdCk7dGhpcy5vdXQud3JpdGVCeXRlKDApfTtHSUZFbmNvZGVyLnByb3RvdHlwZS53cml0ZVBhbGV0dGU9ZnVuY3Rpb24oKXt0aGlzLm91dC53cml0ZUJ5dGVzKHRoaXMuY29sb3JUYWIpO3ZhciBuPTMqMjU2LXRoaXMuY29sb3JUYWIubGVuZ3RoO2Zvcih2YXIgaT0wO2k8bjtpKyspdGhpcy5vdXQud3JpdGVCeXRlKDApfTtHSUZFbmNvZGVyLnByb3RvdHlwZS53cml0ZVNob3J0PWZ1bmN0aW9uKHBWYWx1ZSl7dGhpcy5vdXQud3JpdGVCeXRlKHBWYWx1ZSYyNTUpO3RoaXMub3V0LndyaXRlQnl0ZShwVmFsdWU+PjgmMjU1KX07R0lGRW5jb2Rlci5wcm90b3R5cGUud3JpdGVQaXhlbHM9ZnVuY3Rpb24oKXt2YXIgZW5jPW5ldyBMWldFbmNvZGVyKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQsdGhpcy5pbmRleGVkUGl4ZWxzLHRoaXMuY29sb3JEZXB0aCk7ZW5jLmVuY29kZSh0aGlzLm91dCl9O0dJRkVuY29kZXIucHJvdG90eXBlLnN0cmVhbT1mdW5jdGlvbigpe3JldHVybiB0aGlzLm91dH07bW9kdWxlLmV4cG9ydHM9R0lGRW5jb2Rlcn0seyIuL0xaV0VuY29kZXIuanMiOjIsIi4vVHlwZWROZXVRdWFudC5qcyI6M31dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBFT0Y9LTE7dmFyIEJJVFM9MTI7dmFyIEhTSVpFPTUwMDM7dmFyIG1hc2tzPVswLDEsMyw3LDE1LDMxLDYzLDEyNywyNTUsNTExLDEwMjMsMjA0Nyw0MDk1LDgxOTEsMTYzODMsMzI3NjcsNjU1MzVdO2Z1bmN0aW9uIExaV0VuY29kZXIod2lkdGgsaGVpZ2h0LHBpeGVscyxjb2xvckRlcHRoKXt2YXIgaW5pdENvZGVTaXplPU1hdGgubWF4KDIsY29sb3JEZXB0aCk7dmFyIGFjY3VtPW5ldyBVaW50OEFycmF5KDI1Nik7dmFyIGh0YWI9bmV3IEludDMyQXJyYXkoSFNJWkUpO3ZhciBjb2RldGFiPW5ldyBJbnQzMkFycmF5KEhTSVpFKTt2YXIgY3VyX2FjY3VtLGN1cl9iaXRzPTA7dmFyIGFfY291bnQ7dmFyIGZyZWVfZW50PTA7dmFyIG1heGNvZGU7dmFyIGNsZWFyX2ZsZz1mYWxzZTt2YXIgZ19pbml0X2JpdHMsQ2xlYXJDb2RlLEVPRkNvZGU7ZnVuY3Rpb24gY2hhcl9vdXQoYyxvdXRzKXthY2N1bVthX2NvdW50KytdPWM7aWYoYV9jb3VudD49MjU0KWZsdXNoX2NoYXIob3V0cyl9ZnVuY3Rpb24gY2xfYmxvY2sob3V0cyl7Y2xfaGFzaChIU0laRSk7ZnJlZV9lbnQ9Q2xlYXJDb2RlKzI7Y2xlYXJfZmxnPXRydWU7b3V0cHV0KENsZWFyQ29kZSxvdXRzKX1mdW5jdGlvbiBjbF9oYXNoKGhzaXplKXtmb3IodmFyIGk9MDtpPGhzaXplOysraSlodGFiW2ldPS0xfWZ1bmN0aW9uIGNvbXByZXNzKGluaXRfYml0cyxvdXRzKXt2YXIgZmNvZGUsYyxpLGVudCxkaXNwLGhzaXplX3JlZyxoc2hpZnQ7Z19pbml0X2JpdHM9aW5pdF9iaXRzO2NsZWFyX2ZsZz1mYWxzZTtuX2JpdHM9Z19pbml0X2JpdHM7bWF4Y29kZT1NQVhDT0RFKG5fYml0cyk7Q2xlYXJDb2RlPTE8PGluaXRfYml0cy0xO0VPRkNvZGU9Q2xlYXJDb2RlKzE7ZnJlZV9lbnQ9Q2xlYXJDb2RlKzI7YV9jb3VudD0wO2VudD1uZXh0UGl4ZWwoKTtoc2hpZnQ9MDtmb3IoZmNvZGU9SFNJWkU7ZmNvZGU8NjU1MzY7ZmNvZGUqPTIpKytoc2hpZnQ7aHNoaWZ0PTgtaHNoaWZ0O2hzaXplX3JlZz1IU0laRTtjbF9oYXNoKGhzaXplX3JlZyk7b3V0cHV0KENsZWFyQ29kZSxvdXRzKTtvdXRlcl9sb29wOndoaWxlKChjPW5leHRQaXhlbCgpKSE9RU9GKXtmY29kZT0oYzw8QklUUykrZW50O2k9Yzw8aHNoaWZ0XmVudDtpZihodGFiW2ldPT09ZmNvZGUpe2VudD1jb2RldGFiW2ldO2NvbnRpbnVlfWVsc2UgaWYoaHRhYltpXT49MCl7ZGlzcD1oc2l6ZV9yZWctaTtpZihpPT09MClkaXNwPTE7ZG97aWYoKGktPWRpc3ApPDApaSs9aHNpemVfcmVnO2lmKGh0YWJbaV09PT1mY29kZSl7ZW50PWNvZGV0YWJbaV07Y29udGludWUgb3V0ZXJfbG9vcH19d2hpbGUoaHRhYltpXT49MCl9b3V0cHV0KGVudCxvdXRzKTtlbnQ9YztpZihmcmVlX2VudDwxPDxCSVRTKXtjb2RldGFiW2ldPWZyZWVfZW50Kys7aHRhYltpXT1mY29kZX1lbHNle2NsX2Jsb2NrKG91dHMpfX1vdXRwdXQoZW50LG91dHMpO291dHB1dChFT0ZDb2RlLG91dHMpfWZ1bmN0aW9uIGVuY29kZShvdXRzKXtvdXRzLndyaXRlQnl0ZShpbml0Q29kZVNpemUpO3JlbWFpbmluZz13aWR0aCpoZWlnaHQ7Y3VyUGl4ZWw9MDtjb21wcmVzcyhpbml0Q29kZVNpemUrMSxvdXRzKTtvdXRzLndyaXRlQnl0ZSgwKX1mdW5jdGlvbiBmbHVzaF9jaGFyKG91dHMpe2lmKGFfY291bnQ+MCl7b3V0cy53cml0ZUJ5dGUoYV9jb3VudCk7b3V0cy53cml0ZUJ5dGVzKGFjY3VtLDAsYV9jb3VudCk7YV9jb3VudD0wfX1mdW5jdGlvbiBNQVhDT0RFKG5fYml0cyl7cmV0dXJuKDE8PG5fYml0cyktMX1mdW5jdGlvbiBuZXh0UGl4ZWwoKXtpZihyZW1haW5pbmc9PT0wKXJldHVybiBFT0Y7LS1yZW1haW5pbmc7dmFyIHBpeD1waXhlbHNbY3VyUGl4ZWwrK107cmV0dXJuIHBpeCYyNTV9ZnVuY3Rpb24gb3V0cHV0KGNvZGUsb3V0cyl7Y3VyX2FjY3VtJj1tYXNrc1tjdXJfYml0c107aWYoY3VyX2JpdHM+MCljdXJfYWNjdW18PWNvZGU8PGN1cl9iaXRzO2Vsc2UgY3VyX2FjY3VtPWNvZGU7Y3VyX2JpdHMrPW5fYml0czt3aGlsZShjdXJfYml0cz49OCl7Y2hhcl9vdXQoY3VyX2FjY3VtJjI1NSxvdXRzKTtjdXJfYWNjdW0+Pj04O2N1cl9iaXRzLT04fWlmKGZyZWVfZW50Pm1heGNvZGV8fGNsZWFyX2ZsZyl7aWYoY2xlYXJfZmxnKXttYXhjb2RlPU1BWENPREUobl9iaXRzPWdfaW5pdF9iaXRzKTtjbGVhcl9mbGc9ZmFsc2V9ZWxzZXsrK25fYml0cztpZihuX2JpdHM9PUJJVFMpbWF4Y29kZT0xPDxCSVRTO2Vsc2UgbWF4Y29kZT1NQVhDT0RFKG5fYml0cyl9fWlmKGNvZGU9PUVPRkNvZGUpe3doaWxlKGN1cl9iaXRzPjApe2NoYXJfb3V0KGN1cl9hY2N1bSYyNTUsb3V0cyk7Y3VyX2FjY3VtPj49ODtjdXJfYml0cy09OH1mbHVzaF9jaGFyKG91dHMpfX10aGlzLmVuY29kZT1lbmNvZGV9bW9kdWxlLmV4cG9ydHM9TFpXRW5jb2Rlcn0se31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBuY3ljbGVzPTEwMDt2YXIgbmV0c2l6ZT0yNTY7dmFyIG1heG5ldHBvcz1uZXRzaXplLTE7dmFyIG5ldGJpYXNzaGlmdD00O3ZhciBpbnRiaWFzc2hpZnQ9MTY7dmFyIGludGJpYXM9MTw8aW50Ymlhc3NoaWZ0O3ZhciBnYW1tYXNoaWZ0PTEwO3ZhciBnYW1tYT0xPDxnYW1tYXNoaWZ0O3ZhciBiZXRhc2hpZnQ9MTA7dmFyIGJldGE9aW50Ymlhcz4+YmV0YXNoaWZ0O3ZhciBiZXRhZ2FtbWE9aW50Ymlhczw8Z2FtbWFzaGlmdC1iZXRhc2hpZnQ7dmFyIGluaXRyYWQ9bmV0c2l6ZT4+Mzt2YXIgcmFkaXVzYmlhc3NoaWZ0PTY7dmFyIHJhZGl1c2JpYXM9MTw8cmFkaXVzYmlhc3NoaWZ0O3ZhciBpbml0cmFkaXVzPWluaXRyYWQqcmFkaXVzYmlhczt2YXIgcmFkaXVzZGVjPTMwO3ZhciBhbHBoYWJpYXNzaGlmdD0xMDt2YXIgaW5pdGFscGhhPTE8PGFscGhhYmlhc3NoaWZ0O3ZhciBhbHBoYWRlYzt2YXIgcmFkYmlhc3NoaWZ0PTg7dmFyIHJhZGJpYXM9MTw8cmFkYmlhc3NoaWZ0O3ZhciBhbHBoYXJhZGJzaGlmdD1hbHBoYWJpYXNzaGlmdCtyYWRiaWFzc2hpZnQ7dmFyIGFscGhhcmFkYmlhcz0xPDxhbHBoYXJhZGJzaGlmdDt2YXIgcHJpbWUxPTQ5OTt2YXIgcHJpbWUyPTQ5MTt2YXIgcHJpbWUzPTQ4Nzt2YXIgcHJpbWU0PTUwMzt2YXIgbWlucGljdHVyZWJ5dGVzPTMqcHJpbWU0O2Z1bmN0aW9uIE5ldVF1YW50KHBpeGVscyxzYW1wbGVmYWMpe3ZhciBuZXR3b3JrO3ZhciBuZXRpbmRleDt2YXIgYmlhczt2YXIgZnJlcTt2YXIgcmFkcG93ZXI7ZnVuY3Rpb24gaW5pdCgpe25ldHdvcms9W107bmV0aW5kZXg9bmV3IEludDMyQXJyYXkoMjU2KTtiaWFzPW5ldyBJbnQzMkFycmF5KG5ldHNpemUpO2ZyZXE9bmV3IEludDMyQXJyYXkobmV0c2l6ZSk7cmFkcG93ZXI9bmV3IEludDMyQXJyYXkobmV0c2l6ZT4+Myk7dmFyIGksdjtmb3IoaT0wO2k8bmV0c2l6ZTtpKyspe3Y9KGk8PG5ldGJpYXNzaGlmdCs4KS9uZXRzaXplO25ldHdvcmtbaV09bmV3IEZsb2F0NjRBcnJheShbdix2LHYsMF0pO2ZyZXFbaV09aW50Ymlhcy9uZXRzaXplO2JpYXNbaV09MH19ZnVuY3Rpb24gdW5iaWFzbmV0KCl7Zm9yKHZhciBpPTA7aTxuZXRzaXplO2krKyl7bmV0d29ya1tpXVswXT4+PW5ldGJpYXNzaGlmdDtuZXR3b3JrW2ldWzFdPj49bmV0Ymlhc3NoaWZ0O25ldHdvcmtbaV1bMl0+Pj1uZXRiaWFzc2hpZnQ7bmV0d29ya1tpXVszXT1pfX1mdW5jdGlvbiBhbHRlcnNpbmdsZShhbHBoYSxpLGIsZyxyKXtuZXR3b3JrW2ldWzBdLT1hbHBoYSoobmV0d29ya1tpXVswXS1iKS9pbml0YWxwaGE7bmV0d29ya1tpXVsxXS09YWxwaGEqKG5ldHdvcmtbaV1bMV0tZykvaW5pdGFscGhhO25ldHdvcmtbaV1bMl0tPWFscGhhKihuZXR3b3JrW2ldWzJdLXIpL2luaXRhbHBoYX1mdW5jdGlvbiBhbHRlcm5laWdoKHJhZGl1cyxpLGIsZyxyKXt2YXIgbG89TWF0aC5hYnMoaS1yYWRpdXMpO3ZhciBoaT1NYXRoLm1pbihpK3JhZGl1cyxuZXRzaXplKTt2YXIgaj1pKzE7dmFyIGs9aS0xO3ZhciBtPTE7dmFyIHAsYTt3aGlsZShqPGhpfHxrPmxvKXthPXJhZHBvd2VyW20rK107aWYoajxoaSl7cD1uZXR3b3JrW2orK107cFswXS09YSoocFswXS1iKS9hbHBoYXJhZGJpYXM7cFsxXS09YSoocFsxXS1nKS9hbHBoYXJhZGJpYXM7cFsyXS09YSoocFsyXS1yKS9hbHBoYXJhZGJpYXN9aWYoaz5sbyl7cD1uZXR3b3JrW2stLV07cFswXS09YSoocFswXS1iKS9hbHBoYXJhZGJpYXM7cFsxXS09YSoocFsxXS1nKS9hbHBoYXJhZGJpYXM7cFsyXS09YSoocFsyXS1yKS9hbHBoYXJhZGJpYXN9fX1mdW5jdGlvbiBjb250ZXN0KGIsZyxyKXt2YXIgYmVzdGQ9figxPDwzMSk7dmFyIGJlc3RiaWFzZD1iZXN0ZDt2YXIgYmVzdHBvcz0tMTt2YXIgYmVzdGJpYXNwb3M9YmVzdHBvczt2YXIgaSxuLGRpc3QsYmlhc2Rpc3QsYmV0YWZyZXE7Zm9yKGk9MDtpPG5ldHNpemU7aSsrKXtuPW5ldHdvcmtbaV07ZGlzdD1NYXRoLmFicyhuWzBdLWIpK01hdGguYWJzKG5bMV0tZykrTWF0aC5hYnMoblsyXS1yKTtpZihkaXN0PGJlc3RkKXtiZXN0ZD1kaXN0O2Jlc3Rwb3M9aX1iaWFzZGlzdD1kaXN0LShiaWFzW2ldPj5pbnRiaWFzc2hpZnQtbmV0Ymlhc3NoaWZ0KTtpZihiaWFzZGlzdDxiZXN0Ymlhc2Qpe2Jlc3RiaWFzZD1iaWFzZGlzdDtiZXN0Ymlhc3Bvcz1pfWJldGFmcmVxPWZyZXFbaV0+PmJldGFzaGlmdDtmcmVxW2ldLT1iZXRhZnJlcTtiaWFzW2ldKz1iZXRhZnJlcTw8Z2FtbWFzaGlmdH1mcmVxW2Jlc3Rwb3NdKz1iZXRhO2JpYXNbYmVzdHBvc10tPWJldGFnYW1tYTtyZXR1cm4gYmVzdGJpYXNwb3N9ZnVuY3Rpb24gaW54YnVpbGQoKXt2YXIgaSxqLHAscSxzbWFsbHBvcyxzbWFsbHZhbCxwcmV2aW91c2NvbD0wLHN0YXJ0cG9zPTA7Zm9yKGk9MDtpPG5ldHNpemU7aSsrKXtwPW5ldHdvcmtbaV07c21hbGxwb3M9aTtzbWFsbHZhbD1wWzFdO2ZvcihqPWkrMTtqPG5ldHNpemU7aisrKXtxPW5ldHdvcmtbal07aWYocVsxXTxzbWFsbHZhbCl7c21hbGxwb3M9ajtzbWFsbHZhbD1xWzFdfX1xPW5ldHdvcmtbc21hbGxwb3NdO2lmKGkhPXNtYWxscG9zKXtqPXFbMF07cVswXT1wWzBdO3BbMF09ajtqPXFbMV07cVsxXT1wWzFdO3BbMV09ajtqPXFbMl07cVsyXT1wWzJdO3BbMl09ajtqPXFbM107cVszXT1wWzNdO3BbM109an1pZihzbWFsbHZhbCE9cHJldmlvdXNjb2wpe25ldGluZGV4W3ByZXZpb3VzY29sXT1zdGFydHBvcytpPj4xO2ZvcihqPXByZXZpb3VzY29sKzE7ajxzbWFsbHZhbDtqKyspbmV0aW5kZXhbal09aTtwcmV2aW91c2NvbD1zbWFsbHZhbDtzdGFydHBvcz1pfX1uZXRpbmRleFtwcmV2aW91c2NvbF09c3RhcnRwb3MrbWF4bmV0cG9zPj4xO2ZvcihqPXByZXZpb3VzY29sKzE7ajwyNTY7aisrKW5ldGluZGV4W2pdPW1heG5ldHBvc31mdW5jdGlvbiBpbnhzZWFyY2goYixnLHIpe3ZhciBhLHAsZGlzdDt2YXIgYmVzdGQ9MWUzO3ZhciBiZXN0PS0xO3ZhciBpPW5ldGluZGV4W2ddO3ZhciBqPWktMTt3aGlsZShpPG5ldHNpemV8fGo+PTApe2lmKGk8bmV0c2l6ZSl7cD1uZXR3b3JrW2ldO2Rpc3Q9cFsxXS1nO2lmKGRpc3Q+PWJlc3RkKWk9bmV0c2l6ZTtlbHNle2krKztpZihkaXN0PDApZGlzdD0tZGlzdDthPXBbMF0tYjtpZihhPDApYT0tYTtkaXN0Kz1hO2lmKGRpc3Q8YmVzdGQpe2E9cFsyXS1yO2lmKGE8MClhPS1hO2Rpc3QrPWE7aWYoZGlzdDxiZXN0ZCl7YmVzdGQ9ZGlzdDtiZXN0PXBbM119fX19aWYoaj49MCl7cD1uZXR3b3JrW2pdO2Rpc3Q9Zy1wWzFdO2lmKGRpc3Q+PWJlc3RkKWo9LTE7ZWxzZXtqLS07aWYoZGlzdDwwKWRpc3Q9LWRpc3Q7YT1wWzBdLWI7aWYoYTwwKWE9LWE7ZGlzdCs9YTtpZihkaXN0PGJlc3RkKXthPXBbMl0tcjtpZihhPDApYT0tYTtkaXN0Kz1hO2lmKGRpc3Q8YmVzdGQpe2Jlc3RkPWRpc3Q7YmVzdD1wWzNdfX19fX1yZXR1cm4gYmVzdH1mdW5jdGlvbiBsZWFybigpe3ZhciBpO3ZhciBsZW5ndGhjb3VudD1waXhlbHMubGVuZ3RoO3ZhciBhbHBoYWRlYz0zMCsoc2FtcGxlZmFjLTEpLzM7dmFyIHNhbXBsZXBpeGVscz1sZW5ndGhjb3VudC8oMypzYW1wbGVmYWMpO3ZhciBkZWx0YT1+fihzYW1wbGVwaXhlbHMvbmN5Y2xlcyk7dmFyIGFscGhhPWluaXRhbHBoYTt2YXIgcmFkaXVzPWluaXRyYWRpdXM7dmFyIHJhZD1yYWRpdXM+PnJhZGl1c2JpYXNzaGlmdDtpZihyYWQ8PTEpcmFkPTA7Zm9yKGk9MDtpPHJhZDtpKyspcmFkcG93ZXJbaV09YWxwaGEqKChyYWQqcmFkLWkqaSkqcmFkYmlhcy8ocmFkKnJhZCkpO3ZhciBzdGVwO2lmKGxlbmd0aGNvdW50PG1pbnBpY3R1cmVieXRlcyl7c2FtcGxlZmFjPTE7c3RlcD0zfWVsc2UgaWYobGVuZ3RoY291bnQlcHJpbWUxIT09MCl7c3RlcD0zKnByaW1lMX1lbHNlIGlmKGxlbmd0aGNvdW50JXByaW1lMiE9PTApe3N0ZXA9MypwcmltZTJ9ZWxzZSBpZihsZW5ndGhjb3VudCVwcmltZTMhPT0wKXtzdGVwPTMqcHJpbWUzfWVsc2V7c3RlcD0zKnByaW1lNH12YXIgYixnLHIsajt2YXIgcGl4PTA7aT0wO3doaWxlKGk8c2FtcGxlcGl4ZWxzKXtiPShwaXhlbHNbcGl4XSYyNTUpPDxuZXRiaWFzc2hpZnQ7Zz0ocGl4ZWxzW3BpeCsxXSYyNTUpPDxuZXRiaWFzc2hpZnQ7cj0ocGl4ZWxzW3BpeCsyXSYyNTUpPDxuZXRiaWFzc2hpZnQ7aj1jb250ZXN0KGIsZyxyKTthbHRlcnNpbmdsZShhbHBoYSxqLGIsZyxyKTtpZihyYWQhPT0wKWFsdGVybmVpZ2gocmFkLGosYixnLHIpO3BpeCs9c3RlcDtpZihwaXg+PWxlbmd0aGNvdW50KXBpeC09bGVuZ3RoY291bnQ7aSsrO2lmKGRlbHRhPT09MClkZWx0YT0xO2lmKGklZGVsdGE9PT0wKXthbHBoYS09YWxwaGEvYWxwaGFkZWM7cmFkaXVzLT1yYWRpdXMvcmFkaXVzZGVjO3JhZD1yYWRpdXM+PnJhZGl1c2JpYXNzaGlmdDtpZihyYWQ8PTEpcmFkPTA7Zm9yKGo9MDtqPHJhZDtqKyspcmFkcG93ZXJbal09YWxwaGEqKChyYWQqcmFkLWoqaikqcmFkYmlhcy8ocmFkKnJhZCkpfX19ZnVuY3Rpb24gYnVpbGRDb2xvcm1hcCgpe2luaXQoKTtsZWFybigpO3VuYmlhc25ldCgpO2lueGJ1aWxkKCl9dGhpcy5idWlsZENvbG9ybWFwPWJ1aWxkQ29sb3JtYXA7ZnVuY3Rpb24gZ2V0Q29sb3JtYXAoKXt2YXIgbWFwPVtdO3ZhciBpbmRleD1bXTtmb3IodmFyIGk9MDtpPG5ldHNpemU7aSsrKWluZGV4W25ldHdvcmtbaV1bM11dPWk7dmFyIGs9MDtmb3IodmFyIGw9MDtsPG5ldHNpemU7bCsrKXt2YXIgaj1pbmRleFtsXTttYXBbaysrXT1uZXR3b3JrW2pdWzBdO21hcFtrKytdPW5ldHdvcmtbal1bMV07bWFwW2srK109bmV0d29ya1tqXVsyXX1yZXR1cm4gbWFwfXRoaXMuZ2V0Q29sb3JtYXA9Z2V0Q29sb3JtYXA7dGhpcy5sb29rdXBSR0I9aW54c2VhcmNofW1vZHVsZS5leHBvcnRzPU5ldVF1YW50fSx7fV0sNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIEdJRkVuY29kZXIscmVuZGVyRnJhbWU7R0lGRW5jb2Rlcj1yZXF1aXJlKCIuL0dJRkVuY29kZXIuanMiKTtyZW5kZXJGcmFtZT1mdW5jdGlvbihmcmFtZSl7dmFyIGVuY29kZXIscGFnZSxzdHJlYW0sdHJhbnNmZXI7ZW5jb2Rlcj1uZXcgR0lGRW5jb2RlcihmcmFtZS53aWR0aCxmcmFtZS5oZWlnaHQpO2lmKGZyYW1lLmluZGV4PT09MCl7ZW5jb2Rlci53cml0ZUhlYWRlcigpfWVsc2V7ZW5jb2Rlci5maXJzdEZyYW1lPWZhbHNlfWVuY29kZXIuc2V0VHJhbnNwYXJlbnQoZnJhbWUudHJhbnNwYXJlbnQpO2VuY29kZXIuc2V0UmVwZWF0KGZyYW1lLnJlcGVhdCk7ZW5jb2Rlci5zZXREZWxheShmcmFtZS5kZWxheSk7ZW5jb2Rlci5zZXRRdWFsaXR5KGZyYW1lLnF1YWxpdHkpO2VuY29kZXIuc2V0RGl0aGVyKGZyYW1lLmRpdGhlcik7ZW5jb2Rlci5zZXRHbG9iYWxQYWxldHRlKGZyYW1lLmdsb2JhbFBhbGV0dGUpO2VuY29kZXIuYWRkRnJhbWUoZnJhbWUuZGF0YSk7aWYoZnJhbWUubGFzdCl7ZW5jb2Rlci5maW5pc2goKX1pZihmcmFtZS5nbG9iYWxQYWxldHRlPT09dHJ1ZSl7ZnJhbWUuZ2xvYmFsUGFsZXR0ZT1lbmNvZGVyLmdldEdsb2JhbFBhbGV0dGUoKX1zdHJlYW09ZW5jb2Rlci5zdHJlYW0oKTtmcmFtZS5kYXRhPXN0cmVhbS5wYWdlcztmcmFtZS5jdXJzb3I9c3RyZWFtLmN1cnNvcjtmcmFtZS5wYWdlU2l6ZT1zdHJlYW0uY29uc3RydWN0b3IucGFnZVNpemU7aWYoZnJhbWUuY2FuVHJhbnNmZXIpe3RyYW5zZmVyPWZ1bmN0aW9uKCl7dmFyIGksbGVuLHJlZixyZXN1bHRzO3JlZj1mcmFtZS5kYXRhO3Jlc3VsdHM9W107Zm9yKGk9MCxsZW49cmVmLmxlbmd0aDtpPGxlbjtpKyspe3BhZ2U9cmVmW2ldO3Jlc3VsdHMucHVzaChwYWdlLmJ1ZmZlcil9cmV0dXJuIHJlc3VsdHN9KCk7cmV0dXJuIHNlbGYucG9zdE1lc3NhZ2UoZnJhbWUsdHJhbnNmZXIpfWVsc2V7cmV0dXJuIHNlbGYucG9zdE1lc3NhZ2UoZnJhbWUpfX07c2VsZi5vbm1lc3NhZ2U9ZnVuY3Rpb24oZXZlbnQpe3JldHVybiByZW5kZXJGcmFtZShldmVudC5kYXRhKX19LHsiLi9HSUZFbmNvZGVyLmpzIjoxfV19LHt9LFs0XSk7Ci8vIyBzb3VyY2VNYXBwaW5nVVJMPWdpZi53b3JrZXIuanMubWFwCg==";
  let gifWorkerUrl = null;
  function getGifWorkerUrl(){
    if(!gifWorkerUrl){
      const bytes = atob(GIF_WORKER_B64);
      const arr = new Uint8Array(bytes.length);
      for(let i=0; i<bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], {type: 'application/javascript'});
      gifWorkerUrl = URL.createObjectURL(blob);
    }
    return gifWorkerUrl;
  }
  let onionSkinEnabled = false;
  let onionSkinCount = 1;
  let onionSkinOpacity = 50;
  let onionSkinCache = { prev: [], next: [] };
  let seamlessModeEnabled = false;
  let editingHeightMode = false;
  let editingRoughnessMode = false;
  let lightingPreviewEnabled = false;
  let lightPosX = 0.3, lightPosY = 0.3; // normalized 0-1 within the tile
  let lightingDragging = false;
  let colorHighlightActive = false;

  function generateDefaultPaletteColors() {
    const list = [];
    let cid = 1;
    // 9 grayscale swatches at the top (3 columns x 3 rows: white on left, black on right)
    const grays = [
      "#ffffff", "#e0e0e0", "#c0c0c0",
      "#a0a0a0", "#808080", "#606060",
      "#404040", "#202020", "#000000"
    ];
    grays.forEach(hex => list.push({ id: cid++, hex }));

    // Common Hues (3x3 grid per hue: saturation left->right, lightness top->bottom)
    const hues = [
      { name: "Red", h: 0 },
      { name: "Orange", h: 30 },
      { name: "Yellow", h: 55, lSteps: [0.80, 0.60, 0.40] },
      { name: "Lime", h: 85 },
      { name: "Green", h: 130 },
      { name: "Teal", h: 175 },
      { name: "Blue", h: 215 },
      { name: "Purple", h: 265 },
      { name: "Magenta", h: 315 },
      { name: "Brown", h: 25, sSteps: [0.30, 0.50, 0.75], lSteps: [0.65, 0.42, 0.22] }
    ];

    const sDefault = [0.30, 0.65, 0.95];
    const lDefault = [0.75, 0.50, 0.25];

    hues.forEach(hueObj => {
      const sSteps = hueObj.sSteps || sDefault;
      const lSteps = hueObj.lSteps || lDefault;
      for (let r = 0; r < 3; r++) { // 3 lightness steps (top to bottom)
        for (let c = 0; c < 3; c++) { // 3 saturation steps (left to right)
          const hex = hslToHex(hueObj.h, sSteps[c], lSteps[r]);
          list.push({ id: cid++, hex });
        }
      }
    });
    return { colors: list, nextId: cid };
  }

  const defaultPaletteInit = generateDefaultPaletteColors();
  let groups = [
    { id:0, name:'Main Palette', isMain:true,
      colors: defaultPaletteInit.colors,
      collapsed:false, columns:9 }
  ];
  let groupIdCounter = 1;
  let mainColorIdCounter = defaultPaletteInit.nextId;
  let fgColor = '#ffffff';
  let selectedColors = new Set();
  let rangeAnchor = { groupId:null, index:null };
  function mainGroup(){ return groups.find(g=>g.isMain) || groups[0]; }
  function mainColorById(id){ return mainGroup().colors.find(c=>c.id===id); }
  function sortGroupByHueSatValue(group){
    const HUE_BUCKETS = 12; // 30 degrees each
    function sortKey(hex){
      const {h,s,l} = hexToHsl(hex);
      const bucket = Math.floor(h / (360/HUE_BUCKETS)) % HUE_BUCKETS;
      return {bucket, s, l};
    }
    function cmp(ka, kb){
      if(ka.bucket !== kb.bucket) return ka.bucket - kb.bucket;
      if(Math.abs(ka.s-kb.s) > 0.001) return ka.s - kb.s;
      return ka.l - kb.l;
    }
    if(group.isMain){
      group.colors.sort((a,b)=> cmp(sortKey(a.hex), sortKey(b.hex)));
    } else {
      const withKeys = group.colorRefs.map(id=>{
        const entry = mainColorById(id);
        return { id, key: sortKey(entry ? entry.hex : '#000000') };
      });
      withKeys.sort((a,b)=> cmp(a.key, b.key));
      group.colorRefs = withKeys.map(w=>w.id);
    }
    refreshGroups();
  }
  function resolveGroupSwatches(group){
    // Returns [{id,hex}, ...] for rendering — main group's own colors, or a reference
    // group's colorRefs resolved live against the main group (so edits there propagate).
    if(group.isMain) return group.colors;
    return group.colorRefs.map(id=>mainColorById(id)).filter(Boolean);
  }
  function groupArray(group){
    // The actual array to splice for reordering: Main's real {id,hex} objects, or a
    // reference group's plain id list.
    return group.isMain ? group.colors : group.colorRefs;
  }

  // ---------- Palette swatch drag-and-drop (pointer-based, live reorder, multi-item) ----------
  // Picking up a selected swatch that's part of a larger selection drags the whole selection
  // together. Reordering happens continuously as the cursor moves — no delay — by hit-testing
  // cursor position against the currently-rendered (non-dragged) swatches in the grid.
  const PTR_DRAG_THRESHOLD = 4;
  let ptrDrag = null; // { group, draggedItems, originalIndices, insertAt }
  let dragGhostEl = null;

  let lastSwatchClickKey = null;
  let lastSwatchClickTime = 0;
  function beginSwatchPointerTracking(group, entry, idx, downEv){
    if(downEv.button !== 0) return;
    const startX = downEv.clientX, startY = downEv.clientY;
    let started = false;

    function onMove(ev){
      if(!started){
        if(Math.abs(ev.clientX-startX) > PTR_DRAG_THRESHOLD || Math.abs(ev.clientY-startY) > PTR_DRAG_THRESHOLD){
          started = true;
          beginSwatchDrag(group, idx, ev);
        }
        return;
      }
      updateSwatchDrag(ev);
    }
    function onUp(upEv){
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if(started){
        endSwatchDrag();
      } else {
        // No actual drag occurred — treat this as a click here directly, rather than relying on
        // the browser's native 'click' event. Even slight pointer jitter during an intended
        // click can occasionally exceed the drag threshold, triggering a (no-op) reorder that
        // re-renders the swatch grid mid-interaction — which silently suppresses the native
        // 'click' event since pointerdown/pointerup no longer target the same DOM element,
        // requiring a confusing second click to actually register the selection.
        //
        // Double-click detection is handled manually here too, for the same underlying reason:
        // handleSwatchClick() always calls refreshGroups() at the end, which now runs on every
        // single click — so the second click of an intended double-click lands on a freshly
        // replaced DOM element, which silently breaks the browser's native 'dblclick' event.
        const key = group.id + ':' + idx;
        const now = Date.now();
        if(group.isMain && lastSwatchClickKey === key && (now - lastSwatchClickTime) < 400){
          lastSwatchClickKey = null;
          openColorEditor(entry, upEv);
          return;
        }
        lastSwatchClickKey = key;
        lastSwatchClickTime = now;
        handleSwatchClick(group, entry, idx, upEv);
      }
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function beginSwatchDrag(group, idx, ev){
    const arr = groupArray(group);
    const clickedItem = arr[idx];
    const clickedHex = group.isMain ? clickedItem.hex : mainColorById(clickedItem).hex;

    let indices;
    if(clickedHex && selectedColors.has(clickedHex) && selectedColors.size > 1){
      const swatches = resolveGroupSwatches(group);
      indices = [];
      swatches.forEach((entry,i)=>{ if(selectedColors.has(entry.hex)) indices.push(i); });
    } else {
      indices = [idx];
    }
    indices.sort((a,b)=>a-b);
    const draggedItems = indices.map(i=>arr[i]);

    ptrDrag = { group, draggedItems, originalIndices: indices, insertAt: indices[0] };
    for(let i=indices.length-1;i>=0;i--) arr.splice(indices[i], 1);
    arr.splice(ptrDrag.insertAt, 0, ...draggedItems); // reinsert as one contiguous tentative block

    createDragGhost(draggedItems, group, ev.clientX, ev.clientY);
    refreshGroups();
  }

  function findSwatchGridForGroup(group){
    return document.querySelector('.group-swatch-grid[data-group-id="'+group.id+'"]');
  }

  function updateSwatchDrag(ev){
    if(!ptrDrag) return;
    moveDragGhost(ev.clientX, ev.clientY);
    const grid = findSwatchGridForGroup(ptrDrag.group);
    if(!grid) return;
    const n = ptrDrag.draggedItems.length;
    const allEls = [...grid.querySelectorAll('.swatch')];
    const nonDraggedEls = allEls.filter((_, i) => i < ptrDrag.insertAt || i >= ptrDrag.insertAt + n);

    let newIndex = nonDraggedEls.length;
    for(let i=0;i<nonDraggedEls.length;i++){
      const rect = nonDraggedEls[i].getBoundingClientRect();
      if(ev.clientY < rect.top){ newIndex = i; break; }
      if(ev.clientY <= rect.bottom && ev.clientX < rect.left + rect.width/2){ newIndex = i; break; }
    }

    if(newIndex !== ptrDrag.insertAt){
      const arr = groupArray(ptrDrag.group);
      arr.splice(ptrDrag.insertAt, n);
      arr.splice(newIndex, 0, ...ptrDrag.draggedItems);
      ptrDrag.insertAt = newIndex;
      captureFlipSnapshot('.swatch[data-flip-key]');
      refreshGroups();
      playFlipAnimation('.swatch[data-flip-key]');
    }
  }

  function endSwatchDrag(){
    if(!ptrDrag) return;
    removeDragGhost();
    ptrDrag = null;
    refreshGroups();
  }

  function cancelSwatchDrag(){
    if(!ptrDrag) return;
    removeDragGhost();
    const arr = groupArray(ptrDrag.group);
    arr.splice(ptrDrag.insertAt, ptrDrag.draggedItems.length);
    ptrDrag.originalIndices.forEach((origIdx, i) => arr.splice(origIdx, 0, ptrDrag.draggedItems[i]));
    ptrDrag = null;
    refreshGroups();
  }

  function createDragGhost(items, group, x, y){
    dragGhostEl = document.createElement('div');
    dragGhostEl.className = 'drag-ghost';
    items.slice(0,5).forEach((item, i)=>{
      const hex = group.isMain ? item.hex : mainColorById(item).hex;
      const chip = document.createElement('div');
      chip.className = 'drag-ghost-chip';
      chip.style.background = hex;
      chip.style.transform = 'translate(' + (i*4) + 'px, ' + (i*4) + 'px)';
      dragGhostEl.appendChild(chip);
    });
    if(items.length > 1){
      const badge = document.createElement('div');
      badge.className = 'drag-ghost-badge';
      badge.textContent = items.length;
      dragGhostEl.appendChild(badge);
    }
    document.body.appendChild(dragGhostEl);
    moveDragGhost(x,y);
  }
  function moveDragGhost(x,y){
    if(dragGhostEl){ dragGhostEl.style.left = x+'px'; dragGhostEl.style.top = y+'px'; }
  }
  function removeDragGhost(){
    if(dragGhostEl){ dragGhostEl.remove(); dragGhostEl = null; }
  }

  // FLIP animation (First-Last-Invert-Play) for live reordering: snapshot each swatch/chip's
  // position before the DOM rebuilds, then after rebuilding, offset each one back to its old
  // spot with no transition and immediately animate to zero offset — the browser tweens the
  // visual position smoothly even though the actual DOM reorder itself is instant.
  let flipSnapshots = null;
  function captureFlipSnapshot(selector){
    flipSnapshots = new Map();
    document.querySelectorAll(selector).forEach(el=>{
      if(el.dataset.flipKey) flipSnapshots.set(el.dataset.flipKey, el.getBoundingClientRect());
    });
  }
  function playFlipAnimation(selector){
    if(!flipSnapshots) return;
    const snapshots = flipSnapshots;
    flipSnapshots = null;
    document.querySelectorAll(selector).forEach(el=>{
      const key = el.dataset.flipKey;
      const oldRect = key && snapshots.get(key);
      if(!oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left, dy = oldRect.top - newRect.top;
      if(!dx && !dy) return;
      el.style.transition = 'none';
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      requestAnimationFrame(()=>{
        el.style.transition = 'transform .15s ease';
        el.style.transform = '';
      });
    });
  }

  // ---------- Gradient stop drag-and-drop (same pick up / pause-to-shift / commit-or-revert
  // pattern as palette swatches, but tracked explicitly by index+removed-flag rather than by
  // object identity, since buildingStops holds plain hex strings that can legitimately repeat) ----------
  // Gradient stop drag — same pointer-based live-reorder pattern as palette swatches, single
  // item only (stops have no multi-select). Tracked by index (not object identity) since
  // buildingStops holds plain hex strings that can legitimately repeat.
  let stopPtrDrag = null; // { item, insertAt }

  function beginStopPointerTracking(idx, downEv){
    if(downEv.button !== 0) return;
    const startX = downEv.clientX, startY = downEv.clientY;
    let started = false;
    function onMove(ev){
      if(!started){
        if(Math.abs(ev.clientX-startX) > PTR_DRAG_THRESHOLD || Math.abs(ev.clientY-startY) > PTR_DRAG_THRESHOLD){
          started = true;
          beginStopDrag(idx, ev);
        }
        return;
      }
      updateStopDrag(ev);
    }
    function onUp(){
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if(started){ removeDragGhost(); stopPtrDrag = null; refreshBuilder(); }
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function beginStopDrag(idx, ev){
    const item = buildingStops[idx];
    stopPtrDrag = { item, originalIndex: idx, insertAt: idx };
    buildingStops.splice(idx, 1);
    buildingStops.splice(idx, 0, item);
    createDragGhost([{hex:item}], {isMain:true}, ev.clientX, ev.clientY);
    refreshBuilder();
  }

  function updateStopDrag(ev){
    if(!stopPtrDrag) return;
    moveDragGhost(ev.clientX, ev.clientY);
    const chips = document.getElementById('stopChips');
    if(!chips) return;
    const allEls = [...chips.querySelectorAll('.stop-chip')];
    const nonDraggedEls = allEls.filter((_, i) => i !== stopPtrDrag.insertAt);

    let newIndex = nonDraggedEls.length;
    for(let i=0;i<nonDraggedEls.length;i++){
      const rect = nonDraggedEls[i].getBoundingClientRect();
      if(ev.clientY < rect.top){ newIndex = i; break; }
      if(ev.clientY <= rect.bottom && ev.clientX < rect.left + rect.width/2){ newIndex = i; break; }
    }

    if(newIndex !== stopPtrDrag.insertAt){
      buildingStops.splice(stopPtrDrag.insertAt, 1);
      buildingStops.splice(newIndex, 0, stopPtrDrag.item);
      stopPtrDrag.insertAt = newIndex;
      captureFlipSnapshot('.stop-chip[data-flip-key]');
      refreshBuilder();
      playFlipAnimation('.stop-chip[data-flip-key]');
    }
  }

  function cancelStopDrag(){
    if(!stopPtrDrag) return;
    removeDragGhost();
    buildingStops.splice(stopPtrDrag.insertAt, 1);
    buildingStops.splice(stopPtrDrag.originalIndex, 0, stopPtrDrag.item);
    stopPtrDrag = null;
    refreshBuilder();
  }

  function allColors(){
    const out = [];
    groups.forEach(g => resolveGroupSwatches(g).forEach(c => out.push(c.hex)));
    return out;
  }
  function fitSidePanelToPalette(){
    const sidePanel = document.querySelector('.side-panel');
    if(!sidePanel) return;
    let maxGridWidth = 0;
    groups.forEach(g=>{
      const w = g.columns * 32 - 6; // 26px swatch + 6px gap each, minus the trailing gap
      if(w > maxGridWidth) maxGridWidth = w;
    });
    if(maxGridWidth === 0) maxGridWidth = 8 * 32 - 6;
    const needed = maxGridWidth + 80; // panel padding (20px) + section (18px) + card (18px) + scrollbar buffer (24px)
    const clamped = Math.max(220, Math.min(800, needed));
    sidePanel.style.flex = '0 0 ' + clamped + 'px';
    sidePanel.style.width = clamped + 'px';
    if(typeof fitCanvasToScreen === 'function') fitCanvasToScreen(false); // panel width changed, so pan padding needs recomputing
  }

  let gradients = [];
  let selectedGradientIndex = null;
  let buildingStops = [];
  let editingGradientIndex = null;

  let stamps = [];
  let selectedStampIndex = null;
  const STAMP_SCRATCH_MAX = 256; // generous headroom above typical dab sizes; avoids per-dab canvas resize
  const stampScratch = document.createElement('canvas');
  stampScratch.width = STAMP_SCRATCH_MAX; stampScratch.height = STAMP_SCRATCH_MAX;
  const stampScratchCtx = stampScratch.getContext('2d', { willReadFrequently: true });
  const shapeScratch = document.createElement('canvas');
  shapeScratch.width = STAMP_SCRATCH_MAX; shapeScratch.height = STAMP_SCRATCH_MAX;
  const shapeScratchCtx = shapeScratch.getContext('2d', { willReadFrequently: true });

  // ---------- WebGL-accelerated stamp spraying (PixiJS ParticleContainer) ----------
  // Only the stamp dab shape routes through here — circle/square dabs stay on the existing
  // Canvas 2D path, which is already cheap. Stamps with heavy jitter at large sizes generate
  // thousands of transformed sprite instances per stroke; batching those through the GPU
  // avoids the per-call JS↔native dispatch cost that dominates when doing that many individual
  // Canvas 2D drawImage calls. Falls back gracefully to the old Canvas 2D stamp path if WebGL
  // or PixiJS itself is unavailable for any reason.
  let pixiApp = null;
  let pixiParticleContainer = null;
  let pixiStrokeActive = false;
  let pixiAvailable = false;
  function initPixiForStamps(){
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, W + MARGIN_PX*2);
      canvas.height = Math.max(1, H + MARGIN_PX*2);
      pixiApp = new PIXI.Application({
        view: canvas,
        width: canvas.width,
        height: canvas.height,
        backgroundAlpha: 0,
        antialias: true,
        powerPreference: 'high-performance',
        autoStart: false
      });
      pixiApp.ticker.stop(); // we render manually, on the same cadence as the rest of painting
      pixiParticleContainer = new PIXI.ParticleContainer(16384, {
        vertices: true, position: true, rotation: true, uvs: false, tint: true
      }, 16384, true);
      pixiApp.stage.addChild(pixiParticleContainer);
      pixiAvailable = true;
    } catch(err){
      console.warn('WebGL/PixiJS unavailable — stamp spray will use the standard Canvas 2D path instead.', err);
      pixiAvailable = false;
    }
  }
  function getEffectiveCanvasW(){ return seamlessModeEnabled ? W * 3 : W; }
  function getEffectiveCanvasH(){ return seamlessModeEnabled ? H * 3 : H; }

  function resizeAllCanvasesToWH(){
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    displayCanvas.width = effW; displayCanvas.height = effH;
    gridCanvas.width = effW; gridCanvas.height = effH;
    selectionCanvas.width = effW; selectionCanvas.height = effH;
    cursorPreviewCanvas.width = effW + MARGIN_PX*2; cursorPreviewCanvas.height = effH + MARGIN_PX*2;
    colorHighlightCanvas.width = effW; colorHighlightCanvas.height = effH;
    const canvasLighting = document.getElementById('canvasLightingCanvas');
    if(canvasLighting){ canvasLighting.width = effW; canvasLighting.height = effH; }
    const canvasGizmo = document.getElementById('canvasLightingGizmoCanvas');
    if(canvasGizmo){ canvasGizmo.width = effW; canvasGizmo.height = effH; }
    modalPreviewCanvas.width = effW; modalPreviewCanvas.height = effH;
    marginFadeCanvas.width = effW + MARGIN_PX*2; marginFadeCanvas.height = effH + MARGIN_PX*2;
    resizePixiCanvas();
  }
  function resizePixiCanvas(){
    if(!pixiAvailable || !pixiApp) return;
    pixiApp.renderer.resize(Math.max(1, W + MARGIN_PX*2), Math.max(1, H + MARGIN_PX*2));
  }
  const stampPixiTextureCache = new WeakMap(); // maskCanvas -> PIXI.Texture (masks never mutate after creation)
  function getStampPixiTexture(maskCanvas){
    let tex = stampPixiTextureCache.get(maskCanvas);
    if(!tex){
      tex = PIXI.Texture.from(maskCanvas);
      stampPixiTextureCache.set(maskCanvas, tex);
    }
    const targetScaleMode = pixelPerfect ? PIXI.SCALE_MODES.NEAREST : PIXI.SCALE_MODES.LINEAR;
    if(tex.baseTexture && tex.baseTexture.scaleMode !== targetScaleMode){
      tex.baseTexture.scaleMode = targetScaleMode;
      tex.baseTexture.update();
    }
    return tex;
  }
  function hexColorToPixiTint(hex){
    return parseInt(hex.replace('#',''), 16) || 0xffffff;
  }
  function clearPixiStroke(){
    if(!pixiAvailable) return;
    pixiParticleContainer.removeChildren();
    pixiStrokeActive = false;
  }
  function commitPixiStroke(){
    if(!pixiAvailable || !pixiStrokeActive || !layers[activeLayer]) return;
    pixiApp.render();
    withHeightMask(0, 0, W, H, ()=>{
      const ctx = layers[activeLayer].ctx;
      paintNoBlend(ctx, W, H, 0, 0, W, H, (sctx)=>{
        sctx.globalAlpha = opacity/100;
        sctx.imageSmoothingEnabled = !pixelPerfect;
        sctx.drawImage(pixiApp.view, MARGIN_PX, MARGIN_PX, W, H, 0, 0, W, H);
      });
    });
    clearPixiStroke();
  }

  let grids = [];
  let gridMasterOn = false;
  let snapToGridEnabled = false;
  let gridIdCounter = 1;

  let tool = 'spray';
  let toolBeforeSpace = null;
  let brushSize = 24;
  let opacity = 100;
  let sourceKind = 'selected';
  let dabShape = 'circle';
  let brushShape = 'square';
  let eraserShape = 'circle';
  let eraserHardness = 100;
  let brushMode = 'paint';
  let sprayMode = 'paint';
  let softenType = 'edge'; // 'edge' | 'full'
  let softenHardness = 100; // 0 to 100

  function updateSoftenUI(){
    const group = document.getElementById('softenOptionsGroup');
    const isSoften = (sprayMode === 'blur' || (tool === 'brush' && brushMode === 'blur'));
    if(group) group.style.display = isSoften ? 'block' : 'none';

    document.querySelectorAll('.soften-type-btn').forEach(b=>{
      const isActive = (b.dataset.softenType === softenType);
      b.classList.toggle('active', isActive);
      b.classList.toggle('primary', isActive);
    });

    const shs = document.getElementById('softenHardnessSlider');
    if(shs) shs.value = softenHardness;
    const shv = document.getElementById('softenHardnessVal');
    if(shv) shv.textContent = softenHardness + '%';

    const hint = document.getElementById('softenTypeHint');
    if(hint){
      if(softenType === 'full'){
        hint.textContent = 'Full Area: Fades opacity under the entire brush shape (reduces opacity across solid interior pixels too).';
      } else {
        hint.textContent = 'Edge Only: Smooths and fades opacity along boundaries where colored shapes meet transparency.';
      }
    }
  }
  let heightPaintEnabled = false;
  let heightSourceLayerIndex = null;
  let heightMode = 'range';
  let heightMin = 0, heightMax = 255, heightSoftness = 0;
  let vineRAF = null;
  let brushSoftenRAF = null;
  let brushSoftenLastTick = 0;
  let vineTipX = 0, vineTipY = 0;
  let vineDirX = 0, vineDirY = -1;
  let vineDistSinceDecoration = 0;
  let vineNextDecorationAt = 0;
  let vineHasDirection = false;
  let vineNextLeafSide = 1;
  let vineDensity = 50;
  let vineDecorSize = 14;
  let vineMaxTurnPct = 100;
  let brushLineAnchorX = null, brushLineAnchorY = null;
  let measureStartX = null, measureStartY = null;
  let measuring = false;
  let vineRotationJitter = 30;
  let vineOffshootDensity = 20;
  let vineOffshootLength = 40;
  let isGrowingOffshoot = false;
  let pathUndoSnapshot = null;
  let pathPoints = []; // [{x, y}]
  let pathState = 'idle'; // 'idle' | 'start_placed' | 'end_placed'
  let vineSizeJitter = 0;
  let pathStyle = "default";
  let vineEnableDecorations = true;
  let vineDecorationType = 'shape-leaf';
  let vineOffshootSizeSliderVal = 45;
  let paintTaperEnabled = false;
  let paintTaperStart = true;
  let paintTaperFinish = false;
  let paintTaperLength = 16;
  let paintTaperOpacityFade = false;
  let paintTaperSizePct = 100;
  let paintTaperSpreadPct = 100;
  let freehandPathDetail = 30;
  let gradientDabsPerColor = 1;
  let gradientSequentialStepMode = 'distance'; // 'distance' | 'dabs'
  let paintDabCounter = 0;
  let gradientOrdered = false;
  let gradientCycleLength = 200;
  let vinePresetIdCounter = 1;
  let activeVinePresetId = 'builtin-vine-classic';
  const DEFAULT_BUILTIN_VINE_PRESETS = [
    {
      id: 'builtin-vine-classic',
      name: 'Classic Green Ivy',
      builtin: true,
      savedSettings: {
        brushSize: 14,
        vineDensity: 50,
        vineDecorSize: 14,
        vineRotationJitter: 30,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 20,
        vineOffshootLength: 40,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: true,
        vineTaperLength: 50,
        vineSizeJitter: 15,
        pathStyle: 'default',
        vineEnableDecorations: true
      },
      settings: {
        brushSize: 14,
        vineDensity: 50,
        vineDecorSize: 14,
        vineRotationJitter: 30,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 20,
        vineOffshootLength: 40,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: true,
        vineTaperLength: 50,
        vineSizeJitter: 15,
        pathStyle: 'default',
        vineEnableDecorations: true
      }
    },
    {
      id: 'builtin-vine-moss',
      name: 'Castle Moss (Winding)',
      builtin: true,
      savedSettings: {
        brushSize: 6,
        vineDensity: 80,
        vineDecorSize: 8,
        vineRotationJitter: 20,
        vineMaxTurnPct: 70,
        vineOffshootDensity: 0,
        vineOffshootLength: 0,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: false,
        vineTaperLength: 50,
        vineSizeJitter: 10,
        pathStyle: 'default',
        vineEnableDecorations: true
      },
      settings: {
        brushSize: 6,
        vineDensity: 80,
        vineDecorSize: 8,
        vineRotationJitter: 20,
        vineMaxTurnPct: 70,
        vineOffshootDensity: 0,
        vineOffshootLength: 0,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: false,
        vineTaperLength: 50,
        vineSizeJitter: 10,
        pathStyle: 'default',
        vineEnableDecorations: true
      }
    },
    {
      id: 'builtin-vine-pipes',
      name: 'Tech Circuit Pipes (Right Angles)',
      builtin: true,
      savedSettings: {
        brushSize: 8,
        vineDensity: 0,
        vineDecorSize: 0,
        vineRotationJitter: 0,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 0,
        vineOffshootLength: 0,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: false,
        vineTaperLength: 50,
        vineSizeJitter: 0,
        pathStyle: '90',
        vineEnableDecorations: false
      },
      settings: {
        brushSize: 8,
        vineDensity: 0,
        vineDecorSize: 0,
        vineRotationJitter: 0,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 0,
        vineOffshootLength: 0,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: false,
        vineTaperLength: 50,
        vineSizeJitter: 0,
        pathStyle: '90',
        vineEnableDecorations: false
      }
    },
    {
      id: 'builtin-vine-techbranch',
      name: 'Modular Tech Grid Branch',
      builtin: true,
      savedSettings: {
        brushSize: 10,
        vineDensity: 40,
        vineDecorSize: 12,
        vineRotationJitter: 0,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 30,
        vineOffshootLength: 35,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: false,
        vineTaperLength: 50,
        vineSizeJitter: 0,
        pathStyle: '90',
        vineEnableDecorations: true
      },
      settings: {
        brushSize: 10,
        vineDensity: 40,
        vineDecorSize: 12,
        vineRotationJitter: 0,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 30,
        vineOffshootLength: 35,
        vineTaperStart: false,
        vineTaperFinish: false,
        vineTaperOffshoots: false,
        vineTaperLength: 50,
        vineSizeJitter: 0,
        pathStyle: '90',
        vineEnableDecorations: true
      }
    },
    {
      id: 'builtin-vine-dotted',
      name: 'Dotted Guide Line (No Details)',
      builtin: true,
      savedSettings: {
        brushSize: 5,
        vineDensity: 0,
        vineDecorSize: 0,
        vineRotationJitter: 0,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 0,
        vineOffshootLength: 0,
        vineTaperStart: true,
        vineTaperFinish: true,
        vineTaperOffshoots: false,
        vineTaperLength: 80,
        vineSizeJitter: 0,
        pathStyle: 'default',
        vineEnableDecorations: false
      },
      settings: {
        brushSize: 5,
        vineDensity: 0,
        vineDecorSize: 0,
        vineRotationJitter: 0,
        vineMaxTurnPct: 100,
        vineOffshootDensity: 0,
        vineOffshootLength: 0,
        vineTaperStart: true,
        vineTaperFinish: true,
        vineTaperOffshoots: false,
        vineTaperLength: 80,
        vineSizeJitter: 0,
        pathStyle: 'default',
        vineEnableDecorations: false
      }
    }
  ];
  let vinePresets = JSON.parse(JSON.stringify(DEFAULT_BUILTIN_VINE_PRESETS));
  let pathSegments = [];
  let vineSessionBackupCanvas = null;
  let vineSeed = 42;
  let pixelPerfect = true;
  let flow = 100;
  let density = 30;
  let dabSize = 8;
  let dabWidth = 8;
  let dabHeight = 8;
  let dabLockAspect = true;
  let fillMode = 'connected';
  let fillTolerance = 0;
  let sizeJitterAmt = 0;
  let sizeJitterMin = 100;
  let sizeJitterMax = 100;
  let dabWidthJitterMin = 100;
  let dabWidthJitterMax = 100;
  let dabHeightJitterMin = 100;
  let dabHeightJitterMax = 100;
  let opacityJitterAmt = 0;
  let opacityJitterMin = 100;
  let opacityJitterMax = 100;
  let rotationJitterAmt = 0;
  let rotationMode = 'range'; // 'range' | 'toward' | 'away'
  let rotationAlgorithm = 'rotsprite'; // 'rotsprite' | 'areasample' | 'smooth' | 'nearest'
  let rotationMinAngle = 0;
  let rotationMaxAngle = 0;
  let rotationRanges = [{ min: 0, max: 0 }];
  let activeRotationRangeIndex = 0;
  let sprayTargetAnchorX = null;
  let sprayTargetAnchorY = null;
  let spraySnapToGrid = false;
  let spraySnapClearCell = false;
  let settingSprayAnchorMode = false;
  let sprayLineAnchorX = null;
  let sprayLineAnchorY = null;
  let falloff = 40;
  let sprayPresetIdCounter = 1;
    let sprayCombineSameColor = false;
  let sprayInterpolate = true;
  let activeSprayPresetId = 'builtin-spray';
  const DEFAULT_BUILTIN_SPRAY_PRESETS = [
    { id: 'builtin-pixelperfect', name: 'Pixel-Perfect Pencil', builtin: true,
      savedSettings: { sprayMode: 'paint', brushSize: 1, dabSize: 1, dabWidth: 1, dabHeight: 1, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'paint', brushSize: 1, dabSize: 1, dabWidth: 1, dabHeight: 1, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-spray', name: 'Default Spray', builtin: true,
      savedSettings: { sprayMode: 'paint', brushSize: 24, dabSize: 8, dabWidth: 8, dabHeight: 8, dabLockAspect: true, density: 30, falloff: 40, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'circle', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'paint', brushSize: 24, dabSize: 8, dabWidth: 8, dabHeight: 8, dabLockAspect: true, density: 30, falloff: 40, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'circle', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-brush', name: 'Solid Brush', builtin: true,
      savedSettings: { sprayMode: 'paint', brushSize: 12, dabSize: 12, dabWidth: 12, dabHeight: 12, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'paint', brushSize: 12, dabSize: 12, dabWidth: 12, dabHeight: 12, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-finespray', name: 'Fine Spray', builtin: true,
      savedSettings: { sprayMode: 'paint', brushSize: 16, dabSize: 1, dabWidth: 1, dabHeight: 1, dabLockAspect: true, density: 40, falloff: 20, flow: 80, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'paint', brushSize: 16, dabSize: 1, dabWidth: 1, dabHeight: 1, dabLockAspect: true, density: 40, falloff: 20, flow: 80, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-eraser', name: 'Eraser', builtin: true,
      savedSettings: { sprayMode: 'eraser', brushSize: 12, dabSize: 12, dabWidth: 12, dabHeight: 12, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'eraser', brushSize: 12, dabSize: 12, dabWidth: 12, dabHeight: 12, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-colorize', name: 'Colorize', builtin: true,
      savedSettings: { sprayMode: 'colorize', brushSize: 16, dabSize: 16, dabWidth: 16, dabHeight: 16, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'colorize', brushSize: 16, dabSize: 16, dabWidth: 16, dabHeight: 16, dabLockAspect: true, density: 100, falloff: 0, flow: 100, sizeJitterMin: 100, sizeJitterMax: 100, opacityJitterMin: 100, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: 0, rotationMaxAngle: 0, dabShape: 'square', pixelPerfect: true, opacity: 100, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-soft', name: 'Soft Scatter', builtin: true,
      savedSettings: { sprayMode: 'blur', brushSize: 24, dabSize: 4, dabWidth: 4, dabHeight: 4, dabLockAspect: true, density: 25, falloff: 50, flow: 40, sizeJitterMin: 80, sizeJitterMax: 120, opacityJitterMin: 70, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: -180, rotationMaxAngle: 180, dabShape: 'circle', pixelPerfect: false, opacity: 80, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false },
      settings: { sprayMode: 'blur', brushSize: 24, dabSize: 4, dabWidth: 4, dabHeight: 4, dabLockAspect: true, density: 25, falloff: 50, flow: 40, sizeJitterMin: 80, sizeJitterMax: 120, opacityJitterMin: 70, opacityJitterMax: 100, rotationMode: 'range', rotationMinAngle: -180, rotationMaxAngle: 180, dabShape: 'circle', pixelPerfect: false, opacity: 80, sprayCombineSameColor: false, sprayInterpolate: true, spraySnapToGrid: false }
    },
    { id: 'builtin-vine-classic', name: 'Path: Classic Green Ivy', builtin: true,
      savedSettings: { sprayMode: 'path', brushSize: 14, vineDensity: 50, vineDecorSize: 14, vineRotationJitter: 30, vineMaxTurnPct: 100, vineOffshootDensity: 20, vineOffshootLength: 40, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: true, vineTaperLength: 50, vineSizeJitter: 15, pathStyle: 'default', vineEnableDecorations: true },
      settings: { sprayMode: 'path', brushSize: 14, vineDensity: 50, vineDecorSize: 14, vineRotationJitter: 30, vineMaxTurnPct: 100, vineOffshootDensity: 20, vineOffshootLength: 40, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: true, vineTaperLength: 50, vineSizeJitter: 15, pathStyle: 'default', vineEnableDecorations: true }
    },
    { id: 'builtin-vine-moss', name: 'Path: Castle Moss (Winding)', builtin: true,
      savedSettings: { sprayMode: 'path', brushSize: 8, vineDensity: 75, vineDecorSize: 8, vineRotationJitter: 60, vineMaxTurnPct: 40, vineOffshootDensity: 0, vineOffshootLength: 0, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: false, vineTaperLength: 10, vineSizeJitter: 25, pathStyle: 'default', vineEnableDecorations: true },
      settings: { sprayMode: 'path', brushSize: 8, vineDensity: 75, vineDecorSize: 8, vineRotationJitter: 60, vineMaxTurnPct: 40, vineOffshootDensity: 0, vineOffshootLength: 0, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: false, vineTaperLength: 10, vineSizeJitter: 25, pathStyle: 'default', vineEnableDecorations: true }
    },
    { id: 'builtin-vine-tech-pipes', name: 'Path: Tech Circuit Pipes', builtin: true,
      savedSettings: { sprayMode: 'path', brushSize: 10, vineDensity: 0, vineDecorSize: 10, vineRotationJitter: 0, vineMaxTurnPct: 100, vineOffshootDensity: 0, vineOffshootLength: 0, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: false, vineTaperLength: 0, vineSizeJitter: 0, pathStyle: '90', vineEnableDecorations: false },
      settings: { sprayMode: 'path', brushSize: 10, vineDensity: 0, vineDecorSize: 10, vineRotationJitter: 0, vineMaxTurnPct: 100, vineOffshootDensity: 0, vineOffshootLength: 0, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: false, vineTaperLength: 0, vineSizeJitter: 0, pathStyle: '90', vineEnableDecorations: false }
    },
    { id: 'builtin-vine-tech-grid', name: 'Path: Modular Tech Grid Branch', builtin: true,
      savedSettings: { sprayMode: 'path', brushSize: 12, vineDensity: 40, vineDecorSize: 16, vineRotationJitter: 0, vineMaxTurnPct: 100, vineOffshootDensity: 30, vineOffshootLength: 50, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: false, vineTaperLength: 0, vineSizeJitter: 0, pathStyle: '90', vineEnableDecorations: true },
      settings: { sprayMode: 'path', brushSize: 12, vineDensity: 40, vineDecorSize: 16, vineRotationJitter: 0, vineMaxTurnPct: 100, vineOffshootDensity: 30, vineOffshootLength: 50, vineTaperStart: false, vineTaperFinish: false, vineTaperOffshoots: false, vineTaperLength: 0, vineSizeJitter: 0, pathStyle: '90', vineEnableDecorations: true }
    },
    { id: 'builtin-vine-dotted', name: 'Path: Dotted Guide Line', builtin: true,
      savedSettings: { sprayMode: 'path', brushSize: 4, vineDensity: 100, vineDecorSize: 4, vineRotationJitter: 0, vineMaxTurnPct: 100, vineOffshootDensity: 0, vineOffshootLength: 0, vineTaperStart: true, vineTaperFinish: true, vineTaperOffshoots: false, vineTaperLength: 15, vineSizeJitter: 0, pathStyle: 'default', vineEnableDecorations: false },
      settings: { sprayMode: 'path', brushSize: 4, vineDensity: 100, vineDecorSize: 4, vineRotationJitter: 0, vineMaxTurnPct: 100, vineOffshootDensity: 0, vineOffshootLength: 0, vineTaperStart: true, vineTaperFinish: true, vineTaperOffshoots: false, vineTaperLength: 15, vineSizeJitter: 0, pathStyle: 'default', vineEnableDecorations: false }
    }
  ];
  let sprayPresets = JSON.parse(JSON.stringify(DEFAULT_BUILTIN_SPRAY_PRESETS));

  let painting = false;
  let panning = false;
  let panStart = {x:0,y:0,scrollLeft:0,scrollTop:0};
  let lastX = 0, lastY = 0;

  let selecting = false;
  let pendingColorPick = null; // callback fn, or null when not currently picking
  let previousToolBeforePick = null;
  let selectStart = {x:0,y:0};
  let selection = null; // {x,y,w,h} in image-space integer px
  let floatingSelection = null; // {canvas, x, y, w, h} — lifted pixel content currently being moved
  let movingSelection = false;
  let moveGrabOffsetX = 0, moveGrabOffsetY = 0;
  let sprayRAF = null;
  let sprayBuffer = null, sprayBufferCtx = null;
  let sprayLastBurst = 0;

  let zoom = 1;
  const MARGIN_PX = 128; // canvas-space margin around the paintable area: scratchpad that fades, scales with zoom
  let marginHasContent = false; // true whenever a paint op touches the margin ring — lets the
  // fade tick skip its full-canvas scan entirely while the margin is empty, which is most of
  // the time in normal use (painting away from the canvas edges never touches it at all)
  let autoFullscreen = false;

  // ---------- History (undo/redo) ----------
  let undoStack = [];
  let redoStack = [];
  const MAX_HISTORY = 40;

  function snapshot(){
    return {
      W, H, activeLayer, editingHeightMode, editingRoughnessMode,
      groups: JSON.parse(JSON.stringify(groups)),
      selectedColors: Array.from(selectedColors),
      fgColor: fgColor,
      layers: layers.map(l=>({
        name:l.name, visible:l.visible, locked:!!l.locked, opacity:l.opacity,
        colorData: l.colorCanvas.toDataURL(),
        heightData: l.heightCanvas ? l.heightCanvas.toDataURL() : null,
        roughnessData: l.roughnessCanvas ? l.roughnessCanvas.toDataURL() : null
      }))
    };
  }
  function pushHistory(){
    undoStack.push(snapshot());
    if(undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }
  function restore(state){
    const dimsChanged = (state.W !== W || state.H !== H);
    return Promise.all(state.layers.map(ld=> new Promise(res=>{
      const img = new Image();
      img.onload = ()=>{
        const c = document.createElement('canvas');
        c.width = state.W; c.height = state.H;
        c.getContext('2d', { willReadFrequently: true }).drawImage(img,0,0);
        const ctx = c.getContext('2d', { willReadFrequently: true });
        const layerObj = {
          name:ld.name, canvas:c, ctx,
          colorCanvas:c, colorCtx:ctx,
          heightCanvas:null, heightCtx:null,
          roughnessCanvas:null, roughnessCtx:null,
          visible:ld.visible, locked:!!ld.locked, opacity:ld.opacity
        };
        const promises = [];
        if(ld.heightData){
          promises.push(new Promise(r1=>{
            const himg = new Image();
            himg.onload = ()=>{
              const hc = document.createElement('canvas');
              hc.width = state.W; hc.height = state.H;
              hc.getContext('2d', { willReadFrequently: true }).drawImage(himg,0,0);
              layerObj.heightCanvas = hc;
              layerObj.heightCtx = hc.getContext('2d', { willReadFrequently: true });
              r1();
            };
            himg.src = ld.heightData;
          }));
        }
        if(ld.roughnessData){
          promises.push(new Promise(r2=>{
            const rimg = new Image();
            rimg.onload = ()=>{
              const rc = document.createElement('canvas');
              rc.width = state.W; rc.height = state.H;
              rc.getContext('2d', { willReadFrequently: true }).drawImage(rimg,0,0);
              layerObj.roughnessCanvas = rc;
              layerObj.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
              r2();
            };
            rimg.src = ld.roughnessData;
          }));
        }
        Promise.all(promises).then(()=> res(layerObj));
      };
      img.src = ld.colorData;
    }))).then(newLayers=>{
      if(state.groups){
        groups = JSON.parse(JSON.stringify(state.groups));
        selectedColors = new Set(state.selectedColors || []);
        if(state.fgColor) fgColor = state.fgColor;
        refreshGroups();
        updateSpraySourceHint();
      }
      W = state.W; H = state.H;
      resizeAllCanvasesToWH();
      syncDocCompositeCanvasSize();
      clearSelection();
      layers = newLayers;
      activeLayer = Math.min(state.activeLayer, layers.length-1);
      editingHeightMode = !!state.editingHeightMode;
      editingRoughnessMode = !!state.editingRoughnessMode;
      const hToggle = document.getElementById('editingHeightToggle');
      if(hToggle) hToggle.checked = editingHeightMode;
      const rToggle = document.getElementById('editingRoughnessToggle');
      if(rToggle) rToggle.checked = editingRoughnessMode;
      syncHeightEditSwap();
      fitCanvasToScreen(dimsChanged); // only re-fit zoom if the canvas size actually changed
      refreshLayerPanel();
      drawGridOverlay();
      render();
    });
  }
  function undo(){
    if(undoStack.length===0) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    updateHistoryButtons();
  }
  function redo(){
    if(redoStack.length===0) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    updateHistoryButtons();
  }
  function updateHistoryButtons(){
    document.getElementById('undoBtn').disabled = undoStack.length===0;
    document.getElementById('redoBtn').disabled = redoStack.length===0;
  }
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  // ---------- Animation frames ----------
  function makeFrame(name, layersArr, activeIdx){
    return { id: frameIdCounter++, name, layers: layersArr, activeLayer: activeIdx, undoStack: [], redoStack: [] };
  }
  function captureCurrentFrameState(){
    if(!frames[currentFrameIndex]) return;
    const f = frames[currentFrameIndex];
    f.layers = layers;
    f.activeLayer = activeLayer;
    f.undoStack = undoStack;
    f.redoStack = redoStack;
  }
  function applyFrameState(idx){
    const f = frames[idx];
    if(!f) return;
    if(layers && f.layers && f.layers.length < layers.length){
      for(let i = f.layers.length; i < layers.length; i++){
        const templateLayer = layers[i];
        const nl = makeLayer(templateLayer ? templateLayer.name : ('Layer ' + (i+1)));
        if(templateLayer){
          nl.visible = templateLayer.visible;
          nl.opacity = templateLayer.opacity;
        }
        f.layers.push(nl);
      }
    }
    layers = f.layers;
    activeLayer = Math.min(f.activeLayer, layers.length - 1);
    undoStack = f.undoStack;
    redoStack = f.redoStack;
    currentFrameIndex = idx;
    clearSelection();
    refreshLayerPanel();
    updateHistoryButtons();
    drawGridOverlay();
    rebuildOnionSkinCache();
    render();
  }
  function switchToFrame(idx){
    if(idx === currentFrameIndex || !frames[idx]) return;
    captureCurrentFrameState();
    applyFrameState(idx);
    refreshFramesPanel();
  }
  function addFrame(){
    captureCurrentFrameState();
    const currentLayers = (frames[currentFrameIndex] && frames[currentFrameIndex].layers) ? frames[currentFrameIndex].layers : layers;
    const newLayers = currentLayers.map(l => makeLayer(l.name));
    const insertAt = currentFrameIndex + 1;
    frames.splice(insertAt, 0, makeFrame('Frame ' + frameIdCounter, newLayers, activeLayer));
    applyFrameState(insertAt);
    refreshFramesPanel();
  }
  function duplicateFrame(){
    captureCurrentFrameState();
    const src = frames[currentFrameIndex];
    const copiedLayers = src.layers.map(l=>{
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(l.colorCanvas, 0, 0);
      const newLayer = {
        name: l.name, canvas: c, ctx,
        colorCanvas: c, colorCtx: ctx,
        heightCanvas: null, heightCtx: null,
        roughnessCanvas: null, roughnessCtx: null,
        visible: l.visible, opacity: l.opacity
      };
      if(l.heightCanvas){
        const hc = document.createElement('canvas');
        hc.width = W; hc.height = H;
        hc.getContext('2d', { willReadFrequently: true }).drawImage(l.heightCanvas, 0, 0);
        newLayer.heightCanvas = hc;
        newLayer.heightCtx = hc.getContext('2d', { willReadFrequently: true });
      }
      if(l.roughnessCanvas){
        const rc = document.createElement('canvas');
        rc.width = W; rc.height = H;
        rc.getContext('2d', { willReadFrequently: true }).drawImage(l.roughnessCanvas, 0, 0);
        newLayer.roughnessCanvas = rc;
        newLayer.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
      }
      return newLayer;
    });
    const insertAt = currentFrameIndex + 1;
    frames.splice(insertAt, 0, makeFrame('Frame ' + frameIdCounter, copiedLayers, src.activeLayer));
    applyFrameState(insertAt);
    refreshFramesPanel();
  }
  function deleteFrame(){
    if(frames.length <= 1){ alert('At least one frame is required.'); return; }
    frames.splice(currentFrameIndex, 1);
    const newIdx = Math.min(currentFrameIndex, frames.length-1);
    applyFrameState(newIdx);
    refreshFramesPanel();
  }
  function moveFrame(dir){
    const newIdx = currentFrameIndex + dir;
    if(newIdx < 0 || newIdx >= frames.length) return;
    captureCurrentFrameState();
    const [f] = frames.splice(currentFrameIndex, 1);
    frames.splice(newIdx, 0, f);
    currentFrameIndex = newIdx;
    refreshFramesPanel();
    rebuildOnionSkinCache();
    render();
  }
  function refreshFramesPanel(){
    const list = document.getElementById('frameList');
    if(list){
      list.innerHTML = '';
      const pb = document.getElementById('playBtn'); if(pb) pb.disabled = frames.length <= 1;
      frames.forEach((f, i)=>{
        const row = document.createElement('div');
        row.className = 'layer-row' + (i===currentFrameIndex ? ' active' : '');
        if (currentDragType === 'frame' && i === currentDragIndex) {
          row.classList.add('dragging');
        }
        row.dataset.index = i;
        row.dataset.flipKey = 'frame-row-' + f.id;

        // Pointer-based Drag & Drop for Frame Panel List
        let startX = 0, startY = 0;
        let started = false;

        function onPointerMove(ev) {
          if (!started) {
            if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) {
              started = true;
              currentDragType = 'frame';
              currentDragIndex = i;
              blockFrameClick = true;
              pushHistory();
              captureCurrentFrameState();
              createListDragGhost(f.name || ('Frame ' + (i + 1)), ev.clientX, ev.clientY);
              refreshFramesPanel();
              if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
            }
            return;
          }
          moveListDragGhost(ev.clientX, ev.clientY);

          const listContainer = document.getElementById('frameList');
          if (listContainer) {
            const allEls = [...listContainer.querySelectorAll('.layer-row')];
            let newIndex = allEls.length - 1;
            for (let j = 0; j < allEls.length; j++) {
              const rect = allEls[j].getBoundingClientRect();
              if (ev.clientY < rect.top + rect.height / 2) {
                newIndex = j;
                break;
              }
            }

            if (newIndex !== currentDragIndex) {
              const fromIdx = currentDragIndex;
              const toIdx = newIndex;

              captureFlipSnapshot('#frameList .layer-row');

              const [moved] = frames.splice(fromIdx, 1);
              frames.splice(toIdx, 0, moved);

              if (currentFrameIndex === fromIdx) {
                currentFrameIndex = toIdx;
              } else if (currentFrameIndex > fromIdx && currentFrameIndex <= toIdx) {
                currentFrameIndex--;
              } else if (currentFrameIndex < fromIdx && currentFrameIndex >= toIdx) {
                currentFrameIndex++;
              }

              currentDragIndex = toIdx;

              refreshFramesPanel();
              if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
              rebuildOnionSkinCache();
              render();

              playFlipAnimation('#frameList .layer-row');
            }
          }
        }

        function onPointerUp(ev) {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          if (started) {
            removeListDragGhost();
            currentDragType = null;
            currentDragIndex = -1;
            refreshFramesPanel();
            if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
            rebuildOnionSkinCache();
            render();
          }
        }

        row.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          startX = ev.clientX;
          startY = ev.clientY;
          started = false;
          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        });

        const thumb = document.createElement('canvas');
        thumb.width = 24; thumb.height = 24;
        thumb.className = 'layer-thumb';
        const tctx = thumb.getContext('2d', { willReadFrequently: true });
        const srcLayers = (i === currentFrameIndex) ? layers : f.layers;
        srcLayers.forEach(l=>{
          if(!l.visible) return;
          tctx.globalAlpha = l.opacity/100;
          tctx.drawImage(l.canvas, 0, 0, 24, 24);
        });
        tctx.globalAlpha = 1;

        const name = document.createElement('div');
        name.className = 'layer-name';
        name.textContent = f.name;

        row.appendChild(thumb);
        row.appendChild(name);
        list.appendChild(row);
      });
    }
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
  }
  document.getElementById('frameList')?.addEventListener('click', ev=>{
    if (blockFrameClick) {
      blockFrameClick = false;
      return;
    }
    const row = ev.target.closest('.layer-row');
    if(!row) return;
    const idx = +row.dataset.index;
    if(frames[idx] === undefined) return;
    if(isPlaying) stopPlayback();
    switchToFrame(idx);
  });
  document.getElementById('addFrameBtn')?.addEventListener('click', addFrame);
  document.getElementById('dupFrameBtn')?.addEventListener('click', duplicateFrame);
  document.getElementById('delFrameBtn')?.addEventListener('click', deleteFrame);
  document.getElementById('frameLeftBtn')?.addEventListener('click', ()=> moveFrame(-1));
  document.getElementById('frameRightBtn')?.addEventListener('click', ()=> moveFrame(1));

  function compositeTintedFrame(frame, tintHex, distance){
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    frame.layers.forEach(l=>{
      if(!l.visible) return;
      ctx.globalAlpha = l.opacity/100;
      ctx.drawImage(l.canvas, 0, 0);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tintHex;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const distFactor = Math.max(0.15, 1.0 - (distance-1)*0.3);
    return { canvas: c, distFactor };
  }
  function rebuildOnionSkinCache(){
    onionSkinCache = { prev: [], next: [] };
    if(!onionSkinEnabled || onionSkinCount <= 0) return;
    for(let i=1; i<=onionSkinCount; i++){
      const prevIdx = currentFrameIndex - i;
      if(prevIdx >= 0) onionSkinCache.prev.push(compositeTintedFrame(frames[prevIdx], '#ff4d4d', i));
      const nextIdx = currentFrameIndex + i;
      if(nextIdx < frames.length) onionSkinCache.next.push(compositeTintedFrame(frames[nextIdx], '#4d9fff', i));
    }
  }
  document.getElementById('onionSkinEnabled')?.addEventListener('change', e=>{
    onionSkinEnabled = e.target.checked;
    const opt = document.getElementById('onionSkinOptions'); if(opt) opt.style.display = onionSkinEnabled ? 'block' : 'none';
    rebuildOnionSkinCache();
    render();
  });
  document.getElementById('onionSkinCountSlider')?.addEventListener('input', e=>{
    onionSkinCount = +e.target.value;
    const val = document.getElementById('onionSkinCountVal'); if(val) val.textContent = onionSkinCount;
    rebuildOnionSkinCache();
    render();
  });

  // ---------- Timeline Matrix Logic ----------
  function hasLayerContent(layer){
    if(!layer) return false;
    const c = layer.colorCanvas || layer.canvas;
    if(!c || c.width === 0 || c.height === 0) return false;
    const ctx = layer.colorCtx || layer.ctx || c.getContext('2d', { willReadFrequently: true });
    try {
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for(let i = 3; i < data.length; i += 32){
        if(data[i] > 0) return true;
      }
    } catch(e){}
    return false;
  }

  function refreshMatrixTimeline(){
    const wrap = document.getElementById('timelineGridWrap');
    if(!wrap) return;
    wrap.innerHTML = '';
    if(!frames || !frames.length) return;

    const playBtn = document.getElementById('tlPlayBtn');
    if(playBtn){
      playBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
      playBtn.disabled = frames.length <= 1;
    }
    const fpsInput = document.getElementById('tlFpsInput');
    if(fpsInput && document.activeElement !== fpsInput){
      fpsInput.value = playbackFps;
    }
    const onionCheck = document.getElementById('tlOnionSkinCheckbox');
    if(onionCheck){
      onionCheck.checked = onionSkinEnabled;
    }
    const osSlider = document.getElementById('tlOnionSkinOpacitySlider');
    const osVal = document.getElementById('tlOnionSkinOpacityVal');
    if(osSlider){
      osSlider.value = onionSkinOpacity;
      if(osVal) osVal.textContent = onionSkinOpacity + '%';
    }

    const opSlider = document.getElementById('tlLayerOpacitySlider');
    const opVal = document.getElementById('tlLayerOpacityVal');
    if(opSlider && layers[activeLayer]){
      opSlider.value = layers[activeLayer].opacity;
      if(opVal) opVal.textContent = layers[activeLayer].opacity + '%';
    }

    const table = document.createElement('table');
    table.className = 'timeline-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const cornerTh = document.createElement('th');
    cornerTh.className = 'timeline-th-corner';
    cornerTh.textContent = 'Timeline Matrix';
    headerRow.appendChild(cornerTh);

    const displayFrames = [...frames];
    if (tlDrag && tlDrag.type === 'frame') {
      const [dragged] = displayFrames.splice(tlDrag.startIndex, 1);
      displayFrames.splice(tlDrag.insertAt, 0, dragged);
    }

    displayFrames.forEach((f, fColIdx) => {
      const fIdx = frames.indexOf(f);
      const isPlaceholder = (tlDrag && tlDrag.type === 'frame' && fColIdx === tlDrag.insertAt);
      const th = document.createElement('th');
      th.className = 'timeline-th-frame' + (fIdx === currentFrameIndex ? ' active-frame' : '') + (isPlaceholder ? ' ptr-placeholder' : '');
      if(isPlaying && fIdx === playbackFrameIndex) th.classList.add('playback-active');
      th.dataset.flipKey = 'tl-th-frame-' + f.id;
      th.title = 'Switch to ' + (f.name || ('Frame ' + (fIdx + 1)));

      const titleSpan = document.createElement('span');
      titleSpan.textContent = f.name || ('Frame ' + (fIdx + 1));
      th.appendChild(titleSpan);

      const fLayers = (fIdx === currentFrameIndex) ? layers : f.layers;
      const frameHasH = (fLayers || []).some(l => l && l.heightCanvas && hasLayerContent({ colorCanvas: l.heightCanvas, colorCtx: l.heightCtx }));
      const frameHasR = (fLayers || []).some(l => l && l.roughnessCanvas && hasLayerContent({ colorCanvas: l.roughnessCanvas, colorCtx: l.roughnessCtx }));
      if(frameHasH || frameHasR){
        const badges = document.createElement('span');
        badges.className = 'tl-frame-map-badges';
        if(frameHasH){
          const bH = document.createElement('span');
          bH.className = 'tl-map-badge tl-badge-height';
          bH.textContent = 'H';
          bH.title = 'Frame contains Heightmap';
          badges.appendChild(bH);
        }
        if(frameHasR){
          const bR = document.createElement('span');
          bR.className = 'tl-map-badge tl-badge-roughness';
          bR.textContent = 'R';
          bR.title = 'Frame contains Roughness map';
          badges.appendChild(bR);
        }
        th.appendChild(badges);
      }

      // Pointer-based Drag & Drop for Frames in Timeline
      let startX = 0, startY = 0;
      let started = false;

      function onPointerMove(ev) {
        if (!started) {
          if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) {
            started = true;
            captureFlipSnapshot('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
            tlDrag = { type: 'frame', startIndex: fIdx, insertAt: fColIdx };
            createListDragGhost(f.name || ('Frame ' + (fIdx + 1)), ev.clientX, ev.clientY);
            refreshMatrixTimeline();
            playFlipAnimation('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
          }
          return;
        }
        moveListDragGhost(ev.clientX, ev.clientY);

        const liveTable = document.querySelector('.timeline-table');
        if (liveTable) {
          const theadRow = liveTable.querySelector('thead tr');
          if (theadRow) {
            const allThs = [...theadRow.querySelectorAll('.timeline-th-frame')];
            if (allThs.length > 0) {
              let newIndex = allThs.length - 1;
              for (let j = 0; j < allThs.length; j++) {
                const rect = allThs[j].getBoundingClientRect();
                if (ev.clientX < rect.left + rect.width / 2) {
                  newIndex = j;
                  break;
                }
              }

              if (newIndex !== tlDrag.insertAt) {
                captureFlipSnapshot('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
                tlDrag.insertAt = newIndex;
                refreshMatrixTimeline();
                playFlipAnimation('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
              }
            }
          }
        }
      }

      function onPointerUp(ev) {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (started) {
          removeListDragGhost();
          const fromIdx = tlDrag.startIndex;
          const toIdx = tlDrag.insertAt;
          tlDrag = null;
          captureFlipSnapshot('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
          if (fromIdx !== toIdx) {
            pushHistory();
            captureCurrentFrameState();
            const [moved] = frames.splice(fromIdx, 1);
            frames.splice(toIdx, 0, moved);

            if (currentFrameIndex === fromIdx) {
              currentFrameIndex = toIdx;
            } else if (currentFrameIndex > fromIdx && currentFrameIndex <= toIdx) {
              currentFrameIndex--;
            } else if (currentFrameIndex < fromIdx && currentFrameIndex >= toIdx) {
              currentFrameIndex++;
            }
          }
          refreshMatrixTimeline();
          playFlipAnimation('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
          refreshFramesPanel();
          rebuildOnionSkinCache();
          render();
        } else {
          if (isPlaying) stopPlayback();
          switchToFrame(fIdx);
        }
      }

      th.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        startX = ev.clientX;
        startY = ev.clientY;
        started = false;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });

      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const currentLayerList = layers;

    const layerIndices = Array.from({ length: currentLayerList.length }, (_, i) => i);
    if (tlDrag && tlDrag.type === 'layer') {
      const [dragged] = layerIndices.splice(tlDrag.startIndex, 1);
      layerIndices.splice(tlDrag.insertAt, 0, dragged);
    }

    for (let visualRow = 0; visualRow < currentLayerList.length; visualRow++) {
      const lIdx = layerIndices[currentLayerList.length - 1 - visualRow];
      const layerObj = currentLayerList[lIdx];
      const isRowPlaceholder = (tlDrag && tlDrag.type === 'layer' && visualRow === (currentLayerList.length - 1 - tlDrag.insertAt));

      const tr = document.createElement('tr');
      tr.dataset.flipKey = 'tl-row-' + layerObj.id;
      if (isRowPlaceholder) tr.classList.add('ptr-placeholder');

      const layerTd = document.createElement('td');
      layerTd.className = 'timeline-td-layer' + (lIdx === activeLayer ? ' active-layer' : '') + (isRowPlaceholder ? ' ptr-placeholder' : '');
      layerTd.dataset.index = lIdx;
      layerTd.dataset.flipKey = 'tl-layer-header-' + layerObj.id;

      const visCheck = document.createElement('input');
      visCheck.type = 'checkbox';
      visCheck.checked = layerObj.visible;
      visCheck.style.accentColor = 'var(--accent)';
      visCheck.style.cursor = 'pointer';
      visCheck.title = 'Toggle visibility';
      visCheck.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      visCheck.addEventListener('change', (ev) => {
        ev.stopPropagation();
        pushHistory();
        const isVis = ev.target.checked;
        frames.forEach(f => { if(f.layers && f.layers[lIdx]) f.layers[lIdx].visible = isVis; });
        refreshLayerPanel();
        refreshMatrixTimeline();
        render();
      });

      const lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = 'tl-layer-lock-btn' + (layerObj.locked ? ' active' : '');
      lockBtn.innerHTML = layerObj.locked ? '🔒' : '🔓';
      lockBtn.title = layerObj.locked ? 'Unlock layer' : 'Lock layer';
      lockBtn.style.background = 'none';
      lockBtn.style.border = 'none';
      lockBtn.style.cursor = 'pointer';
      lockBtn.style.fontSize = '12px';
      lockBtn.style.padding = '0 2px';
      lockBtn.style.lineHeight = '1';
      lockBtn.style.opacity = layerObj.locked ? '1' : '0.4';
      lockBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      lockBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        pushHistory();
        const isLocked = !layerObj.locked;
        frames.forEach(f => { if(f.layers && f.layers[lIdx]) f.layers[lIdx].locked = isLocked; });
        refreshLayerPanel();
        refreshMatrixTimeline();
        render();
      });

      const layerName = document.createElement('span');
      layerName.textContent = layerObj.name;
      layerName.style.flex = '1';
      layerName.style.overflow = 'hidden';
      layerName.style.textOverflow = 'ellipsis';
      layerName.style.whiteSpace = 'nowrap';

      const opacityBadge = document.createElement('span');
      opacityBadge.className = 'tiny-label';
      opacityBadge.textContent = layerObj.opacity + '%';

      layerTd.appendChild(visCheck);
      layerTd.appendChild(lockBtn);
      layerTd.appendChild(layerName);
      layerTd.appendChild(opacityBadge);

      // Pointer-based Drag & Drop for Layers in Timeline
      let startX = 0, startY = 0;
      let started = false;

      function onPointerMove(ev) {
        if (!started) {
          if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) {
            started = true;
            captureFlipSnapshot('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
            tlDrag = { type: 'layer', startIndex: lIdx, insertAt: lIdx };
            createListDragGhost(layerObj.name, ev.clientX, ev.clientY);
            refreshMatrixTimeline();
            playFlipAnimation('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
          }
          return;
        }
        moveListDragGhost(ev.clientX, ev.clientY);

        const liveTable = document.querySelector('.timeline-table');
        if (liveTable) {
          const listContainer = liveTable.querySelector('tbody');
          if (listContainer) {
            const allTrs = [...listContainer.querySelectorAll('tr')];
            if (allTrs.length > 0) {
              let newVisualRow = allTrs.length - 1;
              for (let j = 0; j < allTrs.length; j++) {
                const rect = allTrs[j].getBoundingClientRect();
                if (ev.clientY < rect.top + rect.height / 2) {
                  newVisualRow = j;
                  break;
                }
              }
              const newIndex = currentLayerList.length - 1 - newVisualRow;

              if (newIndex !== tlDrag.insertAt) {
                captureFlipSnapshot('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
                tlDrag.insertAt = newIndex;
                refreshMatrixTimeline();
                playFlipAnimation('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
              }
            }
          }
        }
      }

      function onPointerUp(ev) {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (started) {
          removeListDragGhost();
          const fromIdx = tlDrag.startIndex;
          const toIdx = tlDrag.insertAt;
          tlDrag = null;
          captureFlipSnapshot('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
          if (fromIdx !== toIdx) {
            pushHistory();
            captureCurrentFrameState();
            frames.forEach(f => {
              if (f.layers) {
                const [moved] = f.layers.splice(fromIdx, 1);
                f.layers.splice(toIdx, 0, moved);
              }
            });

            if (activeLayer === fromIdx) {
              activeLayer = toIdx;
            } else if (activeLayer > fromIdx && activeLayer <= toIdx) {
              activeLayer--;
            } else if (activeLayer < fromIdx && activeLayer >= toIdx) {
              activeLayer++;
            }
            layers = frames[currentFrameIndex].layers;
          }
          refreshMatrixTimeline();
          playFlipAnimation('.timeline-table th[data-flip-key], .timeline-table td[data-flip-key]');
          refreshLayerPanel();
          render();
        } else {
          if (ev.target !== visCheck) {
            activeLayer = lIdx;
            refreshLayerPanel();
            refreshMatrixTimeline();
            render();
          }
        }
      }

      layerTd.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        if (ev.target === visCheck) return;
        startX = ev.clientX;
        startY = ev.clientY;
        started = false;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });

      tr.appendChild(layerTd);

      displayFrames.forEach((f, fColIdx) => {
        const fIdx = frames.indexOf(f);
        const td = document.createElement('td');
        const isActiveCell = (fIdx === currentFrameIndex && lIdx === activeLayer);
        const isFramePlaceholder = (tlDrag && tlDrag.type === 'frame' && fColIdx === tlDrag.insertAt);
        const isCellPlaceholder = isRowPlaceholder || isFramePlaceholder;

        td.className = 'timeline-cell' + (isActiveCell ? ' active-cell' : '') + (isCellPlaceholder ? ' ptr-placeholder' : '');
        td.dataset.flipKey = 'tl-cell-' + layerObj.id + '-' + f.id;

        const cellInner = document.createElement('div');
        cellInner.className = 'timeline-cell-inner';

        const frameLayers = (fIdx === currentFrameIndex) ? layers : f.layers;
        const cellLayer = frameLayers ? frameLayers[lIdx] : null;

        if(cellLayer && (cellLayer.colorCanvas || cellLayer.canvas)){
          const cCanvas = cellLayer.colorCanvas || cellLayer.canvas;
          const miniCanvas = document.createElement('canvas');
          miniCanvas.width = 34; miniCanvas.height = 34;
          miniCanvas.className = 'timeline-cell-canvas';
          const mctx = miniCanvas.getContext('2d', { willReadFrequently: true });
          mctx.imageSmoothingEnabled = false;
          mctx.globalAlpha = (cellLayer.opacity || 100) / 100;
          mctx.drawImage(cCanvas, 0, 0, 34, 34);

          cellInner.appendChild(miniCanvas);

          if(hasLayerContent(cellLayer)){
            td.classList.add('timeline-cell-has-data');
          }

          const cellHasH = cellLayer.heightCanvas && hasLayerContent({ colorCanvas: cellLayer.heightCanvas, colorCtx: cellLayer.heightCtx });
          const cellHasR = cellLayer.roughnessCanvas && hasLayerContent({ colorCanvas: cellLayer.roughnessCanvas, colorCtx: cellLayer.roughnessCtx });
          if(cellHasH || cellHasR){
            const cellBadges = document.createElement('div');
            cellBadges.className = 'tl-cell-badges';
            if(cellHasH){
              const bH = document.createElement('span');
              bH.className = 'tl-cell-badge tl-badge-height';
              bH.textContent = 'H';
              bH.title = 'Layer has Heightmap';
              cellBadges.appendChild(bH);
            }
            if(cellHasR){
              const bR = document.createElement('span');
              bR.className = 'tl-cell-badge tl-badge-roughness';
              bR.textContent = 'R';
              bR.title = 'Layer has Roughness map';
              cellBadges.appendChild(bR);
            }
            cellInner.appendChild(cellBadges);
          }
        } else {
          const dot = document.createElement('div');
          dot.className = 'timeline-cell-empty-dot';
          cellInner.appendChild(dot);
        }

        td.appendChild(cellInner);

        td.title = `${f.name || ('Frame ' + (fIdx + 1))} • ${layerObj.name} — Click to edit`;
        td.addEventListener('click', () => {
          if(isPlaying) stopPlayback();
          captureCurrentFrameState();
          applyFrameState(fIdx);
          activeLayer = Math.min(lIdx, layers.length - 1);
          refreshLayerPanel();
          refreshMatrixTimeline();
          render();
        });

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  function initMatrixTimeline(){
    document.getElementById('tlPlayBtn')?.addEventListener('click', ()=>{
      if(isPlaying) stopPlayback(); else startPlayback();
    });
    document.getElementById('tlFpsInput')?.addEventListener('change', (e) => {
      playbackFps = Math.max(1, Math.min(60, parseInt(e.target.value) || 12));
    });
    document.getElementById('tlOnionSkinCheckbox')?.addEventListener('change', (e) => {
      onionSkinEnabled = e.target.checked;
      rebuildOnionSkinCache();
      render();
    });
    document.getElementById('tlOnionSkinOpacitySlider')?.addEventListener('input', (e) => {
      onionSkinOpacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
      const valEl = document.getElementById('tlOnionSkinOpacityVal');
      if(valEl) valEl.textContent = onionSkinOpacity + '%';
      render();
    });

    document.getElementById('tlLayerOpacitySlider')?.addEventListener('input', (e) => {
      updateLayerOpacity(+e.target.value);
    });

    document.getElementById('tlAddFrameBtn')?.addEventListener('click', addFrame);
    document.getElementById('tlDupFrameBtn')?.addEventListener('click', duplicateFrame);
    document.getElementById('tlDelFrameBtn')?.addEventListener('click', deleteFrame);

    document.getElementById('tlAddLayerBtn')?.addEventListener('click', () => addLayer());
    document.getElementById('tlDupLayerBtn')?.addEventListener('click', duplicateActiveLayer);
    document.getElementById('tlMergeLayerBtn')?.addEventListener('click', mergeActiveLayerDown);
    document.getElementById('tlDelLayerBtn')?.addEventListener('click', deleteActiveLayer);
    document.getElementById('tlUpLayerBtn')?.addEventListener('click', moveActiveLayerUp);
    document.getElementById('tlDownLayerBtn')?.addEventListener('click', moveActiveLayerDown);

    const collapseBtn = document.getElementById('tlToggleCollapseBtn');
    collapseBtn?.addEventListener('click', () => {
      const panel = document.getElementById('matrixTimelinePanel');
      if(!panel) return;
      panel.classList.toggle('collapsed');
      const isCollapsed = panel.classList.contains('collapsed');
      collapseBtn.textContent = isCollapsed ? '▲' : '▼';
      collapseBtn.title = isCollapsed ? 'Expand timeline' : 'Collapse timeline';
      fitCanvasToScreen(false);
      positionZoomHud();
    });

    makeVResizer(document.getElementById('timelineResizer'), document.getElementById('matrixTimelinePanel'), {
      min: 80,
      max: 500,
      onResize: () => {
        fitCanvasToScreen(false);
        positionZoomHud();
      }
    });
  }

  // ---------- Playback ----------
  let isPlaying = false;
  let playbackRAFId = null;
  let playbackFrameIndex = 0;
  let playbackLastTickTime = 0;
  let playbackFps = 12;

  function renderFrameForPlayback(frame){
    syncDocCompositeCanvasSize();
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const targetCtx = seamlessModeEnabled ? docCompositeCtx : dctx;
    dctx.clearRect(0,0,effW,effH);
    if(seamlessModeEnabled) docCompositeCtx.clearRect(0,0,W,H);
    frame.layers.forEach(l=>{
      if(!l.visible) return;
      targetCtx.globalAlpha = l.opacity/100;
      targetCtx.drawImage(l.canvas, 0, 0);
    });
    targetCtx.globalAlpha = 1;
    if(seamlessModeEnabled){
      for(let ty=0; ty<3; ty++){
        for(let tx=0; tx<3; tx++){
          dctx.drawImage(docCompositeCanvas, tx*W, ty*H);
        }
      }
    }
  }
  function playbackTick(now){
    if(!isPlaying) return;
    const interval = 1000/playbackFps;
    if(now - playbackLastTickTime >= interval){
      playbackLastTickTime = now;
      renderFrameForPlayback(frames[playbackFrameIndex]);
      document.querySelectorAll('#frameList .layer-row').forEach((row,i)=>{
        row.classList.toggle('playback-active', i===playbackFrameIndex);
      });
      document.querySelectorAll('.timeline-th-frame').forEach((th,i)=>{
        th.classList.toggle('playback-active', i===playbackFrameIndex);
      });
      playbackFrameIndex = (playbackFrameIndex + 1) % frames.length;
    }
    playbackRAFId = requestAnimationFrame(playbackTick);
  }
  function startPlayback(){
    if(frames.length <= 1) return; // nothing to animate
    captureCurrentFrameState(); // make sure the frame we're leaving is fully up to date
    isPlaying = true;
    playbackFrameIndex = 0;
    playbackLastTickTime = 0;
    const pBtn = document.getElementById('playBtn'); if(pBtn) pBtn.textContent = '⏸ Pause';
    const tlPBtn = document.getElementById('tlPlayBtn'); if(tlPBtn) tlPBtn.textContent = '⏸ Pause';
    playbackRAFId = requestAnimationFrame(playbackTick);
  }
  function stopPlayback(){
    if(!isPlaying) return;
    isPlaying = false;
    if(playbackRAFId){ cancelAnimationFrame(playbackRAFId); playbackRAFId = null; }
    const pBtn = document.getElementById('playBtn'); if(pBtn) pBtn.textContent = '▶ Play';
    const tlPBtn = document.getElementById('tlPlayBtn'); if(tlPBtn) tlPBtn.textContent = '▶ Play';
    document.querySelectorAll('#frameList .layer-row').forEach(row=> row.classList.remove('playback-active'));
    document.querySelectorAll('.timeline-th-frame').forEach(th => th.classList.remove('playback-active'));
    render(); // restore the actual editing frame's display, undoing any playback-only drawing
  }
  document.getElementById('playBtn')?.addEventListener('click', ()=>{
    if(isPlaying) stopPlayback(); else startPlayback();
  });
  document.getElementById('playbackFpsInput')?.addEventListener('input', e=>{
    playbackFps = Math.max(1, Math.min(60, +e.target.value || 12));
  });

  // ---------- Layer helpers ----------
  function makeLayer(name){
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    return {
      id: layerIdCounter++,
      name, canvas: c, ctx,
      colorCanvas: c, colorCtx: ctx,
      heightCanvas: null, heightCtx: null,
      roughnessCanvas: null, roughnessCtx: null,
      visible: true, locked: false, opacity: 100
    };
  }
  function regenerateHeightFromColor(layer){
    if(!layer || !layer.colorCtx) return;
    if(!layer.heightCanvas){
      const hc = document.createElement('canvas');
      hc.width = W; hc.height = H;
      layer.heightCanvas = hc;
      layer.heightCtx = hc.getContext('2d', { willReadFrequently: true });
    }
    const imgData = layer.colorCtx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const hImgData = layer.heightCtx.createImageData(W, H);
    const hd = hImgData.data;
    for(let i=0; i<data.length; i+=4){
      const lum = Math.round(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
      hd[i]=lum; hd[i+1]=lum; hd[i+2]=lum; hd[i+3]=data[i+3]; // preserve alpha so height respects transparency
    }
    layer.heightCtx.putImageData(hImgData, 0, 0);
  }
  function ensureHeightCanvas(layer){
    if(layer.heightCanvas) return;
    const hc = document.createElement('canvas');
    hc.width = W; hc.height = H;
    layer.heightCanvas = hc;
    layer.heightCtx = hc.getContext('2d', { willReadFrequently: true });
    regenerateHeightFromColor(layer);
  }

  function ensureRoughnessCanvas(layer){
    if(layer.roughnessCanvas) return;
    const rc = document.createElement('canvas');
    rc.width = W; rc.height = H;
    layer.roughnessCanvas = rc;
    layer.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
    setRoughnessAll(layer, 200); // default moderately matte
  }

  function setRoughnessAll(layer, val){
    if(!layer || !layer.colorCtx) return;
    if(!layer.roughnessCanvas){
      const rc = document.createElement('canvas');
      rc.width = W; rc.height = H;
      layer.roughnessCanvas = rc;
      layer.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
    }
    const imgData = layer.colorCtx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const rImgData = layer.roughnessCtx.createImageData(W, H);
    const rd = rImgData.data;
    for(let i=0; i<data.length; i+=4){
      rd[i] = val; rd[i+1] = val; rd[i+2] = val; rd[i+3] = data[i+3];
    }
    layer.roughnessCtx.putImageData(rImgData, 0, 0);
  }

  function regenerateRoughnessFromColor(layer){
    if(!layer || !layer.colorCtx) return;
    if(!layer.roughnessCanvas){
      const rc = document.createElement('canvas');
      rc.width = W; rc.height = H;
      layer.roughnessCanvas = rc;
      layer.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
    }
    const imgData = layer.colorCtx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const rImgData = layer.roughnessCtx.createImageData(W, H);
    const rd = rImgData.data;
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0){
        rd[i]=255; rd[i+1]=255; rd[i+2]=255; rd[i+3]=0;
        continue;
      }
      const lum = (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
      const roughnessVal = Math.max(0, Math.min(255, Math.round(255 - (lum * 0.8))));
      rd[i] = roughnessVal; rd[i+1] = roughnessVal; rd[i+2] = roughnessVal; rd[i+3] = data[i+3];
    }
    layer.roughnessCtx.putImageData(rImgData, 0, 0);
  }

  function clearLayerHeightMap(layer){
    if(!layer) return;
    if(!layer.heightCanvas){
      showToast('No heightmap to clear on active layer');
      return;
    }
    pushHistory();
    if(editingHeightMode){
      editingHeightMode = false;
      const hToggle = document.getElementById('editingHeightToggle');
      if(hToggle) hToggle.checked = false;
    }
    layer.heightCanvas = null;
    layer.heightCtx = null;
    if(frames && frames[currentFrameIndex] && frames[currentFrameIndex].layers && frames[currentFrameIndex].layers[activeLayer]){
      frames[currentFrameIndex].layers[activeLayer].heightCanvas = null;
      frames[currentFrameIndex].layers[activeLayer].heightCtx = null;
    }
    syncHeightEditSwap();
    render();
    refreshLayerPanel();
    refreshLayerThumbOnly();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    updateLightingPreview();
    showToast('Layer heightmap cleared');
  }

  function clearLayerRoughnessMap(layer){
    if(!layer) return;
    if(!layer.roughnessCanvas){
      showToast('No roughness map to clear on active layer');
      return;
    }
    pushHistory();
    if(editingRoughnessMode){
      editingRoughnessMode = false;
      const rToggle = document.getElementById('editingRoughnessToggle');
      if(rToggle) rToggle.checked = false;
    }
    layer.roughnessCanvas = null;
    layer.roughnessCtx = null;
    if(frames && frames[currentFrameIndex] && frames[currentFrameIndex].layers && frames[currentFrameIndex].layers[activeLayer]){
      frames[currentFrameIndex].layers[activeLayer].roughnessCanvas = null;
      frames[currentFrameIndex].layers[activeLayer].roughnessCtx = null;
    }
    syncHeightEditSwap();
    render();
    refreshLayerPanel();
    refreshLayerThumbOnly();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    updateLightingPreview();
    showToast('Layer roughness map cleared');
  }

  function syncHeightEditSwap(){
    // Single chokepoint, called from render() (which runs constantly) so it stays correct no
    // matter how activeLayer got changed — exactly the active layer points at its height or roughness data
    // when editing modes are on, every other layer always points at its color data.
    layers.forEach((l, i)=>{
      if(!l.colorCanvas) return;
      if(editingHeightMode && i === activeLayer){
        ensureHeightCanvas(l);
        l.canvas = l.heightCanvas;
        l.ctx = l.heightCtx;
      } else if(editingRoughnessMode && i === activeLayer){
        ensureRoughnessCanvas(l);
        l.canvas = l.roughnessCanvas;
        l.ctx = l.roughnessCtx;
      } else {
        l.canvas = l.colorCanvas;
        l.ctx = l.colorCtx;
      }
    });
  }
  document.getElementById('editingHeightToggle').addEventListener('change', e=>{
    editingHeightMode = e.target.checked;
    if(editingHeightMode){
      editingRoughnessMode = false;
      const rToggle = document.getElementById('editingRoughnessToggle');
      if(rToggle) rToggle.checked = false;
    }
    render();
    refreshLayerThumbOnly();
  });
  document.getElementById('editingRoughnessToggle')?.addEventListener('change', e=>{
    editingRoughnessMode = e.target.checked;
    if(editingRoughnessMode){
      editingHeightMode = false;
      const hToggle = document.getElementById('editingHeightToggle');
      if(hToggle) hToggle.checked = false;
    }
    render();
    refreshLayerThumbOnly();
  });
  document.getElementById('setLayerShinyBtn')?.addEventListener('click', ()=>{
    const layer = layers[activeLayer];
    if(!layer) return;
    pushHistory();
    setRoughnessAll(layer, 0); // Full shiny
    syncHeightEditSwap();
    render();
    refreshLayerPanel();
    refreshLayerThumbOnly();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    updateLightingPreview();
    showToast('Layer roughness set to 0 (Mirror Shiny)');
  });
  document.getElementById('setLayerMatteBtn')?.addEventListener('click', ()=>{
    const layer = layers[activeLayer];
    if(!layer) return;
    pushHistory();
    setRoughnessAll(layer, 255); // Full matte
    syncHeightEditSwap();
    render();
    refreshLayerPanel();
    refreshLayerThumbOnly();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    updateLightingPreview();
    showToast('Layer roughness set to 255 (Matte)');
  });
  document.getElementById('regenRoughnessBtn')?.addEventListener('click', ()=>{
    const layer = layers[activeLayer];
    if(!layer) return;
    if(layer.roughnessCanvas && !confirm('This layer already has a roughness map — regenerating will overwrite any hand-painted edits. Continue?')){
      return;
    }
    pushHistory();
    regenerateRoughnessFromColor(layer);
    syncHeightEditSwap();
    render();
    refreshLayerPanel();
    refreshLayerThumbOnly();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    updateLightingPreview();
    showToast('Roughness map regenerated from layer color');
  });
  document.getElementById('clearRoughnessBtn')?.addEventListener('click', ()=>{
    const layer = layers[activeLayer];
    clearLayerRoughnessMap(layer);
  });
  document.getElementById('regenHeightBtn')?.addEventListener('click', ()=>{
    const layer = layers[activeLayer];
    if(!layer) return;
    if(layer.heightCanvas && !confirm('This layer already has a heightmap — regenerating will overwrite any hand-painted edits. Continue?')){
      return;
    }
    pushHistory();
    regenerateHeightFromColor(layer);
    syncHeightEditSwap();
    render();
    refreshLayerPanel();
    refreshLayerThumbOnly();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    updateLightingPreview();
    showToast('Heightmap regenerated from layer color');
  });
  document.getElementById('clearHeightBtn')?.addEventListener('click', ()=>{
    const layer = layers[activeLayer];
    clearLayerHeightMap(layer);
  });

  function addLayer(name, drawFn, skipHistory, isDuplicate){
    if(!skipHistory) pushHistory();
    const defaultNum = (layers ? layers.length : 0) + 1;
    const layerName = name || ('Layer ' + defaultNum);

    if(!frames || frames.length === 0){
      const l = makeLayer(layerName);
      if(drawFn) drawFn(l.ctx);
      if(!layers) layers = [];
      layers.push(l);
      activeLayer = layers.length - 1;
    } else {
      captureCurrentFrameState();
      const srcIdx = activeLayer;
      frames.forEach((f, fIdx) => {
        const l = makeLayer(layerName);
        if(fIdx === currentFrameIndex){
          if(drawFn) drawFn(l.ctx);
        } else if(isDuplicate && f.layers && f.layers[srcIdx]){
          l.ctx.drawImage(f.layers[srcIdx].canvas, 0, 0);
          if(f.layers[srcIdx].heightCanvas){
            const hc = document.createElement('canvas');
            hc.width = W; hc.height = H;
            hc.getContext('2d', { willReadFrequently: true }).drawImage(f.layers[srcIdx].heightCanvas, 0, 0);
            l.heightCanvas = hc;
            l.heightCtx = hc.getContext('2d', { willReadFrequently: true });
          }
          if(f.layers[srcIdx].roughnessCanvas){
            const rc = document.createElement('canvas');
            rc.width = W; rc.height = H;
            rc.getContext('2d', { willReadFrequently: true }).drawImage(f.layers[srcIdx].roughnessCanvas, 0, 0);
            l.roughnessCanvas = rc;
            l.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
          }
        }
        f.layers.push(l);
      });
      layers = frames[currentFrameIndex].layers;
      activeLayer = layers.length - 1;
    }
    refreshLayerPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    render();
  }

  function duplicateActiveLayer(){
    if(!layers || !layers[activeLayer]) return;
    pushHistory();
    const src = layers[activeLayer];
    addLayer(src.name + ' copy', ctx => ctx.drawImage(src.canvas, 0, 0), true, true);
  }

  function mergeActiveLayerDown(){
    if(!layers || activeLayer <= 0){
      if(typeof showToast === 'function') showToast('No layer below to merge into');
      return;
    }
    const topLayer = layers[activeLayer];
    const bottomLayer = layers[activeLayer - 1];
    if(bottomLayer.locked){
      if(typeof showToast === 'function') showToast('Target layer below is locked');
      return;
    }
    pushHistory();
    captureCurrentFrameState();
    const topIdx = activeLayer;
    const bottomIdx = activeLayer - 1;

    frames.forEach(f => {
      if(!f.layers || f.layers.length <= topIdx) return;
      const top = f.layers[topIdx];
      const bottom = f.layers[bottomIdx];
      if(!top || !bottom) return;

      const bCtx = bottom.colorCtx || bottom.ctx;
      bCtx.save();
      bCtx.globalAlpha = (top.opacity !== undefined ? top.opacity : 100) / 100;
      bCtx.drawImage(top.colorCanvas || top.canvas, 0, 0);
      bCtx.restore();

      if(top.heightCanvas){
        if(!bottom.heightCanvas){
          const hc = document.createElement('canvas');
          hc.width = W; hc.height = H;
          bottom.heightCanvas = hc;
          bottom.heightCtx = hc.getContext('2d', { willReadFrequently: true });
        }
        bottom.heightCtx.drawImage(top.heightCanvas, 0, 0);
      }

      if(top.roughnessCanvas){
        if(!bottom.roughnessCanvas){
          const rc = document.createElement('canvas');
          rc.width = W; rc.height = H;
          bottom.roughnessCanvas = rc;
          bottom.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
        }
        bottom.roughnessCtx.drawImage(top.roughnessCanvas, 0, 0);
      }

      f.layers.splice(topIdx, 1);
    });

    activeLayer = bottomIdx;
    layers = frames[currentFrameIndex].layers;
    refreshLayerPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    render();
    if(typeof showToast === 'function') showToast('Layer merged down');
  }

  function deleteActiveLayer(){
    if(!layers || layers.length <= 1) return;
    pushHistory();
    captureCurrentFrameState();
    const idxToRemove = activeLayer;
    frames.forEach(f => {
      if(f.layers && f.layers.length > idxToRemove){
        f.layers.splice(idxToRemove, 1);
      }
    });
    activeLayer = Math.max(0, idxToRemove - 1);
    layers = frames[currentFrameIndex].layers;
    refreshLayerPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    render();
  }

  function reorderLayer(fromIdx, toIdx){
    if(fromIdx === toIdx || !layers) return;
    pushHistory();
    captureCurrentFrameState();
    frames.forEach(f => {
      if(f.layers){
        const [moved] = f.layers.splice(fromIdx, 1);
        f.layers.splice(toIdx, 0, moved);
      }
    });
    // Adjust activeLayer index
    if(activeLayer === fromIdx){
      activeLayer = toIdx;
    } else if(activeLayer > fromIdx && activeLayer <= toIdx){
      activeLayer--;
    } else if(activeLayer < fromIdx && activeLayer >= toIdx){
      activeLayer++;
    }
    layers = frames[currentFrameIndex].layers;
    refreshLayerPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    render();
  }

  function reorderFrame(fromIdx, toIdx){
    if(fromIdx === toIdx || !frames) return;
    pushHistory();
    captureCurrentFrameState();
    const [moved] = frames.splice(fromIdx, 1);
    frames.splice(toIdx, 0, moved);
    // Adjust currentFrameIndex
    if(currentFrameIndex === fromIdx){
      currentFrameIndex = toIdx;
    } else if(currentFrameIndex > fromIdx && currentFrameIndex <= toIdx){
      currentFrameIndex--;
    } else if(currentFrameIndex < fromIdx && currentFrameIndex >= toIdx){
      currentFrameIndex++;
    }
    applyFrameState(currentFrameIndex);
    refreshFramesPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    rebuildOnionSkinCache();
    render();
  }

  function moveActiveLayerUp(){
    if(!layers || activeLayer >= layers.length - 1) return;
    pushHistory();
    captureCurrentFrameState();
    const idx = activeLayer;
    frames.forEach(f => {
      if(f.layers && f.layers[idx] && f.layers[idx + 1]){
        [f.layers[idx], f.layers[idx + 1]] = [f.layers[idx + 1], f.layers[idx]];
      }
    });
    activeLayer++;
    layers = frames[currentFrameIndex].layers;
    refreshLayerPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    render();
  }

  function moveActiveLayerDown(){
    if(!layers || activeLayer <= 0) return;
    pushHistory();
    captureCurrentFrameState();
    const idx = activeLayer;
    frames.forEach(f => {
      if(f.layers && f.layers[idx] && f.layers[idx - 1]){
        [f.layers[idx], f.layers[idx - 1]] = [f.layers[idx - 1], f.layers[idx]];
      }
    });
    activeLayer--;
    layers = frames[currentFrameIndex].layers;
    refreshLayerPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    render();
  }

  function updateLayerOpacity(val){
    if(!layers || !layers[activeLayer]) return;
    frames.forEach(f => {
      if(f.layers && f.layers[activeLayer]) f.layers[activeLayer].opacity = val;
    });
    const opVal = document.getElementById('layerOpacityVal'); if(opVal) opVal.textContent = val + '%';
    const tlOpVal = document.getElementById('tlLayerOpacityVal'); if(tlOpVal) tlOpVal.textContent = val + '%';
    const opSl = document.getElementById('layerOpacitySlider'); if(opSl) opSl.value = val;
    const tlOpSl = document.getElementById('tlLayerOpacitySlider'); if(tlOpSl) tlOpSl.value = val;
    render();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
  }

  function fitCanvasToScreen(forceFit){
    let cw = canvasWrap ? canvasWrap.clientWidth : 0;
    let ch = canvasWrap ? canvasWrap.clientHeight : 0;
    
    // If layout hasn't fully rendered or expanded yet, fallback to viewport dimensions
    if (cw <= 100) cw = window.innerWidth > 300 ? window.innerWidth - 280 : window.innerWidth;
    if (ch <= 100) ch = Math.max(300, window.innerHeight - 120);
    
    // Use a comfortable padding around the canvas
    const availW = Math.max(100, cw - 60);
    const availH = Math.max(100, ch - 60);
    
    if(forceFit){
      zoom = Math.max(0.05, Math.min(32, availW / W, availH / H));
    }
    applyZoom();
    updateCanvasPadding();
    positionZoomHud();
  }
  function positionZoomHud(){
    const wrap = document.getElementById('canvasWrap');
    const hud = document.querySelector('.zoom-hud');
    if(!wrap || !hud) return;
    const wrapHeight = wrap.clientHeight;
    hud.style.right = '16px';
    hud.style.left = 'auto';
    hud.style.top = Math.max(10, (wrapHeight - hud.offsetHeight - 16)) + 'px';
  }
  let docCompositeCanvas = document.createElement('canvas');
  docCompositeCanvas.width = W; docCompositeCanvas.height = H;
  let docCompositeCtx = docCompositeCanvas.getContext('2d', { willReadFrequently: true });

  function syncDocCompositeCanvasSize(){
    if (docCompositeCanvas.width !== W || docCompositeCanvas.height !== H) {
      docCompositeCanvas.width = W;
      docCompositeCanvas.height = H;
    }
  }

  function updateCanvasPadding(){
    // Explicit width/height (canvas size + margin ring + a full viewport of margin on
    // each side) so the canvas edge can be panned all the way to screen center — computed
    // directly rather than relying on CSS min-width/padding auto-sizing.
    const inner = document.getElementById('canvasInner');
    const vw = canvasWrap.clientWidth;
    const vh = canvasWrap.clientHeight;
    const ringPx = MARGIN_PX * zoom;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const canvasW = effW * zoom + ringPx*2;
    const canvasH = effH * zoom + ringPx*2;
    inner.style.width = Math.round(canvasW + vw) + 'px';
    inner.style.height = Math.round(canvasH + vh) + 'px';
  }
  function centerCanvas(){
    const inner = document.getElementById('canvasInner');
    canvasWrap.scrollLeft = Math.max(0, (inner.offsetWidth - canvasWrap.clientWidth) / 2);
    canvasWrap.scrollTop = Math.max(0, (inner.offsetHeight - canvasWrap.clientHeight) / 2);
  }
  function applyZoom(){
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const wPx = (effW * zoom) + 'px', hPx = (effH * zoom) + 'px';
    displayCanvas.style.width = wPx; displayCanvas.style.height = hPx;
    gridCanvas.style.width = wPx; gridCanvas.style.height = hPx;
    selectionCanvas.style.width = wPx; selectionCanvas.style.height = hPx;
    colorHighlightCanvas.style.width = wPx; colorHighlightCanvas.style.height = hPx;
    const canvasLighting = document.getElementById('canvasLightingCanvas');
    if(canvasLighting){ canvasLighting.style.width = wPx; canvasLighting.style.height = hPx; }
    const canvasGizmo = document.getElementById('canvasLightingGizmoCanvas');
    if(canvasGizmo){ canvasGizmo.style.width = wPx; canvasGizmo.style.height = hPx; }
    const lightHandle = document.getElementById('canvasLightHandle');
    if(lightHandle){
      const effOffset = seamlessModeEnabled ? W : 0;
      lightHandle.style.left = (((lightPosX * W) + effOffset) * zoom) + 'px';
      lightHandle.style.top = (((lightPosY * H) + effOffset) * zoom) + 'px';
    }
    modalPreviewCanvas.style.width = wPx; modalPreviewCanvas.style.height = hPx;
    document.getElementById('zoomLabel').textContent = Math.round(zoom*100) + '%';

    const ringPx = MARGIN_PX * zoom;
    document.getElementById('previewZone').style.padding = ringPx + 'px';
    marginFadeCanvas.style.left = (-ringPx) + 'px';
    marginFadeCanvas.style.top = (-ringPx) + 'px';
    marginFadeCanvas.style.width = ((effW + MARGIN_PX*2) * zoom) + 'px';
    marginFadeCanvas.style.height = ((effH + MARGIN_PX*2) * zoom) + 'px';

    cursorPreviewCanvas.style.left = (-ringPx) + 'px';
    cursorPreviewCanvas.style.top = (-ringPx) + 'px';
    cursorPreviewCanvas.style.width = ((effW + MARGIN_PX*2) * zoom) + 'px';
    cursorPreviewCanvas.style.height = ((effH + MARGIN_PX*2) * zoom) + 'px';
  }
  function setZoom(z){
    zoom = Math.max(0.05, Math.min(16, z));
    applyZoom();
    updateCanvasPadding();
  }
  function zoomAtPoint(newZoomVal, clientX, clientY){
    const oldRect = displayCanvas.getBoundingClientRect();
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const scaleX = effW / oldRect.width;
    const scaleY = effH / oldRect.height;
    const imgX = (clientX - oldRect.left) * scaleX;
    const imgY = (clientY - oldRect.top) * scaleY;

    zoom = Math.max(0.05, Math.min(16, newZoomVal));
    applyZoom();
    updateCanvasPadding();

    const newRect = displayCanvas.getBoundingClientRect();
    const newScreenX = newRect.left + (imgX / effW) * newRect.width;
    const newScreenY = newRect.top + (imgY / effH) * newRect.height;

    canvasWrap.scrollLeft += (newScreenX - clientX);
    canvasWrap.scrollTop += (newScreenY - clientY);
  }

  function render(){
    syncHeightEditSwap();
    syncDocCompositeCanvasSize();

    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();

    const targetCtx = seamlessModeEnabled ? docCompositeCtx : dctx;
    dctx.clearRect(0, 0, effW, effH);
    if (seamlessModeEnabled) {
      docCompositeCtx.clearRect(0, 0, W, H);
    }

    if(onionSkinEnabled && onionSkinCache){
      const osAlphaMult = (typeof onionSkinOpacity === 'number') ? (onionSkinOpacity / 100) : 0.5;
      if(osAlphaMult > 0){
        onionSkinCache.prev.forEach(g=>{
          const factor = (g.distFactor !== undefined) ? g.distFactor : (g.alpha !== undefined ? g.alpha : 1);
          targetCtx.globalAlpha = Math.min(1, Math.max(0, factor * osAlphaMult));
          targetCtx.drawImage(g.canvas, 0, 0);
        });
        onionSkinCache.next.forEach(g=>{
          const factor = (g.distFactor !== undefined) ? g.distFactor : (g.alpha !== undefined ? g.alpha : 1);
          targetCtx.globalAlpha = Math.min(1, Math.max(0, factor * osAlphaMult));
          targetCtx.drawImage(g.canvas, 0, 0);
        });
      }
      targetCtx.globalAlpha = 1;
    }
    layers.forEach((l,idx)=>{
      if(!l.visible) return;
      targetCtx.globalAlpha = l.opacity/100;
      targetCtx.drawImage(l.canvas,0,0);
      if(idx === activeLayer && sprayBuffer){
        // in-progress spray stroke: composited once at the set Opacity, no matter how much
        // internal dab overlap has built up inside the buffer itself
        targetCtx.globalAlpha = (l.opacity/100) * (opacity/100);
        targetCtx.drawImage(sprayBuffer,0,0);
      }
      if(idx === activeLayer && floatingSelection){
        targetCtx.globalAlpha = l.opacity/100;
        targetCtx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
      }
      if(idx === activeLayer && pixiStrokeActive){
        // in-progress WebGL-backed stamp stroke — same opacity-capping approach as sprayBuffer,
        // cropped to just the on-canvas region (the pixi canvas also covers the margin ring)
        pixiApp.render();
        targetCtx.globalAlpha = (l.opacity/100) * (opacity/100);
        targetCtx.imageSmoothingEnabled = !pixelPerfect;
        targetCtx.drawImage(pixiApp.view, MARGIN_PX, MARGIN_PX, W, H, 0, 0, W, H);
      }
    });
    targetCtx.globalAlpha = 1;

    if (seamlessModeEnabled) {
      for (let ty = 0; ty < 3; ty++) {
        for (let tx = 0; tx < 3; tx++) {
          dctx.drawImage(docCompositeCanvas, tx * W, ty * H);
        }
      }
    }

    updateLightingPreview();
    updateColorHighlight();
    if (document.getElementById('tilesetTesterPopup')?.style.display !== 'none') {
      updateTilesetTester();
    }
  }

  function toggleSeamlessMode(enabled){
    seamlessModeEnabled = (enabled !== undefined) ? !!enabled : !seamlessModeEnabled;
    const cb = document.getElementById('seamlessModeEnabled');
    if (cb) cb.checked = seamlessModeEnabled;

    const sidebarBtn = document.getElementById('sidebarSeamlessToggleBtn');
    if (sidebarBtn) {
      sidebarBtn.classList.toggle('primary', seamlessModeEnabled);
      sidebarBtn.style.background = seamlessModeEnabled ? 'var(--accent)' : '';
      sidebarBtn.style.color = seamlessModeEnabled ? '#000' : '';
    }

    resizeAllCanvasesToWH();
    applyZoom();
    updateCanvasPadding();
    drawGridOverlay();
    render();
    centerCanvas();
  }

  const cbSeamless = document.getElementById('seamlessModeEnabled');
  if (cbSeamless) {
    cbSeamless.addEventListener('change', e=>{
      toggleSeamlessMode(e.target.checked);
    });
  }
  const sidebarSeamlessToggleBtnEl = document.getElementById('sidebarSeamlessToggleBtn');
  if (sidebarSeamlessToggleBtnEl) {
    sidebarSeamlessToggleBtnEl.addEventListener('click', ()=>{
      toggleSeamlessMode(!seamlessModeEnabled);
    });
  }

  let lightboxCanvas = document.createElement('canvas');
  lightboxCanvas.width = 256;
  lightboxCanvas.height = 256;
  let lightboxCtx = lightboxCanvas.getContext('2d', { willReadFrequently: true });
  let lightboxImageData = null;

  function renderLightboxPreset(preset){
    const w = 256, h = 256;
    lightboxCanvas.width = w;
    lightboxCanvas.height = h;
    const ctx = lightboxCtx;
    ctx.clearRect(0, 0, w, h);

    if(preset === 'none'){
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    } else if(preset === 'white'){
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if(preset === 'studio'){
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f111a');
      grad.addColorStop(0.5, '#1e2235');
      grad.addColorStop(1, '#08090f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const sb1 = ctx.createRadialGradient(w*0.5, h*0.25, 5, w*0.5, h*0.25, 80);
      sb1.addColorStop(0, 'rgba(255, 255, 255, 1)');
      sb1.addColorStop(0.4, 'rgba(230, 240, 255, 0.8)');
      sb1.addColorStop(1, 'rgba(30, 34, 53, 0)');
      ctx.fillStyle = sb1;
      ctx.fillRect(0, 0, w, h);

      const sb2 = ctx.createRadialGradient(w*0.85, h*0.4, 5, w*0.85, h*0.4, 60);
      sb2.addColorStop(0, 'rgba(255, 220, 160, 0.9)');
      sb2.addColorStop(1, 'rgba(255, 220, 160, 0)');
      ctx.fillStyle = sb2;
      ctx.fillRect(0, 0, w, h);

      const sb3 = ctx.createRadialGradient(w*0.15, h*0.6, 5, w*0.15, h*0.6, 70);
      sb3.addColorStop(0, 'rgba(120, 180, 255, 0.8)');
      sb3.addColorStop(1, 'rgba(120, 180, 255, 0)');
      ctx.fillStyle = sb3;
      ctx.fillRect(0, 0, w, h);
    } else if(preset === 'cyberpunk'){
      ctx.fillStyle = '#05020a';
      ctx.fillRect(0, 0, w, h);

      const pGrad = ctx.createLinearGradient(0, 0, 0, h*0.5);
      pGrad.addColorStop(0, '#ff007f');
      pGrad.addColorStop(1, 'rgba(255, 0, 127, 0)');
      ctx.fillStyle = pGrad;
      ctx.fillRect(0, 0, w, h*0.5);

      const cGrad = ctx.createLinearGradient(0, h*0.5, 0, h);
      cGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
      cGrad.addColorStop(1, '#00f3ff');
      ctx.fillStyle = cGrad;
      ctx.fillRect(0, h*0.5, w, h*0.5);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      for(let x=0; x<=w; x+=32){
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for(let y=0; y<=h; y+=32){
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if(preset === 'sunset'){
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0c102b');
      grad.addColorStop(0.4, '#801d4a');
      grad.addColorStop(0.65, '#ff5500');
      grad.addColorStop(0.8, '#ffaa00');
      grad.addColorStop(1, '#ffee99');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const sun = ctx.createRadialGradient(w*0.5, h*0.7, 5, w*0.5, h*0.7, 60);
      sun.addColorStop(0, '#ffffff');
      sun.addColorStop(0.3, '#fff4a8');
      sun.addColorStop(1, 'rgba(255, 170, 0, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
    } else if(preset === 'grid'){
      ctx.fillStyle = '#101216';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      for(let gy=20; gy<h; gy+=40){
        for(let gx=20; gx<w; gx+=40){
          ctx.fillRect(gx, gy, 14, 14);
        }
      }
      const glow = ctx.createRadialGradient(w*0.5, h*0.5, 10, w*0.5, h*0.5, 120);
      glow.addColorStop(0, 'rgba(200, 225, 255, 0.6)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    } else if(preset === 'metallic'){
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#222222');
      grad.addColorStop(0.25, '#888888');
      grad.addColorStop(0.3, '#ffffff');
      grad.addColorStop(0.35, '#444444');
      grad.addColorStop(0.7, '#cccccc');
      grad.addColorStop(0.75, '#ffffff');
      grad.addColorStop(1, '#111111');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    lightboxImageData = ctx.getImageData(0, 0, w, h);
  }

  function computeLitPixels(){
    const layer = layers[activeLayer];
    if(!layer) return null;

    const heightData = (layer.heightCtx && layer.heightCanvas) ? layer.heightCtx.getImageData(0, 0, W, H).data : null;
    const roughnessData = (layer.roughnessCtx && layer.roughnessCanvas) ? layer.roughnessCtx.getImageData(0, 0, W, H).data : null;
    const colorData = dctx.getImageData(0, 0, W, H).data;
    const out = new Uint8ClampedArray(colorData.length);

    const lightHeightPct = +document.getElementById('lightHeightSlider')?.value || 150;
    const ambient = (+document.getElementById('lightAmbientSlider')?.value || 20) / 100;
    const spotIntensityMult = (+document.getElementById('spotIntensitySlider')?.value || 100) / 100;
    const heightScalePct = (+document.getElementById('heightScaleSlider')?.value || 100);
    const roughnessScalePct = (+document.getElementById('roughnessScaleSlider')?.value || 100);
    const presetSelectVal = document.getElementById('lightboxPresetSelect')?.value || 'none';
    const reflectionMult = (+document.getElementById('lightboxIntensitySlider')?.value || 100) / 100;
    const specularMult = (+document.getElementById('specularBoostSlider')?.value || 100) / 100;

    const lightZ = (lightHeightPct/100) * Math.max(W, H);
    const lightPxX = lightPosX * W, lightPxY = lightPosY * H;
    const bumpStrength = 3 * (heightScalePct / 100);

    if(!lightboxImageData){
      renderLightboxPreset(presetSelectVal);
    }
    const envData = lightboxImageData ? lightboxImageData.data : null;
    const envW = lightboxCanvas.width, envH = lightboxCanvas.height;

    // Radius of point light influence based on light height
    const lightRadius = Math.max(W, H) * Math.max(0.15, (lightHeightPct / 100) * 0.5);
    const lightZSq = lightZ * lightZ;

    for(let y=0; y<H; y++){
      for(let x=0; x<W; x++){
        const i = (y*W+x)*4;
        const alpha = colorData[i+3];
        if(alpha === 0){
          out[i]=0; out[i+1]=0; out[i+2]=0; out[i+3]=0;
          continue;
        }

        let nx = 0, ny = 0, nz = 1;
        if(heightData && bumpStrength > 0){
          const hL = heightData[(y*W + Math.max(0,x-1))*4];
          const hR = heightData[(y*W + Math.min(W-1,x+1))*4];
          const hU = heightData[(Math.max(0,y-1)*W + x)*4];
          const hD = heightData[(Math.min(H-1,y+1)*W + x)*4];
          const dx = (hR-hL)/255 * bumpStrength;
          const dy = (hD-hU)/255 * bumpStrength;
          nx = -dx; ny = -dy; nz = 1;
          const nlen = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
          nx/=nlen; ny/=nlen; nz/=nlen;
        }

        const lx_raw = lightPxX - x, ly_raw = lightPxY - y, lz_raw = lightZ;
        const dist2DSq = lx_raw * lx_raw + ly_raw * ly_raw;
        const dist3D = Math.sqrt(dist2DSq + lightZSq) || 1;
        const lx = lx_raw / dist3D, ly = ly_raw / dist3D, lz = lz_raw / dist3D;

        // Smooth point light distance attenuation and circular falloff
        const falloffRatio = Math.min(1, Math.sqrt(dist2DSq) / lightRadius);
        const falloff = Math.max(0, 1 - falloffRatio * falloffRatio);
        const pointFalloff = falloff * falloff;
        const attenuation = lightZSq / (dist3D * dist3D);

        const dot = Math.max(0, nx*lx + ny*ly + nz*lz);
        const pointIntensity = dot * attenuation * pointFalloff * spotIntensityMult;

        // Ambient diffuse light modulated by Lightbox Scenery
        let ambR = 0, ambG = 0, ambB = 0;
        if(ambient > 0){
          if(presetSelectVal !== 'none' && envData){
            const ambU = Math.max(0, Math.min(1, 0.5 + nx * 0.5));
            const ambV = Math.max(0, Math.min(1, 0.5 - ny * 0.5));
            const ambEx = Math.floor(ambU * (envW - 1));
            const ambEy = Math.floor(ambV * (envH - 1));
            const ambEi = (ambEy * envW + ambEx) * 4;
            ambR = ambient * (envData[ambEi] / 255);
            ambG = ambient * (envData[ambEi + 1] / 255);
            ambB = ambient * (envData[ambEi + 2] / 255);
          } else {
            ambR = ambient;
            ambG = ambient;
            ambB = ambient;
          }
        }

        // Roughness map value (0 = Mirror Shiny, 255 = Matte)
        const rawR = roughnessData ? roughnessData[i] : 200;
        const rVal = Math.max(0, Math.min(255, Math.round(rawR * (roughnessScalePct / 100))));
        const normR = rVal / 255;
        const smoothness = 1 - normR;

        // Specular highlight (Blinn-Phong)
        const hx = lx, hy = ly, hz = lz + 1;
        const hlen = Math.sqrt(hx*hx + hy*hy + hz*hz) || 1;
        const nh = Math.max(0, nx*(hx/hlen) + ny*(hy/hlen) + nz*(hz/hlen));
        const specPower = Math.pow(2, smoothness * 7) + 1;
        const specFactor = Math.pow(nh, specPower) * Math.pow(smoothness, 1.2) * specularMult * attenuation * pointFalloff * spotIntensityMult;

        // Lightbox Scenery Reflection
        let refR = 0, refG = 0, refB = 0;
        const lightFactor = ambient + pointIntensity;
        if(presetSelectVal !== 'none' && smoothness > 0.05 && envData && reflectionMult > 0 && lightFactor > 0){
          const rx = 2 * nx * nz;
          const ry = 2 * ny * nz;
          const u = Math.max(0, Math.min(1, 0.5 + rx * 0.5));
          const v = Math.max(0, Math.min(1, 0.5 - ry * 0.5));
          const ex = Math.floor(u * (envW - 1));
          const ey = Math.floor(v * (envH - 1));
          const ei = (ey * envW + ex) * 4;
          const refStrength = Math.pow(smoothness, 1.5) * reflectionMult * Math.min(1, lightFactor);
          refR = envData[ei] * refStrength;
          refG = envData[ei+1] * refStrength;
          refB = envData[ei+2] * refStrength;
        }

        const litR = colorData[i]   * (ambR + pointIntensity) + specFactor * 255 + refR;
        const litG = colorData[i+1] * (ambG + pointIntensity) + specFactor * 255 + refG;
        const litB = colorData[i+2] * (ambB + pointIntensity) + specFactor * 255 + refB;

        out[i]   = Math.min(255, Math.round(litR));
        out[i+1] = Math.min(255, Math.round(litG));
        out[i+2] = Math.min(255, Math.round(litB));
        out[i+3] = alpha;
      }
    }
    return out;
  }

  function updateColorHighlight(){
    const hctx = colorHighlightCanvas.getContext('2d', { willReadFrequently: true });
    hctx.clearRect(0, 0, W, H);
    if(!colorHighlightActive || selectedColors.size===0 || !layers[activeLayer]) return;
    const src = layers[activeLayer].colorCtx.getImageData(0, 0, W, H).data;
    const targetRgbs = [...selectedColors].map(hex=>hexToRgb(hex)).filter(Boolean);
    const outImg = hctx.createImageData(W, H);
    const out = outImg.data;
    for(let i=0; i<src.length; i+=4){
      const a = src[i+3];
      if(a === 0) continue;
      const r = src[i], g = src[i+1], b = src[i+2];
      const maxDev = a < 255 ? (Math.ceil(128 / a) + 2) : 0;
      let matched = false;
      for(let tr of targetRgbs){
        if(Math.abs(r - tr.r) <= maxDev && Math.abs(g - tr.g) <= maxDev && Math.abs(b - tr.b) <= maxDev){
          matched = true;
          break;
        }
      }
      if(matched){
        out[i]=255; out[i+1]=255; out[i+2]=0; out[i+3]=180; // yellow highlight overlay
      }
    }
    hctx.putImageData(outImg, 0, 0);
  }
  document.getElementById('highlightOnCanvasBtn')?.addEventListener('click', ()=>{
    colorHighlightActive = !colorHighlightActive;
    document.getElementById('highlightOnCanvasBtn').classList.toggle('primary', colorHighlightActive);
    updateColorHighlight();
  });

  function updateLightingPreview(){
    const canvasLighting = document.getElementById('canvasLightingCanvas');
    const canvasGizmo = document.getElementById('canvasLightingGizmoCanvas');
    const lightHandle = document.getElementById('canvasLightHandle');

    if(!lightingPreviewEnabled){
      displayCanvas.style.visibility = 'visible';
      if(canvasLighting) canvasLighting.style.display = 'none';
      if(canvasGizmo) canvasGizmo.style.display = 'none';
      if(lightHandle) lightHandle.style.display = 'none';
      return;
    }

    displayCanvas.style.visibility = 'hidden';

    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const wPx = (effW * zoom) + 'px', hPx = (effH * zoom) + 'px';

    if(canvasLighting){
      canvasLighting.style.display = 'block';
      if(canvasLighting.width !== effW || canvasLighting.height !== effH){
        canvasLighting.width = effW; canvasLighting.height = effH;
      }
      canvasLighting.style.width = wPx;
      canvasLighting.style.height = hPx;
    }
    if(canvasGizmo){
      canvasGizmo.style.display = 'block';
      if(canvasGizmo.width !== effW || canvasGizmo.height !== effH){
        canvasGizmo.width = effW; canvasGizmo.height = effH;
      }
      canvasGizmo.style.width = wPx;
      canvasGizmo.style.height = hPx;
    }

    const litData = computeLitPixels();
    if(!litData) return;

    if(canvasLighting){
      const clCtx = canvasLighting.getContext('2d', { willReadFrequently: true });
      clCtx.clearRect(0, 0, effW, effH);
      const litImgData = clCtx.createImageData(W, H);
      litImgData.data.set(litData);

      if(!seamlessModeEnabled){
        clCtx.putImageData(litImgData, 0, 0);
      } else {
        const tmpC = document.createElement('canvas');
        tmpC.width = W; tmpC.height = H;
        tmpC.getContext('2d', { willReadFrequently: true }).putImageData(litImgData, 0, 0);
        for(let ty=0; ty<3; ty++){
          for(let tx=0; tx<3; tx++){
            clCtx.drawImage(tmpC, tx*W, ty*H);
          }
        }
      }
    }

    // Update Interactive Light Handle on Canvas
    if(lightHandle){
      lightHandle.style.display = 'block';
      const effOffset = seamlessModeEnabled ? W : 0;
      lightHandle.style.left = (((lightPosX * W) + effOffset) * zoom) + 'px';
      lightHandle.style.top = (((lightPosY * H) + effOffset) * zoom) + 'px';
    }

    // Draw Light Gizmo / Rays on Canvas
    if(canvasGizmo){
      const gctx = canvasGizmo.getContext('2d', { willReadFrequently: true });
      gctx.clearRect(0, 0, effW, effH);
      const effOffset = seamlessModeEnabled ? W : 0;
      const lx = lightPosX * W + effOffset;
      const ly = lightPosY * H + effOffset;

      gctx.save();
      const lightHeightPct = +document.getElementById('lightHeightSlider')?.value || 150;
      const lightRadius = Math.max(W, H) * Math.max(0.15, (lightHeightPct / 100) * 0.5);

      gctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      gctx.lineWidth = 1;
      gctx.setLineDash([4, 4]);
      gctx.beginPath();
      gctx.arc(lx, ly, lightRadius, 0, Math.PI * 2);
      gctx.stroke();

      gctx.setLineDash([]);
      const radGrad = gctx.createRadialGradient(lx, ly, 1, lx, ly, 16);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      radGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.7)');
      radGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
      gctx.fillStyle = radGrad;
      gctx.beginPath();
      gctx.arc(lx, ly, 16, 0, Math.PI * 2);
      gctx.fill();

      gctx.restore();
    }
  }

  function setLightingPreviewEnabled(enabled){
    lightingPreviewEnabled = !!enabled;
    const chk = document.getElementById('lightingPreviewEnabled');
    if(chk) chk.checked = lightingPreviewEnabled;
    const wrap = document.getElementById('lightingPreviewWrap');
    if(wrap) wrap.style.display = lightingPreviewEnabled ? 'block' : 'none';
    const btn = document.getElementById('canvasLightingToggleBtn');
    if(btn) btn.classList.toggle('active', lightingPreviewEnabled);
    updateLightingPreview();
  }

  document.getElementById('canvasLightingToggleBtn')?.addEventListener('click', ()=>{
    setLightingPreviewEnabled(!lightingPreviewEnabled);
  });

  // Interactive Light Handle Dragging on Canvas
  let canvasLightDragging = false;
  const canvasLightHandle = document.getElementById('canvasLightHandle');
  if(canvasLightHandle){
    canvasLightHandle.addEventListener('pointerdown', (e)=>{
      e.stopPropagation();
      e.preventDefault();
      canvasLightDragging = true;
      canvasLightHandle.style.cursor = 'grabbing';
      if(canvasLightHandle.setPointerCapture){
        canvasLightHandle.setPointerCapture(e.pointerId);
      }
    });
    canvasLightHandle.addEventListener('pointermove', (e)=>{
      if(!canvasLightDragging) return;
      e.stopPropagation();
      e.preventDefault();
      const {x, y} = canvasCoords(e);
      lightPosX = x / W;
      lightPosY = y / H;
      updateLightingPreview();
    });
    const endLightDrag = (e)=>{
      if(canvasLightDragging){
        canvasLightDragging = false;
        canvasLightHandle.style.cursor = 'grab';
        try { canvasLightHandle.releasePointerCapture(e.pointerId); } catch(err){}
      }
    };
    canvasLightHandle.addEventListener('pointerup', endLightDrag);
    canvasLightHandle.addEventListener('pointercancel', endLightDrag);
  }

  document.getElementById('lightingPreviewEnabled')?.addEventListener('change', e=>{
    setLightingPreviewEnabled(e.target.checked);
  });
  document.getElementById('spotIntensitySlider')?.addEventListener('input', e=>{
    document.getElementById('spotIntensityVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });
  document.getElementById('heightScaleSlider')?.addEventListener('input', e=>{
    document.getElementById('heightScaleVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });
  document.getElementById('roughnessScaleSlider')?.addEventListener('input', e=>{
    document.getElementById('roughnessScaleVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });
  document.getElementById('lightHeightSlider')?.addEventListener('input', e=>{
    document.getElementById('lightHeightVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });
  document.getElementById('lightAmbientSlider')?.addEventListener('input', e=>{
    document.getElementById('lightAmbientVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });
  document.getElementById('lightboxPresetSelect')?.addEventListener('change', e=>{
    const val = e.target.value;
    const fileInput = document.getElementById('lightboxFileInput');
    if(val === 'custom'){
      if(fileInput) fileInput.style.display = 'block';
      if(fileInput) fileInput.click();
    } else {
      if(fileInput) fileInput.style.display = 'none';
      renderLightboxPreset(val);
      updateLightingPreview();
    }
  });
  document.getElementById('lightboxFileInput')?.addEventListener('change', e=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const img = new Image();
      img.onload = ()=>{
        lightboxCanvas.width = 256;
        lightboxCanvas.height = 256;
        lightboxCtx.clearRect(0,0,256,256);
        lightboxCtx.drawImage(img, 0, 0, 256, 256);
        lightboxImageData = lightboxCtx.getImageData(0,0,256,256);
        updateLightingPreview();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('lightboxIntensitySlider')?.addEventListener('input', e=>{
    document.getElementById('lightboxIntensityVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });
  document.getElementById('specularBoostSlider')?.addEventListener('input', e=>{
    document.getElementById('specularBoostVal').textContent = e.target.value + '%';
    updateLightingPreview();
    if(document.getElementById('tilesetTesterPopup')?.style.display !== 'none') updateTilesetTester();
  });

  function offsetWrap(srcCanvas, w, h){
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d', { willReadFrequently: true });
    const hw = Math.floor(w/2), hh = Math.floor(h/2);
    const rw = w-hw, rh = h-hh;
    octx.drawImage(srcCanvas, hw, hh, rw, rh, 0, 0, rw, rh);   // src bottom-right -> dst top-left
    octx.drawImage(srcCanvas, 0, hh, hw, rh, rw, 0, hw, rh);   // src bottom-left  -> dst top-right
    octx.drawImage(srcCanvas, hw, 0, rw, hh, 0, rh, rw, hh);   // src top-right    -> dst bottom-left
    octx.drawImage(srcCanvas, 0, 0, hw, hh, rw, rh, hw, hh);   // src top-left     -> dst bottom-right
    return out;
  }
  function boxBlurArray(src, w, h){
    const out = new Uint8ClampedArray(src.length);
    for(let y=0; y<h; y++){
      for(let x=0; x<w; x++){
        let sr=0,sg=0,sb=0,sa=0,count=0;
        for(let ky=-1; ky<=1; ky++){
          for(let kx=-1; kx<=1; kx++){
            const nx=x+kx, ny=y+ky;
            if(nx<0||ny<0||nx>=w||ny>=h) continue;
            const ni=(ny*w+nx)*4;
            sr+=src[ni]; sg+=src[ni+1]; sb+=src[ni+2]; sa+=src[ni+3];
            count++;
          }
        }
        const i=(y*w+x)*4;
        out[i]=sr/count; out[i+1]=sg/count; out[i+2]=sb/count; out[i+3]=sa/count;
      }
    }
    return out;
  }
  function computeSeamlessResult(fadePct, zoomPct){
    if(!layers[activeLayer]) return null;
    const w = W, h = H;
    const offsetCanvas = offsetWrap(layers[activeLayer].canvas, w, h);
    const octx = offsetCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = octx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imgData.data);
    const dst = imgData.data;

    const strength = fadePct / 100;
    const bandW = Math.max(1, Math.round((w / 2) * 0.25 * (zoomPct / 100)));
    const bandH = Math.max(1, Math.round((h / 2) * 0.25 * (zoomPct / 100)));

    const halfW = Math.floor(w / 2);
    const halfH = Math.floor(h / 2);

    for (let y = 0; y < h; y++) {
      const dy = Math.abs(y - halfH);
      let wy = 0;
      if (dy < bandH) {
        wy = (1 - dy / bandH) * strength * 0.5;
      }
      const mirrorY = (y < halfH) ? (y + halfH) : (y - halfH);

      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x - halfW);
        let wx = 0;
        if (dx < bandW) {
          wx = (1 - dx / bandW) * strength * 0.5;
        }
        const mirrorX = (x < halfW) ? (x + halfW) : (x - halfW);

        const i00 = (y * w + x) * 4;
        const i10 = (y * w + mirrorX) * 4;
        const i01 = (mirrorY * w + x) * 4;
        const i11 = (mirrorY * w + mirrorX) * 4;

        const w00 = (1 - wx) * (1 - wy);
        const w10 = wx * (1 - wy);
        const w01 = (1 - wx) * wy;
        const w11 = wx * wy;

        dst[i00]     = Math.round(src[i00]*w00 + src[i10]*w10 + src[i01]*w01 + src[i11]*w11);
        dst[i00 + 1] = Math.round(src[i00+1]*w00 + src[i10+1]*w10 + src[i01+1]*w01 + src[i11+1]*w11);
        dst[i00 + 2] = Math.round(src[i00+2]*w00 + src[i10+2]*w10 + src[i01+2]*w01 + src[i11+2]*w11);
        dst[i00 + 3] = Math.round(src[i00+3]*w00 + src[i10+3]*w10 + src[i01+3]*w01 + src[i11+3]*w11);
      }
    }

    if (document.getElementById('seamlessPalettizeCheckbox') && document.getElementById('seamlessPalettizeCheckbox').checked) {
      const colors = allColors();
      if (colors.length > 0) {
        const colorsRGB = colors.map(hexToRgb);
        for (let i = 0; i < dst.length; i += 4) {
          if (dst[i+3] > 0) {
            let bestDist = Infinity;
            let bestColor = null;
            for(let c of colorsRGB) {
              const dr = dst[i] - c.r, dg = dst[i+1] - c.g, db = dst[i+2] - c.b;
              const dist = dr*dr + dg*dg + db*db;
              if(dist < bestDist) { bestDist = dist; bestColor = c; }
            }
            if (bestColor) {
              dst[i] = bestColor.r;
              dst[i+1] = bestColor.g;
              dst[i+2] = bestColor.b;
              // dst[i+3] is preserved as calculated
            }
          }
        }
      }
    }

    octx.putImageData(imgData, 0, 0);
    return offsetCanvas;
  }
  function updateMakeSeamlessPreview(){
    const fadePct = +document.getElementById('seamlessFadeSlider').value;
    const zoomPct = +document.getElementById('seamlessZoomSlider').value;
    const result = computeSeamlessResult(fadePct, zoomPct);
    if(!result) return;
    const preview = document.getElementById('makeSeamlessPreviewCanvas');
    preview.width = W; preview.height = H;
    preview.getContext('2d', { willReadFrequently: true }).drawImage(result, 0, 0);
  }
  function openMakeSeamlessPopup(){
    const popup = document.getElementById('makeSeamlessPopup');
    popup.style.display = 'block';
    updateMakeSeamlessPreview();
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closeMakeSeamlessPopup(){
    document.getElementById('makeSeamlessPopup').style.display = 'none';
  }
  document.getElementById('makeSeamlessBtn')?.addEventListener('click', openMakeSeamlessPopup);
  document.getElementById('fxSeamlessBtn')?.addEventListener('click', openMakeSeamlessPopup);
  document.getElementById('seamlessCancelBtn').addEventListener('click', closeMakeSeamlessPopup);
  const seamlessCloseBtnEl = document.getElementById('seamlessPopupCloseBtn');
  if (seamlessCloseBtnEl) seamlessCloseBtnEl.addEventListener('click', closeMakeSeamlessPopup);

  makePopupDraggable(document.getElementById('makeSeamlessPopup'), document.getElementById('makeSeamlessDragHandle'));

  document.getElementById('seamlessFadeSlider').addEventListener('input', e=>{
    document.getElementById('seamlessFadeVal').textContent = e.target.value + '%';
    updateMakeSeamlessPreview();
  });
  document.getElementById('seamlessZoomSlider').addEventListener('input', e=>{
    document.getElementById('seamlessZoomVal').textContent = e.target.value + '%';
    updateMakeSeamlessPreview();
  });
  const seamlessPalettizeCb = document.getElementById('seamlessPalettizeCheckbox');
  if (seamlessPalettizeCb) {
    seamlessPalettizeCb.addEventListener('change', updateMakeSeamlessPreview);
  }
  document.getElementById('seamlessApplyBtn').addEventListener('click', ()=>{
    const fadePct = +document.getElementById('seamlessFadeSlider').value;
    const zoomPct = +document.getElementById('seamlessZoomSlider').value;
    const result = computeSeamlessResult(fadePct, zoomPct);
    if(!result || !layers[activeLayer]) return;
    pushHistory();
    const ctx = layers[activeLayer].ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(result, 0, 0);
    render();
    refreshLayerThumbOnly();
    closeMakeSeamlessPopup();
  });

  // ---------- Grid overlay ----------
  function drawGridOverlay(){
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    gctx.clearRect(0,0,effW,effH);

    if (seamlessModeEnabled) {
      gctx.save();
      gctx.strokeStyle = '#d4a017';
      gctx.globalAlpha = 0.55;
      gctx.lineWidth = Math.max(1, 2 / zoom);
      gctx.setLineDash([6 / zoom, 4 / zoom]);
      gctx.beginPath();
      gctx.moveTo(W, 0); gctx.lineTo(W, 3 * H);
      gctx.moveTo(2 * W, 0); gctx.lineTo(2 * W, 3 * H);
      gctx.moveTo(0, H); gctx.lineTo(3 * W, H);
      gctx.moveTo(0, 2 * H); gctx.lineTo(3 * W, 2 * H);
      gctx.stroke();

      // Highlight the main original center canvas tile
      gctx.strokeStyle = '#38bdf8';
      gctx.globalAlpha = 0.85;
      gctx.lineWidth = Math.max(1, 2.5 / zoom);
      gctx.setLineDash([]);
      gctx.strokeRect(W, H, W, H);
      gctx.restore();
    }

    if(!gridMasterOn) return;
    grids.forEach(g=>{
      if(!g.visible || g.spacing < 1) return;
      gctx.save();
      gctx.strokeStyle = g.color;
      gctx.globalAlpha = g.opacity/100;
      gctx.lineWidth = 1;
      gctx.beginPath();
      const startX = ((g.offsetX % g.spacing) + g.spacing) % g.spacing;
      const startY = ((g.offsetY % g.spacing) + g.spacing) % g.spacing;
      for(let x = startX; x <= effW; x += g.spacing){
        gctx.moveTo(Math.floor(x)+0.5, 0);
        gctx.lineTo(Math.floor(x)+0.5, effH);
      }
      for(let y = startY; y <= effH; y += g.spacing){
        gctx.moveTo(0, Math.floor(y)+0.5);
        gctx.lineTo(effW, Math.floor(y)+0.5);
      }
      gctx.stroke();
      gctx.restore();
    });
  }

  function refreshGridPanel(){
    document.getElementById('snapToGridHint').style.display = (snapToGridEnabled && grids.length===0) ? 'block' : 'none';
    const list = document.getElementById('gridList');
    list.innerHTML = '';
    grids.forEach((g, idx)=>{
      const card = document.createElement('div');
      card.className = 'grid-card';

      const top = document.createElement('div');
      top.className = 'grid-card-top';
      const vis = document.createElement('input');
      vis.type = 'checkbox'; vis.checked = g.visible;
      vis.addEventListener('change', ()=>{ g.visible = vis.checked; drawGridOverlay(); });
      const label = document.createElement('span');
      label.textContent = 'Grid ' + (idx+1);
      const del = document.createElement('button');
      del.className = 'btn small danger';
      del.textContent = '×';
      del.addEventListener('click', ()=>{ grids.splice(idx,1); refreshGridPanel(); drawGridOverlay(); });
      top.appendChild(vis); top.appendChild(label); top.appendChild(del);

      const spacingLbl = document.createElement('label');
      spacingLbl.textContent = 'Spacing (px)';
      const spacing = document.createElement('input');
      spacing.type = 'number'; spacing.min = 1; spacing.max = 2048; spacing.value = g.spacing;
      spacing.addEventListener('input', ()=>{ g.spacing = Math.max(1, +spacing.value || 1); drawGridOverlay(); });
      spacingLbl.appendChild(spacing);

      const colorLbl = document.createElement('label');
      colorLbl.textContent = 'Color';
      const color = document.createElement('input');
      color.type = 'color'; color.value = g.color;
      color.addEventListener('input', ()=>{ g.color = color.value; drawGridOverlay(); });
      colorLbl.appendChild(color);

      const opLbl = document.createElement('label');
      opLbl.textContent = 'Opacity';
      const op = document.createElement('input');
      op.type = 'range'; op.min = 0; op.max = 100; op.value = g.opacity;
      op.addEventListener('input', ()=>{ g.opacity = +op.value; drawGridOverlay(); });
      opLbl.appendChild(op);
      applyStepper(op);

      const offRow = document.createElement('div');
      offRow.className = 'row2';
      const offXLbl = document.createElement('label'); offXLbl.style.flex='1'; offXLbl.textContent = 'Offset X';
      const offX = document.createElement('input');
      offX.type = 'number'; offX.value = g.offsetX;
      offX.addEventListener('input', ()=>{ g.offsetX = +offX.value || 0; drawGridOverlay(); });
      offXLbl.appendChild(offX);
      const offYLbl = document.createElement('label'); offYLbl.style.flex='1'; offYLbl.textContent = 'Offset Y';
      const offY = document.createElement('input');
      offY.type = 'number'; offY.value = g.offsetY;
      offY.addEventListener('input', ()=>{ g.offsetY = +offY.value || 0; drawGridOverlay(); });
      offYLbl.appendChild(offY);
      offRow.appendChild(offXLbl); offRow.appendChild(offYLbl);

      card.appendChild(top);
      card.appendChild(spacingLbl);
      card.appendChild(colorLbl);
      card.appendChild(opLbl);
      card.appendChild(offRow);
      list.appendChild(card);
    });
  }
  document.getElementById('gridMasterToggle').addEventListener('change', e=>{
    gridMasterOn = e.target.checked;
    drawGridOverlay();
  });
  document.getElementById('snapToGridToggle').addEventListener('change', e=>{
    snapToGridEnabled = e.target.checked;
    document.getElementById('snapToGridHint').style.display = (snapToGridEnabled && grids.length===0) ? 'block' : 'none';
  });
  document.getElementById('addGridBtn').addEventListener('click', ()=>{
    grids.push({id:gridIdCounter++, visible:true, spacing:16, color:'#ffffff', opacity:25, offsetX:0, offsetY:0});
    refreshGridPanel();
    drawGridOverlay();
  });

  // ---------- Selection ----------
  function drawSelectionOverlay(){
    sctx.clearRect(0,0,W,H);
    if(!selection || selection.w < 1 || selection.h < 1){ hideOverlayLabel(); return; }
    const {x,y,w,h} = selection;
    sctx.save();
    sctx.lineWidth = 1;
    sctx.setLineDash([4,4]);
    sctx.strokeStyle = '#ffffff';
    sctx.lineDashOffset = 0;
    sctx.strokeRect(x+0.5, y+0.5, Math.max(0,w-1), Math.max(0,h-1));
    sctx.strokeStyle = '#000000';
    sctx.lineDashOffset = 4;
    sctx.strokeRect(x+0.5, y+0.5, Math.max(0,w-1), Math.max(0,h-1));
    sctx.restore();
    showOverlayLabel(x+w/2, y-12, w + ' × ' + h);
  }
  function anchorFloatingSelection(){
    if(!floatingSelection) return;
    if(layers[activeLayer]){
      if(layers[activeLayer].locked){
        showToast('Active layer is locked');
        return;
      }
      layers[activeLayer].ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
      refreshLayerThumbOnly();
    }
    floatingSelection = null;
    render();
  }
  function clearSelection(){
    selection = null;
    floatingSelection = null; // discard, not anchor — the underlying layer state is changing
    drawSelectionOverlay();
    updateSelectionUI();
  }
  function clearLayerOrSelection(){
    if(!layers[activeLayer]) return;
    if(layers[activeLayer].locked){
      showToast('Active layer is locked');
      return;
    }
    pushHistory();
    const ctx = layers[activeLayer].ctx;
    if(selection && selection.w > 0 && selection.h > 0){
      ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    render();
    refreshLayerThumbOnly();
  }
  function updateSelectionUI(){
    const hint = document.getElementById('selectionHint');
    const stampBtn = document.getElementById('stampFromSelectionBtn');
    const clearBtn = document.getElementById('clearSelectionBtn');
    if(selection && selection.w > 0 && selection.h > 0){
      hint.textContent = 'Selection: ' + selection.w + ' × ' + selection.h + ' px';
      hint.style.display = 'block';
      stampBtn.disabled = false;
      clearBtn.disabled = false;
    } else {
      hint.textContent = '';
      hint.style.display = 'none';
      stampBtn.disabled = true;
      clearBtn.disabled = true;
    }
  }
  let internalClipboardCanvas = null;

  function getSelectionCanvas(){
    if(!selection || selection.w < 1 || selection.h < 1) return null;
    const tmp = document.createElement('canvas');
    tmp.width = selection.w; tmp.height = selection.h;
    const tmpCtx = tmp.getContext('2d', { willReadFrequently: true });
    if(floatingSelection){
      tmpCtx.drawImage(floatingSelection.canvas, 0, 0);
    } else if(layers[activeLayer]){
      tmpCtx.drawImage(layers[activeLayer].canvas, selection.x, selection.y, selection.w, selection.h, 0, 0, selection.w, selection.h);
    }
    return tmp;
  }

  async function pasteFromClipboard(){
    let pasteSourceImg = null;

    if(navigator.clipboard && navigator.clipboard.read){
      try {
        const items = await navigator.clipboard.read();
        for(const item of items){
          const imageType = item.types.find(t => t.startsWith('image/'));
          if(!imageType) continue;
          const blob = await item.getType(imageType);
          const img = new Image();
          const url = URL.createObjectURL(blob);
          await new Promise(res=>{ img.onload = res; img.src = url; });
          URL.revokeObjectURL(url);
          pasteSourceImg = img;
          break;
        }
      } catch(err){
        console.warn('System clipboard read fallback to internal:', err);
      }
    }

    if(!pasteSourceImg && internalClipboardCanvas){
      pasteSourceImg = internalClipboardCanvas;
    }

    if(!pasteSourceImg){
      alert('No image found on the clipboard. Select an area and click Copy first!');
      return;
    }

    pushHistory();
    const w = pasteSourceImg.width || 100;
    const h = pasteSourceImg.height || 100;
    const cx = Math.round((W - w)/2);
    const cy = Math.round((H - h)/2);

    if(!layers[activeLayer]) addLayer('Pasted Image', null, true);

    anchorFloatingSelection();

    const lifted = document.createElement('canvas');
    lifted.width = w; lifted.height = h;
    lifted.getContext('2d', { willReadFrequently: true }).drawImage(pasteSourceImg, 0, 0);

    floatingSelection = { canvas: lifted, x: cx, y: cy, w: w, h: h };
    selection = { x: cx, y: cy, w: w, h: h };
    setTool('select');
    drawSelectionOverlay();
    updateSelectionUI();
    render();
    if(typeof showToast === 'function') showToast('Pasted onto canvas');
  }

  function copySelectionToClipboard(){
    const selCanvas = getSelectionCanvas();
    if(!selCanvas){
      alert('Make a selection first (Select tool), then Copy places just that region on the clipboard.');
      return;
    }

    internalClipboardCanvas = document.createElement('canvas');
    internalClipboardCanvas.width = selCanvas.width;
    internalClipboardCanvas.height = selCanvas.height;
    internalClipboardCanvas.getContext('2d', { willReadFrequently: true }).drawImage(selCanvas, 0, 0);

    if(typeof showToast === 'function') showToast('Selection copied');

    if(navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined'){
      selCanvas.toBlob(async (blob)=>{
        if(!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
        } catch(err){
          console.warn('System clipboard write warning:', err);
        }
      }, 'image/png');
    }
  }

  document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
  document.getElementById('copySelectionBtn').addEventListener('click', copySelectionToClipboard);
  document.getElementById('pasteClipboardBtn').addEventListener('click', pasteFromClipboard);
  document.getElementById('stampFromSelectionBtn').addEventListener('click', async ()=>{
    if(!selection || selection.w < 1 || selection.h < 1) return;
    const selCanvas = getSelectionCanvas();
    if(!selCanvas) return;

    const mask = buildStampMask(selCanvas);
    let defaultName = 'Stamp ' + (stamps.length + 1);
    let name = defaultName;
    try {
      const userEntered = await showCustomPrompt('Stamp name:', defaultName);
      if(userEntered !== null && userEntered.trim() !== ''){
        name = userEntered.trim();
      }
    } catch(err){
      console.warn('Prompt blocked or unavailable:', err);
    }

    stamps.push({name, mask});
    selectedStampIndex = stamps.length - 1;

    dabShape = 'stamp';
    brushShape = 'stamp';
    document.querySelectorAll('.shape-btn[data-shape]').forEach(b=>b.classList.toggle('active', b.dataset.shape==='stamp'));
    document.querySelectorAll('.shape-btn[data-brush-shape]').forEach(b=>b.classList.toggle('active', b.dataset.brushShape==='stamp'));

    const s = document.getElementById('stampSourceSelect');
    if(s) s.style.display = 'block';
    const bs = document.getElementById('brushStampSourceSelect');
    if(bs) bs.style.display = 'block';

    refreshStampList();
    populateStampDropdown();
    if(typeof showToast === 'function') showToast('Stamp "' + name + '" created!');
  });

  // ---------- Color helpers ----------
  function hexToRgb(hex){
    if (!hex) return { r: 0, g: 0, b: 0 };
    if (typeof hex === 'object' && typeof hex.r === 'number') return hex;
    const str = String(hex).trim();
    if (str.startsWith('rgb')) {
      const parts = str.match(/\d+/g);
      if (parts && parts.length >= 3) {
        return {
          r: parseInt(parts[0], 10),
          g: parseInt(parts[1], 10),
          b: parseInt(parts[2], 10)
        };
      }
    }
    let h = str.replace('#','');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length < 6) return { r: 0, g: 0, b: 0 };
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 0, g: 0, b: 0 };
    return { r, g, b };
  }
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h=0, s=0; const l=(max+min)/2;
    const d = max-min;
    if(d !== 0){
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = ((g-b)/d + (g<b?6:0)); break;
        case g: h = (b-r)/d + 2; break;
        case b: h = (r-g)/d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  }
  function hslToRgb(h,s,l){
    h = ((h % 360) + 360) % 360;
    if(s === 0){ const v=Math.round(l*255); return {r:v,g:v,b:v}; }
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    function hue2rgb(t){
      if(t<0) t+=1; if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    }
    const hk = h/360;
    return {
      r: Math.round(hue2rgb(hk+1/3)*255),
      g: Math.round(hue2rgb(hk)*255),
      b: Math.round(hue2rgb(hk-1/3)*255)
    };
  }
  function hexToHsl(hex){ const {r,g,b} = hexToRgb(hex); return rgbToHsl(r,g,b); }
  function hslToHex(h,s,l){ const {r,g,b} = hslToRgb(h,s,l); return rgbToHex(r,g,b); }
  function rgbToHex(r,g,b){
    return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
  }
  function syncColorBuffer(layer){
    if(!layer || !layer.ctx) return;
    if(!layer.colorBuffer) {
      layer.colorBuffer = new Uint8ClampedArray(W * H * 4);
    }
    const buf = layer.colorBuffer;
    const realImg = layer.ctx.getImageData(0, 0, W, H);
    buf.set(realImg.data);
  }
  function invalidateColorBuffer(layer){
    if(layer) layer.colorBuffer = null;
  }
  function getPixelColorAt(px, py){
    const gx = Math.floor(px), gy = Math.floor(py);
    if(gx < 0 || gy < 0 || gx >= W || gy >= H) return null;

    if(layers && layers[activeLayer] && layers[activeLayer].visible){
      const layer = layers[activeLayer];
      if(!layer.colorBuffer){
        syncColorBuffer(layer);
      }
      if(layer.colorBuffer){
        const idx = (gy * W + gx) * 4;
        const a = layer.colorBuffer[idx + 3];
        if(a > 0){
          const r = layer.colorBuffer[idx], g = layer.colorBuffer[idx+1], b = layer.colorBuffer[idx+2];
          // Account for canvas 2D premultiplied alpha quantization when checking palette colors:
          if(a < 255){
            const maxDev = Math.ceil(128 / a) + 2;
            const mainColors = mainGroup()?.colors || [];
            let bestHex = null, bestDist = Infinity, bestR = r, bestG = g, bestB = b;
            for(let c of mainColors){
              const prgb = hexToRgb(c.hex);
              if(!prgb) continue;
              const dr = Math.abs(prgb.r - r);
              const dg = Math.abs(prgb.g - g);
              const db = Math.abs(prgb.b - b);
              if(dr <= maxDev && dg <= maxDev && db <= maxDev){
                const dist = dr*dr + dg*dg + db*db;
                if(dist < bestDist){
                  bestDist = dist;
                  bestHex = c.hex;
                  bestR = prgb.r;
                  bestG = prgb.g;
                  bestB = prgb.b;
                }
              }
            }
            if(bestHex){
              return { r: bestR, g: bestG, b: bestB, a, hex: bestHex };
            }
          }
          return { r, g, b, a, hex: rgbToHex(r, g, b) };
        }
      }
    }
    return null;
  }
  function sampleCanvasColorAt(px, py){
    const info = getPixelColorAt(px, py);
    return info ? info.hex : null;
  }
  function startColorPick(callback){
    pendingColorPick = callback;
    if(tool !== 'colorpick'){
      previousToolBeforePick = tool;
    }
    setTool('colorpick');
  }
  function selectPaletteColorByHex(hex){
    if(!hex) return;
    let entry = mainGroup().colors.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    if(!entry){
      const rgb = hexToRgb(hex);
      if(rgb){
        let bestDist = Infinity, bestEntry = null;
        for(let c of mainGroup().colors){
          const crgb = hexToRgb(c.hex);
          if(!crgb) continue;
          const d = Math.abs(crgb.r - rgb.r) + Math.abs(crgb.g - rgb.g) + Math.abs(crgb.b - rgb.b);
          if(d < bestDist){
            bestDist = d;
            bestEntry = c;
          }
        }
        if(bestEntry && bestDist <= 30){
          entry = bestEntry;
        }
      }
    }
    if(!entry){
      alert('That color isn\'t in your Main Palette.');
      return;
    }
    selectedColors = new Set([entry.hex]);
    setFg(entry.hex);
    refreshGroups();
  }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function blendColors(colors,t){
    if(!colors || colors.length === 0) return fgColor;
    if(colors.length === 1) return colors[0];
    const clampedT = Math.max(0, Math.min(1, t));
    const scaled = clampedT * (colors.length - 1);
    const i = Math.floor(scaled);
    const frac = scaled - i;
    const c1 = hexToRgb(colors[Math.min(i, colors.length-1)]);
    const c2 = hexToRgb(colors[Math.min(i+1, colors.length-1)]);
    if (!c1 || !c2) return fgColor;
    const r = Math.round(lerp(c1.r,c2.r,frac));
    const g = Math.round(lerp(c1.g,c2.g,frac));
    const b = Math.round(lerp(c1.b,c2.b,frac));
    return `rgb(${r},${g},${b})`;
  }
  function randomFromColors(colors){
    if(colors.length === 0) return fgColor;
    return colors[Math.floor(Math.random()*colors.length)];
  }
  function getSprayColors(){
    if(sourceKind === 'gradient' && selectedGradientIndex !== null && gradients[selectedGradientIndex]){
      return gradients[selectedGradientIndex].stops;
    }
    if(selectedColors.size === 0) return allColors();
    return allColors().filter(hex => selectedColors.has(hex));
  }
  function updateGradientOrderedVisibility() {
    const orderedOpts = document.getElementById('gradientOrderedOptions');
    if (orderedOpts) {
      orderedOpts.style.display = (sourceKind === 'gradient' && gradients.length > 0) ? 'block' : 'none';
    }
    const configGroup = document.getElementById('gradientOrderedConfig');
    if (configGroup) {
      configGroup.style.display = (sourceKind === 'gradient' && gradients.length > 0 && gradientOrdered) ? 'block' : 'none';
    }
    const cycleOpts = document.getElementById('gradientCycleOptions');
    if (cycleOpts) {
      cycleOpts.style.display = (sourceKind === 'gradient' && gradients.length > 0 && gradientOrdered && gradientSequentialStepMode === 'distance') ? 'block' : 'none';
    }
    const dabsOpts = document.getElementById('gradientDabsOptions');
    if (dabsOpts) {
      dabsOpts.style.display = (sourceKind === 'gradient' && gradients.length > 0 && gradientOrdered && gradientSequentialStepMode === 'dabs') ? 'block' : 'none';
    }
  }
  function updatePaintTaperUI() {
    const group = document.getElementById('paintTaperSettingsGroup');
    if (group) {
      group.style.display = paintTaperEnabled ? 'block' : 'none';
    }
  }
  function updateVineFreehandUI() {
    const isFreehand = pathStyle === 'freehand';
    const el = document.getElementById('pathStyleSelect');
    if (el) el.value = pathStyle;
    const grp = document.getElementById('vineFreehandDetailGroup');
    if (grp) grp.style.display = isFreehand ? 'block' : 'none';
    const slider = document.getElementById('vineFreehandDetailSlider');
    if (slider) slider.value = freehandPathDetail;
    const val = document.getElementById('vineFreehandDetailVal');
    if (val) val.textContent = freehandPathDetail + 'px';
  }
  function updateSpraySourceHint(){
    const hint = document.getElementById('spraySourceHint');
    if(sourceKind === 'gradient'){
      if(selectedGradientIndex !== null && gradients[selectedGradientIndex]){
        hint.textContent = 'Using gradient: "' + gradients[selectedGradientIndex].name + '"';
      } else {
        hint.textContent = 'No gradient saved yet';
      }
    } else if(selectedColors.size > 0){
      hint.textContent = 'Using: ' + selectedColors.size + ' selected color' + (selectedColors.size>1?'s':'');
    } else {
      hint.textContent = 'Using: full palette';
    }
    updateGradientOrderedVisibility();
  }
  function populateGradientSourceDropdown(){
    const sel = document.getElementById('gradientSourceSelect');
    sel.innerHTML = '';
    if(gradients.length === 0){
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = 'No gradients saved yet';
      sel.appendChild(opt);
      selectedGradientIndex = null;
      updateSourceKindAvailability();
      updateSpraySourceHint();
      return;
    }
    gradients.forEach((g, idx)=>{
      const opt = document.createElement('option');
      opt.value = idx; opt.textContent = g.name;
      sel.appendChild(opt);
    });
    if(selectedGradientIndex === null || selectedGradientIndex >= gradients.length){
      selectedGradientIndex = 0;
    }
    sel.value = selectedGradientIndex;
    updateSourceKindAvailability();
    updateSpraySourceHint();
  }
  function updateSourceKindAvailability(){
    const sel = document.getElementById('sourceKindSelect');
    const gradOption = sel.querySelector('option[value="gradient"]');
    gradOption.disabled = (gradients.length === 0);
    if(gradients.length === 0 && sourceKind === 'gradient'){
      sourceKind = 'selected';
      sel.value = 'selected';
      document.getElementById('gradientSourceSelect').style.display = 'none';
    }
  }

  // ---------- Stamps ----------
  function renderColorizedMask(mask, color){
    // The stored mask is deliberately a white+alpha template (see buildStampMask) so it can be
    // tinted with any color at paint time — this renders that same tint for previews, so what
    // you see in the stamp list and hover preview actually resembles what painting will produce.
    const c = document.createElement('canvas');
    c.width = mask.width; c.height = mask.height;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(mask, 0, 0);
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = color;
    cctx.fillRect(0, 0, mask.width, mask.height);
    return c;
  }
  function buildStampMask(img){
    const maxDim = 128;
    let w = img.width || 128;
    let h = img.height || 128;
    if(w <= 0) w = 128;
    if(h <= 0) h = 128;
    if(Math.max(w,h) > maxDim){
      const scale = maxDim / Math.max(w,h);
      w = Math.max(1, Math.round(w*scale));
      h = Math.max(1, Math.round(h*scale));
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    cctx.imageSmoothingEnabled = !pixelPerfect;
    cctx.drawImage(img, 0, 0, w, h);
    const data = cctx.getImageData(0,0,w,h);
    const d = data.data;

    let hasAlpha = false;
    for(let i = 3; i < d.length; i += 4){
      if(d[i] < 250){
        hasAlpha = true;
        break;
      }
    }

    if(hasAlpha){
      // Layer/selection has transparent pixels.
      // What was drawn on the layer forms the stamp shape.
      for(let i = 0; i < d.length; i += 4){
        // Keep d[i+3] as alpha, set RGB to white so the stamp can be tinted with any palette color
        d[i] = 255; d[i+1] = 255; d[i+2] = 255;
      }
    } else {
      // Image/selection is fully opaque (e.g. flat photo).
      // Compute average brightness to infer if artwork is dark on light bg or light on dark bg
      let sumLum = 0;
      for(let i = 0; i < d.length; i += 4){
        sumLum += (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114);
      }
      const avgLum = sumLum / (d.length / 4);
      const isLightBg = avgLum > 128;

      for(let i = 0; i < d.length; i += 4){
        const gray = d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114;
        d[i+3] = isLightBg ? Math.round(255 - gray) : Math.round(gray);
        d[i] = 255; d[i+1] = 255; d[i+2] = 255;
      }
    }

    cctx.putImageData(data, 0, 0);

    // Crop transparent margins to ensure clean downscaling and alignment
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3];
        if (a > 5) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (found && (minX > 0 || maxX < w - 1 || minY > 0 || maxY < h - 1)) {
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
      cropCtx.drawImage(c, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      return cropCanvas;
    }

    return c;
  }
  function invertMaskCanvas(maskCanvas){
    if(!maskCanvas || !maskCanvas.width) return null;
    const c = document.createElement('canvas');
    c.width = maskCanvas.width; c.height = maskCanvas.height;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(maskCanvas, 0, 0);
    const data = cctx.getImageData(0,0,c.width,c.height);
    const d = data.data;
    for(let i=3;i<d.length;i+=4){ d[i] = 255 - d[i]; }
    cctx.putImageData(data,0,0);
    return c;
  }
  function getActiveStampMask(stamp){
    if(!stamp) return null;
    if(!stamp.inverted) return stamp.mask || null;
    if(!stamp.invertedMask && stamp.mask) stamp.invertedMask = invertMaskCanvas(stamp.mask);
    return stamp.invertedMask || stamp.mask || null;
  }
  const tintedStampCache = new Map();
  const MAX_TINTED_CACHE_SIZE = 256;

  function getRotatedRectBounds(cx, cy, w, h, angle, pivotX = 0.5, pivotY = 0.5) {
    if (!angle || Math.abs(angle) < 0.0008) {
      const destX = Math.round(cx - w * pivotX);
      const destY = Math.round(cy - h * pivotY);
      return { x: destX - 1, y: destY - 1, w: Math.ceil(w) + 2, h: Math.ceil(h) + 2 };
    }
    const x0 = -w * pivotX, x1 = w * (1 - pivotX);
    const y0 = -h * pivotY, y1 = h * (1 - pivotY);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const corners = [
      { x: x0 * cos - y0 * sin, y: x0 * sin + y0 * cos },
      { x: x1 * cos - y0 * sin, y: x1 * sin + y0 * cos },
      { x: x1 * cos - y1 * sin, y: x1 * sin + y1 * cos },
      { x: x0 * cos - y1 * sin, y: x0 * sin + y1 * cos }
    ];
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const minX = cx + Math.min(...xs);
    const maxX = cx + Math.max(...xs);
    const minY = cy + Math.min(...ys);
    const maxY = cy + Math.max(...ys);
    return {
      x: Math.floor(minX) - 2,
      y: Math.floor(minY) - 2,
      w: Math.ceil(maxX) - Math.floor(minX) + 4,
      h: Math.ceil(maxY) - Math.floor(minY) + 4
    };
  }

  function scale2xImageData(srcData, srcW, srcH) {
    const dstW = srcW * 2;
    const dstH = srcH * 2;
    const dst32 = new Uint32Array(dstW * dstH);
    const src32 = new Uint32Array(srcData.data.buffer);
    for (let y = 0; y < srcH; y++) {
      const yPrev = y > 0 ? y - 1 : y;
      const yNext = y < srcH - 1 ? y + 1 : y;
      const rowIdx = y * srcW;
      const prevRowIdx = yPrev * srcW;
      const nextRowIdx = yNext * srcW;
      const outRow0 = (y * 2) * dstW;
      const outRow1 = (y * 2 + 1) * dstW;
      for (let x = 0; x < srcW; x++) {
        const xPrev = x > 0 ? x - 1 : x;
        const xNext = x < srcW - 1 ? x + 1 : x;
        const p = src32[rowIdx + x];
        const a = src32[prevRowIdx + x];
        const c = src32[rowIdx + xPrev];
        const b = src32[rowIdx + xNext];
        const d = src32[nextRowIdx + x];

        const e0 = (c === a && c !== d && a !== b) ? a : p;
        const e1 = (a === b && a !== c && b !== d) ? b : p;
        const e2 = (d === c && d !== b && c !== a) ? c : p;
        const e3 = (b === d && b !== a && d !== c) ? d : p;

        const outCol = x * 2;
        dst32[outRow0 + outCol] = e0;
        dst32[outRow0 + outCol + 1] = e1;
        dst32[outRow1 + outCol] = e2;
        dst32[outRow1 + outCol + 1] = e3;
      }
    }
    return { data32: dst32, w: dstW, h: dstH };
  }

  const rotatedStampCache = new Map();
  const MAX_ROTATED_STAMP_CACHE = 512;
  const rotatedShapeCache = new Map();
  const MAX_ROTATED_SHAPE_CACHE = 512;

  function getRotatedStampCanvas(sourceCanvas, targetW, targetH, angle, pivotX = 0.5, pivotY = 0.5, color = null, stampObj = null) {
    if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return null;
    let normAngle = angle % (Math.PI * 2);
    if (normAngle > Math.PI) normAngle -= Math.PI * 2;
    if (normAngle < -Math.PI) normAngle += Math.PI * 2;

    const roundW = Math.max(1, Math.round(targetW));
    const roundH = Math.max(1, Math.round(targetH));
    if (Math.abs(normAngle) < 0.0008) {
      return {
        canvas: sourceCanvas,
        w: roundW,
        h: roundH,
        pivotOffsetX: Math.round(roundW * pivotX),
        pivotOffsetY: Math.round(roundH * pivotY)
      };
    }

    if (!sourceCanvas._stampId) {
      if (!window._nextStampId) window._nextStampId = 1;
      sourceCanvas._stampId = window._nextStampId++;
    }

    const algo = rotationAlgorithm || 'rotsprite';
    const isPP = !!pixelPerfect;
    const angleDegHalf = Math.round((normAngle * 180 / Math.PI) * 2) / 2;
    const cacheKey = `${sourceCanvas._stampId}_${roundW}_${roundH}_${angleDegHalf}_${color || ''}_${isPP ? 1 : 0}_${algo}_${Math.round(pivotX * 100)}_${Math.round(pivotY * 100)}`;

    if (rotatedStampCache.has(cacheKey)) {
      const cached = rotatedStampCache.get(cacheKey);
      rotatedStampCache.delete(cacheKey);
      rotatedStampCache.set(cacheKey, cached);
      return cached;
    }

    const cos = Math.cos(normAngle), sin = Math.sin(normAngle);
    const invCos = Math.cos(-normAngle), invSin = Math.sin(-normAngle);
    const x0 = -roundW * pivotX, x1 = roundW * (1 - pivotX);
    const y0 = -roundH * pivotY, y1 = roundH * (1 - pivotY);
    const corners = [
      { x: x0 * cos - y0 * sin, y: x0 * sin + y0 * cos },
      { x: x1 * cos - y0 * sin, y: x1 * sin + y0 * cos },
      { x: x1 * cos - y1 * sin, y: x1 * sin + y1 * cos },
      { x: x0 * cos - y1 * sin, y: x0 * sin + y1 * cos }
    ];
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));

    const outW = Math.max(1, Math.ceil(maxX) - Math.floor(minX) + 2);
    const outH = Math.max(1, Math.ceil(maxY) - Math.floor(minY) + 2);
    const outPivX = -Math.floor(minX) + 1;
    const outPivY = -Math.floor(minY) + 1;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });

    if (!isPP && algo === 'smooth') {
      outCtx.imageSmoothingEnabled = true;
      outCtx.save();
      outCtx.translate(outPivX, outPivY);
      outCtx.rotate(normAngle);
      outCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, -roundW * pivotX, -roundH * pivotY, roundW, roundH);
      outCtx.restore();
    } else if (algo === 'nearest') {
      outCtx.imageSmoothingEnabled = false;
      outCtx.save();
      outCtx.translate(outPivX, outPivY);
      outCtx.rotate(normAngle);
      outCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, Math.round(-roundW * pivotX), Math.round(-roundH * pivotY), roundW, roundH);
      outCtx.restore();
      if (isPP) {
        const imgData = outCtx.getImageData(0, 0, outW, outH);
        const d32 = new Uint32Array(imgData.data.buffer);
        for (let i = 0; i < d32.length; i++) {
          if (((d32[i] >>> 24) & 0xFF) >= 128) d32[i] |= 0xFF000000;
          else d32[i] = 0;
        }
        outCtx.putImageData(imgData, 0, 0);
      }
    } else {
      // RotSprite / Area Sampling (Crisp, zero-distortion pixel-art rotation)
      const src1xCanvas = document.createElement('canvas');
      src1xCanvas.width = roundW;
      src1xCanvas.height = roundH;
      const s1xCtx = src1xCanvas.getContext('2d', { willReadFrequently: true });
      s1xCtx.imageSmoothingEnabled = false;
      s1xCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, roundW, roundH);
      const src1xData = s1xCtx.getImageData(0, 0, roundW, roundH);

      const s2x = scale2xImageData(src1xData, roundW, roundH);
      const s4x = scale2xImageData({ data: { buffer: s2x.data32.buffer } }, s2x.w, s2x.h);
      const s4Data32 = s4x.data32;
      const s4W = s4x.w;
      const s4H = s4x.h;

      const outImgData = outCtx.createImageData(outW, outH);
      const out32 = new Uint32Array(outImgData.data.buffer);
      const cRgb = color ? hexToRgb(color) : null;
      const srcPivotX_4 = roundW * pivotX * 4;
      const srcPivotY_4 = roundH * pivotY * 4;
      const thresholdSamples = (algo === 'areasample') ? 3 : 4; // >= 20% or >= 25% coverage

      for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
          let hits = 0;
          let dominantColor = 0;
          let dominantAlpha = 0;

          for (let sy_sub = 0; sy_sub < 4; sy_sub++) {
            for (let sx_sub = 0; sx_sub < 4; sx_sub++) {
              const subX = ox + (sx_sub + 0.5) * 0.25 - outPivX;
              const subY = oy + (sy_sub + 0.5) * 0.25 - outPivY;

              const srcX = (subX * invCos - subY * invSin) * 4 + srcPivotX_4;
              const srcY = (subX * invSin + subY * invCos) * 4 + srcPivotY_4;

              const isx = Math.floor(srcX);
              const isy = Math.floor(srcY);

              if (isx >= 0 && isx < s4W && isy >= 0 && isy < s4H) {
                const pix = s4Data32[isy * s4W + isx];
                const a = (pix >>> 24) & 0xFF;
                if (a > 20) {
                  hits++;
                  if (a > dominantAlpha) {
                    dominantAlpha = a;
                    dominantColor = pix;
                  }
                }
              }
            }
          }

          if (hits >= thresholdSamples) {
            let finalR, finalG, finalB, finalA;
            if (cRgb) {
              finalR = cRgb.r; finalG = cRgb.g; finalB = cRgb.b;
            } else if (dominantColor) {
              finalR = dominantColor & 0xFF;
              finalG = (dominantColor >>> 8) & 0xFF;
              finalB = (dominantColor >>> 16) & 0xFF;
            } else {
              finalR = 255; finalG = 255; finalB = 255;
            }

            if (isPP) {
              finalA = 255;
            } else {
              finalA = Math.min(255, Math.round((hits / 16) * (dominantAlpha || 255)));
            }

            out32[oy * outW + ox] = (finalA << 24) | (finalB << 16) | (finalG << 8) | finalR;
          }
        }
      }
      outCtx.putImageData(outImgData, 0, 0);
    }

    const result = {
      canvas: outCanvas,
      w: outW,
      h: outH,
      pivotOffsetX: outPivX,
      pivotOffsetY: outPivY
    };

    rotatedStampCache.set(cacheKey, result);
    if (rotatedStampCache.size > MAX_ROTATED_STAMP_CACHE) {
      const oldest = rotatedStampCache.keys().next().value;
      rotatedStampCache.delete(oldest);
    }
    return result;
  }

  function getRotatedShapeCanvas(shape, w, h, angle, color = '#ffffff') {
    const roundW = Math.max(1, Math.round(w));
    const roundH = Math.max(1, Math.round(h));
    let normAngle = angle % (Math.PI * 2);
    if (normAngle > Math.PI) normAngle -= Math.PI * 2;
    if (normAngle < -Math.PI) normAngle += Math.PI * 2;

    const angleDegHalf = Math.round((normAngle * 180 / Math.PI) * 2) / 2;
    const isPP = !!pixelPerfect;
    const cacheKey = `${shape}_${roundW}_${roundH}_${angleDegHalf}_${color}_${isPP ? 1 : 0}`;

    if (rotatedShapeCache.has(cacheKey)) {
      const cached = rotatedShapeCache.get(cacheKey);
      rotatedShapeCache.delete(cacheKey);
      rotatedShapeCache.set(cacheKey, cached);
      return cached;
    }

    const SS = 4;
    const hiW = roundW * SS;
    const hiH = roundH * SS;

    const cos = Math.cos(normAngle), sin = Math.sin(normAngle);
    const invCos = Math.cos(-normAngle), invSin = Math.sin(-normAngle);
    const x0 = -roundW * 0.5, x1 = roundW * 0.5;
    const y0 = -roundH * 0.5, y1 = roundH * 0.5;
    const corners = [
      { x: x0 * cos - y0 * sin, y: x0 * sin + y0 * cos },
      { x: x1 * cos - y0 * sin, y: x1 * sin + y0 * cos },
      { x: x1 * cos - y1 * sin, y: x1 * sin + y1 * cos },
      { x: x0 * cos - y1 * sin, y: x0 * sin + y1 * cos }
    ];
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));

    const outW = Math.max(1, Math.ceil(maxX) - Math.floor(minX) + 2);
    const outH = Math.max(1, Math.ceil(maxY) - Math.floor(minY) + 2);
    const outPivX = -Math.floor(minX) + 1;
    const outPivY = -Math.floor(minY) + 1;

    const hiCanvas = document.createElement('canvas');
    hiCanvas.width = hiW;
    hiCanvas.height = hiH;
    const hiCtx = hiCanvas.getContext('2d', { willReadFrequently: true });
    hiCtx.fillStyle = '#ffffff';
    drawVectorPrimitivePath(hiCtx, shape, hiW / 2, hiH / 2, hiW, hiH);
    const hiData = hiCtx.getImageData(0, 0, hiW, hiH);
    const hi32 = new Uint32Array(hiData.data.buffer);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
    const outImgData = outCtx.createImageData(outW, outH);
    const out32 = new Uint32Array(outImgData.data.buffer);
    const cRgb = hexToRgb(color) || { r: 255, g: 255, b: 255 };

    const srcPivotX_4 = hiW * 0.5;
    const srcPivotY_4 = hiH * 0.5;

    for (let oy = 0; oy < outH; oy++) {
      for (let ox = 0; ox < outW; ox++) {
        let hits = 0;
        for (let sy_sub = 0; sy_sub < 4; sy_sub++) {
          for (let sx_sub = 0; sx_sub < 4; sx_sub++) {
            const subX = ox + (sx_sub + 0.5) * 0.25 - outPivX;
            const subY = oy + (sy_sub + 0.5) * 0.25 - outPivY;

            const srcX = (subX * invCos - subY * invSin) * 4 + srcPivotX_4;
            const srcY = (subX * invSin + subY * invCos) * 4 + srcPivotY_4;

            const isx = Math.floor(srcX);
            const isy = Math.floor(srcY);

            if (isx >= 0 && isx < hiW && isy >= 0 && isy < hiH) {
              if (((hi32[isy * hiW + isx] >>> 24) & 0xFF) >= 128) {
                hits++;
              }
            }
          }
        }

        if (hits >= 4) { // >= 25% area coverage preserves edges/corners
          const finalA = isPP ? 255 : Math.min(255, Math.round((hits / 16) * 255));
          out32[oy * outW + ox] = (finalA << 24) | (cRgb.b << 16) | (cRgb.g << 8) | cRgb.r;
        }
      }
    }

    outCtx.putImageData(outImgData, 0, 0);

    const result = {
      canvas: outCanvas,
      w: outW,
      h: outH,
      pivotOffsetX: outPivX,
      pivotOffsetY: outPivY
    };

    rotatedShapeCache.set(cacheKey, result);
    if (rotatedShapeCache.size > MAX_ROTATED_SHAPE_CACHE) {
      const oldest = rotatedShapeCache.keys().next().value;
      rotatedShapeCache.delete(oldest);
    }
    return result;
  }

  function buildTintedStamp(maskCanvas, targetW, targetH, color){
    if(!maskCanvas || !maskCanvas.width || !maskCanvas.height) return null;
    let finalW, finalH, finalColor;
    if (typeof targetH === 'string' || targetH === undefined) {
      // 3-argument signature: buildTintedStamp(maskCanvas, size, color)
      finalColor = targetH || '#ffffff';
      const size = targetW;
      const aspect = maskCanvas.width / maskCanvas.height;
      if(aspect >= 1){ finalW = size; finalH = size/aspect; } else { finalH = size; finalW = size*aspect; }
    } else {
      // 4-argument signature: buildTintedStamp(maskCanvas, targetW, targetH, color)
      finalW = targetW;
      finalH = targetH;
      finalColor = color;
    }

    const roundedW = Math.max(1, Math.round(finalW));
    const roundedH = Math.max(1, Math.round(finalH));
    if (!maskCanvas._stampId) {
      if (!window._nextStampId) window._nextStampId = 1;
      maskCanvas._stampId = window._nextStampId++;
    }
    const isPP = !!pixelPerfect;
    const normalizedColor = String(finalColor).toLowerCase();
    const key = `${maskCanvas._stampId}_${roundedW}_${roundedH}_${normalizedColor}_${isPP ? 1 : 0}`;

    if (tintedStampCache.has(key)) {
      const cached = tintedStampCache.get(key);
      tintedStampCache.delete(key);
      tintedStampCache.set(key, cached);
      return cached;
    }

    const w = Math.max(1, Math.min(STAMP_SCRATCH_MAX, roundedW));
    const h = Math.max(1, Math.min(STAMP_SCRATCH_MAX, roundedH));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = !isPP;
    ctx.drawImage(maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = finalColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    const cRgb = hexToRgb(finalColor);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        if (cRgb) {
          d[i]     = cRgb.r;
          d[i + 1] = cRgb.g;
          d[i + 2] = cRgb.b;
        }
        if (isPP) {
          d[i + 3] = d[i + 3] >= 128 ? 255 : 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const cachedEntry = {
      canvas: canvas,
      w: w,
      h: h,
      srcW: w,
      srcH: h
    };

    tintedStampCache.set(key, cachedEntry);
    if (tintedStampCache.size > MAX_TINTED_CACHE_SIZE) {
      const oldestKey = tintedStampCache.keys().next().value;
      tintedStampCache.delete(oldestKey);
    }

    return cachedEntry;
  }

  function prewarmActiveSizeCache() {
    if (stamps.length === 0) return;
    const sizes = new Set();
    if (typeof brushSize === 'number') sizes.add(Math.round(brushSize));
    if (typeof dabSize === 'number') sizes.add(Math.round(dabSize));
    if (typeof dabWidth === 'number') sizes.add(Math.round(dabWidth));
    if (typeof dabHeight === 'number') sizes.add(Math.round(dabHeight));

    const colors = [fgColor, '#000000', '#ffffff'];
    const activeStamps = [];
    if (typeof selectedStampIndex === 'number' && selectedStampIndex !== null && stamps[selectedStampIndex]) {
      activeStamps.push(stamps[selectedStampIndex]);
    } else if (stamps.length > 0) {
      activeStamps.push(stamps[0]);
    }
    activeStamps.forEach(stamp => {
      const m = getActiveStampMask(stamp);
      if (m) {
        colors.forEach(col => {
          sizes.forEach(sz => {
            buildTintedStamp(m, sz, col);
          });
        });
      }
    });
  }

  function drawBuiltStamp(ctx, sourceCanvas, w, h, cx, cy, angle, pivotX = 0.5, pivotY = 0.5, srcW = undefined, srcH = undefined, color = null, stampObj = null){
    const normAngle = angle || 0;
    if (Math.abs(normAngle) < 0.0008) {
      ctx.save();
      ctx.imageSmoothingEnabled = !pixelPerfect;
      const finalCx = pixelPerfect ? Math.round(cx) : cx;
      const finalCy = pixelPerfect ? Math.round(cy) : cy;
      const destX = pixelPerfect ? Math.round(-w * pivotX) : (-w * pivotX);
      const destY = pixelPerfect ? Math.round(-h * pivotY) : (-h * pivotY);
      const sw = srcW || sourceCanvas.width;
      const sh = srcH || sourceCanvas.height;
      ctx.drawImage(sourceCanvas, 0, 0, sw, sh, finalCx + destX, finalCy + destY, w, h);
      ctx.restore();
      return;
    }

    if (pixelPerfect || rotationAlgorithm === 'rotsprite' || rotationAlgorithm === 'areasample') {
      const rot = getRotatedStampCanvas(sourceCanvas, w, h, normAngle, pivotX, pivotY, color, stampObj);
      if (rot) {
        const finalCx = pixelPerfect ? Math.round(cx) : cx;
        const finalCy = pixelPerfect ? Math.round(cy) : cy;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(rot.canvas, 0, 0, rot.w, rot.h, finalCx - rot.pivotOffsetX, finalCy - rot.pivotOffsetY, rot.w, rot.h);
        ctx.restore();
        return;
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = !pixelPerfect;
    const finalCx = pixelPerfect ? Math.round(cx) : cx;
    const finalCy = pixelPerfect ? Math.round(cy) : cy;
    ctx.translate(finalCx, finalCy);
    ctx.rotate(normAngle);
    const destX = pixelPerfect ? Math.round(-w * pivotX) : (-w * pivotX);
    const destY = pixelPerfect ? Math.round(-h * pivotY) : (-h * pivotY);
    const sw = srcW || sourceCanvas.width;
    const sh = srcH || sourceCanvas.height;
    ctx.drawImage(sourceCanvas, 0, 0, sw, sh, destX, destY, w, h);
    ctx.restore();
  }

  function drawStampDab(ctx, maskCanvas, cx, cy, targetW, targetH, color, angle, pivotX = 0.5, pivotY = 0.5){
    if(!maskCanvas || !maskCanvas.width || !maskCanvas.height) return;
    let finalW, finalH, finalColor, finalAngle, finalPivotX, finalPivotY;
    if (typeof color === 'number' || color === undefined) {
      // 8-argument style: drawStampDab(ctx, maskCanvas, cx, cy, size, color, angle, pivotX, pivotY)
      const size = targetW;
      finalColor = targetH; // 6th argument
      finalAngle = color;   // 7th argument
      finalPivotX = angle;  // 8th argument
      finalPivotY = pivotX; // 9th argument
      
      const aspect = maskCanvas.width / maskCanvas.height;
      if(aspect >= 1){ finalW = size; finalH = size/aspect; } else { finalH = size; finalW = size*aspect; }
    } else {
      // 10-argument style: drawStampDab(ctx, maskCanvas, cx, cy, targetW, targetH, color, angle, pivotX, pivotY)
      finalW = targetW;
      finalH = targetH;
      finalColor = color;
      finalAngle = angle;
      finalPivotX = pivotX;
      finalPivotY = pivotY;
    }
    const built = buildTintedStamp(maskCanvas, finalW, finalH, finalColor);
    if(built){
      drawBuiltStamp(ctx, built.canvas, built.w, built.h, cx, cy, finalAngle, finalPivotX, finalPivotY, built.srcW, built.srcH, finalColor);
    }
  }

  function containFit(boxW, boxH, srcW, srcH){
    const scale = Math.min(boxW/srcW, boxH/srcH);
    const w = Math.max(1, Math.round(srcW*scale));
    const h = Math.max(1, Math.round(srcH*scale));
    return { w, h, x: Math.round((boxW-w)/2), y: Math.round((boxH-h)/2) };
  }
  const stampHoverPreview = document.getElementById('stampHoverPreview');
  const stampHoverCanvas = document.getElementById('stampHoverCanvas');
  const shpctx = stampHoverCanvas.getContext('2d', { willReadFrequently: true });
  function showStampHoverPreview(mask, ev){
    const maxDim = 160;
    const fit = containFit(maxDim, maxDim, mask.width, mask.height);
    stampHoverCanvas.width = fit.w; stampHoverCanvas.height = fit.h;
    stampHoverCanvas.style.width = fit.w + 'px'; stampHoverCanvas.style.height = fit.h + 'px';
    shpctx.clearRect(0,0,fit.w,fit.h);
    shpctx.drawImage(renderColorizedMask(mask, fgColor), 0, 0, fit.w, fit.h);
    stampHoverPreview.style.display = 'block';
    positionStampHoverPreview(ev);
  }
  function positionStampHoverPreview(ev){
    const pad = 16;
    let left = ev.clientX + pad;
    let top = ev.clientY + pad;
    if(left > window.innerWidth - 200) left = ev.clientX - 200 - pad;
    if(top > window.innerHeight - 200) top = ev.clientY - 200 - pad;
    stampHoverPreview.style.left = left + 'px';
    stampHoverPreview.style.top = top + 'px';
  }
  function hideStampHoverPreview(){
    stampHoverPreview.style.display = 'none';
  }

  function refreshStampList(){
    const select = document.getElementById('stampSelect');
    const delBtn = document.getElementById('deleteStampBtn');
    const invertCheck = document.getElementById('stampInvertCheckbox');
    if(!select) return;
    select.innerHTML = '';

    if(!stamps || stamps.length === 0){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No stamps uploaded yet';
      select.appendChild(opt);
      if(delBtn) delBtn.style.display = 'none';
      if(invertCheck) invertCheck.checked = false;
      selectedStampIndex = null;
    } else {
      if(selectedStampIndex === null || selectedStampIndex < 0 || selectedStampIndex >= stamps.length){
        selectedStampIndex = 0;
      }
      stamps.forEach((s, idx)=>{
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = s.name + (s.isSvg ? ' [SVG]' : '');
        if(idx === selectedStampIndex) opt.selected = true;
        select.appendChild(opt);
      });
      select.value = selectedStampIndex;

      const currentStamp = stamps[selectedStampIndex];
      if(delBtn){
        delBtn.style.display = currentStamp ? 'inline-block' : 'none';
      }
      if(invertCheck && currentStamp){
        invertCheck.checked = !!currentStamp.inverted;
      }

      const s1 = document.getElementById('stampSourceSelect'); if(s1) s1.value = selectedStampIndex;
      const s2 = document.getElementById('brushStampSourceSelect'); if(s2) s2.value = selectedStampIndex;
      const vss = document.getElementById('vineStampSourceSelect');
      if (vss) {
        if (vineDecorationType && vineDecorationType.startsWith('stamp-') && selectedStampIndex !== null) {
          vss.value = 'stamp-' + selectedStampIndex;
          vineDecorationType = vss.value;
        }
      }

      const pivotContainer = document.getElementById('stampLibPivotContainer');
      if(pivotContainer){
        pivotContainer.style.display = currentStamp ? 'block' : 'none';
        if(currentStamp) drawStampPivotCanvas();
      }
      const svgContainer = document.getElementById('svgStampSettingsContainer');
      if(svgContainer){
        svgContainer.style.display = (currentStamp && currentStamp.isSvg) ? 'block' : 'none';
        if(currentStamp && currentStamp.isSvg){
          const slider = document.getElementById('svgLineWidthSlider');
          const label = document.getElementById('svgLineWidthVal');
          const noFill = document.getElementById('svgNoFillCheckbox');
          if(slider) slider.value = currentStamp.svgLineWidth || 0;
          if(label) label.textContent = (currentStamp.svgLineWidth && currentStamp.svgLineWidth > 0) ? currentStamp.svgLineWidth : 'Default';
          if(noFill) noFill.checked = !!currentStamp.svgNoFill;
        }
      }
    }
  }

  document.getElementById('stampSelect')?.addEventListener('change', e=>{
    const idx = e.target.value === '' ? null : +e.target.value;
    selectedStampIndex = idx;
    const s1 = document.getElementById('stampSourceSelect'); if(s1) s1.value = idx ?? '';
    const s2 = document.getElementById('brushStampSourceSelect'); if(s2) s2.value = idx ?? '';
    const vss = document.getElementById('vineStampSourceSelect');
    if (vss) {
      if (vineDecorationType && vineDecorationType.startsWith('stamp-') && idx !== null) {
        vss.value = 'stamp-' + idx;
        vineDecorationType = vss.value;
      }
    }
    refreshStampList();
    drawStampPivotCanvas();
  });

  document.getElementById('deleteStampBtn')?.addEventListener('click', ()=>{
    if(selectedStampIndex !== null && stamps[selectedStampIndex]){
      stamps.splice(selectedStampIndex, 1);
      if(selectedStampIndex >= stamps.length){
        selectedStampIndex = stamps.length ? stamps.length - 1 : null;
      }
      populateStampDropdown();
      refreshStampList();
      drawStampPivotCanvas();
    }
  });

  document.getElementById('stampInvertCheckbox')?.addEventListener('change', e=>{
    if(selectedStampIndex !== null && stamps[selectedStampIndex]){
      stamps[selectedStampIndex].inverted = e.target.checked;
      drawStampPivotCanvas();
    }
  });
  function populateStampDropdown(){
    [document.getElementById('stampSourceSelect'), document.getElementById('brushStampSourceSelect')].filter(Boolean).forEach(sel=>{
      sel.innerHTML = '';
      if(stamps.length === 0){
        const opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'No stamps uploaded yet';
        sel.appendChild(opt);
      } else {
        stamps.forEach((s, idx)=>{
          const opt = document.createElement('option');
          opt.value = idx; opt.textContent = s.name;
          sel.appendChild(opt);
        });
      }
    });
    const vineSel = document.getElementById('vineStampSourceSelect');
    if(vineSel){
      const prevVal = vineSel.value || vineDecorationType || 'shape-leaf';
      vineSel.innerHTML = '';
      
      // Basic Leaf Shape
      const leafOpt = document.createElement('option');
      leafOpt.value = 'shape-leaf'; leafOpt.textContent = 'Leaf';
      vineSel.appendChild(leafOpt);

      // Basic Shapes too
      const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'ring', 'line'];
      shapes.forEach(sh => {
        const opt = document.createElement('option');
        opt.value = 'shape-' + sh;
        opt.textContent = sh.charAt(0).toUpperCase() + sh.slice(1);
        vineSel.appendChild(opt);
      });

      // Stamps
      stamps.forEach((s, idx)=>{
        const opt = document.createElement('option');
        opt.value = 'stamp-' + idx; opt.textContent = 'Stamp: ' + s.name;
        vineSel.appendChild(opt);
      });

      // Restore previous value if possible, else default to shape-leaf
      if ([...vineSel.options].some(o => o.value === prevVal)) {
        vineSel.value = prevVal;
      } else {
        vineSel.value = 'shape-leaf';
      }
      vineDecorationType = vineSel.value;
    }
    if(stamps.length === 0){
      selectedStampIndex = null;
    } else {
      if(selectedStampIndex === null || selectedStampIndex >= stamps.length) selectedStampIndex = 0;
      const s1 = document.getElementById('stampSourceSelect');
      if(s1) s1.value = selectedStampIndex;
      const s2 = document.getElementById('brushStampSourceSelect');
      if(s2) s2.value = selectedStampIndex;
    }
    updateStampShapeAvailability();
    drawStampPivotCanvas();
  }
  function updateStampShapeAvailability(){
    const btn = document.getElementById('stampShapeBtn');
    if(btn) btn.disabled = (stamps.length === 0);
    const brushBtn = document.getElementById('brushStampShapeBtn');
    if(brushBtn) brushBtn.disabled = (stamps.length === 0);
    if(stamps.length === 0 && dabShape === 'stamp'){
      dabShape = 'circle';
      document.querySelectorAll('.shape-btn[data-shape]').forEach(b=>b.classList.toggle('active', b.dataset.shape==='circle'));
      const s = document.getElementById('stampSourceSelect');
      if(s) s.style.display = 'none';
    }
    if(stamps.length === 0 && brushShape === 'stamp'){
      brushShape = 'square';
      document.querySelectorAll('.shape-btn[data-brush-shape]').forEach(b=>b.classList.toggle('active', b.dataset.brushShape==='square'));
      const bs = document.getElementById('brushStampSourceSelect');
      if(bs) bs.style.display = 'none';
      updateBrushPixelPerfectAvailability();
    }
  }

  // ---------- SVG Vector Shape Helpers ----------
  function svgToImage(svgMarkup){
    return new Promise((resolve, reject)=>{
      let str = svgMarkup.trim();
      if(!str.toLowerCase().startsWith('<svg')){
        str = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100"><path d="${str}" fill="#ffffff"/></svg>`;
      } else {
        if(!str.includes('xmlns=')){
          str = str.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if(!str.includes('width=') && !str.includes('width =')){
          str = str.replace('<svg', '<svg width="128"');
        }
        if(!str.includes('height=') && !str.includes('height =')){
          str = str.replace('<svg', '<svg height="128"');
        }
      }
      const img = new Image();
      const blob = new Blob([str], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      img.onload = ()=>{
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err)=>{
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  async function addSvgShape(svgMarkup, name){
    try {
      const img = await svgToImage(svgMarkup);
      const mask = buildStampMask(img);
      const finalName = name || 'SVG Shape ' + (stamps.length + 1);
      stamps.push({ name: finalName, mask, svgString: svgMarkup, isSvg: true });
      selectedStampIndex = stamps.length - 1;
      dabShape = 'stamp';
      brushShape = 'stamp';
      document.querySelectorAll('.shape-btn[data-shape]').forEach(b=>b.classList.toggle('active', b.dataset.shape==='stamp'));
      document.querySelectorAll('.shape-btn[data-brush-shape]').forEach(b=>b.classList.toggle('active', b.dataset.brushShape==='stamp'));
      const s = document.getElementById('stampSourceSelect');
      if(s) s.style.display = 'block';
      const bs = document.getElementById('brushStampSourceSelect');
      if(bs) bs.style.display = 'block';
      updateStampShapeAvailability();
      refreshStampList();
      populateStampDropdown();
      if(typeof showToast === 'function') showToast('SVG Vector Shape "' + finalName + '" created!');
    } catch(err){
      console.warn('Failed to parse or render SVG:', err);
      alert('Could not parse SVG markup or path data. Please check the syntax and try again.');
    }
  }

  async function regenerateSvgStampMask(stamp){
    if(!stamp.isSvg || !stamp.svgString) return;
    let markup = stamp.svgString.trim();
    if(!markup.toLowerCase().startsWith('<svg')){
      markup = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100"><path d="${markup}" fill="#ffffff"/></svg>`;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(markup, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if(!svgEl) return;

      const strokeWidth = stamp.svgLineWidth !== undefined ? stamp.svgLineWidth : 0;
      const noFill = !!stamp.svgNoFill;

      const shapes = doc.querySelectorAll('path, polygon, polyline, circle, rect, ellipse, line');
      shapes.forEach(shape => {
        if(noFill){
          shape.setAttribute('fill', 'none');
        } else {
          shape.setAttribute('fill', '#ffffff');
        }

        if(strokeWidth > 0){
          shape.setAttribute('stroke', '#ffffff');
          shape.setAttribute('stroke-width', strokeWidth);
          shape.setAttribute('stroke-linejoin', 'round');
          shape.setAttribute('stroke-linecap', 'round');
        } else {
          if(noFill){
            shape.setAttribute('stroke', '#ffffff');
            shape.setAttribute('stroke-width', '2');
            shape.setAttribute('stroke-linejoin', 'round');
            shape.setAttribute('stroke-linecap', 'round');
          } else {
            shape.removeAttribute('stroke');
            shape.removeAttribute('stroke-width');
          }
        }
      });

      const serializer = new XMLSerializer();
      const modifiedStr = serializer.serializeToString(doc);
      const img = await svgToImage(modifiedStr);
      stamp.mask = buildStampMask(img);
      stamp.invertedMask = null;
    } catch(err){
      console.warn('Error regenerating SVG stamp:', err);
    }
  }

  const DEFAULT_SVG_PRESETS = [
    { name: 'Leaf Vector', d: 'M 50 10 C 80 30, 90 70, 50 90 C 10 70, 20 30, 50 10 Z' },
    { name: 'Star Vector', d: 'M 50 5 L 63 35 L 95 38 L 71 60 L 78 92 L 50 75 L 22 92 L 29 60 L 5 38 L 37 35 Z' },
    { name: 'Shield Vector', d: 'M 50 10 L 85 20 L 85 55 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 55 L 15 20 Z' },
    { name: 'Cloud Vector', d: 'M 25 70 A 20 20 0 0 1 20 30 A 25 25 0 0 1 65 20 A 20 20 0 0 1 85 45 A 18 18 0 0 1 75 70 Z' },
    { name: 'Flame Vector', d: 'M 50 10 C 65 30, 85 45, 85 68 C 85 86, 70 95, 50 95 C 30 95, 15 86, 15 68 C 15 50, 35 30, 50 10 Z' },
    { name: 'Arrow Vector', d: 'M 50 10 L 85 45 L 65 45 L 65 90 L 35 90 L 35 45 L 15 45 Z' },
    { name: 'Crescent Moon', d: 'M 60 10 A 38 38 0 1 0 90 70 A 42 42 0 1 1 60 10 Z' },
    { name: 'Heart Vector', d: 'M 50 25 C 50 10, 20 10, 20 37.5 C 20 62.5, 50 85, 50 85 C 50 85, 80 62.5, 80 37.5 C 80 10, 50 10, 50 25 Z' }
  ];

  async function initDefaultSvgStamps(){
    if(stamps.length > 0) return;
    for(const item of DEFAULT_SVG_PRESETS){
      try {
        const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${item.d}" fill="#ffffff"/></svg>`;
        const img = await svgToImage(markup);
        const mask = buildStampMask(img);
        stamps.push({ name: item.name, mask, svgString: markup, isSvg: true });
      } catch(e) {
        console.warn('Error loading default SVG preset:', item.name, e);
      }
    }
    if(stamps.length > 0 && selectedStampIndex === null){
      selectedStampIndex = 0;
    }

    prewarmActiveSizeCache();

    updateStampShapeAvailability();
    refreshStampList();
    populateStampDropdown();
  }

  function openSvgPopup(){
    const popup = document.getElementById('svgPopup');
    if(!popup) return;
    document.getElementById('svgNameInput').value = 'SVG Shape ' + (stamps.length + 1);
    document.getElementById('svgCodeInput').value = '';
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closeSvgPopup(){
    const popup = document.getElementById('svgPopup');
    if(popup) popup.style.display = 'none';
  }

  const addSvgBtn = document.getElementById('addSvgBtn');
  if(addSvgBtn) addSvgBtn.addEventListener('click', openSvgPopup);
  const svgAddCancelBtn = document.getElementById('svgAddCancelBtn');
  if(svgAddCancelBtn) svgAddCancelBtn.addEventListener('click', closeSvgPopup);
  const svgAddDoneBtn = document.getElementById('svgAddDoneBtn');
  if(svgAddDoneBtn){
    svgAddDoneBtn.addEventListener('click', async ()=>{
      const name = document.getElementById('svgNameInput').value.trim();
      const code = document.getElementById('svgCodeInput').value.trim();
      if(!code){
        alert('Please paste SVG markup or path d=... string.');
        return;
      }
      await addSvgShape(code, name);
      closeSvgPopup();
    });
  }

  document.getElementById('stampUpload').addEventListener('change', e=>{
    const files = Array.from(e.target.files);
    files.forEach(file=>{
      if(file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml'){
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const text = evt.target.result;
            const img = await svgToImage(text);
            const mask = buildStampMask(img);
            stamps.push({ name: file.name.replace(/\.[^.]+$/,''), mask, svgString: text, isSvg: true });
            selectedStampIndex = stamps.length - 1;
            updateStampShapeAvailability();
            refreshStampList();
            populateStampDropdown();
            if(typeof showToast === 'function') showToast('SVG Shape "' + file.name + '" added!');
          } catch(err){
            console.warn('SVG file parse warning, loading as image:', err);
            const img = new Image();
            img.onload = ()=>{
              const mask = buildStampMask(img);
              stamps.push({name: file.name.replace(/\.[^.]+$/,''), mask});
              updateStampShapeAvailability();
              refreshStampList();
              populateStampDropdown();
            };
            img.src = URL.createObjectURL(file);
          }
        };
        reader.readAsText(file);
      } else {
        const img = new Image();
        img.onload = ()=>{
          const mask = buildStampMask(img);
          stamps.push({name: file.name.replace(/\.[^.]+$/,''), mask});
          updateStampShapeAvailability();
          refreshStampList();
          populateStampDropdown();
        };
        img.src = URL.createObjectURL(file);
      }
    });
    e.target.value = '';
  });
  document.getElementById('stampSourceSelect').addEventListener('change', e=>{
    selectedStampIndex = e.target.value === '' ? null : +e.target.value;
    const bss = document.getElementById('brushStampSourceSelect');
    if(bss) bss.value = selectedStampIndex ?? '';
    const vss = document.getElementById('vineStampSourceSelect');
    if (vss) {
      if (vineDecorationType && vineDecorationType.startsWith('stamp-') && selectedStampIndex !== null) {
        vss.value = 'stamp-' + selectedStampIndex;
        vineDecorationType = vss.value;
      }
    }
    refreshStampList();
    drawStampPivotCanvas();
  });
  const bssSelect = document.getElementById('brushStampSourceSelect');
  if(bssSelect){
    bssSelect.addEventListener('change', e=>{
      selectedStampIndex = e.target.value === '' ? null : +e.target.value;
      const ss = document.getElementById('stampSourceSelect');
      if(ss) ss.value = selectedStampIndex ?? '';
      const vss = document.getElementById('vineStampSourceSelect');
      if (vss) {
        if (vineDecorationType && vineDecorationType.startsWith('stamp-') && selectedStampIndex !== null) {
          vss.value = 'stamp-' + selectedStampIndex;
          vineDecorationType = vss.value;
        }
      }
      refreshStampList();
      drawStampPivotCanvas();
    });
  }

  const svgLineWidthSliderEl = document.getElementById('svgLineWidthSlider');
  if(svgLineWidthSliderEl){
    svgLineWidthSliderEl.addEventListener('input', e=>{
      const val = parseFloat(e.target.value);
      const valText = val > 0 ? val : 'Default';
      const label = document.getElementById('svgLineWidthVal');
      if(label) label.textContent = valText;
    });
    svgLineWidthSliderEl.addEventListener('change', async e=>{
      if(selectedStampIndex !== null && stamps[selectedStampIndex]){
        const stamp = stamps[selectedStampIndex];
        if(stamp.isSvg){
          stamp.svgLineWidth = parseFloat(e.target.value);
          tintedStampCache.clear();
          await regenerateSvgStampMask(stamp);
          refreshStampList();
          drawStampPivotCanvas();
        }
      }
    });
  }

  const svgNoFillCheckboxEl = document.getElementById('svgNoFillCheckbox');
  if(svgNoFillCheckboxEl){
    svgNoFillCheckboxEl.addEventListener('change', async e=>{
      if(selectedStampIndex !== null && stamps[selectedStampIndex]){
        const stamp = stamps[selectedStampIndex];
        if(stamp.isSvg){
          stamp.svgNoFill = e.target.checked;
          if(stamp.svgNoFill && (!stamp.svgLineWidth || stamp.svgLineWidth <= 0)){
            stamp.svgLineWidth = 2;
            const slider = document.getElementById('svgLineWidthSlider');
            if(slider) slider.value = 2;
            const label = document.getElementById('svgLineWidthVal');
            if(label) label.textContent = '2';
          }
          tintedStampCache.clear();
          await regenerateSvgStampMask(stamp);
          refreshStampList();
          drawStampPivotCanvas();
        }
      }
    });
  }
  function canvasCoords(e){
    const rect = displayCanvas.getBoundingClientRect();
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const scaleX = effW / rect.width;
    const scaleY = effH / rect.height;
    const cx = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX);
    const cy = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY);
    let rawX = (cx - rect.left) * scaleX;
    let rawY = (cy - rect.top) * scaleY;
    
    let x, y;
    if (seamlessModeEnabled) {
      // In 3x3 mode, coordinates are continuous relative to the center tile [W..2W, H..2H]
      x = rawX - W;
      y = rawY - H;
    } else {
      x = rawX;
      y = rawY;
    }

    if(snapToGridEnabled && (tool === 'spray' || tool === 'select') && grids.length > 0){
      const g = grids.find(g => g.visible) || grids[0];
      if(g && g.spacing >= 1){
        const offX = ((g.offsetX % g.spacing) + g.spacing) % g.spacing;
        const offY = ((g.offsetY % g.spacing) + g.spacing) % g.spacing;
        x = Math.round((x - offX) / g.spacing) * g.spacing + offX;
        y = Math.round((y - offY) / g.spacing) * g.spacing + offY;
      }
    }
    if (isPathTool() && (pathStyle === "90" || pathStyle === "45" || brushPixelPerfect)) {
      x = Math.round(x);
      y = Math.round(y);
    }
    return { x, y, rawX, rawY };
  }

  function colorDistance(r1,g1,b1,a1, r2,g2,b2,a2){
    // Simple Euclidean distance across RGBA, 0-441.7 range (sqrt(255^2*4)) — normalized to 0-100 by caller
    const dr=r1-r2, dg=g1-g2, db=b1-b2, da=a1-a2;
    return Math.sqrt(dr*dr+dg*dg+db*db+da*da);
  }
  function floodFill(px, py, connected, tolerancePct){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    const gx = Math.floor(px), gy = Math.floor(py);
    if(gx<0||gy<0||gx>=W||gy>=H) return;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const startIdx = (gy*W + gx) * 4;
    const tR=data[startIdx], tG=data[startIdx+1], tB=data[startIdx+2], tA=data[startIdx+3];
    const {r:fR, g:fG, b:fB} = hexToRgb(fgColor);
    const fA = Math.round((opacity/100) * 255);
    const maxDist = 441.7; // sqrt(255^2 * 4)
    const threshold = (tolerancePct/100) * maxDist;

    if(tR===fR && tG===fG && tB===fB && tA===fA && threshold===0) return; // nothing would change

    function matches(idx){
      if(threshold === 0) return data[idx]===tR && data[idx+1]===tG && data[idx+2]===tB && data[idx+3]===tA;
      return colorDistance(data[idx],data[idx+1],data[idx+2],data[idx+3], tR,tG,tB,tA) <= threshold;
    }
    function setFillPixel(idx){
      data[idx]=fR; data[idx+1]=fG; data[idx+2]=fB; data[idx+3]=fA;
    }

    if(connected){
      const stack = [gx + gy*W];
      const visited = new Uint8Array(W*H);
      while(stack.length){
        const p = stack.pop();
        if(visited[p]) continue;
        const cx = p % W, cy = (p - cx) / W;
        const idx = p*4;
        if(!matches(idx)) continue;
        visited[p] = 1;
        setFillPixel(idx);
        if(cx+1<W) stack.push(p+1);
        if(cx-1>=0) stack.push(p-1);
        if(cy+1<H) stack.push(p+W);
        if(cy-1>=0) stack.push(p-W);
      }
    } else {
      for(let i=0;i<data.length;i+=4){
        if(matches(i)) setFillPixel(i);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }
  let brushStampLastX = null, brushStampLastY = null;
  function brushStampAt(px, py){
    if(!layers[activeLayer] || selectedStampIndex === null || !stamps[selectedStampIndex]) return;
    const ctx = layers[activeLayer].ctx;
    const stamp = stamps[selectedStampIndex];
    const pX = (stamp.pivotX !== undefined) ? stamp.pivotX : 0.5;
    const pY = (stamp.pivotY !== undefined) ? stamp.pivotY : 0.5;
    const mask = getActiveStampMask(stamp);
    const built = mask ? buildTintedStamp(mask, brushSize, fgColor) : null;
    if(!built) return;

    const rawX = seamlessModeEnabled ? (px + W) : px;
    const rawY = seamlessModeEnabled ? (py + H) : py;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();

    const normPx = seamlessModeEnabled ? (((px % W) + W) % W) : px;
    const normPy = seamlessModeEnabled ? (((py % H) + H) % H) : py;
    const offsets = seamlessModeEnabled ?
      [
        [0,0], [-W,0], [W,0],
        [0,-H], [-W,-H], [W,-H],
        [0,H], [-W,H], [W,H]
      ] : [[0,0]];

    for (let offset of offsets) {
      const tx = normPx + offset[0];
      const ty = normPy + offset[1];
      const bounds = getRotatedRectBounds(tx, ty, built.w, built.h, 0, pX, pY);
      if (bounds.x >= W || bounds.y >= H || bounds.x + bounds.w <= 0 || bounds.y + bounds.h <= 0) continue;

      paintNoBlend(ctx, W, H, bounds.x, bounds.y, bounds.w, bounds.h, (sctx)=>{
        sctx.globalAlpha = opacity/100;
        drawBuiltStamp(sctx, built.canvas, built.w, built.h, tx, ty, 0, pX, pY, built.srcW, built.srcH);
      });
    }

    const bounds = getRotatedRectBounds(rawX, rawY, built.w, built.h, 0, pX, pY);
    const nearOrInMargin = rawX < built.w || rawX > effW - built.w || rawY < built.h || rawY > effH - built.h;
    if(nearOrInMargin){
      marginHasContent = true;
      const mfW = effW + MARGIN_PX*2;
      const mfH = effH + MARGIN_PX*2;
      paintNoBlend(mfCtx, mfW, mfH, bounds.x+MARGIN_PX, bounds.y+MARGIN_PX, bounds.w, bounds.h, (sctx)=>{
        sctx.globalAlpha = opacity/100;
        drawBuiltStamp(sctx, built.canvas, built.w, built.h, rawX+MARGIN_PX, rawY+MARGIN_PX, 0, pX, pY, built.srcW, built.srcH);
      });
    }
  }
  function brushStampLineTo(px, py){
    if(brushStampLastX === null){
      brushStampAt(px, py);
      brushStampLastX = px; brushStampLastY = py;
      return;
    }
    const dx = px - brushStampLastX, dy = py - brushStampLastY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const spacing = Math.max(1, brushSize * 0.3);
    const steps = Math.floor(dist / spacing);
    for(let i=1; i<=steps; i++){
      const t = i/steps;
      brushStampAt(brushStampLastX + dx*t, brushStampLastY + dy*t);
    }
    brushStampLastX = px; brushStampLastY = py;
  }
  let brushCircleLastX = null, brushCircleLastY = null;
  function brushCircleAt(px, py){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    const r = brushSize/2;

    const rawX = seamlessModeEnabled ? (px + W) : px;
    const rawY = seamlessModeEnabled ? (py + H) : py;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();

    const normPx = seamlessModeEnabled ? (((px % W) + W) % W) : px;
    const normPy = seamlessModeEnabled ? (((py % H) + H) % H) : py;
    const offsets = seamlessModeEnabled ?
      [
        [0,0], [-W,0], [W,0],
        [0,-H], [-W,-H], [W,-H],
        [0,H], [-W,H], [W,H]
      ] : [[0,0]];

    for (let offset of offsets) {
      const tx = normPx + offset[0];
      const ty = normPy + offset[1];
      if (tx < -r || ty < -r || tx > W + r || ty > H + r) continue;

      paintNoBlend(ctx, W, H, tx-r, ty-r, r*2, r*2, (sctx)=>{
        sctx.globalAlpha = opacity/100;
        sctx.fillStyle = fgColor;
        sctx.beginPath();
        sctx.arc(tx, ty, r, 0, Math.PI*2);
        sctx.fill();
      }, fgColor);
    }

    const nearOrInMargin = rawX < brushSize || rawX > effW - brushSize || rawY < brushSize || rawY > effH - brushSize;
    if(nearOrInMargin){
      marginHasContent = true;
      const mfW = effW + MARGIN_PX*2;
      const mfH = effH + MARGIN_PX*2;
      paintNoBlend(mfCtx, mfW, mfH, rawX+MARGIN_PX-r, rawY+MARGIN_PX-r, r*2, r*2, (sctx)=>{
        sctx.globalAlpha = opacity/100;
        sctx.fillStyle = fgColor;
        sctx.beginPath();
        sctx.arc(rawX+MARGIN_PX, rawY+MARGIN_PX, r, 0, Math.PI*2);
        sctx.fill();
      }, fgColor);
    }
  }
  function brushCircleLineTo(px, py){
    if(brushCircleLastX === null){
      brushCircleAt(px, py);
      brushCircleLastX = px; brushCircleLastY = py;
      return;
    }
    const dx = px - brushCircleLastX, dy = py - brushCircleLastY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const spacing = Math.max(1, brushSize * 0.3);
    const steps = Math.floor(dist / spacing);
    for(let i=1; i<=steps; i++){
      const t = i/steps;
      brushCircleAt(brushCircleLastX + dx*t, brushCircleLastY + dy*t);
    }
    brushCircleLastX = px; brushCircleLastY = py;
  }
  function computeHeightWeight(h){
    if(heightMode === 'gradientLowHigh') return h/255;
    if(heightMode === 'gradientHighLow') return 1 - h/255;
    // range mode
    const soft = (heightSoftness/100) * 40; // max transition band width, in height-units
    if(soft <= 0) return (h >= heightMin && h <= heightMax) ? 1 : 0;
    if(h < heightMin - soft || h > heightMax + soft) return 0;
    if(h >= heightMin && h <= heightMax) return 1;
    if(h < heightMin) return (h - (heightMin-soft)) / soft;
    return ((heightMax+soft) - h) / soft;
  }
  // ---------- Full replacement pixel painting (no blend) ----------
  // Paint operations replace pixels outright rather than alpha-blending with what's already
  // there — painting over existing pixels behaves identically to painting over fully transparent pixels.
  // Any pixel touched by the new stroke/dab replaces whatever was underneath with its exact RGBA,
  // preventing out-of-palette blend colors or edge bleeding.
  let noBlendScratchCanvas = null, noBlendScratchCtx = null;

  function ensureNoBlendScratch(bw, bh){
    const reqW = Math.max(256, bw);
    const reqH = Math.max(256, bh);
    if(!noBlendScratchCanvas){
      noBlendScratchCanvas = document.createElement('canvas');
      noBlendScratchCanvas.width = reqW;
      noBlendScratchCanvas.height = reqH;
      noBlendScratchCtx = noBlendScratchCanvas.getContext('2d', { willReadFrequently: true });
    } else if (noBlendScratchCanvas.width < bw || noBlendScratchCanvas.height < bh || noBlendScratchCanvas.width > reqW * 2 || noBlendScratchCanvas.height > reqH * 2) {
      noBlendScratchCanvas.width = reqW;
      noBlendScratchCanvas.height = reqH;
      noBlendScratchCtx = noBlendScratchCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  function paintNoBlend(realCtx, cw, ch, bx, by, bw, bh, drawFn, colorHex){
    const rx_ = Math.floor(bx);
    const ry_ = Math.floor(by);
    const rw_ = Math.ceil(bx + bw) - rx_;
    const rh_ = Math.ceil(by + bh) - ry_;
    bx = rx_; by = ry_; bw = rw_; bh = rh_;
    if(bw <= 0 || bh <= 0) return;
    if(bx >= cw || by >= ch || bx + bw <= 0 || by + bh <= 0) return;

    ensureNoBlendScratch(bw, bh);
    noBlendScratchCtx.clearRect(0, 0, bw, bh);

    noBlendScratchCtx.save();
    noBlendScratchCtx.translate(-bx, -by);
    drawFn(noBlendScratchCtx);
    noBlendScratchCtx.restore();

    const rx0 = Math.max(0, bx), ry0 = Math.max(0, by);
    const rx1 = Math.min(cw, bx + bw), ry1 = Math.min(ch, by + bh);
    if(rx1 <= rx0 || ry1 <= ry0) return;
    const rw = rx1 - rx0, rh = ry1 - ry0;

    const sx0 = rx0 - bx, sy0 = ry0 - by;

    const realImg = realCtx.getImageData(rx0, ry0, rw, rh);
    const scratchImg = noBlendScratchCtx.getImageData(sx0, sy0, rw, rh);

    const real32 = new Uint32Array(realImg.data.buffer);
    const scratch32 = new Uint32Array(scratchImg.data.buffer);

    const sRgb = colorHex ? hexToRgb(colorHex) : null;
    let modified = false;
    const len = scratch32.length;

    for (let i = 0; i < len; i++) {
      const sPix = scratch32[i];
      if (sPix === 0) continue;
      let sA = (sPix >>> 24) & 0xFF;
      if (sA === 0) continue;

      if (pixelPerfect) {
        sA = 255;
      }

      const sR = sRgb ? sRgb.r : (sPix & 0xFF);
      const sG = sRgb ? sRgb.g : ((sPix >>> 8) & 0xFF);
      const sB = sRgb ? sRgb.b : ((sPix >>> 16) & 0xFF);

      // Direct unconditional pixel replacement (exact v0.291 behavior)
      real32[i] = (sA << 24) | (sB << 16) | (sG << 8) | sR;
      modified = true;
    }

    if (modified) {
      realCtx.putImageData(realImg, rx0, ry0);
    }
  }

  function paintCombineSameColor(realCtx, cw, ch, bx, by, bw, bh, colorHex, drawFn){
    const rx_ = Math.floor(bx);
    const ry_ = Math.floor(by);
    const rw_ = Math.ceil(bx + bw) - rx_;
    const rh_ = Math.ceil(by + bh) - ry_;
    bx = rx_; by = ry_; bw = rw_; bh = rh_;
    if(bw <= 0 || bh <= 0) return;
    if(bx >= cw || by >= ch || bx + bw <= 0 || by + bh <= 0) return;

    ensureNoBlendScratch(bw, bh);
    noBlendScratchCtx.clearRect(0, 0, bw, bh);

    noBlendScratchCtx.save();
    noBlendScratchCtx.translate(-bx, -by);
    drawFn(noBlendScratchCtx);
    noBlendScratchCtx.restore();

    const rx0 = Math.max(0, bx), ry0 = Math.max(0, by);
    const rx1 = Math.min(cw, bx + bw), ry1 = Math.min(ch, by + bh);
    if(rx1 <= rx0 || ry1 <= ry0) return;
    const rw = rx1 - rx0, rh = ry1 - ry0;

    const sx0 = rx0 - bx, sy0 = ry0 - by;

    const realImg = realCtx.getImageData(rx0, ry0, rw, rh);
    const scratchImg = noBlendScratchCtx.getImageData(sx0, sy0, rw, rh);

    const real32 = new Uint32Array(realImg.data.buffer);
    const scratch32 = new Uint32Array(scratchImg.data.buffer);

    const cRgb = colorHex ? hexToRgb(colorHex) : null;
    let modified = false;
    const len = scratch32.length;

    for(let i = 0; i < len; i++){
      const sPix = scratch32[i];
      if(sPix === 0) continue;
      let sA = (sPix >>> 24) & 0xFF;
      if(sA === 0) continue;

      if (pixelPerfect) {
        sA = 255;
      }

      const sR = cRgb ? cRgb.r : (sPix & 0xFF);
      const sG = cRgb ? cRgb.g : ((sPix >>> 8) & 0xFF);
      const sB = cRgb ? cRgb.b : ((sPix >>> 16) & 0xFF);

      const tPix = real32[i];
      const tA = (tPix >>> 24) & 0xFF;

      if (tA === 0) {
        real32[i] = (sA << 24) | (sB << 16) | (sG << 8) | sR;
        modified = true;
      } else {
        const tR = tPix & 0xFF;
        const tG = (tPix >>> 8) & 0xFF;
        const tB = (tPix >>> 16) & 0xFF;

        const maxDev = Math.max(32, Math.ceil(382.5 / tA) + 16);
        const isSameColor = (
          Math.abs(tR - sR) <= maxDev &&
          Math.abs(tG - sG) <= maxDev &&
          Math.abs(tB - sB) <= maxDev
        );

        if (isSameColor) {
          const finalA = Math.min(255, Math.round(sA + tA * (1 - sA / 255)));
          real32[i] = (finalA << 24) | (sB << 16) | (sG << 8) | sR;
        } else {
          // Replacing pixels outright when painting over a different color
          real32[i] = (sA << 24) | (sB << 16) | (sG << 8) | sR;
        }
        modified = true;
      }
    }

    if(modified){
      realCtx.putImageData(realImg, rx0, ry0);
    }
  }

  function paintEraserDab(realCtx, cw, ch, bx, by, bw, bh, drawFn){
    const rx_ = Math.floor(bx);
    const ry_ = Math.floor(by);
    const rw_ = Math.ceil(bx + bw) - rx_;
    const rh_ = Math.ceil(by + bh) - ry_;
    bx = rx_; by = ry_; bw = rw_; bh = rh_;
    if(bw <= 0 || bh <= 0) return;
    if(bx >= cw || by >= ch || bx + bw <= 0 || by + bh <= 0) return;

    ensureNoBlendScratch(bw, bh);
    noBlendScratchCtx.clearRect(0, 0, bw, bh);

    noBlendScratchCtx.save();
    noBlendScratchCtx.translate(-bx, -by);
    drawFn(noBlendScratchCtx);
    noBlendScratchCtx.restore();

    const rx0 = Math.max(0, bx), ry0 = Math.max(0, by);
    const rx1 = Math.min(cw, bx + bw), ry1 = Math.min(ch, by + bh);
    if(rx1 <= rx0 || ry1 <= ry0) return;
    const rw = rx1 - rx0, rh = ry1 - ry0;

    const realImg = realCtx.getImageData(rx0, ry0, rw, rh);
    const realData = realImg.data;
    const sx0 = rx0 - bx, sy0 = ry0 - by;
    const scratchImg = noBlendScratchCtx.getImageData(sx0, sy0, rw, rh);
    const scratchData = scratchImg.data;

    let modified = false;
    for(let i = 0; i < scratchData.length; i += 4){
      let sA = scratchData[i + 3];
      if(sA > 0 && realData[i + 3] > 0){
        if (pixelPerfect) {
          sA = 255;
        }
        const factor = 1 - (sA / 255);
        realData[i + 3] = Math.round(realData[i + 3] * factor);
        modified = true;
      }
    }

    if(modified){
      realCtx.putImageData(realImg, rx0, ry0);
    }
  }

  function paintColorizeDab(realCtx, cw, ch, bx, by, bw, bh, colorHex, drawFn){
    const rx_ = Math.floor(bx);
    const ry_ = Math.floor(by);
    const rw_ = Math.ceil(bx + bw) - rx_;
    const rh_ = Math.ceil(by + bh) - ry_;
    bx = rx_; by = ry_; bw = rw_; bh = rh_;
    if(bw <= 0 || bh <= 0) return;
    if(bx >= cw || by >= ch || bx + bw <= 0 || by + bh <= 0) return;

    ensureNoBlendScratch(bw, bh);
    noBlendScratchCtx.clearRect(0, 0, bw, bh);

    noBlendScratchCtx.save();
    noBlendScratchCtx.translate(-bx, -by);
    drawFn(noBlendScratchCtx);
    noBlendScratchCtx.restore();

    const rx0 = Math.max(0, bx), ry0 = Math.max(0, by);
    const rx1 = Math.min(cw, bx + bw), ry1 = Math.min(ch, by + bh);
    if(rx1 <= rx0 || ry1 <= ry0) return;
    const rw = rx1 - rx0, rh = ry1 - ry0;

    const realImg = realCtx.getImageData(rx0, ry0, rw, rh);
    const realData = realImg.data;
    const sx0 = rx0 - bx, sy0 = ry0 - by;
    const scratchImg = noBlendScratchCtx.getImageData(sx0, sy0, rw, rh);
    const scratchData = scratchImg.data;

    let maskRgb = null;
    if(colorizeTargetHex){
      maskRgb = hexToRgb(colorizeTargetHex);
    }
    const targetRgb = hexToRgb(colorHex);

    let modified = false;
    for(let i = 0; i < scratchData.length; i += 4){
      const sA = scratchData[i + 3];
      const tA = realData[i + 3];
      if(sA > 0 && tA > 0){
        if(maskRgb){
          const maxDev = tA < 255 ? (Math.ceil(128 / tA) + 2) : 0;
          if(Math.abs(realData[i] - maskRgb.r) <= maxDev &&
             Math.abs(realData[i+1] - maskRgb.g) <= maxDev &&
             Math.abs(realData[i+2] - maskRgb.b) <= maxDev){
            realData[i]     = targetRgb.r;
            realData[i + 1] = targetRgb.g;
            realData[i + 2] = targetRgb.b;
            modified = true;
          }
        } else {
          realData[i]     = targetRgb.r;
          realData[i + 1] = targetRgb.g;
          realData[i + 2] = targetRgb.b;
          modified = true;
        }
      }
    }

    if(modified){
      realCtx.putImageData(realImg, rx0, ry0);
    }
  }

  function withHeightMask(bx, by, bw, bh, paintFn){
    if(!heightPaintEnabled || heightSourceLayerIndex === null || !layers[heightSourceLayerIndex] || !layers[activeLayer]){
      paintFn();
      return;
    }
    bx = Math.max(0, Math.floor(bx)); by = Math.max(0, Math.floor(by));
    const bx2 = Math.min(W, Math.ceil(bx+bw)), by2 = Math.min(H, Math.ceil(by+bh));
    const w = bx2-bx, h = by2-by;
    if(w<=0 || h<=0){ paintFn(); return; }
    const layerCtx = layers[activeLayer].ctx;
    const beforeImg = layerCtx.getImageData(bx, by, w, h);
    const beforeData = new Uint8ClampedArray(beforeImg.data);
    paintFn();
    const afterImg = layerCtx.getImageData(bx, by, w, h);
    const afterData = afterImg.data;
    const heightData = layers[heightSourceLayerIndex].ctx.getImageData(bx, by, w, h).data;
    for(let i=0; i<afterData.length; i+=4){
      const heightVal = 0.299*heightData[i] + 0.587*heightData[i+1] + 0.114*heightData[i+2];
      const weight = computeHeightWeight(heightVal);
      if(weight >= 1) continue;
      if(weight <= 0){
        afterData[i]   = beforeData[i];
        afterData[i+1] = beforeData[i+1];
        afterData[i+2] = beforeData[i+2];
        afterData[i+3] = beforeData[i+3];
        continue;
      }
      
      const bA = beforeData[i+3];
      const aA = afterData[i+3];
      const newA = Math.round(bA * (1 - weight) + aA * weight);
      
      // Strict RGB mode: if it was modified by the brush, we take the new RGB, but combined alpha.
      // How do we know if it was modified? If afterData is different from beforeData.
      if (afterData[i] !== beforeData[i] || afterData[i+1] !== beforeData[i+1] || afterData[i+2] !== beforeData[i+2] || afterData[i+3] !== beforeData[i+3]) {
         // The paintFn modified this pixel. So it should take the new RGB.
         afterData[i+3] = newA;
      }
    }
    layerCtx.putImageData(afterImg, bx, by);
  }

  function eraserDabAt(px, py){
    const r = Math.max(0.5, brushSize/2);
    const rawX = seamlessModeEnabled ? (px + W) : px;
    const rawY = seamlessModeEnabled ? (py + H) : py;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const isCoreTiles = (rawX >= 0 && rawX <= effW && rawY >= 0 && rawY <= effH);

    function paintOnto(targetCtx, ox, oy, cxIn = undefined, cyIn = undefined){
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'destination-out';
      const cx = (cxIn !== undefined) ? cxIn : (px + ox);
      const cy = (cyIn !== undefined) ? cyIn : (py + oy);
      if(eraserHardness >= 100){
        targetCtx.globalAlpha = opacity/100;
        targetCtx.fillStyle = '#000';
        if(eraserShape === 'circle'){
          targetCtx.beginPath(); targetCtx.arc(cx, cy, r, 0, Math.PI*2); targetCtx.fill();
        } else {
          const box = brushBox(Math.round(cx), Math.round(cy));
          targetCtx.fillRect(box.x, box.y, box.n, box.n);
        }
      } else {
        const innerR = Math.max(0, r * (eraserHardness/100));
        const grad = targetCtx.createRadialGradient(cx, cy, innerR, cx, cy, r);
        grad.addColorStop(0, 'rgba(0,0,0,' + (opacity/100) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        targetCtx.fillStyle = grad;
        if(eraserShape === 'circle'){
          targetCtx.beginPath(); targetCtx.arc(cx, cy, r, 0, Math.PI*2); targetCtx.fill();
        } else {
          targetCtx.fillRect(cx-r, cy-r, r*2, r*2);
        }
      }
      targetCtx.restore();
    }

    if(layers[activeLayer]){
      const normPx = seamlessModeEnabled ? (((px % W) + W) % W) : px;
      const normPy = seamlessModeEnabled ? (((py % H) + H) % H) : py;
      const offsets = seamlessModeEnabled ?
        [
          [0,0], [-W,0], [W,0],
          [0,-H], [-W,-H], [W,-H],
          [0,H], [-W,H], [W,H]
        ] : [[0,0]];

      for (let offset of offsets) {
        const tx = normPx + offset[0];
        const ty = normPy + offset[1];
        if (tx < -r || ty < -r || tx > W + r || ty > H + r) continue;
        paintOnto(layers[activeLayer].ctx, 0, 0, tx, ty);
      }
    }
    const nearOrInMargin = rawX < r || rawX > effW - r || rawY < r || rawY > effH - r;
    if(nearOrInMargin) {
      marginHasContent = true;
      paintOnto(mfCtx, 0, 0, rawX + MARGIN_PX, rawY + MARGIN_PX);
    }
  }
  function eraserLineTo(x0, y0, x1, y1){
    const dx = x1-x0, dy = y1-y0;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const spacing = Math.max(1, brushSize*0.25);
    const steps = Math.max(1, Math.ceil(dist/spacing));
    for(let i=0; i<=steps; i++){
      const t = i/steps;
      eraserDabAt(x0+dx*t, y0+dy*t);
    }
  }
  function strokeBrush(x0,y0,x1,y1){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = opacity/100;
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x1,y1);
    ctx.stroke();
    ctx.restore();

    const r = brushSize;
    const nearEdge = x0 < r || x0 > W-r || y0 < r || y0 > H-r || x1 < r || x1 > W-r || y1 < r || y1 > H-r;
    if(nearEdge){
      mfCtx.save();
      mfCtx.globalCompositeOperation = 'destination-out';
      mfCtx.globalAlpha = opacity/100;
      mfCtx.strokeStyle = fgColor;
      mfCtx.lineWidth = brushSize;
      mfCtx.lineCap = 'round';
      mfCtx.lineJoin = 'round';
      mfCtx.beginPath();
      mfCtx.moveTo(x0+MARGIN_PX,y0+MARGIN_PX);
      mfCtx.lineTo(x1+MARGIN_PX,y1+MARGIN_PX);
      mfCtx.stroke();
      mfCtx.restore();
    }
  }

  // ---------- Pixel-perfect brush (square only, snapped, corner-cleaned) ----------
  function bresenhamLine(x0,y0,x1,y1, cb){
    x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
    const dx = Math.abs(x1-x0), sx = x0<x1?1:-1;
    const dy = -Math.abs(y1-y0), sy = y0<y1?1:-1;
    let err = dx+dy, e2;
    let x=x0, y=y0;
    while(true){
      cb(x,y);
      if(x===x1 && y===y1) break;
      e2 = 2*err;
      if(e2>=dy){ err+=dy; x+=sx; }
      if(e2<=dx){ err+=dx; y+=sy; }
    }
  }
  let ppStroke = [];
  let brushPixelPerfect = true;
  function isPixelPerfectLineActive(){
    const spreadIsOne = Math.round(brushSize) <= 1;
    const dabSizeIsOne = Math.round(dabSize) <= 1 && dabWidth <= 1 && dabHeight <= 1;
    const isChecked = !!pixelPerfect || !!brushPixelPerfect;
    return spreadIsOne && dabSizeIsOne && isChecked;
  }
  function isBrushPixelPerfectActive(){
    return isPixelPerfectLineActive();
  }
  function ppReset(){ ppStroke = []; }

  function brushBox(gx, gy){
    const n = Math.max(1, Math.round(brushSize));
    const offset = Math.floor((n-1)/2);
    return { x: gx-offset, y: gy-offset, n };
  }

  function stampBrushCell(cell){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;

    const effectiveMode = tool === 'brush' ? brushMode : sprayMode;

    const rawGx = seamlessModeEnabled ? (cell.gx + W) : cell.gx;
    const rawGy = seamlessModeEnabled ? (cell.gy + H) : cell.gy;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    const normGx = seamlessModeEnabled ? (((cell.gx % W) + W) % W) : cell.gx;
    const normGy = seamlessModeEnabled ? (((cell.gy % H) + H) % H) : cell.gy;

    const offsets = seamlessModeEnabled ?
      [
        [0,0], [-W,0], [W,0],
        [0,-H], [-W,-H], [W,-H],
        [0,H], [-W,H], [W,H]
      ] : [[0,0]];

    for (let offset of offsets) {
      const gx = normGx + offset[0];
      const gy = normGy + offset[1];
      const box = brushBox(gx, gy);
      if (box.x >= W || box.y >= H || box.x + box.n <= 0 || box.y + box.n <= 0) continue;

      if(effectiveMode === 'eraser'){
        paintEraserDab(ctx, W, H, box.x, box.y, box.n, box.n, (sctx)=>{
          sctx.fillStyle = '#ffffff';
          sctx.fillRect(box.x, box.y, box.n, box.n);
        });
      } else if(effectiveMode === 'colorize'){
        paintColorizeDab(ctx, W, H, box.x, box.y, box.n, box.n, fgColor, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.fillRect(box.x, box.y, box.n, box.n);
        });
      } else if(sprayCombineSameColor){
        paintCombineSameColor(ctx, W, H, box.x, box.y, box.n, box.n, fgColor, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.fillRect(box.x, box.y, box.n, box.n);
        });
      } else {
        paintNoBlend(ctx, W, H, box.x, box.y, box.n, box.n, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.fillRect(box.x, box.y, box.n, box.n);
        });
      }
    }

    const box = brushBox(rawGx, rawGy);
    const nearOrInMargin = box.x < 0 || box.y < 0 || box.x + box.n > effW || box.y + box.n > effH;
    if(nearOrInMargin){
      marginHasContent = true;
      const mfBoxX = box.x + MARGIN_PX;
      const mfBoxY = box.y + MARGIN_PX;
      const mfW = effW + MARGIN_PX*2;
      const mfH = effH + MARGIN_PX*2;
      if(effectiveMode === 'eraser'){
        paintEraserDab(mfCtx, mfW, mfH, mfBoxX, mfBoxY, box.n, box.n, (sctx)=>{
          sctx.fillStyle = '#ffffff';
          sctx.fillRect(mfBoxX, mfBoxY, box.n, box.n);
        });
      } else if(effectiveMode === 'colorize'){
        paintColorizeDab(mfCtx, mfW, mfH, mfBoxX, mfBoxY, box.n, box.n, fgColor, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.fillRect(mfBoxX, mfBoxY, box.n, box.n);
        });
      } else if(sprayCombineSameColor){
        paintCombineSameColor(mfCtx, mfW, mfH, mfBoxX, mfBoxY, box.n, box.n, fgColor, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.fillRect(mfBoxX, mfBoxY, box.n, box.n);
        });
      } else {
        paintNoBlend(mfCtx, mfW, mfH, mfBoxX, mfBoxY, box.n, box.n, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.fillRect(mfBoxX, mfBoxY, box.n, box.n);
        });
      }
    }
  }

  function eraseBrushCell(cell){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    const box = brushBox(cell.gx, cell.gy);
    paintEraserDab(ctx, W, H, box.x, box.y, box.n, box.n, (sctx)=>{
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(box.x, box.y, box.n, box.n);
    });
    const nearEdge = box.x < 0 || box.y < 0 || box.x+box.n > W || box.y+box.n > H;
    if(nearEdge){
      paintEraserDab(mfCtx, W+MARGIN_PX*2, H+MARGIN_PX*2, box.x+MARGIN_PX, box.y+MARGIN_PX, box.n, box.n, (sctx)=>{
        sctx.fillStyle = '#ffffff';
        sctx.fillRect(box.x+MARGIN_PX, box.y+MARGIN_PX, box.n, box.n);
      });
    }
  }

  function ppFeedCell(cell){
    if(ppStroke.length > 0){
      const last = ppStroke[ppStroke.length - 1];
      if(last.gx === cell.gx && last.gy === cell.gy) return;
    }

    if(!isPixelPerfectLineActive()){
      stampBrushCell(cell);
      ppStroke.push(cell);
      return;
    }

    while(ppStroke.length >= 2){
      const p1 = ppStroke[ppStroke.length - 1];
      const p2 = ppStroke[ppStroke.length - 2];

      const isDiagonal = Math.abs(cell.gx - p2.gx) === 1 && Math.abs(cell.gy - p2.gy) === 1;
      const isElbow = (p1.gx === p2.gx && p1.gy === cell.gy) || (p1.gy === p2.gy && p1.gx === cell.gx);

      if(isDiagonal && isElbow){
        eraseBrushCell(p1);
        ppStroke.pop();
      } else {
        break;
      }
    }

    stampBrushCell(cell);
    ppStroke.push(cell);
  }

  function ppFeed(cell, drawFn){
    ppFeedCell(cell);
  }

  function ppFlush(drawFn){
    ppReset();
  }
  function drawBrushLinePixelPreview(ax, ay, tx, ty){
    const dx = tx-ax, dy = ty-ay;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if(brushMode === 'blur'){
      const step = Math.max(1, brushSize*0.5);
      const steps = Math.max(1, Math.round(dist/step));
      const r = brushSize/2;
      pctx.save();
      pctx.lineWidth = 1/zoom;
      for(let i=0; i<=steps; i++){
        const t = i/steps;
        const px = ax+dx*t, py = ay+dy*t;
        pctx.strokeStyle = '#ffffff';
        pctx.strokeRect(px-r, py-r, brushSize, brushSize);
        pctx.strokeStyle = '#000000';
        pctx.setLineDash([3/zoom,3/zoom]);
        pctx.strokeRect(px-r, py-r, brushSize, brushSize);
      }
      pctx.restore();
      return;
    }
    if(brushShape === 'stamp' && selectedStampIndex !== null && stamps[selectedStampIndex]){
      const stamp = stamps[selectedStampIndex];
      const pX = (stamp.pivotX !== undefined) ? stamp.pivotX : 0.5;
      const pY = (stamp.pivotY !== undefined) ? stamp.pivotY : 0.5;
      const spacing = Math.max(1, brushSize*0.3);
      const steps = Math.max(1, Math.round(dist/spacing));
      const mask = getActiveStampMask(stamp);
      const built = mask ? buildTintedStamp(mask, brushSize, fgColor) : null;
      if(built){
        pctx.save();
        pctx.globalAlpha = opacity/100;
        for(let i=0; i<=steps; i++){
          const t = i/steps;
          const px = ax+dx*t, py = ay+dy*t;
          drawBuiltStamp(pctx, built.canvas, built.w, built.h, px, py, 0, pX, pY);
        }
        pctx.restore();
      }
      return;
    }
    if(brushShape === 'circle'){
      const spacing = Math.max(1, brushSize*0.5);
      const steps = Math.max(1, Math.round(dist/spacing));
      pctx.save();
      pctx.globalAlpha = opacity/100;
      pctx.fillStyle = fgColor;
      for(let i=0; i<=steps; i++){
        const t = i/steps;
        const px = ax+dx*t, py = ay+dy*t;
        pctx.beginPath();
        pctx.arc(px, py, brushSize/2, 0, Math.PI*2);
        pctx.fill();
      }
      pctx.restore();
      return;
    }
    // Square mode: use the exact same bresenhamLine algorithm the real pixel-perfect paint
    // path uses, so this shows precisely the pixels that would actually be painted — landing
    // on exact integer boundaries rather than the fractional interpolated positions the old
    // per-step approach used, which is what was causing the visible antialiasing.
    pctx.save();
    pctx.globalAlpha = opacity/100;
    pctx.fillStyle = fgColor;
    bresenhamLine(Math.floor(ax), Math.floor(ay), Math.floor(tx), Math.floor(ty), (gx,gy)=>{
      const box = brushBox(gx, gy);
      pctx.fillRect(box.x, box.y, box.n, box.n);
    });
    pctx.restore();
  }
  function drawBrushPreview(gx, gy, shiftKey, ctrlKey){
    clearPreviewCanvas();
    if(tool !== 'brush') return;

    let targetX = gx, targetY = gy;
    if(shiftKey && brushLineAnchorX !== null){
      if(ctrlKey){
        const snapped = snap45(brushLineAnchorX, brushLineAnchorY, gx, gy);
        targetX = snapped.x; targetY = snapped.y;
      }
      pctx.save();
      pctx.translate(MARGIN_PX, MARGIN_PX);
      drawBrushLinePixelPreview(brushLineAnchorX, brushLineAnchorY, targetX, targetY);
      pctx.restore();
    }

    if(brushMode === 'blur'){
      const r = brushSize/2;
      const lw = 1/zoom; // 1 physical screen pixel, independent of current zoom
      pctx.save();
      pctx.translate(MARGIN_PX, MARGIN_PX);
      pctx.lineWidth = lw;
      pctx.strokeStyle = '#ffffff';
      pctx.strokeRect(targetX-r, targetY-r, brushSize, brushSize);
      pctx.strokeStyle = '#000000';
      pctx.setLineDash([3/zoom,3/zoom]);
      pctx.strokeRect(targetX-r, targetY-r, brushSize, brushSize);
      pctx.restore();
      return;
    }
    const box = brushBox(targetX, targetY);
    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);
    pctx.globalAlpha = opacity/100;
    pctx.fillStyle = fgColor;
    if(brushShape === 'circle'){
      pctx.beginPath();
      pctx.arc(targetX, targetY, brushSize/2, 0, Math.PI*2);
      pctx.fill();
    } else {
      pctx.fillRect(box.x, box.y, box.n, box.n);
    }
    pctx.restore();
  }
  function drawSprayPreview(x, y, shiftPressed = false, rawX = undefined, rawY = undefined){
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    clearPreviewCanvas();
    if(tool !== 'spray') return;
    const pxX = (seamlessModeEnabled && rawX !== undefined) ? rawX : x;
    const pxY = (seamlessModeEnabled && rawY !== undefined) ? rawY : y;
    const r = brushSize/2;
    const lw = 1/zoom; // 1 physical screen pixel, independent of current zoom
    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);

    // Shift-click line preview
    if(shiftPressed && sprayLineAnchorX !== null && sprayLineAnchorY !== null){
      pctx.lineWidth = lw * 1.5;
      pctx.strokeStyle = '#38bdf8';
      pctx.setLineDash([4/zoom, 4/zoom]);
      pctx.beginPath();
      pctx.moveTo(sprayLineAnchorX, sprayLineAnchorY);
      pctx.lineTo(pxX, pxY);
      pctx.stroke();
      pctx.setLineDash([]);
    }

    // Anchor point crosshair preview
    if(sprayTargetAnchorX !== null && sprayTargetAnchorY !== null){
      const ax = sprayTargetAnchorX, ay = sprayTargetAnchorY;
      pctx.lineWidth = lw * 1.5;
      pctx.strokeStyle = '#f43f5e'; // Coral red
      pctx.setLineDash([]);
      pctx.beginPath();
      pctx.arc(ax, ay, 6/zoom, 0, Math.PI*2);
      pctx.moveTo(ax - 9/zoom, ay); pctx.lineTo(ax + 9/zoom, ay);
      pctx.moveTo(ax, ay - 9/zoom); pctx.lineTo(ax, ay + 9/zoom);
      pctx.stroke();

      // Dotted direction line if rotation mode uses anchor
      if(rotationMode === 'toward' || rotationMode === 'away'){
        pctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        pctx.setLineDash([2/zoom, 3/zoom]);
        pctx.beginPath();
        pctx.moveTo(pxX, pxY);
        pctx.lineTo(ax, ay);
        pctx.stroke();
      }
    }

    // Main spray radius circle or single pixel box
    const isSinglePx = (Math.round(brushSize) <= 1) && (dabWidth <= 1 && dabHeight <= 1 && Math.round(dabSize) <= 1);
    const isCoreTilesPreview = (pxX >= 0 && pxX <= effW && pxY >= 0 && pxY <= effH);
    const previewOffsets = (seamlessModeEnabled && isCoreTilesPreview) ?
      [
        [0,0], [-W,0], [W,0],
        [0,-H], [-W,-H], [W,-H],
        [0,H], [-W,H], [W,H]
      ] : [[0,0]];

    for (let offset of previewOffsets) {
      const cx = pxX + offset[0];
      const cy = pxY + offset[1];
      if (cx < -r || cy < -r || cx > effW + r || cy > effH + r) continue;

      if(isSinglePx){
        const spx = Math.floor(cx), spy = Math.floor(cy);
        pctx.fillStyle = fgColor;
        pctx.globalAlpha = 0.35 * (opacity/100);
        pctx.fillRect(spx, spy, 1, 1);
        pctx.globalAlpha = 1.0;

        pctx.lineWidth = lw;
        pctx.setLineDash([]);
        pctx.strokeStyle = '#ffffff';
        pctx.strokeRect(spx, spy, 1, 1);
        pctx.strokeStyle = '#000000';
        pctx.setLineDash([3/zoom, 3/zoom]);
        pctx.strokeRect(spx, spy, 1, 1);
      } else {
        pctx.lineWidth = lw;
        pctx.setLineDash([]);
        pctx.strokeStyle = '#ffffff';
        pctx.beginPath(); pctx.arc(cx, cy, r, 0, Math.PI*2); pctx.stroke();
        pctx.strokeStyle = '#000000';
        pctx.setLineDash([3/zoom,3/zoom]);
        pctx.beginPath(); pctx.arc(cx, cy, r, 0, Math.PI*2); pctx.stroke();
      }
    }
    pctx.restore();
  }
  function drawVinePreview(x, y, rawX = undefined, rawY = undefined){
    clearPreviewCanvas();
    if(tool !== 'vine' && !isPathTool()) return;
    const pxX = (seamlessModeEnabled && rawX !== undefined) ? rawX : (seamlessModeEnabled ? x + W : x);
    const pxY = (seamlessModeEnabled && rawY !== undefined) ? rawY : (seamlessModeEnabled ? y + H : y);
    const r = brushSize/2; // Brush Size directly sets stem thickness now, so this shows it accurately
    const lw = 1/zoom;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();
    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);

    const isCoreTilesPreview = (pxX >= 0 && pxX <= effW && pxY >= 0 && pxY <= effH);
    const previewOffsets = (seamlessModeEnabled && isCoreTilesPreview) ?
      [
        [0,0], [-W,0], [W,0],
        [0,-H], [-W,-H], [W,-H],
        [0,H], [-W,H], [W,H]
      ] : [[0,0]];

    for (let offset of previewOffsets) {
      const cx = pxX + offset[0];
      const cy = pxY + offset[1];
      if (cx < -r || cy < -r || cx > effW + r || cy > effH + r) continue;

      pctx.lineWidth = lw;
      pctx.setLineDash([]);
      pctx.strokeStyle = '#ffffff';
      pctx.beginPath(); pctx.arc(cx, cy, r, 0, Math.PI*2); pctx.stroke();
      pctx.strokeStyle = '#000000';
      pctx.setLineDash([3/zoom,3/zoom]);
      pctx.beginPath(); pctx.arc(cx, cy, r, 0, Math.PI*2); pctx.stroke();
    }
    pctx.restore();
  }
  function drawEraserPreview(x, y){
    clearPreviewCanvas();
    if(tool !== 'eraser') return;
    const r = Math.max(0.5, brushSize/2);
    const lw = 1/zoom;
    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);
    pctx.lineWidth = lw;
    pctx.strokeStyle = '#ffffff';
    pctx.beginPath();
    if(eraserShape === 'circle') pctx.arc(x, y, r, 0, Math.PI*2);
    else pctx.rect(x-r, y-r, r*2, r*2);
    pctx.stroke();
    pctx.strokeStyle = '#000000';
    pctx.setLineDash([3/zoom,3/zoom]);
    pctx.beginPath();
    if(eraserShape === 'circle') pctx.arc(x, y, r, 0, Math.PI*2);
    else pctx.rect(x-r, y-r, r*2, r*2);
    pctx.stroke();
    pctx.restore();
  }
  let loupeOverlayCache = null;
  let loupeCanvasCache = null;
  let loupeCtxCache = null;

  function initLoupeCache(){
    if(!loupeOverlayCache) loupeOverlayCache = document.getElementById('loupeOverlay');
    if(!loupeCanvasCache) {
      loupeCanvasCache = document.getElementById('loupeCanvas');
      if(loupeCanvasCache) loupeCtxCache = loupeCanvasCache.getContext('2d', { willReadFrequently: true });
    }
  }

  function hideLoupe(){
    initLoupeCache();
    if(loupeOverlayCache) loupeOverlayCache.style.display = 'none';
    if(pctx) pctx.clearRect(0,0,W,H);
  }

  function updateLoupe(screenX, screenY, canvasX, canvasY){
    initLoupeCache();
    const overlay = loupeOverlayCache;
    const lcanvas = loupeCanvasCache;
    if(!overlay || !lcanvas) return;

    const loupeSize = 160;
    let left = screenX + 24;
    let top = screenY - loupeSize / 2;

    if(left + loupeSize + 20 > window.innerWidth) left = screenX - loupeSize - 24;
    if(top < 20) top = 20;
    if(top + loupeSize + 40 > window.innerHeight) top = window.innerHeight - loupeSize - 40;

    overlay.style.left = left + 'px';
    overlay.style.top = top + 'px';
    overlay.style.display = 'block';

    const lctx = loupeCtxCache;
    lctx.clearRect(0, 0, 320, 320);

    lctx.save();
    lctx.beginPath();
    lctx.arc(160, 160, 158, 0, Math.PI * 2);
    lctx.clip();

    lctx.fillStyle = '#0f172a';
    lctx.fillRect(0, 0, 320, 320);

    const gx = Math.floor(canvasX);
    const gy = Math.floor(canvasY);

    // Draw reticle target box on canvas overlay
    if(pctx && gx >= 0 && gx < W && gy >= 0 && gy < H){
      pctx.clearRect(0, 0, W, H);
      pctx.save();
      const lw = 1 / zoom;
      pctx.lineWidth = lw;
      pctx.strokeStyle = '#ffffff';
      pctx.strokeRect(gx, gy, 1, 1);
      pctx.strokeStyle = '#000000';
      pctx.setLineDash([3 / zoom, 3 / zoom]);
      pctx.strokeRect(gx, gy, 1, 1);
      pctx.restore();
    }

    const gridRadius = 5; // 11x11 grid
    const gridSize = gridRadius * 2 + 1;
    const cellW = 320 / gridSize;

    for(let row = 0; row < gridSize; row++){
      for(let col = 0; col < gridSize; col++){
        const px = gx + (col - gridRadius);
        const py = gy + (row - gridRadius);
        const cellX = col * cellW;
        const cellY = row * cellW;

        const isEven = (col + row) % 2 === 0;
        lctx.fillStyle = isEven ? '#1e293b' : '#334155';
        lctx.fillRect(cellX, cellY, cellW, cellW);

        const pInfo = getPixelColorAt(px, py);
        if(pInfo && pInfo.a > 0){
          lctx.fillStyle = 'rgba(' + pInfo.r + ',' + pInfo.g + ',' + pInfo.b + ',' + (pInfo.a / 255) + ')';
          lctx.fillRect(cellX, cellY, cellW, cellW);
        }

        lctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        lctx.lineWidth = 1;
        lctx.strokeRect(cellX, cellY, cellW, cellW);
      }
    }

    // Highlight center cell
    const centerCellX = gridRadius * cellW;
    const centerCellY = gridRadius * cellW;

    lctx.lineWidth = 4;
    lctx.strokeStyle = '#ffffff';
    lctx.strokeRect(centerCellX, centerCellY, cellW, cellW);
    lctx.lineWidth = 2;
    lctx.strokeStyle = '#000000';
    lctx.strokeRect(centerCellX, centerCellY, cellW, cellW);

    lctx.restore();

    // Update badge
    const centerInfo = getPixelColorAt(gx, gy);
    const swatchEl = document.getElementById('loupeSwatch');
    const hexEl = document.getElementById('loupeHex');

    if(centerInfo){
      if(swatchEl){
        swatchEl.style.backgroundColor = centerInfo.hex;
        swatchEl.style.display = 'inline-block';
      }
      if(hexEl){
        const alphaStr = (centerInfo.a < 255) ? (' (' + Math.round((centerInfo.a / 255) * 100) + '%)') : '';
        hexEl.textContent = centerInfo.hex.toUpperCase() + alphaStr;
      }
    } else {
      if(swatchEl) swatchEl.style.display = 'none';
      if(hexEl) hexEl.textContent = 'Transparent';
    }
  }
  function showOverlayLabel(cx, cy, text){
    // A screen-space HTML label rather than canvas-drawn text — the canvas overlays use
    // image-rendering:pixelated for crisp brush previews, which makes any text drawn onto them
    // (then CSS-scaled by zoom) look blocky/pixelated. Normal HTML text rendering stays crisp
    // regardless of canvas zoom.
    const rect = displayCanvas.getBoundingClientRect();
    const label = document.getElementById('canvasOverlayLabel');
    label.textContent = text;
    label.style.left = (rect.left + cx*zoom) + 'px';
    label.style.top = (rect.top + cy*zoom) + 'px';
    label.style.display = 'block';
  }
  function hideOverlayLabel(){
    document.getElementById('canvasOverlayLabel').style.display = 'none';
  }
  function drawMeasurePreview(x1, y1, x2, y2){
    clearPreviewCanvas();
    const toDispX = (x) => seamlessModeEnabled ? (x + W) : x;
    const toDispY = (y) => seamlessModeEnabled ? (y + H) : y;
    const dx1 = toDispX(x1), dy1 = toDispY(y1);
    const dx2 = toDispX(x2), dy2 = toDispY(y2);
    const dx = dx2 - dx1, dy = dy2 - dy1;
    const dist = Math.sqrt(dx*dx + dy*dy);
    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);
    pctx.lineWidth = 1/zoom;
    pctx.strokeStyle = '#ffffff';
    pctx.beginPath(); pctx.moveTo(dx1, dy1); pctx.lineTo(dx2, dy2); pctx.stroke();
    pctx.strokeStyle = '#000000';
    pctx.setLineDash([3/zoom, 3/zoom]);
    pctx.beginPath(); pctx.moveTo(dx1, dy1); pctx.lineTo(dx2, dy2); pctx.stroke();
    pctx.restore();
    showOverlayLabel((dx1+dx2)/2, (dy1+dy2)/2 - 12/zoom, dist.toFixed(1) + 'px');
  }

  let sprayAnchorX = null, sprayAnchorY = null;
  let strokeDistance = 0;
  function dabsPerTick(effSize = brushSize){
    const maxDabs = Math.min(500, Math.max(4, Math.round((effSize*effSize)/12)));
    const cappedMax = (sprayMode === 'blur') ? Math.min(maxDabs, 16) : maxDabs;
    const densityFactor = Math.pow(density / 100, 2.2);
    const rawDabs = cappedMax * densityFactor;
    const integerPart = Math.floor(rawDabs);
    const fractionalPart = rawDabs - integerPart;
    const count = integerPart + (Math.random() < fractionalPart ? 1 : 0);
    return Math.max(1, count);
  }
  function flowIntervalMs(){
    return Math.max(4, Math.round(150 - (135 * (flow/100))));
  }
  function sprayDabsInterpolated(x, y){
    if(!sprayInterpolate || sprayAnchorX === null){
      if (sprayAnchorX !== null) {
        const dx = x - sprayAnchorX, dy = y - sprayAnchorY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        strokeDistance += dist;
      }
      sprayDabs(x, y);
      sprayAnchorX = x; sprayAnchorY = y;
      return;
    }
    const dx = x - sprayAnchorX, dy = y - sprayAnchorY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist <= 0){
      // Stationary pointer during continuous spray timer: spray in place without advancing stroke distance
      sprayDabs(x, y);
      return;
    }
    const spacing = Math.max(1, brushSize * 0.3); // matches Brush's own interpolation convention
    const steps = Math.max(1, Math.round(dist / spacing));
    const startStrokeDist = strokeDistance;
    for(let i=1; i<=steps; i++){
      const t = i/steps;
      const subDist = startStrokeDist + dist * t;
      let progressVal = null;
      if (sourceKind === 'gradient' && gradientOrdered && gradientSequentialStepMode === 'distance') {
        const cycleL = Math.max(10, gradientCycleLength);
        progressVal = (subDist % cycleL) / cycleL;
      }
      sprayDabs(sprayAnchorX + dx*t, sprayAnchorY + dy*t, null, null, 1.0, progressVal);
    }
    strokeDistance += dist;
    sprayAnchorX = x; sprayAnchorY = y;
  }
  function sprayLoop(now){
    if(!painting || tool !== 'spray'){ sprayRAF = null; return; }
    if(isPixelPerfectLineActive()){
      sprayRAF = requestAnimationFrame(sprayLoop);
      return;
    }
    const targetInterval = flowIntervalMs();
    let elapsed = now - sprayLastBurst;
    let bursts = 0;
    let firedAny = false;
    while(elapsed >= targetInterval && bursts < 12){
      sprayDabsInterpolated(lastX, lastY);
      sprayLastBurst += targetInterval;
      elapsed -= targetInterval;
      bursts++;
      firedAny = true;
    }
    if(bursts >= 12){
      // fell too far behind (very slow frame/device) — resync instead of queuing a runaway backlog
      sprayLastBurst = now;
    }
    if(firedAny) render();
    sprayRAF = requestAnimationFrame(sprayLoop);
  }

  function drawVineNode(cx, cy, diameter, spread = null, opacityFadeMul = 1.0, progress = null){
    if(!layers[activeLayer]) return;
    if(sprayMode === 'path' || isPathTool()){
      sprayDabs(cx, cy, diameter, spread, opacityFadeMul, progress);
    } else {
      const rawX = seamlessModeEnabled ? (cx + W) : cx;
      const rawY = seamlessModeEnabled ? (cy + H) : cy;
      const effW = getEffectiveCanvasW();
      const effH = getEffectiveCanvasH();
      const r = Math.max(0.5, diameter/2);

      const normX = seamlessModeEnabled ? (((cx % W) + W) % W) : cx;
      const normY = seamlessModeEnabled ? (((cy % H) + H) % H) : cy;
      const offsets = seamlessModeEnabled ?
        [
          [0,0], [-W,0], [W,0],
          [0,-H], [-W,-H], [W,-H],
          [0,H], [-W,H], [W,H]
        ] : [[0,0]];

      for (let offset of offsets) {
        const tx = normX + offset[0];
        const ty = normY + offset[1];
        if (tx < -r || ty < -r || tx > W + r || ty > H + r) continue;
        paintNoBlend(layers[activeLayer].ctx, W, H, tx-r, ty-r, r*2, r*2, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.beginPath();
          sctx.arc(tx, ty, r, 0, Math.PI*2);
          sctx.fill();
        }, fgColor);
      }

      const nearOrInMargin = rawX < diameter || rawX > effW - diameter || rawY < diameter || rawY > effH - diameter;
      if(nearOrInMargin){
        marginHasContent = true;
        const mfW = effW + MARGIN_PX*2;
        const mfH = effH + MARGIN_PX*2;
        paintNoBlend(mfCtx, mfW, mfH, rawX+MARGIN_PX-r, rawY+MARGIN_PX-r, r*2, r*2, (sctx)=>{
          sctx.globalAlpha = opacity/100;
          sctx.fillStyle = fgColor;
          sctx.beginPath();
          sctx.arc(rawX+MARGIN_PX, rawY+MARGIN_PX, r, 0, Math.PI*2);
          sctx.fill();
        }, fgColor);
      }
    }
  }
  function drawVineLeaf(cx, cy, size, angle, customColor = null){
    if(!layers[activeLayer]) return;

    const rawX = seamlessModeEnabled ? (cx + W) : cx;
    const rawY = seamlessModeEnabled ? (cy + H) : cy;
    const effW = getEffectiveCanvasW();
    const effH = getEffectiveCanvasH();

    const leafColor = customColor || fgColor;

    const drawLeafToCtx = (targetCtx, cw, ch, lx, ly) => {
      const sz = Math.max(2, Math.round(size));
      const boxW = Math.ceil(sz * 2 + 4);
      const boxH = boxW;
      const bx = lx - boxW/2;
      const by = ly - boxH/2;
      paintNoBlend(targetCtx, cw, ch, bx, by, boxW, boxH, (sctx) => {
        sctx.save();
        sctx.globalAlpha = opacity/100;
        sctx.fillStyle = leafColor;
        if(pixelPerfect){
          const rot = getRotatedShapeCanvas('leaf', sz, sz, angle, leafColor);
          if (rot) {
            sctx.imageSmoothingEnabled = false;
            const finalCx = Math.round(lx);
            const finalCy = Math.round(ly);
            sctx.drawImage(rot.canvas, 0, 0, rot.w, rot.h, finalCx - rot.pivotOffsetX, finalCy - rot.pivotOffsetY, rot.w, rot.h);
          }
        } else {
          sctx.translate(lx, ly);
          sctx.rotate(angle);
          const l = size*0.65, w = size*0.5;
          sctx.beginPath();
          sctx.moveTo(l, 0);
          sctx.quadraticCurveTo(l*0.3, w, -l*0.6, 0);
          sctx.quadraticCurveTo(l*0.3, -w, l, 0);
          sctx.closePath();
          sctx.fill();
        }
        sctx.restore();
      }, leafColor);
    };

    const normX = seamlessModeEnabled ? (((cx % W) + W) % W) : cx;
    const normY = seamlessModeEnabled ? (((cy % H) + H) % H) : cy;
    const offsets = seamlessModeEnabled ?
      [
        [0,0], [-W,0], [W,0],
        [0,-H], [-W,-H], [W,-H],
        [0,H], [-W,H], [W,H]
      ] : [[0,0]];

    for (let offset of offsets) {
      drawLeafToCtx(layers[activeLayer].ctx, W, H, normX + offset[0], normY + offset[1]);
    }

    const nearOrInMargin = rawX < size || rawX > effW - size || rawY < size || rawY > effH - size;
    if(nearOrInMargin){
      marginHasContent = true;
      drawLeafToCtx(mfCtx, effW + MARGIN_PX*2, effH + MARGIN_PX*2, rawX + MARGIN_PX, rawY + MARGIN_PX);
    }
  }
  function vineNextDecorationDistance(){
    const density = vineDensity/100; // 0-1
    const base = 100 - density*80; // sparse (100px apart) at density=0, dense (20px apart) at 100
    return Math.max(8, base * (0.7 + Math.random()*0.6)); // some randomness for organic spacing
  }
  function vineStart(x, y){
    vineTipX = x; vineTipY = y;
    vineHasDirection = false; // next vineGrowTo call will point straight at its target
    vineDistSinceDecoration = 0;
    vineNextDecorationAt = vineNextDecorationDistance();
    vineNextLeafSide = 1;
    drawVineNode(x, y, Math.max(1, brushSize*0.4));
  }
  function placeVineDecoration(dirX, dirY, stemWidth){
    const decorSize = Math.max(1, vineDecorSize);
    const angleJitter = (vineRotationJitter/100) * Math.PI;
    const baseAngle = Math.atan2(dirY, dirX) + Math.PI/2; // one perpendicular to the stem
    const sideAngle = baseAngle + (vineNextLeafSide < 0 ? Math.PI : 0); // flip to the other side
    vineNextLeafSide *= -1; // alternate every placement
    const angle = sideAngle + (Math.random()*2-1)*angleJitter;

    const usingStamp = selectedStampIndex !== null && stamps[selectedStampIndex];
    // Offset far enough that the decoration sits at the stem's edge rather than overlapping
    // its center — the old stemWidth*0.3 offset was often smaller than the stem's own radius
    // (stemWidth/2), so the decoration's center landed inside the stem itself. For the
    // procedural leaf this uses its exact base-point geometry (drawVineLeaf's teardrop has its
    // "base" at local x=-l*0.6, where l=decorSize*0.65); a stamp is centered with no base-point
    // concept, so it uses a simpler generic fraction of its own size instead.
    const offsetDist = usingStamp
      ? stemWidth/2 + decorSize*0.35
      : stemWidth/2 + decorSize*0.65*0.6;
    const px = vineTipX + Math.cos(angle)*offsetDist;
    const py = vineTipY + Math.sin(angle)*offsetDist;

    if(!layers[activeLayer]) return;
    if(usingStamp){
      const st = stamps[selectedStampIndex];
      const mask = getActiveStampMask(st);
      const built = mask ? buildTintedStamp(mask, decorSize, fgColor) : null;
      if(built){
        const pX = (st && st.pivotX !== undefined) ? st.pivotX : 0.5;
        const pY = (st && st.pivotY !== undefined) ? st.pivotY : 0.5;
        const rawX = seamlessModeEnabled ? (px + W) : px;
        const rawY = seamlessModeEnabled ? (py + H) : py;
        const effW = getEffectiveCanvasW();
        const effH = getEffectiveCanvasH();
        const normX = seamlessModeEnabled ? (((px % W) + W) % W) : px;
        const normY = seamlessModeEnabled ? (((py % H) + H) % H) : py;
        const offsets = seamlessModeEnabled ? [
          [0,0], [-W,0], [W,0],
          [0,-H], [-W,-H], [W,-H],
          [0,H], [-W,H], [W,H]
        ] : [[0,0]];
        for (let offset of offsets) {
          const tx = normX + offset[0];
          const ty = normY + offset[1];
          const bounds = getRotatedRectBounds(tx, ty, built.w, built.h, angle, pX, pY);
          if (bounds.x >= W || bounds.y >= H || bounds.x + bounds.w <= 0 || bounds.y + bounds.h <= 0) continue;
          paintNoBlend(layers[activeLayer].ctx, W, H, bounds.x, bounds.y, bounds.w, bounds.h, (sctx)=>{
            sctx.globalAlpha = opacity/100;
            drawBuiltStamp(sctx, built.canvas, built.w, built.h, tx, ty, angle, pX, pY, built.srcW, built.srcH);
          });
        }
        const nearOrInMargin = rawX < built.w || rawX > effW - built.w || rawY < built.h || rawY > effH - built.h;
        if(nearOrInMargin){
          marginHasContent = true;
          const bounds = getRotatedRectBounds(rawX + MARGIN_PX, rawY + MARGIN_PX, built.w, built.h, angle, pX, pY);
          paintNoBlend(mfCtx, effW + MARGIN_PX*2, effH + MARGIN_PX*2, bounds.x, bounds.y, bounds.w, bounds.h, (sctx)=>{
            sctx.globalAlpha = opacity/100;
            drawBuiltStamp(sctx, built.canvas, built.w, built.h, rawX + MARGIN_PX, rawY + MARGIN_PX, angle, pX, pY, built.srcW, built.srcH);
          });
        }
      }
    } else {
      drawVineLeaf(px, py, decorSize, angle);
    }
  }
  function vineGrowTo(targetX, targetY){
    // Grows the stem from the current tip toward (targetX,targetY) — ONLY as far as this single
    // call's target actually is, driven by real drag distance rather than any timer. Holding
    // still (no new target) never extends the vine further, matching a normal brush stroke.
    const stemWidth = Math.max(1, brushSize);
    const step = Math.max(1, stemWidth*0.3);
    const totalDx = targetX - vineTipX, totalDy = targetY - vineTipY;
    const totalDist = Math.sqrt(totalDx*totalDx + totalDy*totalDy);
    if(totalDist < step) return; // not enough accumulated movement yet for even one real step —
                                  // NOT forcing a minimum here is what actually fixes tiny/jittery
                                  // movements looping: vineTipX/Y simply don't move yet, so the
                                  // unconsumed distance naturally carries into the next call
                                  // instead of forcing a full step-sized jump every single time
    if(!vineHasDirection){
      // First step of a fresh stroke — point straight at the target instead of blending from
      // an arbitrary starting direction, which would otherwise waste the first several steps
      // moving the wrong way before the 70/30 blend gradually catches up (a real undershoot,
      // not just a cosmetic wobble — a fast drag would visibly lag behind the cursor).
      vineDirX = totalDx/totalDist; vineDirY = totalDy/totalDist;
      vineHasDirection = true;
    }
    const maxTurnRad = (vineMaxTurnPct/100) * Math.PI;
    const steps = Math.floor(totalDist / step);
    for(let i=0; i<steps; i++){
      const toX = targetX - vineTipX, toY = targetY - vineTipY;
      const toLen = Math.sqrt(toX*toX+toY*toY) || 1;
      const prevDirX = vineDirX, prevDirY = vineDirY;
      let sx = prevDirX*0.7 + (toX/toLen)*0.3;
      let sy = prevDirY*0.7 + (toY/toLen)*0.3;
      const wobble = (Math.random()-0.5) * 0.4 * (vineMaxTurnPct/100); // gentle organic waver,
      // scaled down at low Max Turn settings too — otherwise wobble's own magnitude (up to
      // ~11.5°) routinely exceeds a small turn cap on its own, so the clamp below would end up
      // maxing out in a random direction almost every step regardless of the actual steering
      // target, which is what was still producing loops even at the lowest Max Turn setting
      const cosA = Math.cos(wobble), sinA = Math.sin(wobble);
      let rdx = sx*cosA - sy*sinA, rdy = sx*sinA + sy*cosA;
      const rlen = Math.sqrt(rdx*rdx+rdy*rdy) || 1;
      rdx/=rlen; rdy/=rlen;
      // Cap how far the direction can turn this single step — without this, a small jittery
      // drag can whip the direction around almost instantly, since each step re-targets the
      // (tiny, noisy) mouse delta, producing a tight loop. At 100% the cap is a full 180° and
      // never actually restricts anything (matching the original unclamped behavior).
      const prevAngle = Math.atan2(prevDirY, prevDirX);
      const rawAngle = Math.atan2(rdy, rdx);
      let angleDiff = rawAngle - prevAngle;
      while(angleDiff > Math.PI) angleDiff -= Math.PI*2;
      while(angleDiff < -Math.PI) angleDiff += Math.PI*2;
      const clampedDiff = Math.max(-maxTurnRad, Math.min(maxTurnRad, angleDiff));
      const newAngle = prevAngle + clampedDiff;
      vineDirX = Math.cos(newAngle); vineDirY = Math.sin(newAngle);

      const newX = vineTipX + vineDirX*step, newY = vineTipY + vineDirY*step;
      let drawX = (vineTipX+newX)/2;
      let drawY = (vineTipY+newY)/2;
      if ((pathStyle === "90" || pathStyle === "45") && stemWidth <= 1.5) {
        drawX = newX;
        drawY = newY;
      }
      let vineProgress = null;
      if (sourceKind === 'gradient' && gradientOrdered && gradientSequentialStepMode === 'distance') {
        const cycleL = Math.max(10, gradientCycleLength);
        vineProgress = (strokeDistance % cycleL) / cycleL;
      }
      drawVineNode(drawX, drawY, stemWidth, null, 1.0, vineProgress);
      strokeDistance += step;
      vineTipX = newX; vineTipY = newY;

      // Spawn offshoot organically
      if (!isGrowingOffshoot && vineOffshootDensity > 0) {
        const offshootChance = (vineOffshootDensity / 100) * 0.08;
        if (Math.random() < offshootChance) {
          isGrowingOffshoot = true;
          const side = Math.random() < 0.5 ? 1 : -1;
          const branchAngle = Math.atan2(vineDirY, vineDirX) + side * (Math.PI / 4 + Math.random() * Math.PI / 4);
          const branchLen = vineOffshootLength * (0.4 + Math.random() * 0.6);

          let offX = vineTipX, offY = vineTipY;
          let offDirX = Math.cos(branchAngle), offDirY = Math.sin(branchAngle);
          const offStemWidth = stemWidth * 0.45; // thinner offshoot!
          const offStep = Math.max(1, offStemWidth * 0.4);
          const offSteps = Math.ceil(branchLen / offStep);
          
          let offDistSinceDecoration = 0;
          let offNextDecorationAt = vineNextDecorationDistance() * 0.7; // closer leaves for offshoots!
          
          for (let j = 0; j < offSteps; j++) {
            const wiggle = (Math.random() - 0.5) * 0.4;
            const cosA = Math.cos(wiggle), sinA = Math.sin(wiggle);
            let rdx = offDirX * cosA - offDirY * sinA;
            let rdy = offDirX * sinA + offDirY * cosA;
            const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
            offDirX = rdx / rlen;
            offDirY = rdy / rlen;
            
            const nextOffX = offX + offDirX * offStep;
            const nextOffY = offY + offDirY * offStep;
            
            drawVineNode((offX + nextOffX) / 2, (offY + nextOffY) / 2, offStemWidth);
            offX = nextOffX;
            offY = nextOffY;
            
            offDistSinceDecoration += offStep;
            if (offDistSinceDecoration >= offNextDecorationAt) {
              const origTipX = vineTipX, origTipY = vineTipY;
              vineTipX = offX; vineTipY = offY;
              placeVineDecoration(offDirX, offDirY, offStemWidth);
              vineTipX = origTipX; vineTipY = origTipY;
              
              offDistSinceDecoration = 0;
              offNextDecorationAt = vineNextDecorationDistance() * 0.7;
            }
          }
          isGrowingOffshoot = false;
        }
      }

      vineDistSinceDecoration += step;
      if(vineDistSinceDecoration >= vineNextDecorationAt){
        placeVineDecoration(vineDirX, vineDirY, stemWidth);
        vineDistSinceDecoration = 0;
        vineNextDecorationAt = vineNextDecorationDistance();
      }
    }
  }

  function seededRandom() {
    const x = Math.sin(vineSeed++) * 10000;
    return x - Math.floor(x);
  }

  let isDrawingPathSegments = false;

  function drawFullVineSegments(segments) {
    const layer = layers[activeLayer];
    if (!layer || !layer.ctx) return;
    
    // Clear and restore base canvas
    layer.ctx.clearRect(0, 0, W, H);
    if (vineSessionBackupCanvas) {
      layer.ctx.drawImage(vineSessionBackupCanvas, 0, 0);
    }

    if (segments.length === 0) return;

    isDrawingPathSegments = true;
    try {
      vineSeed = 42; // reset seed for consistent redrawing of existing segments

      let totalLength = 0;
      const segmentData = [];
      for (const pts of segments) {
        const isCurve = (pts.length === 3);
        const startPt = pts[0];
        const controlPt = isCurve ? pts[2] : null;
        const endPt = pts[1];
        
        let segLength = 0;
        if (isCurve) {
          let prevX = startPt.x, prevY = startPt.y;
          for (let i = 1; i <= 100; i++) {
            const t = i / 100;
            const mt = 1 - t;
            const x = mt * mt * startPt.x + 2 * mt * t * controlPt.x + t * t * endPt.x;
            const y = mt * mt * startPt.y + 2 * mt * t * controlPt.y + t * t * endPt.y;
            const dx = x - prevX, dy = y - prevY;
            segLength += Math.sqrt(dx*dx + dy*dy);
            prevX = x; prevY = y;
          }
        } else {
          const dx = endPt.x - startPt.x, dy = endPt.y - startPt.y;
          segLength = Math.sqrt(dx*dx + dy*dy);
        }
        
        segmentData.push({
          pts,
          isCurve,
          startPt,
          controlPt,
          endPt,
          length: segLength,
          startLengthOffset: totalLength
        });
        totalLength += segLength;
      }

      if (totalLength === 0) return;

      const baseStemWidth = Math.max(1, brushSize);
      const step = Math.max(1, baseStemWidth * 0.3);

      function seededVineNextDecorationDistance(){
        const densityVal = vineDensity/100;
        const base = 100 - densityVal*80;
        return Math.max(8, base * (0.7 + seededRandom()*0.6));
      }

      let totalSteps = 0;
      for (const sd of segmentData) {
        totalSteps += Math.ceil(sd.length / step);
      }

      // Initialize state
      const firstPt = segmentData[0].startPt;
      vineTipX = firstPt.x;
      vineTipY = firstPt.y;
      vineHasDirection = false;
      vineDistSinceDecoration = 0;
      vineNextDecorationAt = seededVineNextDecorationDistance();
      vineNextLeafSide = 1;

      // Draw first node with taper/jitter
      const firstJitter = 1 + (seededRandom() - 0.5) * (vineSizeJitter / 100);
      let firstTaper = 1;
      if (paintTaperEnabled) {
        const fStart = paintTaperStart ? 0 : 1;
        const fFinish = paintTaperFinish ? (totalSteps / paintTaperLength) : 1;
        firstTaper = Math.min(1, fStart, fFinish);
      }
      let firstSizeTaper = 1;
      if (paintTaperEnabled) {
        firstSizeTaper = (paintTaperSizePct / 100) + (1 - paintTaperSizePct / 100) * firstTaper;
      }

      let firstSpreadTaper = 1;
      if (paintTaperEnabled) {
        firstSpreadTaper = (paintTaperSpreadPct / 100) + (1 - paintTaperSpreadPct / 100) * firstTaper;
      }
      const firstOpacityTaper = (paintTaperEnabled && paintTaperOpacityFade) ? firstTaper : 1.0;

      drawVineNode(
        vineTipX,
        vineTipY,
        Math.max(1, baseStemWidth * 0.4 * firstSizeTaper * firstJitter),
        Math.max(1, baseStemWidth * 0.4 * firstSpreadTaper),
        firstOpacityTaper,
        0.0
      );

      let currentStepIndex = 0;
      for (const sd of segmentData) {
        const numSteps = Math.ceil(sd.length / step);
        for (let i = 1; i <= numSteps; i++) {
          const t = i / numSteps;
          let tx, ty;
          if (sd.isCurve) {
            const mt = 1 - t;
            tx = mt * mt * sd.startPt.x + 2 * mt * t * sd.controlPt.x + t * t * sd.endPt.x;
            ty = mt * mt * sd.startPt.y + 2 * mt * t * sd.controlPt.y + t * t * sd.endPt.y;
          } else {
            tx = sd.startPt.x + (sd.endPt.x - sd.startPt.x) * t;
            ty = sd.startPt.y + (sd.endPt.y - sd.startPt.y) * t;
          }

          const localDist = t * sd.length;
          const distAlongPath = sd.startLengthOffset + localDist;
          let progress;
          if (sourceKind === 'gradient' && gradientOrdered && gradientSequentialStepMode === 'distance') {
            const cycleL = Math.max(10, gradientCycleLength);
            progress = (distAlongPath % cycleL) / cycleL;
          } else {
            progress = totalLength > 0 ? (distAlongPath / totalLength) : 0;
          }

          // Taper multipliers
          let factorStart = 1;
          if (paintTaperEnabled && paintTaperStart) {
            factorStart = Math.min(1, currentStepIndex / paintTaperLength);
          }
          let factorFinish = 1;
          if (paintTaperEnabled && paintTaperFinish) {
            factorFinish = Math.min(1, (totalSteps - 1 - currentStepIndex) / paintTaperLength);
          }
          const taperFactor = Math.min(factorStart, factorFinish);

          currentStepIndex++;

          let sizeTaperFactor = 1;
          if (paintTaperEnabled) {
            sizeTaperFactor = (paintTaperSizePct / 100) + (1 - paintTaperSizePct / 100) * taperFactor;
          }

          let spreadTaperFactor = 1;
          if (paintTaperEnabled) {
            spreadTaperFactor = (paintTaperSpreadPct / 100) + (1 - paintTaperSpreadPct / 100) * taperFactor;
          }
          const opacityTaperFactor = (paintTaperEnabled && paintTaperOpacityFade) ? taperFactor : 1.0;

          // Size jitter factor
          const jitterFactor = 1 + (seededRandom() - 0.5) * (vineSizeJitter / 100);

          const currentStemWidth = Math.max(1, baseStemWidth * sizeTaperFactor * jitterFactor);
          const currentSpread = baseStemWidth * spreadTaperFactor;

          customVineGrowTo(
            tx, ty,
            currentStemWidth,
            currentSpread,
            sizeTaperFactor,
            spreadTaperFactor,
            opacityTaperFactor,
            taperFactor,
            jitterFactor,
            seededVineNextDecorationDistance,
            progress
          );
        }
      }
    } finally {
      isDrawingPathSegments = false;
    }
  }

  function customVineGrowTo(targetX, targetY, stemWidth, spread, sizeTaperFactor, spreadTaperFactor, opacityTaperFactor, rawTaperFactor, jitterFactor, seededDistFn, progress = null) {
    const step = Math.max(1, stemWidth * 0.3);
    const totalDx = targetX - vineTipX, totalDy = targetY - vineTipY;
    const totalDist = Math.sqrt(totalDx*totalDx + totalDy*totalDy);
    if(totalDist < step) return;

    if(!vineHasDirection){
      vineDirX = totalDx/totalDist; vineDirY = totalDy/totalDist;
      vineHasDirection = true;
    }
    const maxTurnRad = (vineMaxTurnPct/100) * Math.PI;
    const steps = Math.floor(totalDist / step);
    for(let i=0; i<steps; i++){
      const toX = targetX - vineTipX, toY = targetY - vineTipY;
      const toLen = Math.sqrt(toX*toX+toY*toY) || 1;
      const prevDirX = vineDirX, prevDirY = vineDirY;
      
      if (pathStyle === '90' || pathStyle === '45') {
        vineDirX = toX / toLen;
        vineDirY = toY / toLen;
      } else {
        let sx = prevDirX*0.7 + (toX/toLen)*0.3;
        let sy = prevDirY*0.7 + (toY/toLen)*0.3;
        const wobble = (seededRandom()-0.5) * 0.4 * (vineMaxTurnPct/100);
        const cosA = Math.cos(wobble), sinA = Math.sin(wobble);
        let rdx = sx*cosA - sy*sinA, rdy = sx*sinA + sy*cosA;
        const rlen = Math.sqrt(rdx*rdx+rdy*rdy) || 1;
        rdx/=rlen; rdy/=rlen;

        const prevAngle = Math.atan2(prevDirY, prevDirX);
        const rawAngle = Math.atan2(rdy, rdx);
        let angleDiff = rawAngle - prevAngle;
        while(angleDiff > Math.PI) angleDiff -= Math.PI*2;
        while(angleDiff < -Math.PI) angleDiff += Math.PI*2;
        const clampedDiff = Math.max(-maxTurnRad, Math.min(maxTurnRad, angleDiff));
        const newAngle = prevAngle + clampedDiff;
        vineDirX = Math.cos(newAngle); vineDirY = Math.sin(newAngle);
      }

      const newX = vineTipX + vineDirX*step, newY = vineTipY + vineDirY*step;
      let drawX = (vineTipX+newX)/2;
      let drawY = (vineTipY+newY)/2;
      if ((pathStyle === "90" || pathStyle === "45") && stemWidth <= 1.5) {
        drawX = newX;
        drawY = newY;
      }
      drawVineNode(drawX, drawY, stemWidth, spread, opacityTaperFactor, progress);
      vineTipX = newX; vineTipY = newY;

      // Spawn offshoot organically
      if (!isGrowingOffshoot && vineOffshootDensity > 0) {
        const offshootChance = (vineOffshootDensity / 100) * 0.08;
        if (seededRandom() < offshootChance) {
          isGrowingOffshoot = true;
          const side = seededRandom() < 0.5 ? 1 : -1;
          const branchAngle = (pathStyle === '90' || pathStyle === '45')
            ? Math.atan2(vineDirY, vineDirX) + side * (Math.PI / 2)
            : Math.atan2(vineDirY, vineDirX) + side * (Math.PI / 4 + seededRandom() * Math.PI / 4);
          const branchLen = vineOffshootLength * (0.4 + seededRandom() * 0.6);

          let offX = vineTipX, offY = vineTipY;
          let offDirX = Math.cos(branchAngle), offDirY = Math.sin(branchAngle);
          
          const offshootSizePct = (+document.getElementById('vineOffshootSizeSlider')?.value || 45) / 100;
          const offStemWidth = Math.max(1, stemWidth * offshootSizePct);
          const offStep = Math.max(1, offStemWidth * 0.4);
          const offSteps = Math.ceil(branchLen / offStep);
          
          let offDistSinceDecoration = 0;
          let offNextDecorationAt = seededDistFn() * 0.7;
          
          for (let j = 0; j < offSteps; j++) {
            const wiggle = (pathStyle === '90' || pathStyle === '45') ? 0 : (seededRandom() - 0.5) * 0.4;
            const cosA = Math.cos(wiggle), sinA = Math.sin(wiggle);
            let rdx = offDirX * cosA - offDirY * sinA;
            let rdy = offDirX * sinA + offDirY * cosA;
            const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
            offDirX = rdx / rlen;
            offDirY = rdy / rlen;
            
            const nextOffX = offX + offDirX * offStep;
            const nextOffY = offY + offDirY * offStep;
            
            let offTaperFactor = 1;
            if (paintTaperEnabled) {
              offTaperFactor = 1 - (j / offSteps);
            }
            let offSizeTaper = 1;
            if (paintTaperEnabled) {
              offSizeTaper = (paintTaperSizePct / 100) + (1 - paintTaperSizePct / 100) * offTaperFactor;
            }

            let offSpreadTaper = 1;
            if (paintTaperEnabled) {
              offSpreadTaper = (paintTaperSpreadPct / 100) + (1 - paintTaperSpreadPct / 100) * offTaperFactor;
            }
            const offOpacityTaper = (paintTaperEnabled && paintTaperOpacityFade) ? offTaperFactor : 1.0;
            
            const currentOffWidth = Math.max(1, offStemWidth * offSizeTaper);
            const currentOffSpread = offStemWidth * offSpreadTaper;

            drawVineNode(
              (offX + nextOffX) / 2,
              (offY + nextOffY) / 2,
              currentOffWidth,
              currentOffSpread,
              opacityTaperFactor * offOpacityTaper,
              progress
            );
            offX = nextOffX;
            offY = nextOffY;
            
            offDistSinceDecoration += offStep;
            if (vineEnableDecorations && offDistSinceDecoration >= offNextDecorationAt) {
              const origTipX = vineTipX, origTipY = vineTipY;
              vineTipX = offX; vineTipY = offY;
              
              customPlaceVineDecoration(
                offDirX,
                offDirY,
                currentOffWidth,
                rawTaperFactor * offSizeTaper * jitterFactor,
                progress
              );
              vineTipX = origTipX; vineTipY = origTipY;
              
              offDistSinceDecoration = 0;
              offNextDecorationAt = seededDistFn() * 0.7;
            }
          }
          isGrowingOffshoot = false;
        }
      }

      vineDistSinceDecoration += step;
      if(vineEnableDecorations && vineDistSinceDecoration >= vineNextDecorationAt){
        customPlaceVineDecoration(vineDirX, vineDirY, stemWidth, rawTaperFactor * jitterFactor, progress);
        vineDistSinceDecoration = 0;
        vineNextDecorationAt = seededDistFn();
      }
    }
  }

  function resolveDecorationColor(progress) {
    const sprayColors = getSprayColors();
    if (sourceKind === 'gradient') {
      const t = (progress !== null && progress !== undefined) ? progress : (gradientOrdered ? 0.0 : Math.random());
      return blendColors(sprayColors, t);
    } else {
      if (progress !== null && progress !== undefined && sprayColors.length > 0) {
        return sprayColors[Math.min(sprayColors.length - 1, Math.floor(progress * sprayColors.length))];
      }
      return fgColor;
    }
  }

  function customPlaceVineDecoration(dirX, dirY, stemWidth, sizeScaleFactor, progress = null){
    const decorSize = Math.max(1, vineDecorSize * sizeScaleFactor);
    const angleJitter = (vineRotationJitter/100) * Math.PI;
    const baseAngle = Math.atan2(dirY, dirX) + Math.PI/2;
    const sideAngle = baseAngle + (vineNextLeafSide < 0 ? Math.PI : 0);
    vineNextLeafSide *= -1;
    const angle = sideAngle + (seededRandom()*2-1)*angleJitter;

    const decorColor = resolveDecorationColor(progress);

    const usingStamp = vineDecorationType.startsWith('stamp-');
    const isBasicShape = vineDecorationType.startsWith('shape-') && vineDecorationType !== 'shape-leaf';

    // Offset far enough that the decoration sits at the stem's edge rather than overlapping
    const offsetDist = (usingStamp || isBasicShape)
      ? stemWidth/2 + decorSize*0.35
      : stemWidth/2 + decorSize*0.65*0.6;
    const px = vineTipX + Math.cos(angle)*offsetDist;
    const py = vineTipY + Math.sin(angle)*offsetDist;

    if(!layers[activeLayer]) return;

    if(usingStamp){
      const stampIdx = parseInt(vineDecorationType.substring(6));
      const st = stamps[stampIdx];
      if (st) {
        const mask = getActiveStampMask(st);
        const built = mask ? buildTintedStamp(mask, decorSize, decorColor) : null;
        if(built){
          const pX = (st && st.pivotX !== undefined) ? st.pivotX : 0.5;
          const pY = (st && st.pivotY !== undefined) ? st.pivotY : 0.5;
          const rawX = seamlessModeEnabled ? (px + W) : px;
          const rawY = seamlessModeEnabled ? (py + H) : py;
          const effW = getEffectiveCanvasW();
          const effH = getEffectiveCanvasH();
          const isCore = (rawX >= 0 && rawX <= effW && rawY >= 0 && rawY <= effH);
          if(isCore){
            const normX = seamlessModeEnabled ? (((px % W) + W) % W) : px;
            const normY = seamlessModeEnabled ? (((py % H) + H) % H) : py;
            const offsets = seamlessModeEnabled ? [
              [0,0], [-W,0], [W,0],
              [0,-H], [-W,-H], [W,-H],
              [0,H], [-W,H], [W,H]
            ] : [[0,0]];
            for (let offset of offsets) {
              const tx = normX + offset[0];
              const ty = normY + offset[1];
              const ctx = layers[activeLayer].ctx;
              ctx.save();
              ctx.globalAlpha = opacity/100;
              drawBuiltStamp(ctx, built.canvas, built.w, built.h, tx, ty, angle, pX, pY);
              ctx.restore();
            }
          }
        }
      }
    } else if(isBasicShape){
      const shapeName = vineDecorationType.substring(6);
      const rawX = seamlessModeEnabled ? (px + W) : px;
      const rawY = seamlessModeEnabled ? (py + H) : py;
      const effW = getEffectiveCanvasW();
      const effH = getEffectiveCanvasH();
      const isCore = (rawX >= 0 && rawX <= effW && rawY >= 0 && rawY <= effH);
      if(isCore){
        const normX = seamlessModeEnabled ? (((px % W) + W) % W) : px;
        const normY = seamlessModeEnabled ? (((py % H) + H) % H) : py;
        const offsets = seamlessModeEnabled ? [
          [0,0], [-W,0], [W,0],
          [0,-H], [-W,-H], [W,-H],
          [0,H], [-W,H], [W,H]
        ] : [[0,0]];
        for (let offset of offsets) {
          const tx = normX + offset[0];
          const ty = normY + offset[1];
          const ctx = layers[activeLayer].ctx;
          ctx.save();
          ctx.globalAlpha = opacity/100;
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          ctx.fillStyle = decorColor;
          drawVectorPrimitivePath(ctx, shapeName, 0, 0, decorSize, decorSize);
          ctx.restore();
        }
      }
    } else {
      drawVineLeaf(px, py, decorSize, angle, decorColor);
    }
  }

  function commitVineSegment(points) {
    if (points.length < 2) return;
    
    pathSegments.push(points);
    drawFullVineSegments(pathSegments);

    const endPt = points[1];

    // Now endPt becomes the new start point for continuous path
    pathPoints = [endPt];
    pathState = 'start_placed';
    clearPreviewCanvas();
    render();
    refreshLayerThumbOnly();
    updatePathOverlayToolbar();
  }

  function commitVinePath(points) {
    if (points.length < 2) return;
    pushHistory();
    commitVineSegment(points);
    finishCurrentPath();
  }

  function finishCurrentPath(useCurrentCurveMouseCoords = null) {
    if (pathPoints.length >= 2) {
      if (pathState === 'end_placed') {
        if (useCurrentCurveMouseCoords) {
          commitVineSegment([pathPoints[0], pathPoints[1], useCurrentCurveMouseCoords]);
        } else {
          commitVineSegment([pathPoints[0], pathPoints[1]]);
        }
      }
    }
    pathPoints = [];
    pathSegments = [];
    vineSessionBackupCanvas = null;
    pathState = 'idle';
    pathUndoSnapshot = null;
    clearPreviewCanvas();
    hideOverlayLabel();
    updatePathOverlayToolbar();
    render();
    refreshLayerThumbOnly();
  }

  function cancelCurrentPath(){
    if(pathUndoSnapshot){
      restore(pathUndoSnapshot);
      pathUndoSnapshot = null;
    }
    if(undoStack.length > 0) {
      undoStack.pop();
      updateHistoryButtons();
    }
    pathPoints = [];
    pathSegments = [];
    vineSessionBackupCanvas = null;
    pathState = 'idle';
    clearPreviewCanvas();
    hideOverlayLabel();
    updatePathOverlayToolbar();
    render();
  }

  function updatePathOverlayToolbar(){
    const toolbar = document.getElementById('pathOverlayToolbar');
    if(!toolbar) return;
    if(pathState !== 'idle' && isPathTool()){
      if(toolbar.style.display === 'none' || !toolbar.style.display){
        toolbar.style.display = 'block';
        if (!toolbar.style.left || !toolbar.style.top) {
          const popupRect = toolbar.getBoundingClientRect();
          const canvasWrap = document.getElementById('canvasWrap');
          const canvasRect = canvasWrap ? canvasWrap.getBoundingClientRect() : { right: window.innerWidth, top: 0 };
          toolbar.style.left = Math.max(10, canvasRect.right - (popupRect.width || 140) - 20) + 'px';
          toolbar.style.top = (canvasRect.top + 20) + 'px';
        }
      }
    } else {
      toolbar.style.display = 'none';
      toolbar.style.left = '';
      toolbar.style.top = '';
    }
  }

  function drawFreehandPathPreview(mx, my, rawX = undefined, rawY = undefined) {
    if (!pctx) return;
    hideOverlayLabel();
    clearPreviewCanvas();

    const lw = 2 / zoom;
    const dotR = 4 / zoom;

    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);
    
    pctx.fillStyle = 'var(--accent, #4f46e5)';
    pctx.strokeStyle = '#ffffff';
    pctx.lineWidth = 1.5 / zoom;

    const toDispX = (xVal) => seamlessModeEnabled ? (xVal + W) : xVal;
    const toDispY = (yVal) => seamlessModeEnabled ? (yVal + H) : yVal;

    const curDispX = (seamlessModeEnabled && rawX !== undefined) ? rawX : toDispX(mx);
    const curDispY = (seamlessModeEnabled && rawY !== undefined) ? rawY : toDispY(my);

    // Draw lines between accumulated points
    if (pathPoints.length > 0) {
      pctx.strokeStyle = 'var(--accent, #4f46e5)';
      pctx.lineWidth = lw;
      pctx.beginPath();
      pctx.moveTo(toDispX(pathPoints[0].x), toDispY(pathPoints[0].y));
      for (let i = 1; i < pathPoints.length; i++) {
        pctx.lineTo(toDispX(pathPoints[i].x), toDispY(pathPoints[i].y));
      }
      // Also draw line to current cursor
      if (mx !== undefined && my !== undefined) {
        pctx.lineTo(curDispX, curDispY);
      }
      pctx.stroke();

      // Draw dashed white overlay line for high visibility
      pctx.strokeStyle = '#ffffff';
      pctx.setLineDash([4/zoom, 4/zoom]);
      pctx.beginPath();
      pctx.moveTo(toDispX(pathPoints[0].x), toDispY(pathPoints[0].y));
      for (let i = 1; i < pathPoints.length; i++) {
        pctx.lineTo(toDispX(pathPoints[i].x), toDispY(pathPoints[i].y));
      }
      if (mx !== undefined && my !== undefined) {
        pctx.lineTo(curDispX, curDispY);
      }
      pctx.stroke();
    }

    // Draw dots at accumulated nodes
    pctx.fillStyle = '#ffca28';
    pctx.strokeStyle = '#ffffff';
    pctx.lineWidth = 1 / zoom;
    pathPoints.forEach((pt) => {
      const px = toDispX(pt.x);
      const py = toDispY(pt.y);
      pctx.beginPath();
      pctx.arc(px, py, dotR, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
    });

    pctx.restore();
  }

  function drawPathPreview(mx, my, rawX = undefined, rawY = undefined) {
    if (!pctx) return;
    hideOverlayLabel();
    clearPreviewCanvas();

    const lw = 2 / zoom;
    const dotR = 5 / zoom;

    pctx.save();
    pctx.translate(MARGIN_PX, MARGIN_PX);
    
    pctx.fillStyle = 'var(--accent, #4f46e5)';
    pctx.strokeStyle = '#ffffff';
    pctx.lineWidth = 1.5 / zoom;

    const toDispX = (xVal) => seamlessModeEnabled ? (xVal + W) : xVal;
    const toDispY = (yVal) => seamlessModeEnabled ? (yVal + H) : yVal;

    const curDispX = (seamlessModeEnabled && rawX !== undefined) ? rawX : toDispX(mx);
    const curDispY = (seamlessModeEnabled && rawY !== undefined) ? rawY : toDispY(my);

    pathPoints.forEach((pt) => {
      const px = toDispX(pt.x);
      const py = toDispY(pt.y);
      pctx.beginPath();
      pctx.arc(px, py, dotR, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
    });

    if (pathState === 'start_placed') {
      const ptA = pathPoints[0];
      const dispPtA_X = toDispX(ptA.x);
      const dispPtA_Y = toDispY(ptA.y);
      let snappedX = curDispX, snappedY = curDispY;
      if (pathStyle === '90') {
        const dx = Math.abs(curDispX - dispPtA_X);
        const dy = Math.abs(curDispY - dispPtA_Y);
        if (dx > dy) {
          snappedY = dispPtA_Y;
        } else {
          snappedX = dispPtA_X;
        }
      } else if (pathStyle === '45') {
        const dx = curDispX - dispPtA_X;
        const dy = curDispY - dispPtA_Y;
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.sqrt(dx*dx + dy*dy);
        snappedX = dispPtA_X + Math.cos(angle) * dist;
        snappedY = dispPtA_Y + Math.sin(angle) * dist;
      }
      
      pctx.strokeStyle = 'var(--accent, #4f46e5)';
      pctx.lineWidth = lw;
      pctx.beginPath();
      pctx.moveTo(dispPtA_X, dispPtA_Y);
      pctx.lineTo(snappedX, snappedY);
      pctx.stroke();

      pctx.strokeStyle = '#ffffff';
      pctx.setLineDash([4/zoom, 4/zoom]);
      pctx.beginPath();
      pctx.moveTo(dispPtA_X, dispPtA_Y);
      pctx.lineTo(snappedX, snappedY);
      pctx.stroke();

      const r = brushSize / 2;
      pctx.setLineDash([]);
      pctx.strokeStyle = '#ffffff';
      pctx.beginPath(); pctx.arc(snappedX, snappedY, r, 0, Math.PI*2); pctx.stroke();
      pctx.strokeStyle = '#000000';
      pctx.setLineDash([3/zoom, 3/zoom]);
      pctx.beginPath(); pctx.arc(snappedX, snappedY, r, 0, Math.PI*2); pctx.stroke();

    } else if (pathState === 'end_placed') {
      const ptA = pathPoints[0];
      const ptB = pathPoints[1];
      const dispPtA_X = toDispX(ptA.x);
      const dispPtA_Y = toDispY(ptA.y);
      const dispPtB_X = toDispX(ptB.x);
      const dispPtB_Y = toDispY(ptB.y);

      pctx.strokeStyle = 'var(--accent, #4f46e5)';
      pctx.lineWidth = lw;
      pctx.beginPath();
      pctx.moveTo(dispPtA_X, dispPtA_Y);
      pctx.quadraticCurveTo(curDispX, curDispY, dispPtB_X, dispPtB_Y);
      pctx.stroke();

      pctx.strokeStyle = '#ffffff';
      pctx.setLineDash([4/zoom, 4/zoom]);
      pctx.beginPath();
      pctx.moveTo(dispPtA_X, dispPtA_Y);
      pctx.quadraticCurveTo(curDispX, curDispY, dispPtB_X, dispPtB_Y);
      pctx.stroke();

      pctx.lineWidth = 1 / zoom;
      pctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
      pctx.setLineDash([2/zoom, 2/zoom]);
      pctx.beginPath();
      pctx.moveTo(dispPtA_X, dispPtA_Y);
      pctx.lineTo(curDispX, curDispY);
      pctx.lineTo(dispPtB_X, dispPtB_Y);
      pctx.stroke();

      pctx.fillStyle = '#10b981';
      pctx.strokeStyle = '#ffffff';
      pctx.setLineDash([]);
      pctx.beginPath();
      pctx.arc(curDispX, curDispY, dotR * 0.8, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
    }

    pctx.restore();
  }
  function brushSoftenLoop(now){
    if(!painting || tool !== 'brush' || brushMode !== 'blur'){ brushSoftenRAF = null; return; }
    const interval = 60; // ms between applications while held — keeps softening even without movement
    if(now - brushSoftenLastTick >= interval){
      brushSoftenLastTick = now;
      const hbx = lastX - brushSize, hby = lastY - brushSize, hbd = brushSize*2;
      withHeightMask(hbx, hby, hbd, hbd, ()=> genBlurBrushAt(lastX, lastY, brushShape, brushSize));
      render();
    }
    brushSoftenRAF = requestAnimationFrame(brushSoftenLoop);
  }

  function drawVectorPrimitivePath(c, shp, cx, cy, w, h){
    c.beginPath();
    if(shp === 'triangle'){
      c.moveTo(cx, cy - h/2);
      c.lineTo(cx + w/2, cy + h/2);
      c.lineTo(cx - w/2, cy + h/2);
      c.closePath();
      c.fill();
    } else if(shp === 'diamond'){
      c.moveTo(cx, cy - h/2);
      c.lineTo(cx + w/2, cy);
      c.lineTo(cx, cy + h/2);
      c.lineTo(cx - w/2, cy);
      c.closePath();
      c.fill();
    } else if(shp === 'star'){
      const rx = w/2;
      const ry = h/2;
      for(let i=0; i<10; i++){
        const rFactor = (i % 2 === 0) ? 1.0 : 0.4;
        const ang = (i * Math.PI / 5) - Math.PI/2;
        const x = cx + Math.cos(ang) * rx * rFactor;
        const y = cy + Math.sin(ang) * ry * rFactor;
        if(i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
    } else if(shp === 'hexagon'){
      const rx = w/2, ry = h/2;
      for(let i=0; i<6; i++){
        const ang = (i * Math.PI / 3) - Math.PI/2;
        const x = cx + Math.cos(ang) * rx;
        const y = cy + Math.sin(ang) * ry;
        if(i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
    } else if(shp === 'ring'){
      c.ellipse(cx, cy, Math.max(0.5, w/2), Math.max(0.5, h/2), 0, 0, Math.PI*2);
      c.ellipse(cx, cy, Math.max(0.2, w/4), Math.max(0.2, h/4), 0, 0, Math.PI*2, true);
      c.fill();
    } else if(shp === 'heart'){
      const rx = w/2, ry = h/2;
      c.moveTo(cx, cy + ry*0.6);
      c.bezierCurveTo(cx - rx*1.2, cy - ry*0.2, cx - rx*0.8, cy - ry*0.9, cx, cy - ry*0.3);
      c.bezierCurveTo(cx + rx*0.8, cy - ry*0.9, cx + rx*1.2, cy - ry*0.2, cx, cy + ry*0.6);
      c.closePath();
      c.fill();
    } else if(shp === 'leaf'){
      const l = w * 0.65, lw = h * 0.5;
      c.moveTo(cx + l, cy);
      c.quadraticCurveTo(cx + l*0.3, cy + lw, cx - l*0.6, cy);
      c.quadraticCurveTo(cx + l*0.3, cy - lw, cx + l, cy);
      c.closePath();
      c.fill();
    } else if(shp === 'line'){
      const th = Math.max(1, h/4);
      c.rect(cx - w/2, cy - th/2, w, th);
      c.fill();
    } else if(shp === 'square'){
      c.rect(cx - w/2, cy - h/2, w, h);
      c.fill();
    } else {
      c.ellipse(cx, cy, Math.max(0.5, w/2), Math.max(0.5, h/2), 0, 0, Math.PI*2);
      c.fill();
    }
  }

  const pixelShapeMaskCache = new Map();
  const MAX_SHAPE_MASK_CACHE = 256;

  function getPixelShapeMask(shape, sw, sh) {
    const key = `${shape}_${sw}_${sh}`;
    let maskCanvas = pixelShapeMaskCache.get(key);
    if (!maskCanvas) {
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = sw;
      maskCanvas.height = sh;
      const sctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      sctx.fillStyle = '#ffffff';
      drawVectorPrimitivePath(sctx, shape, sw/2, sh/2, sw, sh);

      const imgData = sctx.getImageData(0, 0, sw, sh);
      const d = imgData.data;
      for(let i = 0; i < d.length; i += 4){
        if(d[i+3] >= 128){
          d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = 255;
        } else {
          d[i+3] = 0;
        }
      }
      sctx.putImageData(imgData, 0, 0);

      pixelShapeMaskCache.set(key, maskCanvas);
      if (pixelShapeMaskCache.size > MAX_SHAPE_MASK_CACHE) {
        const oldestKey = pixelShapeMaskCache.keys().next().value;
        pixelShapeMaskCache.delete(oldestKey);
      }
    }
    return maskCanvas;
  }

  function drawDabShape(ctx, px, py, dW, dH, color, rotAngle, alpha){
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    if(dW <= 1.5 && dH <= 1.5){
      ctx.fillRect(Math.round(px - 0.5), Math.round(py - 0.5), 1, 1);
      return;
    }
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = !pixelPerfect;

    const finalPx = pixelPerfect ? Math.round(px) : px;
    const finalPy = pixelPerfect ? Math.round(py) : py;
    const finalDW = pixelPerfect ? Math.max(1, Math.round(dW)) : dW;
    const finalDH = pixelPerfect ? Math.max(1, Math.round(dH)) : dH;
    const normRot = rotAngle || 0;
    const hasRot = Math.abs(normRot) >= 0.0008;

    if(dabShape === 'stamp' && selectedStampIndex !== null && stamps[selectedStampIndex]){
      const st = stamps[selectedStampIndex];
      const pX = (st.pivotX !== undefined) ? st.pivotX : 0.5;
      const pY = (st.pivotY !== undefined) ? st.pivotY : 0.5;
      let targetW = finalDW;
      let targetH = finalDH;
      if (dabLockAspect) {
        const mask = getActiveStampMask(st);
        if (mask && mask.width && mask.height) {
          const aspect = mask.width / mask.height;
          const size = Math.max(finalDW, finalDH);
          if (aspect >= 1) {
            targetW = size;
            targetH = size / aspect;
          } else {
            targetH = size;
            targetW = size * aspect;
          }
        }
      }
      drawStampDab(ctx, getActiveStampMask(st), finalPx, finalPy, targetW, targetH, color, normRot, pX, pY);
    } else if(dabShape === 'square' && pixelPerfect && !hasRot){
      const rx = Math.round(finalPx - finalDW/2);
      const ry = Math.round(finalPy - finalDH/2);
      ctx.fillRect(rx, ry, finalDW, finalDH);
    } else if(pixelPerfect){
      if (hasRot) {
        const rot = getRotatedShapeCanvas(dabShape, finalDW, finalDH, normRot, color);
        if (rot) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(rot.canvas, 0, 0, rot.w, rot.h, finalPx - rot.pivotOffsetX, finalPy - rot.pivotOffsetY, rot.w, rot.h);
          ctx.restore();
        }
      } else {
        const sw = Math.min(STAMP_SCRATCH_MAX, Math.max(1, Math.round(finalDW)));
        const sh = Math.min(STAMP_SCRATCH_MAX, Math.max(1, Math.round(finalDH)));
        const mask = getPixelShapeMask(dabShape, sw, sh);
        const built = buildTintedStamp(mask, sw, sh, color);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(built.canvas, 0, 0, built.srcW, built.srcH, Math.round(finalPx - sw/2), Math.round(finalPy - sh/2), sw, sh);
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.translate(px, py);
      if (hasRot) ctx.rotate(normRot);
      ctx.fillStyle = color;
      drawVectorPrimitivePath(ctx, dabShape, 0, 0, dW, dH);
      ctx.restore();
    }
    ctx.imageSmoothingEnabled = prevSmoothing;
  }



  function sprayDabs(x, y, overrideSize = null, overrideSpread = null, overrideOpacityMul = 1.0, progress = null){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;

    let taperFactor = 1;
    if (paintTaperEnabled && isPathTool() && overrideSize === null) {
      if (paintTaperStart) {
        const estimatedDabs = strokeDistance / Math.max(1, brushSize * 0.3);
        taperFactor = Math.min(1, estimatedDabs / paintTaperLength);
      }
    }

    let sizeTaperFactor = 1;
    if (paintTaperEnabled && isPathTool() && overrideSize === null) {
      sizeTaperFactor = (paintTaperSizePct / 100) + (1 - paintTaperSizePct / 100) * taperFactor;
    }

    let spreadTaperFactor = 1;
    if (paintTaperEnabled && isPathTool() && overrideSize === null) {
      spreadTaperFactor = (paintTaperSpreadPct / 100) + (1 - paintTaperSpreadPct / 100) * taperFactor;
    }

    const opacityTaperFactor = (paintTaperEnabled && isPathTool() && overrideSize === null && paintTaperOpacityFade) ? taperFactor : 1.0;

    const effBrushSize = (overrideSize !== null) ? overrideSize : (brushSize * sizeTaperFactor);
    const effSpread = (overrideSpread !== null) ? overrideSpread : (brushSize * spreadTaperFactor);
    const currentDabMax = Math.max(dabWidth, dabHeight);

    const getRandom = () => (typeof isDrawingPathSegments !== 'undefined' && isDrawingPathSegments) ? seededRandom() : Math.random();

    if(sprayMode === 'blur'){
      const radius = effSpread/2;
      const f = falloff/100;
      const power = 0.5 + f*6;
      const n = dabsPerTick(brushSize);
      const TWO_PI = Math.PI * 2;
      withHeightMask(x-radius-currentDabMax, y-radius-currentDabMax, (radius+currentDabMax)*2, (radius+currentDabMax)*2, ()=>{
        for(let i=0;i<n;i++){
          const ang = getRandom()*TWO_PI;
          const dist = Math.pow(getRandom(), power) * radius;
          genBlurBrushAt(x + Math.cos(ang)*dist, y + Math.sin(ang)*dist, dabShape, currentDabMax);
        }
      });
      return;
    }

    const radius = effSpread/2;
    const sprayColors = getSprayColors();
    const f = falloff/100;
    const power = 0.5 + f*6;
    const n = dabsPerTick(brushSize);

    const maxDabScale = (Math.max(sizeJitterMin, sizeJitterMax) / 100) * (Math.max(dabWidthJitterMin, dabWidthJitterMax, dabHeightJitterMin, dabHeightJitterMax) / 100);
    const maxDabDim = currentDabMax * maxDabScale;

    const applyDabToCanvas = (targetCtx, cw, ch, px, py, dabColor, rotAngle, dW, dH, opMul, isMarginCall = false, clearCellRect = null) => {
      const dabAlpha = Math.max(0, Math.min(1, opMul));
      
      let targetW = dW;
      let targetH = dH;
      let pX = 0.5;
      let pY = 0.5;
      
      if(dabShape === 'stamp' && selectedStampIndex !== null && stamps[selectedStampIndex]){
        const st = stamps[selectedStampIndex];
        pX = (st.pivotX !== undefined) ? st.pivotX : 0.5;
        pY = (st.pivotY !== undefined) ? st.pivotY : 0.5;
        if (dabLockAspect) {
          const mask = getActiveStampMask(st);
          if (mask && mask.width && mask.height) {
            const aspect = mask.width / mask.height;
            const size = Math.max(dW, dH);
            if (aspect >= 1) {
              targetW = size;
              targetH = size / aspect;
            } else {
              targetH = size;
              targetW = size * aspect;
            }
          }
        }
      }

      if (isMarginCall) {
        if(clearCellRect){
          targetCtx.clearRect(clearCellRect.x, clearCellRect.y, clearCellRect.w, clearCellRect.h);
        }
        const bounds = getRotatedRectBounds(px, py, targetW, targetH, rotAngle, pX, pY);
        const drawDabFn = (sctx) => {
          sctx.globalAlpha = (opacity/100) * dabAlpha;
          if(Math.max(dW, dH) > 1 && dabShape === 'stamp' && selectedStampIndex !== null && stamps[selectedStampIndex]){
            const st = stamps[selectedStampIndex];
            const mask = getActiveStampMask(st);
            const built = mask ? buildTintedStamp(mask, targetW, targetH, dabColor) : null;
            if (built) {
              drawBuiltStamp(sctx, built.canvas, built.w, built.h, px, py, rotAngle, pX, pY, built.srcW, built.srcH);
            } else {
              drawDabShape(sctx, px, py, dW, dH, dabColor, rotAngle, 1);
            }
          } else {
            drawDabShape(sctx, px, py, dW, dH, dabColor, rotAngle, 1);
          }
        };
        if(sprayMode === 'eraser'){
          paintEraserDab(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, drawDabFn);
        } else if(sprayMode === 'colorize'){
          paintColorizeDab(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, dabColor, drawDabFn);
        } else if(sprayCombineSameColor){
          paintCombineSameColor(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, dabColor, drawDabFn);
        } else {
          paintNoBlend(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, drawDabFn, dabColor);
        }
        return;
      }

      const dabRawX = seamlessModeEnabled ? (px + W) : px;
      const dabRawY = seamlessModeEnabled ? (py + H) : py;
      const effW = getEffectiveCanvasW();
      const effH = getEffectiveCanvasH();

      const normPx = seamlessModeEnabled ? (((px % W) + W) % W) : px;
      const normPy = seamlessModeEnabled ? (((py % H) + H) % H) : py;

      const normCellX = (clearCellRect && seamlessModeEnabled) ? (((clearCellRect.x % W) + W) % W) : (clearCellRect ? clearCellRect.x : 0);
      const normCellY = (clearCellRect && seamlessModeEnabled) ? (((clearCellRect.y % H) + H) % H) : (clearCellRect ? clearCellRect.y : 0);

      const offsets = seamlessModeEnabled ?
        [
          [0,0], [-W,0], [W,0],
          [0,-H], [-W,-H], [W,-H],
          [0,H], [-W,H], [W,H]
        ] : [[0,0]];

      for (let offset of offsets) {
        const tx = normPx + offset[0];
        const ty = normPy + offset[1];

        if(clearCellRect){
          const cx_ = normCellX + offset[0];
          const cy_ = normCellY + offset[1];
          targetCtx.clearRect(cx_, cy_, clearCellRect.w, clearCellRect.h);
        }

        const bounds = getRotatedRectBounds(tx, ty, targetW, targetH, rotAngle, pX, pY);
        if (bounds.x >= W || bounds.y >= H || bounds.x + bounds.w <= 0 || bounds.y + bounds.h <= 0) continue;

        const drawDabFn = (sctx) => {
          sctx.globalAlpha = (opacity/100) * dabAlpha;
          if(Math.max(dW, dH) > 1 && dabShape === 'stamp' && selectedStampIndex !== null && stamps[selectedStampIndex]){
            const st = stamps[selectedStampIndex];
            const mask = getActiveStampMask(st);
            const built = mask ? buildTintedStamp(mask, targetW, targetH, dabColor) : null;
            if (built) {
              drawBuiltStamp(sctx, built.canvas, built.w, built.h, tx, ty, rotAngle, pX, pY, built.srcW, built.srcH);
            } else {
              drawDabShape(sctx, tx, ty, dW, dH, dabColor, rotAngle, 1);
            }
          } else {
            drawDabShape(sctx, tx, ty, dW, dH, dabColor, rotAngle, 1);
          }
        };

        if(sprayMode === 'eraser'){
          paintEraserDab(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, drawDabFn);
        } else if(sprayMode === 'colorize'){
          paintColorizeDab(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, dabColor, drawDabFn);
        } else if(sprayCombineSameColor){
          paintCombineSameColor(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, dabColor, drawDabFn);
        } else {
          paintNoBlend(targetCtx, cw, ch, bounds.x, bounds.y, bounds.w, bounds.h, drawDabFn, dabColor);
        }
      }

      const nearOrInMargin = dabRawX < maxDabDim || dabRawX > effW - maxDabDim || dabRawY < maxDabDim || dabRawY > effH - maxDabDim;
      if(nearOrInMargin){
        marginHasContent = true;
        const marginClearCell = clearCellRect ? {
          x: (seamlessModeEnabled ? (clearCellRect.x + W) : clearCellRect.x) + MARGIN_PX,
          y: (seamlessModeEnabled ? (clearCellRect.y + H) : clearCellRect.y) + MARGIN_PX,
          w: clearCellRect.w,
          h: clearCellRect.h
        } : null;
        applyDabToCanvas(mfCtx, effW + MARGIN_PX*2, effH + MARGIN_PX*2, dabRawX + MARGIN_PX, dabRawY + MARGIN_PX, dabColor, rotAngle, dW, dH, opMul, true, marginClearCell);
      }
    };

    const TWO_PI = Math.PI * 2;
    const executeDabs = () => {
      for(let i=0; i<n; i++){
        let t = getRandom();
        if (sourceKind === 'gradient' && gradientOrdered) {
          if (progress !== null && progress !== undefined) {
            t = progress;
          } else {
            const cycleL = Math.max(10, gradientCycleLength);
            t = (strokeDistance % cycleL) / cycleL;
          }
        }

        const ang = getRandom()*TWO_PI;
        const dist = (radius < 1) ? 0 : Math.pow(getRandom(), power) * radius;
        let px = x + Math.cos(ang)*dist;
        let py = y + Math.sin(ang)*dist;

        // Snap dabs to grid if enabled
        let snappedGridCell = null;
        if(spraySnapToGrid){
          let gw = 16, gh = 16, ox = 0, oy = 0;
          if(grids && grids.length > 0){
            const g = grids.find(g => g.visible) || grids[0];
            if(g && g.spacing >= 1){
              gw = g.spacing;
              gh = g.spacing;
              ox = g.offsetX || 0;
              oy = g.offsetY || 0;
            }
          }
          const normOx = ((ox % gw) + gw) % gw;
          const normOy = ((oy % gh) + gh) % gh;
          const cellX = Math.floor((px - normOx) / gw) * gw + normOx;
          const cellY = Math.floor((py - normOy) / gh) * gh + normOy;
          px = cellX + gw/2;
          py = cellY + gh/2;
          if(spraySnapClearCell){
            snappedGridCell = { x: cellX, y: cellY, w: gw, h: gh };
          }
        }

        let color;
        if (sourceKind === 'gradient' && gradientOrdered && gradientSequentialStepMode === 'dabs' && progress === null) {
          const stopIndex = Math.floor(paintDabCounter / gradientDabsPerColor) % sprayColors.length;
          color = sprayColors[stopIndex];
          paintDabCounter++;
        } else {
          color = (sourceKind === 'gradient') ? blendColors(sprayColors, t) : randomFromColors(sprayColors);
        }

        // Opacity Jitter Range
        const opMul = ((opacityJitterMin + getRandom() * (opacityJitterMax - opacityJitterMin)) / 100) * overrideOpacityMul * opacityTaperFactor;

        // Size Jitter (Overall) Range
        const scaleBaseW = (sizeJitterMin + getRandom() * (sizeJitterMax - sizeJitterMin)) / 100;
        const scaleBaseH = dabLockAspect ? scaleBaseW : ((sizeJitterMin + getRandom() * (sizeJitterMax - sizeJitterMin)) / 100);

        // Dab Width & Height Jitter Ranges
        const scaleWJitter = (dabWidthJitterMin + getRandom() * (dabWidthJitterMax - dabWidthJitterMin)) / 100;
        const scaleHJitter = dabLockAspect ? scaleWJitter : ((dabHeightJitterMin + getRandom() * (dabHeightJitterMax - dabHeightJitterMin)) / 100);

        const scaleOverride = (overrideSize !== null) ? (overrideSize / brushSize) : 1;
        const dW = Math.max(1, dabWidth * scaleBaseW * scaleWJitter * scaleOverride);
        const dH = Math.max(1, dabHeight * scaleBaseH * scaleHJitter * scaleOverride);

        // Rotation Calculation based on Mode & Multiple Ranges
        let rotAngle = 0;
        let minDeg = 0;
        let maxDeg = 0;
        if(rotationRanges && rotationRanges.length > 0){
          const chosenRange = rotationRanges[Math.floor(getRandom() * rotationRanges.length)];
          minDeg = (chosenRange && typeof chosenRange.min === 'number') ? chosenRange.min : rotationMinAngle;
          maxDeg = (chosenRange && typeof chosenRange.max === 'number') ? chosenRange.max : rotationMaxAngle;
        } else {
          minDeg = rotationMinAngle;
          maxDeg = rotationMaxAngle;
        }

        let rangeDeg;
        if(minDeg <= maxDeg){
          rangeDeg = minDeg + getRandom() * (maxDeg - minDeg);
        } else {
          const span = (maxDeg + 360 - minDeg);
          rangeDeg = minDeg + getRandom() * span;
          if(rangeDeg > 180) rangeDeg -= 360;
        }
        const rangeRad = rangeDeg * Math.PI / 180;

        if(rotationMode === 'toward' && sprayTargetAnchorX !== null && sprayTargetAnchorY !== null){
          const baseAngle = Math.atan2(sprayTargetAnchorY - py, sprayTargetAnchorX - px) + Math.PI/2;
          rotAngle = baseAngle + rangeRad;
        } else if(rotationMode === 'away' && sprayTargetAnchorX !== null && sprayTargetAnchorY !== null){
          const baseAngle = Math.atan2(sprayTargetAnchorY - py, sprayTargetAnchorX - px) - Math.PI/2;
          rotAngle = baseAngle + rangeRad;
        } else {
          rotAngle = rangeRad;
        }

        applyDabToCanvas(ctx, W, H, px, py, color, rotAngle, dW, dH, opMul, false, snappedGridCell);
      }
    };

    if (seamlessModeEnabled) {
      withHeightMask(0, 0, W, H, executeDabs);
    } else {
      withHeightMask(x - radius - maxDabDim, y - radius - maxDabDim, (radius + maxDabDim)*2, (radius + maxDabDim)*2, executeDabs);
    }
  }

  // ---------- Palettize ----------
  const BAYER4 = [
    [0,8,2,10],
    [12,4,14,6],
    [3,11,1,9],
    [15,7,13,5]
  ];
  let palettizeSourceKind = 'full';
  let palettizeGradientIndex = null;
  function getPalettizeColors(){
    if(palettizeSourceKind === 'gradient' && palettizeGradientIndex !== null && gradients[palettizeGradientIndex]){
      return gradients[palettizeGradientIndex].stops;
    }
    if(palettizeSourceKind === 'selected' && selectedColors.size > 0){
      return allColors().filter(hex => selectedColors.has(hex));
    }
    return allColors();
  }
  function populatePalettizeGradientDropdown(){
    const sel = document.getElementById('palettizeGradientSelect');
    const gradOption = document.getElementById('palettizeSourceSelect').querySelector('option[value="gradient"]');
    sel.innerHTML = '';
    gradOption.disabled = (gradients.length === 0);
    if(gradients.length === 0){
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = 'No gradients saved yet';
      sel.appendChild(opt);
      palettizeGradientIndex = null;
      if(palettizeSourceKind === 'gradient'){
        palettizeSourceKind = 'full';
        document.getElementById('palettizeSourceSelect').value = 'full';
        sel.style.display = 'none';
      }
      return;
    }
    gradients.forEach((g, idx)=>{
      const opt = document.createElement('option');
      opt.value = idx; opt.textContent = g.name;
      sel.appendChild(opt);
    });
    if(palettizeGradientIndex === null || palettizeGradientIndex >= gradients.length) palettizeGradientIndex = 0;
    sel.value = palettizeGradientIndex;
  }
  document.getElementById('palettizeSourceSelect').addEventListener('change', e=>{
    palettizeSourceKind = e.target.value;
    document.getElementById('palettizeGradientSelect').style.display = (palettizeSourceKind==='gradient') ? 'block' : 'none';
  });
  document.getElementById('palettizeGradientSelect').addEventListener('change', e=>{
    palettizeGradientIndex = e.target.value === '' ? null : +e.target.value;
  });
  function palettizeLayer(useDither){
    if(!layers[activeLayer]) return;
    const colors = getPalettizeColors();
    if(colors.length === 0){ alert('Add at least one color to the chosen source first.'); return; }
    pushHistory();
    const ctx = layers[activeLayer].ctx;
    const imgData = ctx.getImageData(0,0,W,H);
    const data = imgData.data;
    const pal = colors.map(hexToRgb);
    const ditherStrength = 24;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const idx = (y*W+x)*4;
        const a = data[idx+3];
        if(a === 0) continue;
        let r = data[idx], g = data[idx+1], b = data[idx+2];
        if(useDither){
          const t = ((BAYER4[y%4][x%4] / 16) - 0.5) * ditherStrength;
          r = Math.max(0, Math.min(255, r + t));
          g = Math.max(0, Math.min(255, g + t));
          b = Math.max(0, Math.min(255, b + t));
        }
        let best = 0, bestDist = Infinity;
        for(let i=0;i<pal.length;i++){
          const dr=r-pal[i].r, dg=g-pal[i].g, db=b-pal[i].b;
          const dist = dr*dr+dg*dg+db*db;
          if(dist<bestDist){ bestDist=dist; best=i; }
        }
        data[idx] = pal[best].r; data[idx+1] = pal[best].g; data[idx+2] = pal[best].b;
      }
    }
    ctx.putImageData(imgData,0,0);
    render();
    refreshLayerPanel();
  }
  document.getElementById('palettizeBtn').addEventListener('click', ()=>{
    palettizeLayer(document.getElementById('ditherCheckbox').checked);
  });

  // ---------- Pointer handling (paint + pan) ----------
  function isPanMode(){ return tool === 'pan' || toolBeforeSpace !== null; }

  function snap45(ax, ay, tx, ty){
    const dx = tx-ax, dy = ty-ay;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if(dist < 0.01) return {x:tx, y:ty};
    const angle = Math.atan2(dy, dx);
    const snapStep = Math.PI/4; // 45°
    const snappedAngle = Math.round(angle/snapStep)*snapStep;
    return { x: ax + Math.cos(snappedAngle)*dist, y: ay + Math.sin(snappedAngle)*dist };
  }
  function paintBrushLine(ax, ay, tx, ty){
    const hbx = Math.min(ax,tx) - brushSize, hby = Math.min(ay,ty) - brushSize;
    const hbw = Math.abs(tx-ax) + brushSize*2, hbh = Math.abs(ty-ay) + brushSize*2;
    if(brushMode === 'blur'){
      genBlurLastX = ax; genBlurLastY = ay;
      withHeightMask(hbx, hby, hbw, hbh, ()=> genBlurLineTo(tx, ty, brushShape, brushSize));
    } else if(brushShape === 'stamp'){
      brushStampLastX = ax; brushStampLastY = ay;
      withHeightMask(hbx, hby, hbw, hbh, ()=> brushStampLineTo(tx, ty));
    } else if(brushShape === 'circle'){
      brushCircleLastX = ax; brushCircleLastY = ay;
      withHeightMask(hbx, hby, hbw, hbh, ()=> brushCircleLineTo(tx, ty));
    } else {
      withHeightMask(hbx, hby, hbw, hbh, ()=>{
        ppReset();
        ppFeed({gx: Math.floor(ax), gy: Math.floor(ay)}, stampBrushCell);
        bresenhamLine(Math.floor(ax), Math.floor(ay), Math.floor(tx), Math.floor(ty), (gx,gy)=>{
          ppFeed({gx,gy}, stampBrushCell);
        });
        ppFlush(stampBrushCell);
      });
    }
  }
  function paintSprayLine(x1, y1, x2, y2){
    if(isPixelPerfectLineActive()){
      ppReset();
      bresenhamLine(Math.floor(x1), Math.floor(y1), Math.floor(x2), Math.floor(y2), (gx, gy)=>{
        ppFeedCell({ gx, gy });
      });
      return;
    }
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const spacing = Math.max(1, brushSize * 0.25);
    const steps = Math.max(1, Math.round(dist / spacing));
    const startStrokeDist = strokeDistance;
    for(let i=0; i<=steps; i++){
      const t = (steps === 0) ? 0 : i/steps;

      let factorStart = 1;
      if (paintTaperEnabled && isPathTool() && paintTaperStart) {
        factorStart = Math.min(1, i / paintTaperLength);
      }
      let factorFinish = 1;
      if (paintTaperEnabled && isPathTool() && paintTaperFinish) {
        factorFinish = Math.min(1, (steps - i) / paintTaperLength);
      }
      const taperFactor = Math.min(factorStart, factorFinish);

      let sizeTaperFactor = 1;
      if (paintTaperEnabled && isPathTool()) {
        sizeTaperFactor = (paintTaperSizePct / 100) + (1 - paintTaperSizePct / 100) * taperFactor;
      }

      let spreadTaperFactor = 1;
      if (paintTaperEnabled && isPathTool()) {
        spreadTaperFactor = (paintTaperSpreadPct / 100) + (1 - paintTaperSpreadPct / 100) * taperFactor;
      }

      const opacityTaperFactor = (paintTaperEnabled && isPathTool() && paintTaperOpacityFade) ? taperFactor : 1.0;

      const overrideSize = Math.max(1, brushSize * sizeTaperFactor);
      const overrideSpread = brushSize * spreadTaperFactor;

      let progressVal = null;
      if (sourceKind === 'gradient' && gradientOrdered && gradientSequentialStepMode === 'distance') {
        const cycleL = Math.max(10, gradientCycleLength);
        const currentDist = startStrokeDist + (dist * t);
        progressVal = (currentDist % cycleL) / cycleL;
      }

      sprayDabs(x1 + dx*t, y1 + dy*t, overrideSize, overrideSpread, opacityTaperFactor, progressVal);
    }
    strokeDistance += dist;
  }
  function pointerDown(e){
    e.preventDefault();

    if(isPlaying){ stopPlayback(); return; }
    syncHeightEditSwap();

    if (isPathTool()) {
      if (pathState !== 'idle' && e.button === 1) {
        e.preventDefault();
        finishCurrentPath();
        return;
      }
      if (e.button === 0) {
        if (layers[activeLayer] && !layers[activeLayer].visible) {
          return; // don't paint onto a hidden layer
        }
        const {x, y, rawX, rawY} = canvasCoords(e);
        const effW = getEffectiveCanvasW();
        const effH = getEffectiveCanvasH();
        const margin = MARGIN_PX;
        const isInsideMargin = (rawX >= -margin && rawX <= effW + margin && rawY >= -margin && rawY <= effH + margin);
        if (!isInsideMargin) return;

        if (pathStyle === "freehand") {
          pathUndoSnapshot = snapshot();
          pushHistory();

          // Backup current active layer canvas state
          if (!vineSessionBackupCanvas) {
            vineSessionBackupCanvas = document.createElement('canvas');
          }
          vineSessionBackupCanvas.width = W;
          vineSessionBackupCanvas.height = H;
          const backupCtx = vineSessionBackupCanvas.getContext('2d', { willReadFrequently: true });
          backupCtx.clearRect(0, 0, W, H);
          const layer = layers[activeLayer];
          if (layer && layer.canvas) {
            backupCtx.drawImage(layer.canvas, 0, 0);
          }
          pathSegments = [];
          pathPoints = [{x, y}];
          painting = true; // initiate drag painting
          lastX = x; lastY = y;
          return;
        }

        if (pathState === 'idle') {
          pathUndoSnapshot = snapshot();
          pushHistory();

          // Backup current active layer canvas state
          if (!vineSessionBackupCanvas) {
            vineSessionBackupCanvas = document.createElement('canvas');
          }
          vineSessionBackupCanvas.width = W;
          vineSessionBackupCanvas.height = H;
          const backupCtx = vineSessionBackupCanvas.getContext('2d', { willReadFrequently: true });
          backupCtx.clearRect(0, 0, W, H);
          const layer = layers[activeLayer];
          if (layer && layer.canvas) {
            backupCtx.drawImage(layer.canvas, 0, 0);
          }
          pathSegments = [];

          pathPoints = [{x, y}];
          pathState = 'start_placed';
          drawPathPreview(x, y, rawX, rawY);
          updatePathOverlayToolbar();
        } else if (pathState === 'start_placed') {
          if (pathStyle === '90' || pathStyle === '45') {
            const ptA = pathPoints[0];
            const dx = x - ptA.x;
            const dy = y - ptA.y;
            let snappedX = x, snappedY = y;
            if (pathStyle === '90') {
              if (Math.abs(dx) > Math.abs(dy)) {
                snappedY = ptA.y;
              } else {
                snappedX = ptA.x;
              }
            } else if (pathStyle === '45') {
              const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
              const dist = Math.sqrt(dx*dx + dy*dy);
              snappedX = ptA.x + Math.cos(angle) * dist;
              snappedY = ptA.y + Math.sin(angle) * dist;
            }
            pathPoints.push({x: snappedX, y: snappedY});
            commitVineSegment(pathPoints);
          } else {
            pathPoints.push({x, y});
            pathState = 'end_placed';
            drawPathPreview(x, y, rawX, rawY);
            updatePathOverlayToolbar();
          }
        } else if (pathState === 'end_placed') {
          pathPoints.push({x, y});
          commitVineSegment(pathPoints);
        }
        return;
      }
    }

    if(e.button === 1 || e.button === 2 || isPanMode()){
      panning = true;
      panStart = { x: e.clientX, y: e.clientY, scrollLeft: canvasWrap.scrollLeft, scrollTop: canvasWrap.scrollTop };
      displayCanvas.classList.add('panning');
      canvasWrap.classList.add('panning');
      hideLoupe();
      return;
    }

    if(pendingColorPick || tool === 'colorpick'){
      const {x,y} = canvasCoords(e);
      const hex = sampleCanvasColorAt(x, y);
      hideLoupe();
      if(pendingColorPick){
        const cb = pendingColorPick;
        pendingColorPick = null;
        canvasWrap.style.cursor = '';
        if(hex) cb(hex);
        if(previousToolBeforePick){
          const returnTool = previousToolBeforePick;
          previousToolBeforePick = null;
          setTool(returnTool);
        }
        return;
      }
      if(tool === 'colorpick'){
        if(hex) selectPaletteColorByHex(hex);
        return;
      }
    }

    if(tool === 'select'){
      const {x,y} = canvasCoords(e);
      if(floatingSelection &&
         x >= floatingSelection.x && x <= floatingSelection.x+floatingSelection.w &&
         y >= floatingSelection.y && y <= floatingSelection.y+floatingSelection.h){
        // Already floating (from a previous lift, or a fresh paste) — just pick it up again,
        // don't re-lift from the layer (its pixels there are already cleared/blank).
        movingSelection = true;
        moveGrabOffsetX = x - floatingSelection.x;
        moveGrabOffsetY = y - floatingSelection.y;
        return;
      }
      anchorFloatingSelection();
      if(selection && selection.w > 0 && selection.h > 0 &&
         x >= selection.x && x <= selection.x+selection.w &&
         y >= selection.y && y <= selection.y+selection.h &&
         layers[activeLayer] && layers[activeLayer].visible && !layers[activeLayer].locked){
        pushHistory();
        const sel = selection;
        const lifted = document.createElement('canvas');
        lifted.width = sel.w; lifted.height = sel.h;
        lifted.getContext('2d', { willReadFrequently: true }).drawImage(layers[activeLayer].canvas, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h);
        layers[activeLayer].ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
        floatingSelection = { canvas: lifted, x: sel.x, y: sel.y, w: sel.w, h: sel.h };
        movingSelection = true;
        moveGrabOffsetX = x - sel.x;
        moveGrabOffsetY = y - sel.y;
        render();
        return;
      }
      selecting = true;
      selectStart = {x,y};
      selection = {x:Math.round(x), y:Math.round(y), w:0, h:0};
      drawSelectionOverlay();
      return;
    }

    if(tool === 'measure'){
      const {x,y} = canvasCoords(e);
      measureStartX = Math.round(x); measureStartY = Math.round(y);
      measuring = true;
      drawMeasurePreview(measureStartX, measureStartY, measureStartX, measureStartY);
      return;
    }

    if(layers[activeLayer] && (!layers[activeLayer].visible || layers[activeLayer].locked)){
      if (layers[activeLayer].locked && typeof showToast === 'function') showToast('Active layer is locked');
      return; // don't paint onto a hidden or locked layer
    }

    const {x,y} = canvasCoords(e);

    if(tool === 'fill'){
      const {x, y, rawX, rawY} = canvasCoords(e);
      const effW = getEffectiveCanvasW();
      const effH = getEffectiveCanvasH();
      if(rawX < 0 || rawX >= effW || rawY < 0 || rawY >= effH) return;
      pushHistory();
      const normX = seamlessModeEnabled ? (((x % W) + W) % W) : x;
      const normY = seamlessModeEnabled ? (((y % H) + H) % H) : y;
      floodFill(normX, normY, fillMode === 'connected', fillTolerance);
      render();
      refreshLayerThumbOnly();
      return;
    }

    if(tool === 'spray'){
      if(e.altKey || settingSprayAnchorMode){
        sprayTargetAnchorX = x;
        sprayTargetAnchorY = y;
        settingSprayAnchorMode = false;
        updateSprayAnchorUI();
        if(typeof showToast === 'function') showToast('Spray Anchor set at (' + Math.round(x) + ', ' + Math.round(y) + ')');
        syncActivePresetSettings();
        render();
        return;
      }
      if(e.shiftKey && sprayLineAnchorX !== null){
        let target = {x, y};
        if(e.ctrlKey) target = snap45(sprayLineAnchorX, sprayLineAnchorY, x, y);
        pushHistory();
        paintSprayLine(sprayLineAnchorX, sprayLineAnchorY, target.x, target.y);
        sprayLineAnchorX = target.x;
        sprayLineAnchorY = target.y;
        render();
        refreshLayerThumbOnly();
        return;
      }
    }

    pushHistory();
    invalidateColorBuffer(layers[activeLayer]);
    painting = true;
    strokeDistance = 0;
    paintDabCounter = 0;
    lastX = x; lastY = y;
    if(tool === 'spray') { sprayLineAnchorX = x; sprayLineAnchorY = y; }

    if(tool === 'spray'){
      sprayBuffer = null;
      sprayBufferCtx = null;
      clearPixiStroke();
      ppReset();
      if(isPixelPerfectLineActive()){
        ppFeedCell({ gx: Math.floor(x), gy: Math.floor(y) });
      } else {
        sprayDabs(x,y);
      }
      sprayAnchorX = x; sprayAnchorY = y;
      render();
      sprayLastBurst = performance.now();
      sprayRAF = requestAnimationFrame(sprayLoop);
    }
  }
  function pointerMove(e){
    if(tool === 'colorpick' || pendingColorPick){
      const {x,y} = canvasCoords(e);
      const margin = MARGIN_PX;
      if(x>=-margin && x<=W+margin && y>=-margin && y<=H+margin){
        updateLoupe(e.clientX, e.clientY, x, y);
      } else {
        hideLoupe();
      }
    } else if(tool === 'spray' || tool === 'vine'){
      const {x, y, rawX, rawY} = canvasCoords(e);
      const effW = getEffectiveCanvasW();
      const effH = getEffectiveCanvasH();
      const margin = MARGIN_PX;
      const isInsideMargin = (rawX >= -margin && rawX <= effW + margin && rawY >= -margin && rawY <= effH + margin);
      if(isInsideMargin){
        if(isPathTool()) {
          if (pathStyle === "freehand" && painting) {
            // Drag preview drawing is done in the painting block to keep it synchronized!
          } else if(pathState !== 'idle') {
            drawPathPreview(x, y, rawX, rawY);
          } else {
            drawVinePreview(x, y, rawX, rawY);
          }
        }
        else drawSprayPreview(x, y, e.shiftKey, rawX, rawY);
      } else {
        clearPreviewCanvas();
        if(isPathTool()) hideOverlayLabel();
      }
    }
    if(panning){
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      canvasWrap.scrollLeft = panStart.scrollLeft - dx;
      canvasWrap.scrollTop = panStart.scrollTop - dy;
      return;
    }
    if(selecting){
      const {x,y} = canvasCoords(e);
      const x0 = Math.min(selectStart.x, x), x1 = Math.max(selectStart.x, x);
      const y0 = Math.min(selectStart.y, y), y1 = Math.max(selectStart.y, y);
      selection = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1-x0), h: Math.round(y1-y0) };
      drawSelectionOverlay();
      return;
    }
    if(measuring){
      const {x,y} = canvasCoords(e);
      drawMeasurePreview(measureStartX, measureStartY, Math.round(x), Math.round(y));
      return;
    }
    if(movingSelection){
      const {x,y} = canvasCoords(e);
      floatingSelection.x = Math.round(x - moveGrabOffsetX);
      floatingSelection.y = Math.round(y - moveGrabOffsetY);
      selection = { x: floatingSelection.x, y: floatingSelection.y, w: floatingSelection.w, h: floatingSelection.h };
      drawSelectionOverlay();
      render();
      return;
    }
    if(!painting) return;
    e.preventDefault();
    const {x,y} = canvasCoords(e);
    if(isPathTool()){
      if (pathStyle === "freehand") {
        const lastPt = pathPoints[pathPoints.length - 1];
        if (lastPt) {
          const dx = x - lastPt.x;
          const dy = y - lastPt.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist >= freehandPathDetail) {
            const newPt = {x, y};
            pathSegments.push([lastPt, newPt]);
            pathPoints.push(newPt);
          }
        }
        const coords = canvasCoords(e);
        drawFreehandPathPreview(x, y, coords.rawX, coords.rawY);
      } else {
        vineGrowTo(x, y);
        lastX = x; lastY = y;
        render();
      }
    } else if(tool === 'spray'){
      if(isPixelPerfectLineActive() && painting){
        bresenhamLine(Math.floor(lastX), Math.floor(lastY), Math.floor(x), Math.floor(y), (gx, gy)=>{
          ppFeedCell({ gx, gy });
        });
        render();
      }
      lastX = x; lastY = y;
    }
  }
  function pointerUp(){
    canvasLightDragging = false;
    ppReset();
    const wasPainting = painting;
    if(tool === 'spray' && painting){ sprayLineAnchorX = lastX; sprayLineAnchorY = lastY; }
    measuring = false;
    painting = false;
    panning = false;
    let layerContentChanged = wasPainting;

    if (wasPainting && pathStyle === "freehand" && isPathTool()) {
      if (pathSegments.length > 0) {
        drawFullVineSegments(pathSegments);
        render();
      }
      pathPoints = [];
      pathSegments = [];
      vineSessionBackupCanvas = null;
      pathState = 'idle';
      pathUndoSnapshot = null;
      clearPreviewCanvas();
      layerContentChanged = true;
    }
    if(selecting){
      selecting = false;
      if(selection){
        let {x,y,w,h} = selection;
        x = Math.max(0, Math.min(x, W));
        y = Math.max(0, Math.min(y, H));
        w = Math.max(0, Math.min(w, W-x));
        h = Math.max(0, Math.min(h, H-y));
        selection = (w >= 1 && h >= 1) ? {x,y,w,h} : null;
      }
      drawSelectionOverlay();
      updateSelectionUI();
    }
    if(movingSelection){
      movingSelection = false;
      updateSelectionUI();
    }
    displayCanvas.classList.remove('panning');
    canvasWrap.classList.remove('panning');
    if(sprayRAF){ cancelAnimationFrame(sprayRAF); sprayRAF = null; }
    sprayAnchorX = null; sprayAnchorY = null;
    if(vineRAF){ cancelAnimationFrame(vineRAF); vineRAF = null; }
    if(brushSoftenRAF){ cancelAnimationFrame(brushSoftenRAF); brushSoftenRAF = null; }
    if(sprayBuffer){
      commitSprayBuffer();
      render();
      layerContentChanged = true;
    }
    if(pixiStrokeActive){
      commitPixiStroke();
      render();
      layerContentChanged = true;
    }
    if(layerContentChanged && layers[activeLayer]) {
      invalidateColorBuffer(layers[activeLayer]);
      refreshLayerThumbOnly();
    }
  }
  function commitSprayBuffer(){
    if(!sprayBuffer || !layers[activeLayer]) return;
    withHeightMask(0, 0, W, H, ()=>{
      const ctx = layers[activeLayer].ctx;
      paintNoBlend(ctx, W, H, 0, 0, W, H, (sctx)=>{
        sctx.globalAlpha = opacity/100;
        sctx.drawImage(sprayBuffer, 0, 0);
      });
    });
    sprayBuffer = null;
    sprayBufferCtx = null;
  }
  function refreshLayerThumbOnly(){
    // Cheap thumb refresh without rebuilding the whole panel/selection state
    refreshLayerPanel();
    refreshFramesPanel();
  }

  canvasWrap.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  canvasWrap.addEventListener('auxclick', e=>{ if(e.button===1) e.preventDefault(); });
  canvasWrap.addEventListener('mousedown', e=>{ if(e.button===1) e.preventDefault(); });
  document.addEventListener('contextmenu', e=> e.preventDefault());
  document.addEventListener('mousedown', e=>{ if(e.button===2) e.preventDefault(); });
  document.addEventListener('auxclick', e=>{ if(e.button===2) e.preventDefault(); });
  canvasWrap.addEventListener('pointerleave', ()=>{ hideLoupe(); });

  // Wheel always zooms over the canvas area, centered on the cursor; native scroll is suppressed entirely
  canvasWrap.addEventListener('wheel', e=>{
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAtPoint(zoom * factor, e.clientX, e.clientY);
  }, { passive:false });

  // ---------- Tool selection ----------
  function isPathTool(){
    return tool === 'vine' || (tool === 'spray' && sprayMode === 'path');
  }

  function updateSprayModeUI(){
    document.querySelectorAll('.shape-btn[data-spray-mode]').forEach(b=>b.classList.toggle('active', b.dataset.sprayMode===sprayMode));
    updateSoftenUI();
    const colorizeGroup = document.getElementById('colorizeOptionsGroup');
    if (colorizeGroup) colorizeGroup.style.display = (sprayMode === 'colorize' || (tool === 'brush' && brushMode === 'colorize')) ? 'block' : 'none';
    const isPathMode = isPathTool();
    const vineOptionsEl = document.getElementById('vineOnlyOptions');
    if (vineOptionsEl) vineOptionsEl.style.display = isPathMode ? 'block' : 'none';
    updatePaintTaperUI();
    updateVineFreehandUI();
    updateGradientOrderedVisibility();
  }

  function setTool(t){
    if(t !== 'select' && floatingSelection) anchorFloatingSelection();
    if(t !== 'colorpick'){
      pendingColorPick = null;
      previousToolBeforePick = null;
      hideLoupe();
    }
    const wasMeasuring = (tool === 'measure');

    let actualTool = t;
    let presetToApply = null;

    if(t === 'brush'){
      actualTool = 'spray';
      presetToApply = 'builtin-brush';
    } else if(t === 'eraser'){
      actualTool = 'spray';
      presetToApply = 'builtin-eraser';
    } else if(t === 'colorize'){
      actualTool = 'spray';
      presetToApply = 'builtin-colorize';
    } else if(t === 'spray' || t === 'paint'){
      actualTool = 'spray';
      if(!activeSprayPresetId || !sprayPresets.some(p => p.id === activeSprayPresetId)){
        activeSprayPresetId = 'builtin-spray';
      }
      const activeP = sprayPresets.find(p => p.id === activeSprayPresetId);
      if(activeP) applySprayPreset(activeP);
    } else if(t === 'vine'){
      actualTool = 'spray';
      sprayMode = 'path';
      if(!activeSprayPresetId || !sprayPresets.some(p => p.id === activeSprayPresetId)){
        activeSprayPresetId = 'builtin-vine-classic';
      }
      const activeP = sprayPresets.find(p => p.id === activeSprayPresetId);
      if(activeP) applySprayPreset(activeP);
    }

    tool = actualTool;

    if(presetToApply){
      const found = sprayPresets.find(p=>p.id===presetToApply);
      if(found) applySprayPreset(found);
    }

    document.querySelectorAll('.tool-row button').forEach(b=>{
      const bt = b.dataset.tool;
      b.classList.toggle('active', bt === 'spray' ? (actualTool === 'spray') : (bt === t));
    });

    document.getElementById('sprayOnlyOptions').style.display = (actualTool === 'spray') ? 'block' : 'none';
    document.getElementById('sizeLabelText').textContent = (actualTool === 'spray') ? 'Spread' : 'Size';
    document.getElementById('fillOnlyOptions').style.display = (actualTool === 'fill') ? 'block' : 'none';
    document.getElementById('selectOnlyOptions').style.display = (actualTool === 'select') ? 'block' : 'none';

    updateSprayModeUI();

    displayCanvas.classList.toggle('pan-cursor', actualTool==='pan');
    canvasWrap.classList.toggle('pan-cursor', actualTool==='pan');
    displayCanvas.classList.toggle('hide-cursor', false);
    canvasWrap.classList.toggle('hide-cursor', false);
    if(actualTool !== 'spray' && pctx) clearPreviewCanvas();
    if(!isPathTool()){
      pathPoints = [];
      pathSegments = [];
      vineSessionBackupCanvas = null;
      pathState = 'idle';
      hideOverlayLabel();
      updatePathOverlayToolbar();
    }
    if(wasMeasuring && actualTool !== 'measure') hideOverlayLabel();
  }
  document.querySelectorAll('.tool-row button').forEach(btn=>{
    btn.addEventListener('click', ()=> setTool(btn.dataset.tool));
  });
  document.getElementById('sprayOnlyOptions').style.display = 'block';
  document.getElementById('fillOnlyOptions').style.display = 'none';
  document.getElementById('fillModeSelect').addEventListener('change', e=>{ fillMode = e.target.value; });
  document.getElementById('fillToleranceSlider').addEventListener('input', e=>{
    fillTolerance = +e.target.value;
    document.getElementById('fillToleranceVal').textContent = fillTolerance;
  });

  document.getElementById('sizeSlider').addEventListener('input', e=>{
    brushSize = +e.target.value;
    document.getElementById('sizeVal').textContent = brushSize;
    updateBrushPixelPerfectAvailability();
    syncActivePresetSettings();
  });
  document.getElementById('opacitySlider').addEventListener('input', e=>{
    opacity = +e.target.value;
    document.getElementById('opacityVal').textContent = opacity + '%';
    syncActivePresetSettings();
  });
  document.getElementById('sourceKindSelect').addEventListener('change', e=>{
    sourceKind = e.target.value;
    document.getElementById('gradientSourceSelect').style.display = (sourceKind==='gradient') ? 'block' : 'none';
    updateSpraySourceHint();
  });
  document.getElementById('gradientSourceSelect').addEventListener('change', e=>{
    selectedGradientIndex = e.target.value === '' ? null : +e.target.value;
    updateSpraySourceHint();
  });
  document.getElementById('gradientOrderedCheckbox').addEventListener('change', e=>{
    gradientOrdered = e.target.checked;
    updateGradientOrderedVisibility();
    syncActivePresetSettings();
  });
  document.getElementById('gradientCycleLengthSlider').addEventListener('input', e=>{
    gradientCycleLength = +e.target.value;
    document.getElementById('gradientCycleLengthVal').textContent = gradientCycleLength;
    syncActivePresetSettings();
  });
  document.querySelectorAll('.shape-btn[data-shape]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.disabled) return;
      document.querySelectorAll('.shape-btn[data-shape]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      dabShape = btn.dataset.shape;
      document.getElementById('stampSourceSelect').style.display = (dabShape==='stamp') ? 'block' : 'none';
      drawStampPivotCanvas();
      syncActivePresetSettings();
    });
  });
  document.getElementById('vineStampSourceSelect').addEventListener('change', e=>{
    vineDecorationType = e.target.value;
    if (vineDecorationType.startsWith('stamp-')) {
      const idx = parseInt(vineDecorationType.substring(6));
      selectedStampIndex = idx;
      const s1 = document.getElementById('stampSourceSelect'); if(s1) s1.value = idx;
      const bss = document.getElementById('brushStampSourceSelect'); if(bss) bss.value = idx;
      refreshStampList();
      drawStampPivotCanvas();
    }
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineDensitySlider').addEventListener('input', e=>{
    vineDensity = +e.target.value;
    document.getElementById('vineDensityVal').textContent = vineDensity + '%';
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineDecorSizeSlider').addEventListener('input', e=>{
    vineDecorSize = +e.target.value;
    document.getElementById('vineDecorSizeVal').textContent = vineDecorSize;
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineRotationJitterSlider').addEventListener('input', e=>{
    vineRotationJitter = +e.target.value;
    document.getElementById('vineRotationJitterVal').textContent = vineRotationJitter + '%';
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineMaxTurnSlider').addEventListener('input', e=>{
    vineMaxTurnPct = +e.target.value;
    document.getElementById('vineMaxTurnVal').textContent = vineMaxTurnPct + '%';
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineOffshootDensitySlider').addEventListener('input', e=>{
    vineOffshootDensity = +e.target.value;
    document.getElementById('vineOffshootDensityVal').textContent = vineOffshootDensity + '%';
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineOffshootLengthSlider').addEventListener('input', e=>{
    vineOffshootLength = +e.target.value;
    document.getElementById('vineOffshootLengthVal').textContent = vineOffshootLength;
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineOffshootSizeSlider').addEventListener('input', e=>{
    vineOffshootSizeSliderVal = +e.target.value;
    document.getElementById('vineOffshootSizeVal').textContent = vineOffshootSizeSliderVal + '%';
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperEnabledCheckbox').addEventListener('change', e=>{
    paintTaperEnabled = e.target.checked;
    updatePaintTaperUI();
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperStartCheckbox').addEventListener('change', e=>{
    paintTaperStart = e.target.checked;
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperFinishCheckbox').addEventListener('change', e=>{
    paintTaperFinish = e.target.checked;
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperLengthSlider').addEventListener('input', e=>{
    paintTaperLength = +e.target.value;
    document.getElementById('paintTaperLengthVal').textContent = paintTaperLength + ' dabs';
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperSizeSlider').addEventListener('input', e=>{
    paintTaperSizePct = +e.target.value;
    document.getElementById('paintTaperSizeVal').textContent = paintTaperSizePct + '%';
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperSpreadSlider').addEventListener('input', e=>{
    paintTaperSpreadPct = +e.target.value;
    document.getElementById('paintTaperSpreadVal').textContent = paintTaperSpreadPct + '%';
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('paintTaperOpacityFadeCheckbox').addEventListener('change', e=>{
    paintTaperOpacityFade = e.target.checked;
    syncActivePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('gradientSequentialStepSelect').addEventListener('change', e=>{
    gradientSequentialStepMode = e.target.value;
    updateGradientOrderedVisibility();
    syncActivePresetSettings();
  });
  document.getElementById('gradientDabsPerColorSlider').addEventListener('input', e=>{
    gradientDabsPerColor = +e.target.value;
    document.getElementById('gradientDabsPerColorVal').textContent = gradientDabsPerColor;
    syncActivePresetSettings();
  });
  document.getElementById('vineSizeJitterSlider').addEventListener('input', e=>{
    vineSizeJitter = +e.target.value;
    document.getElementById('vineSizeJitterVal').textContent = vineSizeJitter + '%';
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineEnableDecorationsCheckbox').addEventListener('change', e=>{
    vineEnableDecorations = e.target.checked;
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('pathStyleSelect').addEventListener('change', e=>{
    pathStyle = e.target.value;
    updateVineFreehandUI();
    syncActiveVinePresetSettings();
    if(pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  });
  document.getElementById('vineFreehandDetailSlider').addEventListener('input', e=>{
    freehandPathDetail = +e.target.value;
    document.getElementById('vineFreehandDetailVal').textContent = freehandPathDetail + 'px';
    syncActiveVinePresetSettings();
  });
  document.querySelectorAll('.shape-btn[data-spray-mode]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      sprayMode = btn.dataset.sprayMode;
      updateSprayModeUI();
      syncActivePresetSettings();
    });
  });
  const pbms = document.getElementById('paintBlendModeSelect');
  if (pbms) {
    pbms.addEventListener('change', e => {
      const v = e.target.value;
      if (v === 'pixel-perfect') {
        pixelPerfect = true;
        sprayCombineSameColor = false;
      } else if (v === 'combine-same') {
        pixelPerfect = false;
        sprayCombineSameColor = true;
      } else {
        pixelPerfect = false;
        sprayCombineSameColor = false;
      }
      syncActivePresetSettings();
    });
  }

  function updateSprayAnchorUI(){
    const statusEl = document.getElementById('sprayAnchorStatus');
    const clearBtn = document.getElementById('clearSprayAnchorBtn');
    if(!statusEl) return;
    if(sprayTargetAnchorX !== null && sprayTargetAnchorY !== null){
      statusEl.textContent = 'Anchor: (' + Math.round(sprayTargetAnchorX) + ', ' + Math.round(sprayTargetAnchorY) + ')';
      if(clearBtn) clearBtn.style.display = 'inline-block';
    } else {
      statusEl.textContent = 'Anchor: None (Alt+Click on canvas or use button)';
      if(clearBtn) clearBtn.style.display = 'none';
    }
  }

  const ROT_RANGE_PALETTE = [
    { fill: 'rgba(99, 102, 241, 0.35)', stroke: '#6366f1', min: '#38bdf8', max: '#a855f7', name: 'R1' },
    { fill: 'rgba(16, 185, 129, 0.35)', stroke: '#10b981', min: '#34d399', max: '#059669', name: 'R2' },
    { fill: 'rgba(245, 158, 11, 0.35)', stroke: '#f59e0b', min: '#fbbf24', max: '#d97706', name: 'R3' },
    { fill: 'rgba(244, 63, 94, 0.35)', stroke: '#f43f5e', min: '#fb7185', max: '#e11d48', name: 'R4' },
    { fill: 'rgba(168, 85, 247, 0.35)', stroke: '#c084fc', min: '#e879f9', max: '#9333ea', name: 'R5' },
    { fill: 'rgba(6, 182, 212, 0.35)', stroke: '#06b6d4', min: '#67e8f9', max: '#0891b2', name: 'R6' },
    { fill: 'rgba(234, 179, 8, 0.35)', stroke: '#eab308', min: '#fde047', max: '#ca8a04', name: 'R7' },
    { fill: 'rgba(236, 72, 153, 0.35)', stroke: '#ec4899', min: '#f472b6', max: '#db2777', name: 'R8' }
  ];

  function updateRotationUIElements(){
    const rangeText = document.getElementById('rotationRangeVal');
    const activeRange = (rotationRanges && rotationRanges[activeRotationRangeIndex]) || { min: rotationMinAngle, max: rotationMaxAngle };
    if(rangeText){
      if(rotationRanges && rotationRanges.length > 1){
        rangeText.textContent = `${rotationRanges.length} Ranges (R${activeRotationRangeIndex+1}: ${activeRange.min}° to ${activeRange.max}°)`;
      } else {
        rangeText.textContent = `${activeRange.min}° to ${activeRange.max}°`;
      }
    }

    const minInp = document.getElementById('rotationMinValInput');
    const maxInp = document.getElementById('rotationMaxValInput');
    if(minInp && document.activeElement !== minInp) minInp.value = activeRange.min;
    if(maxInp && document.activeElement !== maxInp) maxInp.value = activeRange.max;

    const removeBtn = document.getElementById('removeRotationRangeBtn');
    if(removeBtn) removeBtn.style.display = (rotationRanges && rotationRanges.length > 1) ? 'inline-block' : 'none';

    // Build chips list
    const listEl = document.getElementById('rotationRangesList');
    if(listEl && Array.isArray(rotationRanges)){
      listEl.innerHTML = '';
      rotationRanges.forEach((r, idx) => {
        const pal = ROT_RANGE_PALETTE[idx % ROT_RANGE_PALETTE.length];
        const isActive = (idx === activeRotationRangeIndex);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'btn small' + (isActive ? ' active' : '');
        chip.style.cssText = `padding:2px 6px;font-size:10px;display:inline-flex;align-items:center;gap:4px;margin:2px;border:1px solid ${isActive ? pal.stroke : 'var(--line)'};background:${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)'};color:var(--text);border-radius:4px;cursor:pointer;`;
        chip.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${pal.stroke};"></span>` +
          `<span>R${idx+1}: ${r.min}°..${r.max}°</span>` +
          (rotationRanges.length > 1 ? `<span class="del-range-btn" title="Delete range" style="margin-left:3px;opacity:0.6;font-size:11px;font-weight:bold;line-height:1;">×</span>` : '');
        
        chip.addEventListener('click', (e)=>{
          const target = e.target;
          if(target && target.classList && target.classList.contains('del-range-btn')){
            e.stopPropagation();
            if(rotationRanges.length > 1){
              rotationRanges.splice(idx, 1);
              if(activeRotationRangeIndex >= rotationRanges.length){
                activeRotationRangeIndex = rotationRanges.length - 1;
              }
              drawRotationDial();
              syncActivePresetSettings();
            }
            return;
          }
          activeRotationRangeIndex = idx;
          drawRotationDial();
          syncActivePresetSettings();
        });
        listEl.appendChild(chip);
      });
    }
  }

  function drawRotationDial(){
    const canvas = document.getElementById('rotationDialCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2;
    const radius = 54;

    ctx.clearRect(0, 0, w, h);

    // Make sure rotationRanges is valid
    if(!Array.isArray(rotationRanges) || rotationRanges.length === 0){
      rotationRanges = [{ min: rotationMinAngle, max: rotationMaxAngle }];
    }
    if(activeRotationRangeIndex < 0 || activeRotationRangeIndex >= rotationRanges.length){
      activeRotationRangeIndex = 0;
    }
    rotationMinAngle = rotationRanges[activeRotationRangeIndex].min;
    rotationMaxAngle = rotationRanges[activeRotationRangeIndex].max;

    // Outer boundary
    ctx.fillStyle = '#12121e';
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();

    // Concentric guide ring
    ctx.strokeStyle = '#1d1d2c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.55, 0, Math.PI*2); ctx.stroke();

    // Cross lines
    ctx.strokeStyle = '#28283c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius); ctx.stroke();

    // Cardinal direction markings (N, E, S, W)
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#636688';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - radius + 11);
    ctx.fillText('S', cx, cy + radius - 11);
    ctx.fillText('E', cx + radius - 11, cy);
    ctx.fillText('W', cx - radius + 11, cy);

    // Ticks every 30 deg and 15 deg
    ctx.strokeStyle = '#3e3e56';
    for(let a=0; a<360; a+=15){
      const rad = (a - 90) * Math.PI / 180;
      const isMajor = (a % 90 === 0);
      const isMedium = (a % 30 === 0);
      const inner = isMajor ? (radius - 7) : (isMedium ? (radius - 5) : (radius - 3));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad)*inner, cy + Math.sin(rad)*inner);
      ctx.lineTo(cx + Math.cos(rad)*radius, cy + Math.sin(rad)*radius);
      ctx.stroke();
    }

    // Helper to draw a single rotation range
    const renderRange = (r, idx, isActive) => {
      const pal = ROT_RANGE_PALETTE[idx % ROT_RANGE_PALETTE.length];
      const minDeg = r.min;
      const maxDeg = r.max;
      const isFull = Math.abs(maxDeg - minDeg) >= 360 || (minDeg === -180 && maxDeg === 180);

      const radStart = (minDeg - 90) * Math.PI / 180;
      const radEnd = (maxDeg - 90) * Math.PI / 180;

      // Arc wedge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      if(isFull){
        ctx.arc(cx, cy, radius, 0, Math.PI*2, false);
      } else {
        ctx.arc(cx, cy, radius, radStart, radEnd, false);
      }
      ctx.closePath();
      ctx.fillStyle = isActive ? pal.fill : pal.fill.replace('0.35', '0.18');
      ctx.fill();

      // Arc outline
      ctx.beginPath();
      if(isFull){
        ctx.arc(cx, cy, radius, 0, Math.PI*2, false);
      } else {
        ctx.arc(cx, cy, radius, radStart, radEnd, false);
      }
      ctx.strokeStyle = isActive ? pal.stroke : pal.stroke + '88';
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.stroke();

      // Min Hand
      const x1 = cx + Math.cos(radStart) * radius;
      const y1 = cy + Math.sin(radStart) * radius;
      ctx.strokeStyle = pal.min;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = pal.min;
      ctx.beginPath(); ctx.arc(x1, y1, isActive ? 5 : 3.5, 0, Math.PI*2); ctx.fill();
      if(isActive){
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x1, y1, 2, 0, Math.PI*2); ctx.fill();
      }

      // Max Hand
      const x2 = cx + Math.cos(radEnd) * radius;
      const y2 = cy + Math.sin(radEnd) * radius;
      ctx.strokeStyle = pal.max;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = pal.max;
      ctx.beginPath(); ctx.arc(x2, y2, isActive ? 5 : 3.5, 0, Math.PI*2); ctx.fill();
      if(isActive){
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x2, y2, 2, 0, Math.PI*2); ctx.fill();
      }
    };

    // Draw inactive ranges first, active range on top
    rotationRanges.forEach((r, idx) => {
      if(idx !== activeRotationRangeIndex) renderRange(r, idx, false);
    });
    if(rotationRanges[activeRotationRangeIndex]){
      renderRange(rotationRanges[activeRotationRangeIndex], activeRotationRangeIndex, true);
    }

    // Center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();

    // Update text and chips list UI
    updateRotationUIElements();
  }

  let draggingDialHand = null;
  function initRotationDialEvents(){
    const canvas = document.getElementById('rotationDialCanvas');
    if(!canvas) return;

    const angularDist = (a, b) => {
      let diff = Math.abs(a - b) % 360;
      return diff > 180 ? 360 - diff : diff;
    };

    const handlePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2, cy = rect.height / 2;
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      let deg = Math.round(Math.atan2(py - cy, px - cx) * 180 / Math.PI) + 90;
      if(deg > 180) deg -= 360;

      if(!draggingDialHand){
        let bestDist = Infinity;
        let bestRangeIdx = activeRotationRangeIndex;
        let bestHand = 'min';

        if(Array.isArray(rotationRanges)){
          rotationRanges.forEach((r, idx) => {
            const dMin = angularDist(deg, r.min);
            const dMax = angularDist(deg, r.max);
            if(dMin < bestDist){
              bestDist = dMin;
              bestRangeIdx = idx;
              bestHand = 'min';
            }
            if(dMax < bestDist){
              bestDist = dMax;
              bestRangeIdx = idx;
              bestHand = 'max';
            }
          });
        }

        activeRotationRangeIndex = bestRangeIdx;
        draggingDialHand = bestHand;
      }

      if(!rotationRanges[activeRotationRangeIndex]){
        rotationRanges[activeRotationRangeIndex] = { min: 0, max: 0 };
      }

      if(draggingDialHand === 'min'){
        rotationRanges[activeRotationRangeIndex].min = deg;
      } else {
        rotationRanges[activeRotationRangeIndex].max = deg;
      }
      rotationMinAngle = rotationRanges[activeRotationRangeIndex].min;
      rotationMaxAngle = rotationRanges[activeRotationRangeIndex].max;

      drawRotationDial();
      syncActivePresetSettings();
    };

    canvas.addEventListener('pointerdown', (e)=>{
      canvas.setPointerCapture(e.pointerId);
      draggingDialHand = null;
      handlePointer(e);
    });
    canvas.addEventListener('pointermove', (e)=>{
      if(e.buttons === 1) handlePointer(e);
    });
    canvas.addEventListener('pointerup', (e)=>{
      draggingDialHand = null;
    });
  }

  function drawStampPivotCanvas(){
    const renderToCanvas = (canvasId, containerId, forceShowWhenStampSelected) => {
      const canvas = document.getElementById(canvasId);
      const container = document.getElementById(containerId);
      if(!canvas || !container) return;

      const isStampActive = (dabShape === 'stamp' || brushShape === 'stamp' || isPathTool());
      const shouldShow = forceShowWhenStampSelected
        ? (selectedStampIndex !== null && stamps[selectedStampIndex])
        : (isStampActive && selectedStampIndex !== null && stamps[selectedStampIndex]);

      const svgContainer = document.getElementById('svgStampSettingsContainer');
      const stamp = (selectedStampIndex !== null) ? stamps[selectedStampIndex] : null;

      if(!shouldShow){
        container.style.display = 'none';
        if(svgContainer) svgContainer.style.display = 'none';
        return;
      }
      container.style.display = 'block';

      if(svgContainer){
        if(stamp && stamp.isSvg){
          svgContainer.style.display = 'block';
          const strokeWidth = stamp.svgLineWidth !== undefined ? stamp.svgLineWidth : 0;
          const noFill = !!stamp.svgNoFill;

          const widthSlider = document.getElementById('svgLineWidthSlider');
          const widthVal = document.getElementById('svgLineWidthVal');
          const fillCheckbox = document.getElementById('svgNoFillCheckbox');

          if(widthSlider) widthSlider.value = strokeWidth;
          if(widthVal) widthVal.textContent = strokeWidth > 0 ? strokeWidth : 'Default';
          if(fillCheckbox) fillCheckbox.checked = noFill;
        } else {
          svgContainer.style.display = 'none';
        }
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if(stamp.pivotX === undefined) stamp.pivotX = 0.5;
      if(stamp.pivotY === undefined) stamp.pivotY = 0.5;

      const mask = getActiveStampMask(stamp);
      const fit = containFit(w - 12, h - 12, mask.width, mask.height);
      const offsetX = fit.x + 6, offsetY = fit.y + 6;

      // Stamp mask preview
      ctx.globalAlpha = 0.85;
      ctx.drawImage(renderColorizedMask(mask, fgColor), offsetX, offsetY, fit.w, fit.h);

      // Frame box
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#383850';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX, offsetY, fit.w, fit.h);

      // Pivot location
      const px = offsetX + fit.w * stamp.pivotX;
      const py = offsetY + fit.h * stamp.pivotY;

      // Pivot crosshair & dot
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py);
      ctx.moveTo(px, py - 7); ctx.lineTo(px, py + 7);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    };

    renderToCanvas('stampLibPivotCanvas', 'stampLibPivotContainer', true);
  }

  function initStampPivotEvents(){
    const setupCanvasEvents = (canvasId) => {
      const canvas = document.getElementById(canvasId);
      if(!canvas) return;

      const handlePointer = (e) => {
        if(selectedStampIndex === null || !stamps[selectedStampIndex]) return;
        const stamp = stamps[selectedStampIndex];
        const rect = canvas.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        const mask = getActiveStampMask(stamp);
        const fit = containFit(w - 12, h - 12, mask.width, mask.height);
        const offsetX = fit.x + 6, offsetY = fit.y + 6;

        const clickX = e.clientX - rect.left - offsetX;
        const clickY = e.clientY - rect.top - offsetY;

        stamp.pivotX = Math.max(0, Math.min(1, clickX / fit.w));
        stamp.pivotY = Math.max(0, Math.min(1, clickY / fit.h));

        drawStampPivotCanvas();
        syncActivePresetSettings();
      };

      canvas.addEventListener('pointerdown', (e)=>{
        canvas.setPointerCapture(e.pointerId);
        handlePointer(e);
      });
      canvas.addEventListener('pointermove', (e)=>{
        if(e.buttons === 1) handlePointer(e);
      });
    };

    setupCanvasEvents('stampLibPivotCanvas');

    const setPivot = (px, py) => {
      if(selectedStampIndex !== null && stamps[selectedStampIndex]){
        stamps[selectedStampIndex].pivotX = px;
        stamps[selectedStampIndex].pivotY = py;
        drawStampPivotCanvas();
        syncActivePresetSettings();
      }
    };

    ['stampLibPivotCenterBtn'].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn) btn.addEventListener('click', ()=> setPivot(0.5, 0.5));
    });
    ['stampLibPivotBottomBtn'].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn) btn.addEventListener('click', ()=> setPivot(0.5, 1.0));
    });
    ['stampLibPivotTopBtn'].forEach(id=>{
      const btn = document.getElementById(id);
      if(btn) btn.addEventListener('click', ()=> setPivot(0.5, 0.0));
    });
  }

  function updateDualRangeFill(minSlider, maxSlider, fillEl){
    if(!minSlider || !maxSlider || !fillEl) return;
    const min = +minSlider.min, max = +minSlider.max;
    const vMin = +minSlider.value, vMax = +maxSlider.value;
    const pctMin = Math.max(0, Math.min(100, ((vMin - min) / (max - min)) * 100));
    const pctMax = Math.max(0, Math.min(100, ((vMax - min) / (max - min)) * 100));
    fillEl.style.left = `calc(7px + (100% - 14px) * ${pctMin / 100})`;
    fillEl.style.width = `calc((100% - 14px) * ${(pctMax - pctMin) / 100})`;
  }

  function updateSizeJitterUI(triggerSource){
    const minEl = document.getElementById('sizeJitterMinSlider');
    const maxEl = document.getElementById('sizeJitterMaxSlider');
    const fillEl = document.getElementById('sizeJitterFill');
    if(!minEl || !maxEl) return;
    
    let valMin = +minEl.value;
    let valMax = +maxEl.value;

    if(triggerSource === 'min'){
      if(valMin > valMax){
        valMax = valMin;
        maxEl.value = valMax;
      }
      minEl.style.zIndex = '3';
      maxEl.style.zIndex = '2';
    } else if(triggerSource === 'max'){
      if(valMax < valMin){
        valMin = valMax;
        minEl.value = valMin;
      }
      maxEl.style.zIndex = '3';
      minEl.style.zIndex = '2';
    }

    sizeJitterMin = valMin;
    sizeJitterMax = valMax;

    document.getElementById('sizeJitterVal').textContent = sizeJitterMin + '% - ' + sizeJitterMax + '%';
    updateDualRangeFill(minEl, maxEl, fillEl);
    syncActivePresetSettings();
  }

  function updateDabWidthJitterUI(triggerSource){
    const minEl = document.getElementById('dabWidthJitterMinSlider');
    const maxEl = document.getElementById('dabWidthJitterMaxSlider');
    const fillEl = document.getElementById('dabWidthJitterFill');
    if(!minEl || !maxEl) return;
    
    let valMin = +minEl.value;
    let valMax = +maxEl.value;

    if(triggerSource === 'min'){
      if(valMin > valMax){
        valMax = valMin;
        maxEl.value = valMax;
      }
      minEl.style.zIndex = '3';
      maxEl.style.zIndex = '2';
    } else if(triggerSource === 'max'){
      if(valMax < valMin){
        valMin = valMax;
        minEl.value = valMin;
      }
      maxEl.style.zIndex = '3';
      minEl.style.zIndex = '2';
    }

    dabWidthJitterMin = valMin;
    dabWidthJitterMax = valMax;

    const valLabel = document.getElementById('dabWidthJitterVal');
    if(valLabel) valLabel.textContent = dabWidthJitterMin + '% - ' + dabWidthJitterMax + '%';
    updateDualRangeFill(minEl, maxEl, fillEl);

    if(dabLockAspect && triggerSource !== 'sync'){
      const hMinEl = document.getElementById('dabHeightJitterMinSlider');
      const hMaxEl = document.getElementById('dabHeightJitterMaxSlider');
      if(hMinEl) hMinEl.value = dabWidthJitterMin;
      if(hMaxEl) hMaxEl.value = dabWidthJitterMax;
      updateDabHeightJitterUI('sync');
    }

    syncActivePresetSettings();
  }

  function updateDabHeightJitterUI(triggerSource){
    const minEl = document.getElementById('dabHeightJitterMinSlider');
    const maxEl = document.getElementById('dabHeightJitterMaxSlider');
    const fillEl = document.getElementById('dabHeightJitterFill');
    if(!minEl || !maxEl) return;
    
    let valMin = +minEl.value;
    let valMax = +maxEl.value;

    if(triggerSource === 'min'){
      if(valMin > valMax){
        valMax = valMin;
        maxEl.value = valMax;
      }
      minEl.style.zIndex = '3';
      maxEl.style.zIndex = '2';
    } else if(triggerSource === 'max'){
      if(valMax < valMin){
        valMin = valMax;
        minEl.value = valMin;
      }
      maxEl.style.zIndex = '3';
      minEl.style.zIndex = '2';
    }

    dabHeightJitterMin = valMin;
    dabHeightJitterMax = valMax;

    const valLabel = document.getElementById('dabHeightJitterVal');
    if(valLabel) valLabel.textContent = dabHeightJitterMin + '% - ' + dabHeightJitterMax + '%';
    updateDualRangeFill(minEl, maxEl, fillEl);

    if(dabLockAspect && triggerSource !== 'sync'){
      const wMinEl = document.getElementById('dabWidthJitterMinSlider');
      const wMaxEl = document.getElementById('dabWidthJitterMaxSlider');
      if(wMinEl) wMinEl.value = dabHeightJitterMin;
      if(wMaxEl) wMaxEl.value = dabHeightJitterMax;
      updateDabWidthJitterUI('sync');
    }

    syncActivePresetSettings();
  }

  function updateOpacityJitterUI(triggerSource){
    const minEl = document.getElementById('opacityJitterMinSlider');
    const maxEl = document.getElementById('opacityJitterMaxSlider');
    const fillEl = document.getElementById('opacityJitterFill');
    if(!minEl || !maxEl) return;
    
    let valMin = +minEl.value;
    let valMax = +maxEl.value;

    if(triggerSource === 'min'){
      if(valMin > valMax){
        valMax = valMin;
        maxEl.value = valMax;
      }
      minEl.style.zIndex = '3';
      maxEl.style.zIndex = '2';
    } else if(triggerSource === 'max'){
      if(valMax < valMin){
        valMin = valMax;
        minEl.value = valMin;
      }
      maxEl.style.zIndex = '3';
      minEl.style.zIndex = '2';
    }

    opacityJitterMin = valMin;
    opacityJitterMax = valMax;

    document.getElementById('opacityJitterVal').textContent = opacityJitterMin + '% - ' + opacityJitterMax + '%';
    updateDualRangeFill(minEl, maxEl, fillEl);
    syncActivePresetSettings();
  }

  function initSprayControlsEvents(){
    initRotationDialEvents();
    initStampPivotEvents();

    document.getElementById('dabWidthSlider').addEventListener('input', e=>{
      dabWidth = +e.target.value;
      document.getElementById('dabWidthVal').textContent = dabWidth;
      if(dabLockAspect){
        dabHeight = dabWidth;
        document.getElementById('dabHeightSlider').value = dabHeight;
        document.getElementById('dabHeightVal').textContent = dabHeight;
      }
      syncActivePresetSettings();
    });
    document.getElementById('dabHeightSlider').addEventListener('input', e=>{
      dabHeight = +e.target.value;
      document.getElementById('dabHeightVal').textContent = dabHeight;
      if(dabLockAspect){
        dabWidth = dabHeight;
        document.getElementById('dabWidthSlider').value = dabWidth;
        document.getElementById('dabWidthVal').textContent = dabWidth;
      }
      syncActivePresetSettings();
    });
    document.getElementById('dabLockAspectCheckbox').addEventListener('change', e=>{
      dabLockAspect = e.target.checked;
      if(dabLockAspect){
        dabHeight = dabWidth;
        document.getElementById('dabHeightSlider').value = dabHeight;
        document.getElementById('dabHeightVal').textContent = dabHeight;

        dabHeightJitterMin = dabWidthJitterMin;
        dabHeightJitterMax = dabWidthJitterMax;
        const hMinEl = document.getElementById('dabHeightJitterMinSlider'); if(hMinEl) hMinEl.value = dabHeightJitterMin;
        const hMaxEl = document.getElementById('dabHeightJitterMaxSlider'); if(hMaxEl) hMaxEl.value = dabHeightJitterMax;
        updateDabHeightJitterUI('sync');
      }
      syncActivePresetSettings();
    });

    const sjMin = document.getElementById('sizeJitterMinSlider');
    const sjMax = document.getElementById('sizeJitterMaxSlider');
    if(sjMin) sjMin.addEventListener('input', ()=> updateSizeJitterUI('min'));
    if(sjMax) sjMax.addEventListener('input', ()=> updateSizeJitterUI('max'));

    const dwjMin = document.getElementById('dabWidthJitterMinSlider');
    const dwjMax = document.getElementById('dabWidthJitterMaxSlider');
    if(dwjMin) dwjMin.addEventListener('input', ()=> updateDabWidthJitterUI('min'));
    if(dwjMax) dwjMax.addEventListener('input', ()=> updateDabWidthJitterUI('max'));

    const dhjMin = document.getElementById('dabHeightJitterMinSlider');
    const dhjMax = document.getElementById('dabHeightJitterMaxSlider');
    if(dhjMin) dhjMin.addEventListener('input', ()=> updateDabHeightJitterUI('min'));
    if(dhjMax) dhjMax.addEventListener('input', ()=> updateDabHeightJitterUI('max'));

    const ojMin = document.getElementById('opacityJitterMinSlider');
    const ojMax = document.getElementById('opacityJitterMaxSlider');
    if(ojMin) ojMin.addEventListener('input', ()=> updateOpacityJitterUI('min'));
    if(ojMax) ojMax.addEventListener('input', ()=> updateOpacityJitterUI('max'));

    document.getElementById('rotationModeSelect').addEventListener('change', e=>{
      rotationMode = e.target.value;
      syncActivePresetSettings();
    });

    const rotAlgoSelect = document.getElementById('rotationAlgorithmSelect');
    if(rotAlgoSelect){
      rotAlgoSelect.addEventListener('change', e=>{
        rotationAlgorithm = e.target.value;
        if(rotatedStampCache) rotatedStampCache.clear();
        if(rotatedShapeCache) rotatedShapeCache.clear();
        syncActivePresetSettings();
      });
    }

    document.getElementById('rotationMinValInput').addEventListener('input', e=>{
      const val = +e.target.value;
      if(!isNaN(val)){
        if(!rotationRanges[activeRotationRangeIndex]) rotationRanges[activeRotationRangeIndex] = { min: 0, max: 0 };
        rotationRanges[activeRotationRangeIndex].min = val;
        rotationMinAngle = val;
        drawRotationDial();
        syncActivePresetSettings();
      }
    });
    document.getElementById('rotationMaxValInput').addEventListener('input', e=>{
      const val = +e.target.value;
      if(!isNaN(val)){
        if(!rotationRanges[activeRotationRangeIndex]) rotationRanges[activeRotationRangeIndex] = { min: 0, max: 0 };
        rotationRanges[activeRotationRangeIndex].max = val;
        rotationMaxAngle = val;
        drawRotationDial();
        syncActivePresetSettings();
      }
    });

    const addRotRangeBtn = document.getElementById('addRotationRangeBtn');
    if(addRotRangeBtn){
      addRotRangeBtn.addEventListener('click', ()=>{
        if(!Array.isArray(rotationRanges)) rotationRanges = [{ min: 0, max: 0 }];
        const last = rotationRanges[rotationRanges.length - 1] || { min: 0, max: 0 };
        let nextMin = last.min + 90;
        let nextMax = last.max + 90;
        if(nextMin > 180) nextMin -= 360;
        if(nextMax > 180) nextMax -= 360;
        rotationRanges.push({ min: nextMin, max: nextMax });
        activeRotationRangeIndex = rotationRanges.length - 1;
        drawRotationDial();
        syncActivePresetSettings();
      });
    }

    const remRotRangeBtn = document.getElementById('removeRotationRangeBtn');
    if(remRotRangeBtn){
      remRotRangeBtn.addEventListener('click', ()=>{
        if(rotationRanges.length > 1){
          rotationRanges.splice(activeRotationRangeIndex, 1);
          activeRotationRangeIndex = Math.max(0, activeRotationRangeIndex - 1);
          drawRotationDial();
          syncActivePresetSettings();
        }
      });
    }

    const setRotRanges = (ranges) => {
      rotationRanges = JSON.parse(JSON.stringify(ranges));
      activeRotationRangeIndex = 0;
      rotationMinAngle = rotationRanges[0].min;
      rotationMaxAngle = rotationRanges[0].max;
      drawRotationDial();
      syncActivePresetSettings();
    };

    document.getElementById('rotPreset0').addEventListener('click', ()=>{
      setRotRanges([{ min: 0, max: 0 }]);
    });
    document.getElementById('rotPreset15').addEventListener('click', ()=>{
      setRotRanges([{ min: -15, max: 15 }]);
    });
    document.getElementById('rotPreset45').addEventListener('click', ()=>{
      setRotRanges([{ min: -45, max: 45 }]);
    });
    document.getElementById('rotPreset90').addEventListener('click', ()=>{
      setRotRanges([{ min: 90, max: 90 }]);
    });
    document.getElementById('rotPresetFull').addEventListener('click', ()=>{
      setRotRanges([{ min: -180, max: 180 }]);
    });
    const rotCardinalBtn = document.getElementById('rotPresetCardinal');
    if(rotCardinalBtn){
      rotCardinalBtn.addEventListener('click', ()=>{
        setRotRanges([
          { min: -15, max: 15 },   // North
          { min: 75, max: 105 },   // East
          { min: 165, max: -165 }, // South (165° to 195° / -165°)
          { min: -105, max: -75 }  // West
        ]);
      });
    }
    const rotDiagBtn = document.getElementById('rotPresetDiagonal');
    if(rotDiagBtn){
      rotDiagBtn.addEventListener('click', ()=>{
        setRotRanges([
          { min: 30, max: 60 },     // NE
          { min: 120, max: 150 },   // SE
          { min: -150, max: -120 }, // SW
          { min: -60, max: -30 }    // NW
        ]);
      });
    }
    const rotHVBtn = document.getElementById('rotPresetHV');
    if(rotHVBtn){
      rotHVBtn.addEventListener('click', ()=>{
        setRotRanges([
          { min: -15, max: 15 },  // Vertical (North/South)
          { min: 75, max: 105 }   // Horizontal (East/West)
        ]);
      });
    }

    document.getElementById('setSprayAnchorBtn').addEventListener('click', ()=>{
      settingSprayAnchorMode = true;
      if(typeof showToast === 'function') showToast('Click anywhere on canvas to place spray rotation anchor.');
    });
    document.getElementById('clearSprayAnchorBtn').addEventListener('click', ()=>{
      sprayTargetAnchorX = null; sprayTargetAnchorY = null;
      settingSprayAnchorMode = false;
      updateSprayAnchorUI();
      syncActivePresetSettings();
      render();
    });

    function updateSpraySnapGridUI(){
      const ssgEl = document.getElementById('spraySnapGridCheckbox');
      const ssccEl = document.getElementById('spraySnapClearCellCheckbox');
      const ssccRow = document.getElementById('spraySnapClearCellRow');
      if(ssgEl) ssgEl.checked = !!spraySnapToGrid;
      if(ssccEl) ssccEl.checked = !!spraySnapClearCell;
      if(ssccRow) ssccRow.style.opacity = spraySnapToGrid ? '1' : '0.5';
    }

    document.getElementById('spraySnapGridCheckbox').addEventListener('change', e=>{
      spraySnapToGrid = e.target.checked;
      updateSpraySnapGridUI();
      syncActivePresetSettings();
    });

    document.getElementById('spraySnapClearCellCheckbox').addEventListener('change', e=>{
      spraySnapClearCell = e.target.checked;
      syncActivePresetSettings();
    });

    const softenTypeEdgeBtn = document.getElementById('softenTypeEdgeBtn');
    if(softenTypeEdgeBtn){
      softenTypeEdgeBtn.addEventListener('click', ()=>{
        softenType = 'edge';
        updateSoftenUI();
        syncActivePresetSettings();
      });
    }
    const softenTypeFullBtn = document.getElementById('softenTypeFullBtn');
    if(softenTypeFullBtn){
      softenTypeFullBtn.addEventListener('click', ()=>{
        softenType = 'full';
        updateSoftenUI();
        syncActivePresetSettings();
      });
    }
    const softenHardnessSlider = document.getElementById('softenHardnessSlider');
    if(softenHardnessSlider){
      softenHardnessSlider.addEventListener('input', e=>{
        softenHardness = Math.max(0, Math.min(100, +e.target.value));
        updateSoftenUI();
        syncActivePresetSettings();
      });
    }

    drawRotationDial();
    drawStampPivotCanvas();
  }

  // Initialize spray control events after DOM load
  setTimeout(initSprayControlsEvents, 100);

  function captureCurrentSpraySettings(){
    return {
      sprayMode,
      softenType,
      softenHardness,
      brushSize,
      dabSize,
      dabWidth,
      dabHeight,
      dabLockAspect,
      density,
      falloff,
      flow,
      sizeJitterMin,
      sizeJitterMax,
      dabWidthJitterMin,
      dabWidthJitterMax,
      dabHeightJitterMin,
      dabHeightJitterMax,
      opacityJitterMin,
      opacityJitterMax,
      rotationMode,
      rotationAlgorithm,
      rotationMinAngle,
      rotationMaxAngle,
      rotationRanges: Array.isArray(rotationRanges) ? JSON.parse(JSON.stringify(rotationRanges)) : [{ min: rotationMinAngle, max: rotationMaxAngle }],
      activeRotationRangeIndex,
      dabShape,
      pixelPerfect,
      opacity,
      sprayCombineSameColor,
      sprayInterpolate,
      spraySnapToGrid,
      spraySnapClearCell,
      sprayTargetAnchorX,
      sprayTargetAnchorY,
      vineDensity,
      vineDecorSize,
      vineRotationJitter,
      vineMaxTurnPct,
      vineOffshootDensity,
      vineOffshootLength,
      vineSizeJitter,
      pathStyle,
      vineEnableDecorations,
      gradientOrdered,
      gradientCycleLength,
      paintTaperEnabled,
      paintTaperStart,
      paintTaperFinish,
      paintTaperLength,
      paintTaperOpacityFade,
      paintTaperSizePct,
      paintTaperSpreadPct,
      gradientDabsPerColor,
      gradientSequentialStepMode
    };
  }

  function syncActivePresetSettings(){
    if(!activeSprayPresetId) return;
    const p = sprayPresets.find(preset => preset.id === activeSprayPresetId);
    if(p){
      p.settings = captureCurrentSpraySettings();
      updatePresetButtonsAndLabels();
    }
    prewarmActiveSizeCache();
  }

  function applySprayPreset(preset){
    if(!preset) return;
    activeSprayPresetId = preset.id;
    if(!preset.savedSettings){
      preset.savedSettings = JSON.parse(JSON.stringify(preset.settings));
    }
    const s = preset.settings;
    if(s.sprayMode !== undefined){
      sprayMode = s.sprayMode;
      document.querySelectorAll('.shape-btn[data-spray-mode]').forEach(b=>b.classList.toggle('active', b.dataset.sprayMode===sprayMode));
    }
    if(s.softenType !== undefined) softenType = s.softenType;
    if(s.softenHardness !== undefined) softenHardness = s.softenHardness;
    updateSoftenUI();
    if(s.brushSize !== undefined){
      brushSize = s.brushSize;
      const el = document.getElementById('sizeSlider'); if(el) el.value = brushSize;
      const vel = document.getElementById('sizeVal'); if(vel) vel.textContent = brushSize;
    }
    if(s.dabSize !== undefined){
      dabSize = s.dabSize;
      const el = document.getElementById('dabSlider'); if(el) el.value = dabSize;
      const vel = document.getElementById('dabVal'); if(vel) vel.textContent = dabSize;
    }
    if(s.dabWidth !== undefined){
      dabWidth = s.dabWidth;
      const el = document.getElementById('dabWidthSlider'); if(el) el.value = dabWidth;
      const vel = document.getElementById('dabWidthVal'); if(vel) vel.textContent = dabWidth;
    }
    if(s.dabHeight !== undefined){
      dabHeight = s.dabHeight;
      const el = document.getElementById('dabHeightSlider'); if(el) el.value = dabHeight;
      const vel = document.getElementById('dabHeightVal'); if(vel) vel.textContent = dabHeight;
    }
    if(s.dabLockAspect !== undefined){
      dabLockAspect = s.dabLockAspect;
      const el = document.getElementById('dabLockAspectCheckbox'); if(el) el.checked = dabLockAspect;
    }
    if(s.density !== undefined){
      density = s.density;
      const el = document.getElementById('densitySlider'); if(el) el.value = density;
      const vel = document.getElementById('densityVal'); if(vel) vel.textContent = density + '%';
    }
    if(s.falloff !== undefined){
      falloff = s.falloff;
      const el = document.getElementById('falloffSlider'); if(el) el.value = falloff;
      const vel = document.getElementById('falloffVal'); if(vel) vel.textContent = falloff + '%';
    }
    if(s.flow !== undefined){
      flow = s.flow;
      const el = document.getElementById('flowSlider'); if(el) el.value = flow;
      const vel = document.getElementById('flowVal'); if(vel) vel.textContent = flow + '%';
    }
    if(s.sizeJitterMin !== undefined) sizeJitterMin = s.sizeJitterMin;
    if(s.sizeJitterMax !== undefined) sizeJitterMax = s.sizeJitterMax;
    if(s.sizeJitterMin !== undefined || s.sizeJitterMax !== undefined){
      const elMin = document.getElementById('sizeJitterMinSlider'); if(elMin) elMin.value = sizeJitterMin;
      const elMax = document.getElementById('sizeJitterMaxSlider'); if(elMax) elMax.value = sizeJitterMax;
      const vel = document.getElementById('sizeJitterVal'); if(vel) vel.textContent = sizeJitterMin + '% - ' + sizeJitterMax + '%';
      updateDualRangeFill(elMin, elMax, document.getElementById('sizeJitterFill'));
    }
    if(s.dabWidthJitterMin !== undefined) dabWidthJitterMin = s.dabWidthJitterMin;
    if(s.dabWidthJitterMax !== undefined) dabWidthJitterMax = s.dabWidthJitterMax;
    if(s.dabWidthJitterMin !== undefined || s.dabWidthJitterMax !== undefined){
      const elMin = document.getElementById('dabWidthJitterMinSlider'); if(elMin) elMin.value = dabWidthJitterMin;
      const elMax = document.getElementById('dabWidthJitterMaxSlider'); if(elMax) elMax.value = dabWidthJitterMax;
      const vel = document.getElementById('dabWidthJitterVal'); if(vel) vel.textContent = dabWidthJitterMin + '% - ' + dabWidthJitterMax + '%';
      updateDualRangeFill(elMin, elMax, document.getElementById('dabWidthJitterFill'));
    }
    if(s.dabHeightJitterMin !== undefined) dabHeightJitterMin = s.dabHeightJitterMin;
    if(s.dabHeightJitterMax !== undefined) dabHeightJitterMax = s.dabHeightJitterMax;
    if(s.dabHeightJitterMin !== undefined || s.dabHeightJitterMax !== undefined){
      const elMin = document.getElementById('dabHeightJitterMinSlider'); if(elMin) elMin.value = dabHeightJitterMin;
      const elMax = document.getElementById('dabHeightJitterMaxSlider'); if(elMax) elMax.value = dabHeightJitterMax;
      const vel = document.getElementById('dabHeightJitterVal'); if(vel) vel.textContent = dabHeightJitterMin + '% - ' + dabHeightJitterMax + '%';
      updateDualRangeFill(elMin, elMax, document.getElementById('dabHeightJitterFill'));
    }
    if(s.opacityJitterMin !== undefined) opacityJitterMin = s.opacityJitterMin;
    if(s.opacityJitterMax !== undefined) opacityJitterMax = s.opacityJitterMax;
    if(s.opacityJitterMin !== undefined || s.opacityJitterMax !== undefined){
      const elMin = document.getElementById('opacityJitterMinSlider'); if(elMin) elMin.value = opacityJitterMin;
      const elMax = document.getElementById('opacityJitterMaxSlider'); if(elMax) elMax.value = opacityJitterMax;
      const vel = document.getElementById('opacityJitterVal'); if(vel) vel.textContent = opacityJitterMin + '% - ' + opacityJitterMax + '%';
      updateDualRangeFill(elMin, elMax, document.getElementById('opacityJitterFill'));
    }
    if(s.rotationMode !== undefined){
      rotationMode = s.rotationMode;
      const el = document.getElementById('rotationModeSelect'); if(el) el.value = rotationMode;
    }
    if(s.rotationAlgorithm !== undefined){
      rotationAlgorithm = s.rotationAlgorithm;
      const el = document.getElementById('rotationAlgorithmSelect'); if(el) el.value = rotationAlgorithm;
    }
    if(s.rotationRanges && Array.isArray(s.rotationRanges) && s.rotationRanges.length > 0){
      rotationRanges = JSON.parse(JSON.stringify(s.rotationRanges));
      activeRotationRangeIndex = Math.max(0, Math.min(rotationRanges.length - 1, s.activeRotationRangeIndex ?? 0));
      rotationMinAngle = rotationRanges[activeRotationRangeIndex].min;
      rotationMaxAngle = rotationRanges[activeRotationRangeIndex].max;
      drawRotationDial();
    } else if(s.rotationMinAngle !== undefined || s.rotationMaxAngle !== undefined){
      rotationMinAngle = s.rotationMinAngle ?? 0;
      rotationMaxAngle = s.rotationMaxAngle ?? 0;
      rotationRanges = [{ min: rotationMinAngle, max: rotationMaxAngle }];
      activeRotationRangeIndex = 0;
      drawRotationDial();
    }
    if(s.spraySnapToGrid !== undefined){
      spraySnapToGrid = s.spraySnapToGrid;
      const el = document.getElementById('spraySnapGridCheckbox'); if(el) el.checked = spraySnapToGrid;
    }
    if(s.spraySnapClearCell !== undefined){
      spraySnapClearCell = s.spraySnapClearCell;
      const el = document.getElementById('spraySnapClearCellCheckbox'); if(el) el.checked = spraySnapClearCell;
    }
    if(typeof updateSpraySnapGridUI === 'function') updateSpraySnapGridUI();
    if(s.sprayTargetAnchorX !== undefined) sprayTargetAnchorX = s.sprayTargetAnchorX;
    if(s.sprayTargetAnchorY !== undefined) sprayTargetAnchorY = s.sprayTargetAnchorY;
    updateSprayAnchorUI();

    if(s.dabShape !== undefined){
      dabShape = s.dabShape;
      document.querySelectorAll('.shape-btn[data-shape]').forEach(b=>b.classList.toggle('active', b.dataset.shape===dabShape));
      const sss = document.getElementById('stampSourceSelect'); if(sss) sss.style.display = (dabShape==='stamp') ? 'block' : 'none';
      drawStampPivotCanvas();
    }
    if(s.opacity !== undefined){
      opacity = s.opacity;
      const el = document.getElementById('opacitySlider'); if(el) el.value = opacity;
      const vel = document.getElementById('opacityVal'); if(vel) vel.textContent = opacity + '%';
    }
    if(s.pixelPerfect !== undefined){
      pixelPerfect = s.pixelPerfect;
    }
    if(s.sprayCombineSameColor !== undefined){
      sprayCombineSameColor = s.sprayCombineSameColor;
    }
    const pbms = document.getElementById('paintBlendModeSelect');
    if (pbms) {
      if (pixelPerfect) pbms.value = 'pixel-perfect';
      else if (sprayCombineSameColor) pbms.value = 'combine-same';
      else pbms.value = 'default';
    }
    if(s.sprayInterpolate !== undefined){
      sprayInterpolate = s.sprayInterpolate;
      const chk = document.getElementById('sprayInterpolateCheckbox');
      if(chk) chk.checked = sprayInterpolate;
    }

    if(s.vineDensity !== undefined){
      vineDensity = s.vineDensity;
      const el = document.getElementById('vineDensitySlider'); if(el) el.value = vineDensity;
      const vel = document.getElementById('vineDensityVal'); if(vel) vel.textContent = vineDensity + '%';
    }
    if(s.vineDecorSize !== undefined){
      vineDecorSize = s.vineDecorSize;
      const el = document.getElementById('vineDecorSizeSlider'); if(el) el.value = vineDecorSize;
      const vel = document.getElementById('vineDecorSizeVal'); if(vel) vel.textContent = vineDecorSize;
    }
    if(s.vineRotationJitter !== undefined){
      vineRotationJitter = s.vineRotationJitter;
      const el = document.getElementById('vineRotationJitterSlider'); if(el) el.value = vineRotationJitter;
      const vel = document.getElementById('vineRotationJitterVal'); if(vel) vel.textContent = vineRotationJitter + '%';
    }
    if(s.vineMaxTurnPct !== undefined){
      vineMaxTurnPct = s.vineMaxTurnPct;
      const el = document.getElementById('vineMaxTurnSlider'); if(el) el.value = vineMaxTurnPct;
      const vel = document.getElementById('vineMaxTurnVal'); if(vel) vel.textContent = vineMaxTurnPct + '%';
    }
    if(s.vineOffshootDensity !== undefined){
      vineOffshootDensity = s.vineOffshootDensity;
      const el = document.getElementById('vineOffshootDensitySlider'); if(el) el.value = vineOffshootDensity;
      const vel = document.getElementById('vineOffshootDensityVal'); if(vel) vel.textContent = vineOffshootDensity + '%';
    }
    if(s.vineOffshootLength !== undefined){
      vineOffshootLength = s.vineOffshootLength;
      const el = document.getElementById('vineOffshootLengthSlider'); if(el) el.value = vineOffshootLength;
      const vel = document.getElementById('vineOffshootLengthVal'); if(vel) vel.textContent = vineOffshootLength;
    }
    if(s.vineSizeJitter !== undefined){
      vineSizeJitter = s.vineSizeJitter;
      const el = document.getElementById('vineSizeJitterSlider'); if(el) el.value = vineSizeJitter;
      const vel = document.getElementById('vineSizeJitterVal'); if(vel) vel.textContent = vineSizeJitter + '%';
    }
    if(s.vineEnableDecorations !== undefined){
      vineEnableDecorations = s.vineEnableDecorations;
      const chk = document.getElementById('vineEnableDecorationsCheckbox'); if(chk) chk.checked = vineEnableDecorations;
    }
    if(s.gradientOrdered !== undefined){
      gradientOrdered = s.gradientOrdered;
      const chk = document.getElementById('gradientOrderedCheckbox'); if(chk) chk.checked = gradientOrdered;
    }
    if(s.gradientCycleLength !== undefined){
      gradientCycleLength = s.gradientCycleLength;
      const el = document.getElementById('gradientCycleLengthSlider'); if(el) el.value = gradientCycleLength;
      const vel = document.getElementById('gradientCycleLengthVal'); if(vel) vel.textContent = gradientCycleLength;
    }
    if(s.paintTaperEnabled !== undefined){
      paintTaperEnabled = s.paintTaperEnabled;
      const chk = document.getElementById('paintTaperEnabledCheckbox'); if(chk) chk.checked = paintTaperEnabled;
    }
    if(s.paintTaperStart !== undefined){
      paintTaperStart = s.paintTaperStart;
      const chk = document.getElementById('paintTaperStartCheckbox'); if(chk) chk.checked = paintTaperStart;
    }
    if(s.paintTaperFinish !== undefined){
      paintTaperFinish = s.paintTaperFinish;
      const chk = document.getElementById('paintTaperFinishCheckbox'); if(chk) chk.checked = paintTaperFinish;
    }
    if(s.paintTaperLength !== undefined){
      paintTaperLength = s.paintTaperLength;
      const el = document.getElementById('paintTaperLengthSlider'); if(el) el.value = paintTaperLength;
      const vel = document.getElementById('paintTaperLengthVal'); if(vel) vel.textContent = paintTaperLength + ' dabs';
    }
    if(s.paintTaperSizePct !== undefined){
      paintTaperSizePct = s.paintTaperSizePct;
      const el = document.getElementById('paintTaperSizeSlider'); if(el) el.value = paintTaperSizePct;
      const vel = document.getElementById('paintTaperSizeVal'); if(vel) vel.textContent = paintTaperSizePct + '%';
    }
    if(s.paintTaperSpreadPct !== undefined){
      paintTaperSpreadPct = s.paintTaperSpreadPct;
      const el = document.getElementById('paintTaperSpreadSlider'); if(el) el.value = paintTaperSpreadPct;
      const vel = document.getElementById('paintTaperSpreadVal'); if(vel) vel.textContent = paintTaperSpreadPct + '%';
    }
    if(s.paintTaperOpacityFade !== undefined){
      paintTaperOpacityFade = s.paintTaperOpacityFade;
      const chk = document.getElementById('paintTaperOpacityFadeCheckbox'); if(chk) chk.checked = paintTaperOpacityFade;
    }
    if(s.gradientDabsPerColor !== undefined){
      gradientDabsPerColor = s.gradientDabsPerColor;
      const el = document.getElementById('gradientDabsPerColorSlider'); if(el) el.value = gradientDabsPerColor;
      const vel = document.getElementById('gradientDabsPerColorVal'); if(vel) vel.textContent = gradientDabsPerColor;
    }
    if(s.gradientSequentialStepMode !== undefined){
      gradientSequentialStepMode = s.gradientSequentialStepMode;
      const el = document.getElementById('gradientSequentialStepSelect'); if(el) el.value = gradientSequentialStepMode;
    }

    updateSprayModeUI();
    updateGradientOrderedVisibility();
    updatePaintTaperUI();
    refreshSprayPresetList();
  }

  // --- PATH/VINE PRESETS SYSTEM ---
  function captureCurrentVineSettings() {
    return {
      brushSize,
      vineDensity,
      vineDecorSize,
      vineRotationJitter,
      vineMaxTurnPct,
      vineOffshootDensity,
      vineOffshootLength,
      vineTaperStart,
      vineTaperFinish,
      vineTaperOffshoots,
      vineTaperLength,
      vineSizeJitter,
      pathStyle,
      vineEnableDecorations,
      vineDecorationType,
      vineOffshootSizeSliderVal,
      vineTaperSizeBehavior,
      vineTaperSpreadBehavior,
      vineTaperOpacityFade,
      freehandPathDetail
    };
  }

  function syncActiveVinePresetSettings() {
    if (!activeVinePresetId) return;
    const p = vinePresets.find(preset => preset.id === activeVinePresetId);
    if (p) {
      p.settings = captureCurrentVineSettings();
      updateVinePresetButtonsAndLabels();
    }
  }

  function applyVinePreset(preset) {
    if (!preset) return;
    activeVinePresetId = preset.id;
    if (!preset.savedSettings) {
      preset.savedSettings = JSON.parse(JSON.stringify(preset.settings));
    }
    const s = preset.settings;
    if (s.brushSize !== undefined) {
      brushSize = s.brushSize;
      const el = document.getElementById('sizeSlider'); if(el) el.value = brushSize;
      const vel = document.getElementById('sizeVal'); if(vel) vel.textContent = brushSize;
    }
    if (s.vineDensity !== undefined) {
      vineDensity = s.vineDensity;
      const el = document.getElementById('vineDensitySlider'); if(el) el.value = vineDensity;
      const vel = document.getElementById('vineDensityVal'); if(vel) vel.textContent = vineDensity + '%';
    }
    if (s.vineDecorSize !== undefined) {
      vineDecorSize = s.vineDecorSize;
      const el = document.getElementById('vineDecorSizeSlider'); if(el) el.value = vineDecorSize;
      const vel = document.getElementById('vineDecorSizeVal'); if(vel) vel.textContent = vineDecorSize;
    }
    if (s.vineRotationJitter !== undefined) {
      vineRotationJitter = s.vineRotationJitter;
      const el = document.getElementById('vineRotationJitterSlider'); if(el) el.value = vineRotationJitter;
      const vel = document.getElementById('vineRotationJitterVal'); if(vel) vel.textContent = vineRotationJitter + '%';
    }
    if (s.vineMaxTurnPct !== undefined) {
      vineMaxTurnPct = s.vineMaxTurnPct;
      const el = document.getElementById('vineMaxTurnSlider'); if(el) el.value = vineMaxTurnPct;
      const vel = document.getElementById('vineMaxTurnVal'); if(vel) vel.textContent = vineMaxTurnPct + '%';
    }
    if (s.vineOffshootDensity !== undefined) {
      vineOffshootDensity = s.vineOffshootDensity;
      const el = document.getElementById('vineOffshootDensitySlider'); if(el) el.value = vineOffshootDensity;
      const vel = document.getElementById('vineOffshootDensityVal'); if(vel) vel.textContent = vineOffshootDensity + '%';
    }
    if (s.vineOffshootLength !== undefined) {
      vineOffshootLength = s.vineOffshootLength;
      const el = document.getElementById('vineOffshootLengthSlider'); if(el) el.value = vineOffshootLength;
      const vel = document.getElementById('vineOffshootLengthVal'); if(vel) vel.textContent = vineOffshootLength;
    }
    if (s.vineTaperStart !== undefined) {
      vineTaperStart = s.vineTaperStart;
      const el = document.getElementById('vineTaperStartCheckbox'); if(el) el.checked = vineTaperStart;
    }
    if (s.vineTaperFinish !== undefined) {
      vineTaperFinish = s.vineTaperFinish;
      const el = document.getElementById('vineTaperFinishCheckbox'); if(el) el.checked = vineTaperFinish;
    }
    if (s.vineTaperOffshoots !== undefined) {
      vineTaperOffshoots = s.vineTaperOffshoots;
      const el = document.getElementById('vineTaperOffshootsCheckbox'); if(el) el.checked = vineTaperOffshoots;
    }
    if (s.vineTaperLength !== undefined) {
      vineTaperLength = s.vineTaperLength;
      const el = document.getElementById('vineTaperLengthSlider'); if(el) el.value = vineTaperLength;
      const vel = document.getElementById('vineTaperLengthVal'); if(vel) vel.textContent = vineTaperLength;
    }
    if (s.vineSizeJitter !== undefined) {
      vineSizeJitter = s.vineSizeJitter;
      const el = document.getElementById('vineSizeJitterSlider'); if(el) el.value = vineSizeJitter;
      const vel = document.getElementById('vineSizeJitterVal'); if(vel) vel.textContent = vineSizeJitter + '%';
    }
    if (s.vineEnableDecorations !== undefined) {
      vineEnableDecorations = s.vineEnableDecorations;
      const el = document.getElementById('vineEnableDecorationsCheckbox'); if(el) el.checked = vineEnableDecorations;
    }
    if (s.vineDecorationType !== undefined) {
      vineDecorationType = s.vineDecorationType;
      const el = document.getElementById('vineStampSourceSelect'); if(el) el.value = vineDecorationType;
    }
    if (s.vineOffshootSizeSliderVal !== undefined) {
      vineOffshootSizeSliderVal = s.vineOffshootSizeSliderVal;
      const el = document.getElementById('vineOffshootSizeSlider'); if(el) el.value = vineOffshootSizeSliderVal;
      const vel = document.getElementById('vineOffshootSizeVal'); if(vel) vel.textContent = vineOffshootSizeSliderVal + '%';
    }
    if (s.vineTaperSizeBehavior !== undefined) {
      vineTaperSizeBehavior = s.vineTaperSizeBehavior;
      const el = document.getElementById('vineTaperSizeBehaviorSelect'); if(el) el.value = vineTaperSizeBehavior;
    }
    if (s.vineTaperSpreadBehavior !== undefined) {
      vineTaperSpreadBehavior = s.vineTaperSpreadBehavior;
      const el = document.getElementById('vineTaperSpreadBehaviorSelect'); if(el) el.value = vineTaperSpreadBehavior;
    }
    if (s.vineTaperOpacityFade !== undefined) {
      vineTaperOpacityFade = s.vineTaperOpacityFade;
      const el = document.getElementById('vineTaperOpacityFadeCheckbox'); if(el) el.checked = vineTaperOpacityFade;
    }
    if (s.freehandPathDetail !== undefined) {
      freehandPathDetail = s.freehandPathDetail;
    }
    if (s.pathStyle !== undefined) {
      pathStyle = s.pathStyle;
    } else {
      if (s.vineRightAnglesOnly) pathStyle = '90';
      else if (s.freehandPathModeEnabled) pathStyle = 'freehand';
      else pathStyle = 'default';
    }
    const psEl = document.getElementById('pathStyleSelect'); if (psEl) psEl.value = pathStyle;
    updateVineFreehandUI();
    refreshVinePresetList();
    if (pathState !== 'idle' && pathSegments.length > 0) {
      drawFullVineSegments(pathSegments);
      render();
    }
  }

  function refreshVinePresetList() {
    const list = document.getElementById('vinePresetList');
    if (!list) return;
    list.innerHTML = '';
    vinePresets.forEach(preset => {
      if (!preset.savedSettings) {
        preset.savedSettings = JSON.parse(JSON.stringify(preset.settings));
      }
      const isModified = JSON.stringify(preset.settings) !== JSON.stringify(preset.savedSettings);
      const row = document.createElement('div');
      row.className = 'layer-row' + (preset.id === activeVinePresetId ? ' active' : '');
      row.dataset.presetId = preset.id;
      
      const name = document.createElement('div');
      name.className = 'layer-name';
      name.textContent = preset.name + (isModified ? ' *' : '');
      row.appendChild(name);

      if (!preset.builtin) {
        const delBtn = document.createElement('button');
        delBtn.className = 'layer-info-btn';
        delBtn.textContent = '×';
        delBtn.title = 'Delete preset';
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          showConfirmDialog({
            title: 'Delete Preset',
            message: 'Delete path preset "' + preset.name + '"?',
            confirmText: 'Delete',
            danger: true
          }, () => {
            vinePresets = vinePresets.filter(p => p.id !== preset.id);
            if (activeVinePresetId === preset.id) {
              activeVinePresetId = vinePresets[0]?.id || null;
              if (activeVinePresetId) {
                const next = vinePresets.find(p => p.id === activeVinePresetId);
                if (next) applyVinePreset(next);
              }
            }
            refreshVinePresetList();
          });
        });
        row.appendChild(delBtn);
      }
      row.addEventListener('click', () => applyVinePreset(preset));
      list.appendChild(row);
    });
    updateVinePresetButtonsAndLabels();
  }

  function updateVinePresetButtonsAndLabels() {
    const list = document.getElementById('vinePresetList');
    if (list) {
      vinePresets.forEach(preset => {
        const isModified = preset.savedSettings && JSON.stringify(preset.settings) !== JSON.stringify(preset.savedSettings);
        const row = list.querySelector(`.layer-row[data-preset-id="${preset.id}"]`);
        if (row) {
          row.classList.toggle('active', preset.id === activeVinePresetId);
          const nameEl = row.querySelector('.layer-name');
          if (nameEl) {
            nameEl.textContent = preset.name + (isModified ? ' *' : '');
          }
        }
      });
    }

    const activeP = vinePresets.find(p => p.id === activeVinePresetId);
    const resetBtn = document.getElementById('resetVinePresetBtn');
    const updateBtn = document.getElementById('updateVinePresetBtn');
    if (resetBtn && updateBtn) {
      if (activeP) {
        const isModified = activeP.savedSettings && JSON.stringify(activeP.settings) !== JSON.stringify(activeP.savedSettings);
        resetBtn.disabled = !isModified;
        updateBtn.disabled = !isModified;
        resetBtn.title = isModified ? 'Reset "' + activeP.name + '" to saved settings' : 'Preset settings match saved values';
        updateBtn.title = isModified ? 'Update saved settings for "' + activeP.name + '"' : 'Preset settings match saved values';
      } else {
        resetBtn.disabled = true;
        updateBtn.disabled = true;
      }
    }
  }

  function refreshSprayPresetList(){
    const select = document.getElementById('sprayPresetSelect');
    if(!select) return;
    select.innerHTML = '';
    sprayPresets.forEach(preset=>{
      if(!preset.savedSettings){
        preset.savedSettings = JSON.parse(JSON.stringify(preset.settings));
      }
      const isModified = JSON.stringify(preset.settings) !== JSON.stringify(preset.savedSettings);
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = preset.name + (isModified ? ' *' : '');
      if(preset.id === activeSprayPresetId){
        opt.selected = true;
      }
      select.appendChild(opt);
    });
    updatePresetButtonsAndLabels();
  }

  function updatePresetButtonsAndLabels(){
    const select = document.getElementById('sprayPresetSelect');
    if(select){
      Array.from(select.options).forEach(opt=>{
        const preset = sprayPresets.find(p=>p.id === opt.value);
        if(preset){
          const isModified = preset.savedSettings && JSON.stringify(preset.settings) !== JSON.stringify(preset.savedSettings);
          opt.textContent = preset.name + (isModified ? ' *' : '');
        }
      });
      select.value = activeSprayPresetId;
    }

    const activeP = sprayPresets.find(p=>p.id === activeSprayPresetId);
    const delBtn = document.getElementById('deleteSprayPresetBtn');
    if(delBtn){
      delBtn.style.display = (activeP && !activeP.builtin) ? 'block' : 'none';
    }

    const resetBtn = document.getElementById('resetSprayPresetBtn');
    const updateBtn = document.getElementById('updateSprayPresetBtn');
    if(resetBtn && updateBtn){
      if(activeP){
        const isModified = activeP.savedSettings && JSON.stringify(activeP.settings) !== JSON.stringify(activeP.savedSettings);
        resetBtn.disabled = !isModified;
        updateBtn.disabled = !isModified;
        resetBtn.title = isModified ? 'Reset "' + activeP.name + '" to saved settings' : 'Preset settings match saved values';
        updateBtn.title = isModified ? 'Update saved settings for "' + activeP.name + '"' : 'Preset settings match saved values';
      } else {
        resetBtn.disabled = true;
        updateBtn.disabled = true;
      }
    }
  }

  document.getElementById('sprayPresetSelect')?.addEventListener('change', e=>{
    const selected = sprayPresets.find(p=>p.id === e.target.value);
    if(selected){
      applySprayPreset(selected);
    }
  });

  document.getElementById('deleteSprayPresetBtn')?.addEventListener('click', ()=>{
    const activeP = sprayPresets.find(p=>p.id === activeSprayPresetId);
    if(!activeP || activeP.builtin) return;
    showConfirmDialog({
      title: 'Delete Preset',
      message: 'Delete preset "' + activeP.name + '"?',
      confirmText: 'Delete',
      danger: true
    }, ()=>{
      sprayPresets = sprayPresets.filter(p=>p.id !== activeP.id);
      activeSprayPresetId = sprayPresets[0]?.id || null;
      if(activeSprayPresetId){
        const next = sprayPresets.find(p=>p.id === activeSprayPresetId);
        if(next) applySprayPreset(next);
      }
      refreshSprayPresetList();
    });
  });

  const resetPresetBtn = document.getElementById('resetSprayPresetBtn');
  if(resetPresetBtn){
    resetPresetBtn.addEventListener('click', ()=>{
      const activeP = sprayPresets.find(p=>p.id === activeSprayPresetId);
      if(!activeP) return;
      if(!activeP.savedSettings) activeP.savedSettings = JSON.parse(JSON.stringify(activeP.settings));
      activeP.settings = JSON.parse(JSON.stringify(activeP.savedSettings));
      applySprayPreset(activeP);
      if(typeof showToast === 'function') showToast('Reset preset "' + activeP.name + '" to saved values');
    });
  }

  const updatePresetBtn = document.getElementById('updateSprayPresetBtn');
  if(updatePresetBtn){
    updatePresetBtn.addEventListener('click', ()=>{
      const activeP = sprayPresets.find(p=>p.id === activeSprayPresetId);
      if(!activeP) return;
      const current = captureCurrentSpraySettings();
      activeP.savedSettings = JSON.parse(JSON.stringify(current));
      activeP.settings = JSON.parse(JSON.stringify(current));
      updatePresetButtonsAndLabels();
      if(typeof showToast === 'function') showToast('Updated saved settings for preset "' + activeP.name + '"');
    });
  }

  document.getElementById('saveSprayPresetBtn').addEventListener('click', async ()=>{
    const name = await showCustomPrompt('Preset name:', 'My Preset');
    if(name === null || name.trim() === '') return;
    const current = captureCurrentSpraySettings();
    const newId = 'preset-' + (sprayPresetIdCounter++);
    const newPreset = {
      id: newId,
      name: name.trim(),
      builtin: false,
      savedSettings: JSON.parse(JSON.stringify(current)),
      settings: JSON.parse(JSON.stringify(current))
    };
    sprayPresets.push(newPreset);
    applySprayPreset(newPreset);
    if(typeof showToast === 'function') showToast('Saved new preset "' + newPreset.name + '"');
  });
  refreshSprayPresetList();
  const spic = document.getElementById('sprayInterpolateCheckbox');
  if(spic){
    spic.addEventListener('change', e=>{
      sprayInterpolate = e.target.checked;
      syncActivePresetSettings();
    });
  }
  const bppc = document.getElementById('brushPixelPerfectCheckbox');
  if(bppc){
    bppc.addEventListener('change', e=>{
      brushPixelPerfect = e.target.checked;
    });
  }
  function updateBrushPixelPerfectAvailability(){
    const cb = document.getElementById('brushPixelPerfectCheckbox');
    const label = document.getElementById('brushPixelPerfectLabel');
    const hint = document.getElementById('brushPixelPerfectHint');
    if(!cb || !label || !hint) return;
    if(brushShape === 'stamp' || brushShape === 'circle'){
      label.style.display = 'none';
      hint.style.display = 'none';
      return;
    }
    label.style.display = 'flex';
    hint.style.display = 'block';
    const isOne = Math.round(brushSize) === 1;
    cb.disabled = !isOne;
    label.style.opacity = isOne ? '1' : '.4';
  }
  document.getElementById('flowSlider').addEventListener('input', e=>{
    flow = +e.target.value;
    document.getElementById('flowVal').textContent = flow + '%';
    syncActivePresetSettings();
  });
  document.getElementById('densitySlider').addEventListener('input', e=>{
    density = +e.target.value;
    document.getElementById('densityVal').textContent = density + '%';
    syncActivePresetSettings();
  });
  const dabSl = document.getElementById('dabSlider');
  if(dabSl){
    dabSl.addEventListener('input', e=>{
      dabSize = +e.target.value;
      const dv = document.getElementById('dabVal'); if(dv) dv.textContent = dabSize;
      syncActivePresetSettings();
    });
  }
  const sjSl = document.getElementById('sizeJitterSlider');
  if(sjSl){
    sjSl.addEventListener('input', e=>{
      sizeJitterAmt = +e.target.value;
      const sjv = document.getElementById('sizeJitterVal'); if(sjv) sjv.textContent = sizeJitterAmt + '%';
      syncActivePresetSettings();
    });
  }
  const ojSl = document.getElementById('opacityJitterSlider');
  if(ojSl){
    ojSl.addEventListener('input', e=>{
      opacityJitterAmt = +e.target.value;
      const ojv = document.getElementById('opacityJitterVal'); if(ojv) ojv.textContent = opacityJitterAmt + '%';
      syncActivePresetSettings();
    });
  }
  const rjSl = document.getElementById('rotationJitterSlider');
  if(rjSl){
    rjSl.addEventListener('input', e=>{
      rotationJitterAmt = +e.target.value;
      const rjv = document.getElementById('rotationJitterVal'); if(rjv) rjv.textContent = rotationJitterAmt + '%';
      syncActivePresetSettings();
    });
  }
  document.getElementById('falloffSlider').addEventListener('input', e=>{
    falloff = +e.target.value;
    document.getElementById('falloffVal').textContent = falloff + '%';
    syncActivePresetSettings();
  });

  function setFg(hex){
    fgColor = hex;
    document.getElementById('fgSwatch').style.background = hex;
    const fgInput = document.getElementById('fgColorInput');
    if(fgInput) fgInput.value = hex;
    const hexEl = document.getElementById('fgHexVal');
    if(hexEl) hexEl.textContent = hex.toUpperCase();
    const hslEl = document.getElementById('fgHslVal');
    if(hslEl && typeof hexToHsl === 'function'){
      const {h, s, l} = hexToHsl(hex);
      hslEl.textContent = `hsl(${Math.round(h)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
    }
    if (typeof prewarmActiveSizeCache === 'function') prewarmActiveSizeCache();
  }
  setFg(fgColor);

  function selectPaletteIndex(idx){
    const all = allColors();
    if(all.length === 0){ selectedColors = new Set(); return; }
    const clamped = Math.max(0, Math.min(idx, all.length-1));
    selectedColors = new Set([all[clamped]]);
    setFg(all[clamped]);
  }

  // ---------- Palette panel (grouped) ----------
  function cssGradientFromStops(stops){
    if(!stops || stops.length===0) return 'transparent';
    if(stops.length===1) return stops[0];
    return 'linear-gradient(90deg,' + stops.join(',') + ')';
  }

  let usedColorsSet = new Set();
  let usedColorsCounts = new Map();
  let showPixelCounts = false;
  function refreshGroups(){
    const container = document.getElementById('groupsContainer');
    container.innerHTML = '';
    groups.forEach((group, gIdx)=>{
      const card = document.createElement('div');
      card.className = 'group-card';

      const header = document.createElement('div');
      header.className = 'group-header';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'group-toggle-btn';
      toggleBtn.textContent = group.collapsed ? '▸' : '▾';
      toggleBtn.title = group.collapsed ? 'Expand' : 'Collapse';
      toggleBtn.addEventListener('click', ()=>{ group.collapsed = !group.collapsed; refreshGroups(); });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'group-name';
      nameSpan.textContent = group.name;
      nameSpan.title = 'Click to rename';
      nameSpan.addEventListener('click', async ()=>{
        const newName = await showCustomPrompt('Group name:', group.name);
        if(newName !== null && newName.trim() !== ''){ group.name = newName.trim(); refreshGroups(); }
      });

      const countSpan = document.createElement('span');
      countSpan.className = 'group-count';
      const groupColorCount = resolveGroupSwatches(group).length;
      countSpan.textContent = group.isMain ? (groupColorCount + '/' + MAX_PALETTE_COLORS) : String(groupColorCount);
      countSpan.title = group.isMain
        ? groupColorCount + ' of ' + MAX_PALETTE_COLORS + ' Main Palette colors used'
        : groupColorCount + ' color' + (groupColorCount===1?'':'s') + ' in this group';

      const colsLabel = document.createElement('label');
      colsLabel.className = 'group-cols-label';
      colsLabel.textContent = 'Cols ';
      const colsInput = document.createElement('input');
      colsInput.type = 'number'; colsInput.min = 2; colsInput.max = 20; colsInput.value = group.columns;
      colsInput.addEventListener('input', ()=>{
        group.columns = Math.max(2, Math.min(20, +colsInput.value || 8));
        refreshGroups();
      });
      colsLabel.appendChild(colsInput);

      const sortBtn = document.createElement('button');
      sortBtn.textContent = '\u21c5';
      sortBtn.title = 'Sort by hue, then saturation, then lightness';
      sortBtn.addEventListener('click', ()=> sortGroupByHueSatValue(group));

      const upBtn = document.createElement('button');
      upBtn.textContent = '↑'; upBtn.title = 'Move group up';
      upBtn.disabled = (gIdx === 0);
      upBtn.addEventListener('click', ()=>{
        if(gIdx===0) return;
        [groups[gIdx-1], groups[gIdx]] = [groups[gIdx], groups[gIdx-1]];
        refreshGroups();
      });

      const downBtn = document.createElement('button');
      downBtn.textContent = '↓'; downBtn.title = 'Move group down';
      downBtn.disabled = (gIdx === groups.length-1);
      downBtn.addEventListener('click', ()=>{
        if(gIdx===groups.length-1) return;
        [groups[gIdx+1], groups[gIdx]] = [groups[gIdx], groups[gIdx+1]];
        refreshGroups();
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.title = group.isMain ? "Can't delete the Main Palette" : 'Delete group';
      delBtn.disabled = !!group.isMain;
      delBtn.addEventListener('click', ()=>{
        if(group.isMain) return;
        pushHistory();
        groups.splice(gIdx,1);
        refreshGroups();
      });

      header.appendChild(toggleBtn);
      header.appendChild(nameSpan);
      header.appendChild(countSpan);
      header.appendChild(colsLabel);
      header.appendChild(sortBtn);
      header.appendChild(upBtn);
      header.appendChild(downBtn);
      header.appendChild(delBtn);
      card.appendChild(header);

      if(!group.collapsed){
        const body = document.createElement('div');
        body.className = 'group-body';

        const swatchGrid = document.createElement('div');
        swatchGrid.className = 'swatch-grid group-swatch-grid';
        swatchGrid.dataset.groupId = group.id;
        swatchGrid.style.gridTemplateColumns = 'repeat(' + group.columns + ', 26px)';
        const swatches = resolveGroupSwatches(group);
        swatches.forEach((entry, idx)=>{
          const hex = entry.hex;
          const isPlaceholder = ptrDrag && ptrDrag.group === group
            && idx >= ptrDrag.insertAt && idx < ptrDrag.insertAt + ptrDrag.draggedItems.length;
          const sw = document.createElement('div');
          sw.className = 'swatch'
            + (hex === fgColor ? ' selected' : '')
            + (selectedColors.has(hex) ? ' multi' : '')
            + (usedColorsSet.has(hex) ? ' in-use' : '')
            + (isPlaceholder ? ' ptr-placeholder' : '');
          sw.style.background = hex;
          sw.dataset.flipKey = group.id + ':' + entry.id;
          sw.title = (entry.name ? entry.name + ' — ' : '') + hex
            + (usedColorsSet.has(hex) ? ' (in use on active layer)' : '')
            + (group.isMain ? ' — double-click to edit, drag to reorder' : ' — drag to reorder');
          if(showPixelCounts && usedColorsCounts.has(hex)){
            const badge = document.createElement('div');
            badge.className = 'count-badge';
            badge.textContent = usedColorsCounts.get(hex).toLocaleString();
            sw.appendChild(badge);
          }
          if(group.isMain){
            sw.addEventListener('dblclick', (ev)=>{ ev.stopPropagation(); openColorEditor(entry, ev); });
          }
          sw.addEventListener('pointerdown', (ev)=> beginSwatchPointerTracking(group, entry, idx, ev));
          swatchGrid.appendChild(sw);
        });
        body.appendChild(swatchGrid);

        if(group.isMain){
          const actions = document.createElement('div');
          actions.className = 'palette-actions';
          const addBtn = document.createElement('button');
          addBtn.className = 'btn small';
          addBtn.style.width='auto'; addBtn.style.display='inline-flex'; addBtn.style.padding='6px 10px';
          addBtn.textContent = '+ Add color';
          addBtn.addEventListener('click', (ev)=>{
            openColorEditor(null, ev, true, group);
          });

          const delColorBtn = document.createElement('button');
          delColorBtn.className = 'btn small danger';
          delColorBtn.textContent = '🗑 Delete selected';
          delColorBtn.title = 'Delete selected color(s) from palette';
          delColorBtn.addEventListener('click', ()=>{
            deleteSelectedPaletteColors(group);
          });

          actions.appendChild(addBtn);
          actions.appendChild(delColorBtn);
          body.appendChild(actions);
        } else {
          const note = document.createElement('div');
          note.className = 'hint';
          note.style.margin = '0';
          note.textContent = 'References the Main Palette — edit colors there.';
          body.appendChild(note);
        }

        card.appendChild(body);
      }

      container.appendChild(card);
    });
    updateSpraySourceHint();
    updateColorHighlight();
    fitSidePanelToPalette();
  }

  let confirmDialogCallback = null;
  function showConfirmDialog(options, onConfirm){
    const overlay = document.getElementById('appConfirmModalOverlay');
    if(!overlay){
      onConfirm();
      return;
    }
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMsg');
    const okBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');

    if(titleEl) titleEl.textContent = options.title || 'Confirm Action';
    if(msgEl) msgEl.textContent = typeof options === 'string' ? options : (options.message || '');
    if(okBtn){
      okBtn.textContent = options.confirmText || 'Delete';
      okBtn.className = 'btn small ' + (options.danger !== false ? 'danger' : 'primary');
    }
    if(cancelBtn) cancelBtn.textContent = options.cancelText || 'Cancel';

    confirmDialogCallback = onConfirm;
    overlay.style.display = 'flex';
  }

  function closeConfirmDialog(){
    const overlay = document.getElementById('appConfirmModalOverlay');
    if(overlay) overlay.style.display = 'none';
    confirmDialogCallback = null;
  }

  document.getElementById('confirmModalOkBtn')?.addEventListener('click', ()=>{
    const cb = confirmDialogCallback;
    closeConfirmDialog();
    if(cb) cb();
  });
  document.getElementById('confirmModalCancelBtn')?.addEventListener('click', closeConfirmDialog);
  document.getElementById('appConfirmModalOverlay')?.addEventListener('click', (ev)=>{
    if(ev.target.id === 'appConfirmModalOverlay') closeConfirmDialog();
  });

  function deleteSelectedPaletteColors(group){
    const main = mainGroup();
    if(!main || !main.colors || !main.colors.length) return;

    let targetHexes = [];
    if(selectedColors.size > 0){
      targetHexes = main.colors.map(c => c.hex).filter(hex => selectedColors.has(hex));
    } else if(fgColor && main.colors.some(c => c.hex === fgColor)){
      targetHexes = [fgColor];
    }

    if(targetHexes.length === 0){
      showToast('Select color(s) in palette first (click or Ctrl/Shift-click swatches)');
      return;
    }

    const count = targetHexes.length;
    const confirmMsg = count === 1
      ? `Are you sure you want to delete color ${targetHexes[0]} from the Main Palette?`
      : `Are you sure you want to delete ${count} selected colors from the Main Palette?`;

    showConfirmDialog({
      title: 'Delete Palette Color' + (count > 1 ? 's' : ''),
      message: confirmMsg,
      confirmText: 'Delete',
      danger: true
    }, ()=>{
      pushHistory(); // Allows Undo!

      const delSet = new Set(targetHexes);
      const delIds = new Set(main.colors.filter(c => delSet.has(c.hex)).map(c => c.id));

      main.colors = main.colors.filter(c => !delSet.has(c.hex));

      groups.forEach(g => {
        if(!g.isMain && g.colorRefs){
          g.colorRefs = g.colorRefs.filter(id => !delIds.has(id));
        }
      });

      targetHexes.forEach(hex => selectedColors.delete(hex));

      if(delSet.has(fgColor)){
        if(main.colors.length > 0){
          fgColor = main.colors[0].hex;
        }
      }

      refreshGroups();
      updateSpraySourceHint();
      showToast(`Deleted ${count} color${count > 1 ? 's' : ''} from palette`);
    });
  }
  let colorEditTarget = null;
  let colorEditCurrentHex = '#000000';
  let colorEditIsNew = false;
  let colorEditGroup = null;

  function updateColorEditSwatch(){
    document.getElementById('colorEditHexSwatch').style.background = colorEditCurrentHex;
  }
  function closeColorEditor(){
    document.getElementById('colorEditPopup').style.display = 'none';
    closeHslColorPicker();
    colorEditTarget = null;
    colorEditIsNew = false;
    colorEditGroup = null;
  }
  document.getElementById('colorEditPickBtn').addEventListener('click', ()=>{
    startColorPick(hex=>{
      colorEditCurrentHex = hex;
      updateColorEditSwatch();
      setHslPickerColor(hex);
    });
  });
  document.getElementById('colorEditSaveBtn').addEventListener('click', ()=>{
    const name = document.getElementById('colorEditName').value.trim();
    pushHistory();
    if(colorEditIsNew){
      const grp = colorEditGroup || mainGroup();
      grp.colors.push({ id: mainColorIdCounter++, hex: colorEditCurrentHex, name });
      closeColorEditor();
      refreshGroups();
    } else if(colorEditTarget){
      colorEditTarget.hex = colorEditCurrentHex;
      colorEditTarget.name = name;
      closeColorEditor();
      refreshGroups();
    }
  });
  document.getElementById('colorEditCancelBtn').addEventListener('click', closeColorEditor);
  document.getElementById('colorEditHexSwatch').addEventListener('click', (ev)=>{
    openHslColorPicker(colorEditCurrentHex, hex=>{
      colorEditCurrentHex = hex;
      updateColorEditSwatch();
    }, document.getElementById('colorEditPopup'));
  });
  function openColorEditor(entry, ev, isNew = false, targetGroup = null){
    colorEditTarget = entry;
    colorEditIsNew = isNew;
    colorEditGroup = targetGroup || mainGroup();
    colorEditCurrentHex = entry ? entry.hex : (fgColor || '#7a9e5c');
    const popup = document.getElementById('colorEditPopup');
    document.getElementById('colorEditName').value = (entry && entry.name) ? entry.name : '';
    updateColorEditSwatch();
    popup.style.display = 'block';
    const sidePanel = document.querySelector('.side-panel');
    const panelRect = sidePanel.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, panelRect.left - popupRect.width - 10) + 'px';
    let top = (ev && ev.clientY) ? (ev.clientY - popupRect.height/2) : 100;
    top = Math.max(10, Math.min(window.innerHeight - popupRect.height - 10, top));
    popup.style.top = top + 'px';
  }
  function updateUsedColors(){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    let data;
    try { data = ctx.getImageData(0,0,W,H).data; } catch(e){ return; }
    const used = new Set();
    const counts = new Map();
    for(let i=0;i<data.length;i+=4){
      if(data[i+3] === 0) continue; // skip fully transparent pixels
      const hex = rgbToHex(data[i], data[i+1], data[i+2]);
      used.add(hex);
      counts.set(hex, (counts.get(hex)||0) + 1);
    }
    usedColorsSet = used;
    usedColorsCounts = counts;
    refreshGroups();
  }
  document.getElementById('markUsedColorsBtn').addEventListener('click', updateUsedColors);
  document.getElementById('showPixelCountsToggle').addEventListener('change', e=>{
    showPixelCounts = e.target.checked;
    refreshGroups();
  });
  updateUsedColors(); // one initial pass so the indicator isn't empty on load

  function handleSwatchClick(group, entry, idx, ev){
    const hex = entry.hex;
    if(ev.shiftKey && rangeAnchor.groupId === group.id){
      const lo = Math.min(rangeAnchor.index, idx), hi = Math.max(rangeAnchor.index, idx);
      const swatches = resolveGroupSwatches(group);
      for(let i=lo;i<=hi;i++) selectedColors.add(swatches[i].hex);
      rangeAnchor = { groupId: group.id, index: idx };
    } else if(ev.ctrlKey || ev.metaKey){
      if(selectedColors.has(hex)) selectedColors.delete(hex); else selectedColors.add(hex);
      rangeAnchor = { groupId: group.id, index: idx };
    } else {
      selectedColors = new Set([hex]);
      rangeAnchor = { groupId: group.id, index: idx };
      setFg(hex);
    }
    refreshGroups();
  }

  document.getElementById('addToGroupBtn').addEventListener('click', async ()=>{
    if(selectedColors.size === 0){ alert('Select one or more colors first (Ctrl+click or Shift+click).'); return; }
    const refs = [];
    selectedColors.forEach(hex=>{
      const entry = mainGroup().colors.find(c=>c.hex===hex);
      if(entry) refs.push(entry.id);
    });
    if(refs.length === 0){ alert('Selected colors could not be matched to the Main Palette.'); return; }
    const name = await showCustomPrompt('New group name:', 'Group ' + (groups.length+1));
    if(name === null) return;
    groups.unshift({ id: groupIdCounter++, name: name.trim() || ('Group ' + (groups.length+1)), isMain:false, colorRefs: refs, collapsed:false, columns:8 });
    refreshGroups();
  });

  function applyColorShift(targetHex){
    if(selectedColors.size === 0 || !layers[activeLayer]) return;
    pushHistory();
    const ctx = layers[activeLayer].ctx;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const sourceRgbs = [...selectedColors].map(hex => hexToRgb(hex));
    const {r:tR, g:tG, b:tB} = hexToRgb(targetHex);
    for(let i=0;i<data.length;i+=4){
      const a = data[i+3];
      if(a === 0) continue; // fully transparent — nothing to shift
      const maxDev = a < 255 ? (Math.ceil(128 / a) + 2) : 0;
      for(const src of sourceRgbs){
        if(Math.abs(data[i] - src.r) <= maxDev &&
           Math.abs(data[i+1] - src.g) <= maxDev &&
           Math.abs(data[i+2] - src.b) <= maxDev){
          data[i]=tR; data[i+1]=tG; data[i+2]=tB;
          break;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    render();
    refreshLayerThumbOnly();
  }
  let colorizeLastX = null, colorizeLastY = null;
  function colorizeBrushAt(px, py){
    if(!layers[activeLayer] || selectedColors.size === 0 || !colorizeTargetHex) return;
    const ctx = layers[activeLayer].ctx;
    const r = brushSize/2;
    const bx = Math.max(0, Math.floor(px-r)), by = Math.max(0, Math.floor(py-r));
    const bx2 = Math.min(W, Math.ceil(px+r)), by2 = Math.min(H, Math.ceil(py+r));
    const bw = bx2-bx, bh = by2-by;
    if(bw<=0 || bh<=0) return;
    const imgData = ctx.getImageData(bx, by, bw, bh);
    const data = imgData.data;
    const sourceRgbs = [...selectedColors].map(hex=>hexToRgb(hex));
    const {r:tR,g:tG,b:tB} = hexToRgb(colorizeTargetHex);
    for(let yy=0; yy<bh; yy++){
      for(let xx=0; xx<bw; xx++){
        const dx = (bx+xx+0.5) - px, dy = (by+yy+0.5) - py;
        if(dx*dx+dy*dy > r*r) continue; // circular brush shape
        const i = (yy*bw+xx)*4;
        const a = data[i+3];
        if(a === 0) continue;
        const maxDev = a < 255 ? (Math.ceil(128 / a) + 2) : 0;
        for(const src of sourceRgbs){
          if(Math.abs(data[i] - src.r) <= maxDev &&
             Math.abs(data[i+1] - src.g) <= maxDev &&
             Math.abs(data[i+2] - src.b) <= maxDev){
            data[i]=tR; data[i+1]=tG; data[i+2]=tB;
            break;
          }
        }
      }
    }
    ctx.putImageData(imgData, bx, by);
  }
  function colorizeLineTo(px, py){
    if(colorizeLastX === null){
      colorizeBrushAt(px, py);
      colorizeLastX = px; colorizeLastY = py;
      return;
    }
    const dx = px-colorizeLastX, dy = py-colorizeLastY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const spacing = Math.max(1, brushSize*0.3);
    const steps = Math.floor(dist/spacing);
    for(let i=1;i<=steps;i++){
      const t = i/steps;
      colorizeBrushAt(colorizeLastX+dx*t, colorizeLastY+dy*t);
    }
    colorizeLastX = px; colorizeLastY = py;
  }
  function getStampAlphaBuffer(size){
    if(selectedStampIndex === null || !stamps[selectedStampIndex]) return null;
    const mask = getActiveStampMask(stamps[selectedStampIndex]);
    const aspect = mask.width/mask.height;
    let w,h;
    if(aspect>=1){ w=size; h=size/aspect; } else { h=size; w=size*aspect; }
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const scratch = document.createElement('canvas');
    scratch.width = w; scratch.height = h;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(mask, 0, 0, w, h);
    const data = sctx.getImageData(0, 0, w, h).data;
    const alpha = new Uint8ClampedArray(w*h);
    for(let i=0; i<w*h; i++) alpha[i] = data[i*4+3];
    return {alpha, w, h};
  }
  let genBlurLastX = null, genBlurLastY = null;
  function genBlurBrushAt(px, py, shape, size){
    if(!layers[activeLayer]) return;
    const r = size/2;
    if(r <= 0) return;
    let stampBuf = null;
    if(shape === 'stamp'){
      stampBuf = getStampAlphaBuffer(size);
      if(!stampBuf) return; // no stamp selected — nothing to blur with
    }
    const ctx = layers[activeLayer].ctx;
    const bx = Math.max(0, Math.floor(px-r-1)), by = Math.max(0, Math.floor(py-r-1));
    const bx2 = Math.min(W, Math.ceil(px+r+1)), by2 = Math.min(H, Math.ceil(py+r+1));
    const bw = bx2-bx, bh = by2-by;
    if(bw<=2 || bh<=2) return;
    const imgData = ctx.getImageData(bx, by, bw, bh);
    const src = imgData.data;
    const out = new Uint8ClampedArray(src.length);
    out.set(src); // start as a copy so untouched pixels stay identical
    const strength = opacity/100;
    const hFactor = Math.max(0.01, Math.min(1.0, softenHardness / 100));

    for(let yy=1; yy<bh-1; yy++){
      for(let xx=1; xx<bw-1; xx++){
        const dx = (bx+xx+0.5) - px, dy = (by+yy+0.5) - py;
        let weight = 0;
        let distRel = 0;

        if(shape === 'circle'){
          distRel = Math.sqrt(dx*dx + dy*dy) / r;
          if(distRel <= 1.0){
            if(distRel <= hFactor){
              weight = 1.0;
            } else {
              const t = (distRel - hFactor) / (1.0 - hFactor);
              const fall = 1.0 - t;
              weight = fall * fall * (3.0 - 2.0 * fall); // smoothstep falloff
            }
          }
        } else if(shape === 'square'){
          distRel = Math.max(Math.abs(dx), Math.abs(dy)) / r;
          if(distRel <= 1.0){
            if(distRel <= hFactor){
              weight = 1.0;
            } else {
              const t = (distRel - hFactor) / (1.0 - hFactor);
              const fall = 1.0 - t;
              weight = fall * fall * (3.0 - 2.0 * fall);
            }
          }
        } else { // stamp shape
          const sx = Math.round(dx + stampBuf.w/2);
          const sy = Math.round(dy + stampBuf.h/2);
          if(sx>=0 && sy>=0 && sx<stampBuf.w && sy<stampBuf.h){
            const stampAlpha = stampBuf.alpha[sy*stampBuf.w+sx] / 255;
            distRel = Math.sqrt(dx*dx + dy*dy) / r;
            let fall = 1.0;
            if(distRel > hFactor){
              const t = Math.min(1.0, (distRel - hFactor) / Math.max(0.01, 1.0 - hFactor));
              fall = 1.0 - t;
              fall = fall * fall * (3.0 - 2.0 * fall);
            }
            weight = stampAlpha * fall;
          }
        }

        if(weight <= 0) continue;
        const i = (yy*bw+xx)*4;
        if(src[i+3] === 0) continue; // only fade existing opacity

        let sa=0;
        const yw = yy*bw, ywM1 = (yy-1)*bw, ywP1 = (yy+1)*bw;
        const xM1 = xx-1, xP1 = xx+1;
        sa += src[(ywM1+xM1)*4+3]; sa += src[(ywM1+xx)*4+3]; sa += src[(ywM1+xP1)*4+3];
        sa += src[(yw+xM1)*4+3];   sa += src[(yw+xx)*4+3];   sa += src[(yw+xP1)*4+3];
        sa += src[(ywP1+xM1)*4+3]; sa += src[(ywP1+xx)*4+3]; sa += src[(ywP1+xP1)*4+3];
        const blurAvg = sa/9;

        let target;
        if(softenType === 'full'){
          // Full area mode: reduces opacity under the full brush footprint (including solid interior pixels)
          const decay = strength * 30;
          target = Math.max(0, blurAvg - decay);
        } else {
          // Edge only mode: reduces opacity along boundaries where colored areas meet transparency
          const inBlendZone = src[i+3] < 255 || blurAvg < 255;
          const decayPerPass = inBlendZone ? strength * 30 : 0;
          target = Math.max(0, blurAvg - decayPerPass);
        }

        const w2 = weight * strength;
        out[i+3] = Math.round(src[i+3]*(1-w2) + target*w2);
      }
    }
    imgData.data.set(out);
    ctx.putImageData(imgData, bx, by);
  }
  function genBlurLineTo(px, py, shape, size){
    if(genBlurLastX === null){
      genBlurBrushAt(px, py, shape, size);
      genBlurLastX = px; genBlurLastY = py;
      return;
    }
    const dx = px-genBlurLastX, dy = py-genBlurLastY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const spacing = Math.max(1, size*0.3);
    const steps = Math.floor(dist/spacing);
    for(let i=1;i<=steps;i++){
      const t = i/steps;
      genBlurBrushAt(genBlurLastX+dx*t, genBlurLastY+dy*t, shape, size);
    }
    genBlurLastX = px; genBlurLastY = py;
  }
  let colorShiftTargetHex = null;
  let colorShiftPreviewTimer = null;

  function computeColorShiftData(targetHex) {
    if (selectedColors.size === 0 || !layers || !layers[activeLayer] || !targetHex) return null;
    const ctx = layers[activeLayer].colorCtx || layers[activeLayer].ctx;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const sourceRgbs = [...selectedColors].map(hex => hexToRgb(hex));
    const { r: tR, g: tG, b: tB } = hexToRgb(targetHex);
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue; // fully transparent — nothing to shift
      const maxDev = a < 255 ? (Math.ceil(128 / a) + 2) : 0;
      for (const src of sourceRgbs) {
        if (Math.abs(data[i] - src.r) <= maxDev &&
            Math.abs(data[i + 1] - src.g) <= maxDev &&
            Math.abs(data[i + 2] - src.b) <= maxDev) {
          data[i] = tR;
          data[i + 1] = tG;
          data[i + 2] = tB;
          break;
        }
      }
    }
    return imgData;
  }

  function updateColorShiftPreview() {
    clearTimeout(colorShiftPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
    const previewOn = document.getElementById('colorShiftPreviewCheckbox')?.checked;
    if (!previewOn || !colorShiftTargetHex || !layers || !layers[activeLayer]) return;
    colorShiftPreviewTimer = setTimeout(() => {
      const shifted = computeColorShiftData(colorShiftTargetHex);
      mpctx.clearRect(0, 0, W, H);
      if (shifted) mpctx.putImageData(shifted, 0, 0);
    }, 40);
  }

  function openColorShiftPopup(){
    if(selectedColors.size === 0){
      alert('Select one or more colors in the palette first (Ctrl+click or Shift+click), then Color Shift replaces every matching pixel on the active layer with a color you pick from the palette.');
      return;
    }
    const popup = document.getElementById('colorShiftPopup');
    const grid = document.getElementById('colorShiftPaletteGrid');
    grid.innerHTML = '';
    const palette = [...new Set(allColors())];
    colorShiftTargetHex = palette.includes(fgColor) ? fgColor : (palette[0] || null);
    palette.forEach(hex=>{
      const sw = document.createElement('div');
      sw.className = 'swatch' + (hex === colorShiftTargetHex ? ' selected' : '');
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener('click', ()=>{
        colorShiftTargetHex = hex;
        grid.querySelectorAll('.swatch').forEach(s=> s.classList.toggle('selected', s === sw));
        document.getElementById('colorShiftApplyBtn').disabled = false;
        updateColorShiftPreview();
      });
      grid.appendChild(sw);
    });
    document.getElementById('colorShiftApplyBtn').disabled = !colorShiftTargetHex;
    document.getElementById('colorShiftSummary').textContent =
      selectedColors.size + ' color' + (selectedColors.size>1?'s':'') + ' selected on the active layer — pick the new color above';
    popup.style.display = 'flex';
    const sidePanel = document.querySelector('.side-panel');
    const panelRect = sidePanel ? sidePanel.getBoundingClientRect() : { left: 300 };
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, panelRect.left - popupRect.width - 10) + 'px';
    popup.style.top = Math.max(10, Math.min(window.innerHeight - popupRect.height - 10, 150)) + 'px';
    updateColorShiftPreview();
  }

  function closeColorShiftPopup(){
    document.getElementById('colorShiftPopup').style.display = 'none';
    clearTimeout(colorShiftPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
  }

  document.getElementById('colorShiftBtn')?.addEventListener('click', openColorShiftPopup);
  document.getElementById('colorShiftCancelBtn')?.addEventListener('click', closeColorShiftPopup);
  document.getElementById('colorShiftCloseCross')?.addEventListener('click', closeColorShiftPopup);
  document.getElementById('colorShiftPreviewCheckbox')?.addEventListener('change', updateColorShiftPreview);
  document.getElementById('colorShiftApplyBtn')?.addEventListener('click', ()=>{
    if(!colorShiftTargetHex) return;
    clearTimeout(colorShiftPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
    applyColorShift(colorShiftTargetHex);
    closeColorShiftPopup();
  });

  // ---------- Outline Layer FX ----------
  let outlinePreviewTimer = null;

  function computeOutlineData(options) {
    if (!layers || !layers[activeLayer]) return null;
    const layer = layers[activeLayer];
    const srcCanvas = layer.colorCanvas || layer.canvas;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = srcCtx.getImageData(0, 0, W, H);
    const data = imgData.data;

    const {
      color = '#000000',
      thickness = 1,
      placement = 'outside',
      corners = '8way',
      pixelPerfect = true
    } = options || {};

    const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 };
    const w = W, h = H;
    const total = w * h;

    const curr = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      curr[i] = data[i * 4 + 3] > 0 ? 1 : 0;
    }

    const offsets = (corners === '4way')
      ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

    let outlineMask = new Uint8Array(total);

    if (placement === 'outside' || placement === 'both') {
      let dilated = new Uint8Array(curr);
      for (let t = 0; t < thickness; t++) {
        const prev = new Uint8Array(dilated);
        for (let y = 0; y < h; y++) {
          const yRow = y * w;
          for (let x = 0; x < w; x++) {
            if (prev[yRow + x]) continue;
            for (let k = 0; k < offsets.length; k++) {
              const ny = y + offsets[k][0];
              const nx = x + offsets[k][1];
              if (ny >= 0 && ny < h && nx >= 0 && nx < w && prev[ny * w + nx]) {
                dilated[yRow + x] = 1;
                break;
              }
            }
          }
        }
      }
      for (let i = 0; i < total; i++) {
        if (dilated[i] && !curr[i]) {
          outlineMask[i] = 1;
        }
      }
    }

    if (placement === 'inside' || placement === 'both') {
      let eroded = new Uint8Array(curr);
      for (let t = 0; t < thickness; t++) {
        const prev = new Uint8Array(eroded);
        for (let y = 0; y < h; y++) {
          const yRow = y * w;
          for (let x = 0; x < w; x++) {
            if (!prev[yRow + x]) continue;
            for (let k = 0; k < offsets.length; k++) {
              const ny = y + offsets[k][0];
              const nx = x + offsets[k][1];
              if (ny < 0 || ny >= h || nx < 0 || nx >= w || !prev[ny * w + nx]) {
                eroded[yRow + x] = 0;
                break;
              }
            }
          }
        }
      }
      for (let i = 0; i < total; i++) {
        if (curr[i] && !eroded[i]) {
          outlineMask[i] = 1;
        }
      }
    }

    // Pixel-perfect corner cleaning (remove 2x2 L-elbows sequentially)
    if (pixelPerfect) {
      for (let y = 0; y < h - 1; y++) {
        const y0 = y * w;
        const y1 = (y + 1) * w;
        for (let x = 0; x < w - 1; x++) {
          const p00 = outlineMask[y0 + x];
          const p10 = outlineMask[y0 + x + 1];
          const p01 = outlineMask[y1 + x];
          const p11 = outlineMask[y1 + x + 1];

          if (p00 && p10 && p01 && !p11) {
            outlineMask[y0 + x] = 0;
          } else if (p10 && p00 && p11 && !p01) {
            outlineMask[y0 + x + 1] = 0;
          } else if (p01 && p00 && p11 && !p10) {
            outlineMask[y1 + x] = 0;
          } else if (p11 && p10 && p01 && !p00) {
            outlineMask[y1 + x + 1] = 0;
          }
        }
      }
    }

    const outImgData = new ImageData(new Uint8ClampedArray(data), w, h);
    const outData = outImgData.data;

    for (let i = 0; i < total; i++) {
      if (outlineMask[i]) {
        const p = i * 4;
        outData[p] = rgb.r;
        outData[p + 1] = rgb.g;
        outData[p + 2] = rgb.b;
        outData[p + 3] = 255;
      }
    }

    return outImgData;
  }

  function getOutlineOptionsFromUI() {
    const colorHex = document.getElementById('outlineColorHex')?.value || '#000000';
    const thickness = parseInt(document.getElementById('outlineThicknessSlider')?.value, 10) || 1;
    const placement = document.getElementById('outlinePlacementSelect')?.value || 'outside';
    const corners = document.getElementById('outlineCornersSelect')?.value || '8way';
    const pixelPerfect = !!document.getElementById('outlinePixelPerfectCheckbox')?.checked;
    return { color: colorHex, thickness, placement, corners, pixelPerfect };
  }

  function updateOutlinePreview() {
    clearTimeout(outlinePreviewTimer);
    mpctx.clearRect(0, 0, W, H);
    const previewOn = document.getElementById('outlinePreviewCheckbox')?.checked;
    if (!previewOn || !layers || !layers[activeLayer]) return;

    outlinePreviewTimer = setTimeout(() => {
      const opts = getOutlineOptionsFromUI();
      const imgData = computeOutlineData(opts);
      mpctx.clearRect(0, 0, W, H);
      if (imgData) mpctx.putImageData(imgData, 0, 0);
    }, 40);
  }

  function openOutlinePopup() {
    if (!layers || !layers[activeLayer]) {
      if (typeof showToast === 'function') showToast('No active layer');
      return;
    }
    const popup = document.getElementById('outlinePopup');
    if (!popup) return;
    if (typeof fgColor === 'string' && fgColor) {
      const col = fgColor.startsWith('#') ? fgColor : '#000000';
      const colPicker = document.getElementById('outlineColorPicker');
      const colHex = document.getElementById('outlineColorHex');
      if (colPicker && col.length === 7) colPicker.value = col;
      if (colHex) colHex.value = col;
    }
    popup.style.display = 'flex';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width) / 2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height) / 2) + 'px';
    updateOutlinePreview();
  }

  function closeOutlinePopup() {
    const popup = document.getElementById('outlinePopup');
    if (popup) popup.style.display = 'none';
    clearTimeout(outlinePreviewTimer);
    mpctx.clearRect(0, 0, W, H);
  }

  document.getElementById('fxOutlineBtn')?.addEventListener('click', openOutlinePopup);
  document.getElementById('outlineBtn')?.addEventListener('click', openOutlinePopup);
  document.getElementById('outlineCloseCross')?.addEventListener('click', closeOutlinePopup);
  document.getElementById('outlineCancelBtn')?.addEventListener('click', closeOutlinePopup);

  document.getElementById('outlineColorPicker')?.addEventListener('input', (e) => {
    const hexInput = document.getElementById('outlineColorHex');
    if (hexInput) hexInput.value = e.target.value;
    updateOutlinePreview();
  });
  document.getElementById('outlineColorHex')?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const colPicker = document.getElementById('outlineColorPicker');
      if (colPicker) colPicker.value = val;
    }
    updateOutlinePreview();
  });
  document.getElementById('outlineUseActiveColorBtn')?.addEventListener('click', () => {
    if (typeof fgColor === 'string' && fgColor) {
      const col = fgColor.startsWith('#') ? fgColor : '#000000';
      const colPicker = document.getElementById('outlineColorPicker');
      const colHex = document.getElementById('outlineColorHex');
      if (colPicker && col.length === 7) colPicker.value = col;
      if (colHex) colHex.value = col;
      updateOutlinePreview();
    }
  });
  document.getElementById('outlineThicknessSlider')?.addEventListener('input', (e) => {
    const valEl = document.getElementById('outlineThicknessVal');
    if (valEl) valEl.textContent = e.target.value + 'px';
    updateOutlinePreview();
  });
  document.getElementById('outlinePlacementSelect')?.addEventListener('change', updateOutlinePreview);
  document.getElementById('outlineCornersSelect')?.addEventListener('change', updateOutlinePreview);
  document.getElementById('outlinePixelPerfectCheckbox')?.addEventListener('change', updateOutlinePreview);
  document.getElementById('outlinePreviewCheckbox')?.addEventListener('change', updateOutlinePreview);

  document.getElementById('outlineApplyBtn')?.addEventListener('click', () => {
    if (!layers || !layers[activeLayer]) return;
    const opts = getOutlineOptionsFromUI();
    const imgData = computeOutlineData(opts);
    if (imgData) {
      pushHistory();
      const ctx = layers[activeLayer].colorCtx || layers[activeLayer].ctx;
      ctx.putImageData(imgData, 0, 0);
      render();
      refreshLayerThumbOnly();
      if (typeof showToast === 'function') showToast('Outline applied');
    }
    closeOutlinePopup();
  });

  function computeSharpenedData(gridSize, offsetX, offsetY){
    if(!layers[activeLayer]) return null;
    const ctx = layers[activeLayer].colorCtx;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const out = new Uint8ClampedArray(data); // copy — untouched blocks (fully transparent) stay as-is

    for(let by = offsetY - gridSize; by < H; by += gridSize){
      for(let bx = offsetX - gridSize; bx < W; bx += gridSize){
        const x0 = Math.max(0, bx), y0 = Math.max(0, by);
        const x1 = Math.min(W, bx+gridSize), y1 = Math.min(H, by+gridSize);
        if(x1 <= x0 || y1 <= y0) continue;

        // Dominant (most frequent) color in this block, not an average — averaging would still
        // produce blended/blurry colors at edges; the mode approximates the original solid
        // color before it got softened.
        const counts = new Map();
        for(let yy=y0; yy<y1; yy++){
          for(let xx=x0; xx<x1; xx++){
            const idx = (yy*W+xx)*4;
            if(data[idx+3] === 0) continue;
            const key = data[idx]*65536 + data[idx+1]*256 + data[idx+2];
            counts.set(key, (counts.get(key)||0) + 1);
          }
        }
        if(counts.size === 0) continue; // fully transparent block

        let bestKey = null, bestCount = -1;
        counts.forEach((count, key)=>{ if(count > bestCount){ bestCount = count; bestKey = key; } });
        const r = Math.floor(bestKey / 65536);
        const g = Math.floor((bestKey % 65536) / 256);
        const b = bestKey % 256;

        for(let yy=y0; yy<y1; yy++){
          for(let xx=x0; xx<x1; xx++){
            const idx = (yy*W+xx)*4;
            if(data[idx+3] === 0) continue; // keep transparent pixels transparent
            out[idx]=r; out[idx+1]=g; out[idx+2]=b; // original alpha preserved
          }
        }
      }
    }
    return new ImageData(out, W, H);
  }
  function autoDetectSharpenGridSize(){
    if(!layers[activeLayer]) return 4;
    const ctx = layers[activeLayer].colorCtx;
    const data = ctx.getImageData(0, 0, W, H).data;
    // Cap both the candidate range and the sampled region so this stays fast regardless of
    // canvas size — a representative sample is enough to estimate the grid, no need to scan
    // every pixel of a huge image across every candidate size.
    const sampleW = Math.min(W, 256), sampleH = Math.min(H, 256);
    const maxCandidate = Math.min(24, Math.floor(Math.min(sampleW, sampleH)/2));
    let bestN = 4, bestScore = Infinity;
    for(let n = 2; n <= maxCandidate; n++){
      let totalDiff = 0, sampleCount = 0;
      for(let by = 0; by < sampleH; by += n){
        for(let bx = 0; bx < sampleW; bx += n){
          const x1 = Math.min(sampleW, bx+n), y1 = Math.min(sampleH, by+n);
          const counts = {};
          let total = 0, bestCount = 0;
          for(let yy=by; yy<y1; yy++){
            for(let xx=bx; xx<x1; xx++){
              const idx = (yy*W+xx)*4;
              if(data[idx+3]===0) continue;
              const key = data[idx]*65536 + data[idx+1]*256 + data[idx+2];
              const c = (counts[key]||0)+1;
              counts[key] = c;
              total++;
              if(c>bestCount) bestCount = c;
            }
          }
          if(total===0) continue;
          totalDiff += (total - bestCount);
          sampleCount += total;
        }
      }
      const score = sampleCount > 0 ? totalDiff / sampleCount : 1;
      if(score < bestScore){ bestScore = score; bestN = n; }
    }
    return bestN;
  }
  function buildColorHistogram(ctx, w, h){
    const data = ctx.getImageData(0, 0, w, h).data;
    const hist = new Map();
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0) continue; // skip transparent pixels
      const key = data[i]*65536 + data[i+1]*256 + data[i+2];
      const entry = hist.get(key);
      if(entry) entry.count++;
      else hist.set(key, {r:data[i], g:data[i+1], b:data[i+2], count:1});
    }
    return hist;
  }
  function medianCutQuantize(histEntries, maxColors){
    let buckets = [histEntries.slice()];
    while(buckets.length < maxColors){
      let bestIdx = -1, bestScore = -1, bestAxis = 'r';
      buckets.forEach((bucket, idx)=>{
        if(bucket.length <= 1) return;
        const totalWeight = bucket.reduce((s,c)=> s + (c.weight!==undefined ? c.weight : c.count), 0);
        ['r','g','b'].forEach(axis=>{
          let min=255, max=0;
          bucket.forEach(c=>{ if(c[axis]<min) min=c[axis]; if(c[axis]>max) max=c[axis]; });
          const range = max-min;
          // Range * total weight (not range alone) — a standard median-cut variant that lets a
          // boosted/populous region get chosen for splitting even if its raw color spread isn't
          // the single largest, which is what actually makes a "protect this color" weight do
          // anything — with pure range-based selection, weight would never influence which
          // bucket gets split next at all, only where a chosen bucket splits.
          const score = range * totalWeight;
          if(score > bestScore){ bestScore = score; bestIdx = idx; bestAxis = axis; }
        });
      });
      if(bestIdx === -1 || bestScore === 0) break; // nothing left worth splitting further
      const bucket = buckets[bestIdx];
      bucket.sort((a,b)=> a[bestAxis]-b[bestAxis]);
      const totalWeight = bucket.reduce((s,c)=> s + (c.weight!==undefined ? c.weight : c.count), 0);
      let acc = 0, splitAt = 0;
      for(let i=0; i<bucket.length; i++){
        acc += (bucket[i].weight!==undefined ? bucket[i].weight : bucket[i].count);
        if(acc >= totalWeight/2){ splitAt = i+1; break; }
      }
      if(splitAt === 0 || splitAt === bucket.length) splitAt = Math.floor(bucket.length/2);
      const left = bucket.slice(0, splitAt), right = bucket.slice(splitAt);
      if(left.length === 0 || right.length === 0) break;
      buckets.splice(bestIdx, 1, left, right);
    }
    return buckets.map(bucket=>{
      let sr=0,sg=0,sb=0,sw=0;
      bucket.forEach(c=>{ sr+=c.r*c.count; sg+=c.g*c.count; sb+=c.b*c.count; sw+=c.count; }); // TRUE
      // pixel count here, always — weighting only ever influences which buckets form, never the
      // resulting averaged color, so a boosted region gets more distinct final colors but each
      // one is still an honest average of its actual pixels, not skewed toward the weight target
      return { r: Math.round(sr/sw), g: Math.round(sg/sw), b: Math.round(sb/sw) };
    });
  }
  let reduceColorsWeightedColors = []; // [{r,g,b,hex,multiplier}] — colors the user has boosted/reduced
  let reduceColorsNeighborhood = 40; // color-distance radius each weighted color's influence reaches
  function computeWeightMultiplier(r, g, b){
    if(reduceColorsWeightedColors.length === 0) return 1;
    let closestDist = Infinity, closestMultiplier = 1;
    reduceColorsWeightedColors.forEach(wc=>{
      const dr=wc.r-r, dg=wc.g-g, db=wc.b-b;
      const dist = Math.sqrt(dr*dr+dg*dg+db*db);
      if(dist < closestDist){ closestDist = dist; closestMultiplier = wc.multiplier; }
    });
    if(closestDist >= reduceColorsNeighborhood) return 1; // outside any weighted color's reach
    const t = 1 - (closestDist / reduceColorsNeighborhood); // 1 at exact match, 0 at the edge
    return 1 + (closestMultiplier - 1) * t; // smooth falloff, not a hard cutoff
  }
  function computeReducedColorsData(maxColors){
    if(!layers[activeLayer]) return null;
    const ctx = layers[activeLayer].colorCtx;
    const hist = buildColorHistogram(ctx, W, H);
    if(hist.size <= maxColors) return null; // already at/below target
    const histEntries = [...hist.values()];
    if(reduceColorsWeightedColors.length > 0){
      histEntries.forEach(entry=>{ entry.weight = entry.count * computeWeightMultiplier(entry.r, entry.g, entry.b); });
    }
    const reducedPalette = medianCutQuantize(histEntries, maxColors);
    // Cache the nearest reduced color per ORIGINAL unique color, so the final per-pixel pass is
    // a cheap lookup instead of comparing every pixel against every palette entry.
    const lookup = new Map();
    hist.forEach((entry, key)=>{
      let best = reducedPalette[0], bestDist = Infinity;
      reducedPalette.forEach(rc=>{
        const dr=rc.r-entry.r, dg=rc.g-entry.g, db=rc.b-entry.b;
        const dist = dr*dr+dg*dg+db*db;
        if(dist < bestDist){ bestDist = dist; best = rc; }
      });
      lookup.set(key, best);
    });
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0) continue;
      const key = data[i]*65536 + data[i+1]*256 + data[i+2];
      const mapped = lookup.get(key);
      if(mapped){ data[i]=mapped.r; data[i+1]=mapped.g; data[i+2]=mapped.b; }
    }
    return imgData;
  }
  function computeConsolidatedColorsData(hueTolPct, hueCurvePct, satTolPct, satCurvePct, lumTolPct, lumCurvePct){
    if(!layers[activeLayer]) return null;
    const ctx = layers[activeLayer].colorCtx;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    // Build a histogram of unique existing colors with their HSL, weighted by pixel count
    const hist = new Map(); // rgbKey -> {r,g,b,count,h,s,l}
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0) continue;
      const key = data[i]*65536 + data[i+1]*256 + data[i+2];
      let e = hist.get(key);
      if(e) e.count++;
      else {
        const {h,s,l} = rgbToHsl(data[i], data[i+1], data[i+2]);
        hist.set(key, {r:data[i], g:data[i+1], b:data[i+2], count:1, h, s, l});
      }
    }
    if(hist.size === 0) return null;
    const colors = [...hist.values()];

    // Tolerance (0-100%) maps to bin width — hue wraps 0-360, sat/lightness are 0-1
    const hueBinWidth = Math.max(1, (hueTolPct/100) * 180);
    const satBinWidth = Math.max(0.01, (satTolPct/100) * 1);
    const lumBinWidth = Math.max(0.01, (lumTolPct/100) * 1);

    function hueBinIndex(h){ return Math.floor((((h%360)+360)%360) / hueBinWidth); }
    function linBinIndex(v, width){ return Math.floor(v / width); }

    const bins = new Map(); // binKey -> [colors]
    colors.forEach(c=>{
      const key = hueBinIndex(c.h) + ',' + linBinIndex(c.s, satBinWidth) + ',' + linBinIndex(c.l, lumBinWidth);
      if(!bins.has(key)) bins.set(key, []);
      bins.get(key).push(c);
    });

    // Weighted percentile (by pixel count) along one axis within a bin's colors
    function weightedPercentile(items, valueFn, percentilePct){
      const sorted = [...items].sort((a,b)=>valueFn(a)-valueFn(b));
      const totalWeight = sorted.reduce((sum,c)=>sum+c.count, 0);
      const targetWeight = totalWeight * (percentilePct/100);
      let acc = 0;
      for(const item of sorted){
        acc += item.count;
        if(acc >= targetWeight) return valueFn(item);
      }
      return valueFn(sorted[sorted.length-1]);
    }

    // For each bin: compute a target (H,S,L) from the percentile controls, then pick whichever
    // ACTUAL EXISTING color in that bin is closest to the target — never synthesizes a new one
    const remap = new Map(); // original rgbKey -> representative rgbKey
    bins.forEach(binColors=>{
      const targetH = weightedPercentile(binColors, c=>c.h, hueCurvePct);
      const targetS = weightedPercentile(binColors, c=>c.s, satCurvePct);
      const targetL = weightedPercentile(binColors, c=>c.l, lumCurvePct);
      let best = binColors[0], bestDist = Infinity;
      binColors.forEach(c=>{
        let dh = Math.abs(c.h - targetH); if(dh > 180) dh = 360 - dh;
        const ds = c.s - targetS, dl = c.l - targetL;
        const dist = (dh/180)*(dh/180) + ds*ds + dl*dl;
        if(dist < bestDist){ bestDist = dist; best = c; }
      });
      const repKey = best.r*65536 + best.g*256 + best.b;
      binColors.forEach(c=>{
        remap.set(c.r*65536 + c.g*256 + c.b, repKey);
      });
    });

    const out = new Uint8ClampedArray(data);
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0) continue;
      const key = data[i]*65536 + data[i+1]*256 + data[i+2];
      const repKey = remap.get(key);
      out[i] = Math.floor(repKey/65536);
      out[i+1] = Math.floor((repKey%65536)/256);
      out[i+2] = repKey%256;
    }
    return new ImageData(out, W, H);
  }
  function reduceColorsOnLayer(maxColors){
    if(!layers[activeLayer]) return;
    const hist = buildColorHistogram(layers[activeLayer].colorCtx, W, H);
    if(hist.size <= maxColors){
      alert('This layer already has ' + hist.size + ' color' + (hist.size===1?'':'s') + ' or fewer.');
      return;
    }
    const imgData = computeReducedColorsData(maxColors);
    if(!imgData) return;
    pushHistory();
    layers[activeLayer].colorCtx.putImageData(imgData, 0, 0);
    render();
    refreshLayerThumbOnly();
  }
  let reduceColorsPreviewTimer = null;
  function reduceColorsMode(){ return document.getElementById('reduceColorsModeSelect').value; }
  function computeActiveReduceColorsData(){
    if(reduceColorsMode() === 'consolidate'){
      return computeConsolidatedColorsData(
        +document.getElementById('rcHueTolSlider').value,
        +document.getElementById('rcHueCurveSlider').value,
        +document.getElementById('rcSatTolSlider').value,
        +document.getElementById('rcSatCurveSlider').value,
        +document.getElementById('rcValTolSlider').value,
        +document.getElementById('rcValCurveSlider').value
      );
    }
    return computeReducedColorsData(+document.getElementById('reduceColorsMaxSlider').value);
  }
  function countUniqueColorsInImageData(imgData){
    const seen = new Set();
    const data = imgData.data;
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0) continue;
      seen.add(data[i]*65536 + data[i+1]*256 + data[i+2]);
    }
    return seen.size;
  }
  function updateReduceColorsPreview(){
    const previewOn = document.getElementById('reduceColorsPreviewCheckbox').checked;
    clearTimeout(reduceColorsPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
    reduceColorsPreviewTimer = setTimeout(()=>{
      const imgData = computeActiveReduceColorsData();
      const resultEl = document.getElementById('reduceColorsResultCount');
      if(imgData){
        const count = countUniqueColorsInImageData(imgData);
        resultEl.textContent = 'This would result in ' + count.toLocaleString() + ' unique color' + (count===1?'':'s') + '.';
      } else if(reduceColorsMode() === 'blend'){
        resultEl.textContent = 'Already at or below this — no reduction needed.';
      } else {
        resultEl.textContent = '';
      }
      if(previewOn){
        mpctx.clearRect(0, 0, W, H);
        if(imgData) mpctx.putImageData(imgData, 0, 0);
      }
    }, 200); // debounced — quantization isn't instant, avoid recomputing on every slider tick
  }
  function makePopupDraggable(popupEl, handleEl, onMove){
    let dragging = false, startX, startY, startLeft, startTop;
    handleEl.addEventListener('pointerdown', (e)=>{
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = popupEl.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      popupEl.style.left = Math.max(0, startLeft + (e.clientX-startX)) + 'px';
      popupEl.style.top = Math.max(0, startTop + (e.clientY-startY)) + 'px';
      if(onMove) onMove();
    });
    window.addEventListener('pointerup', ()=>{ dragging = false; });
  }
  makePopupDraggable(document.getElementById('colorShiftPopup'), document.getElementById('colorShiftDragHandle'));
  makePopupDraggable(document.getElementById('outlinePopup'), document.getElementById('outlineDragHandle'));
  makePopupDraggable(document.getElementById('reduceColorsPopup'), document.getElementById('reduceColorsDragHandle'));
  makePopupDraggable(document.getElementById('sharpenPopup'), document.getElementById('sharpenDragHandle'));

  let sharpenPreviewTimer = null;
  function updateSharpenOffsetRanges(){
    const gridSize = +document.getElementById('sharpenGridSizeSlider').value;
    const maxOffset = Math.max(0, gridSize - 1);
    const xSlider = document.getElementById('sharpenOffsetXSlider');
    const ySlider = document.getElementById('sharpenOffsetYSlider');
    xSlider.max = maxOffset; if(+xSlider.value > maxOffset) xSlider.value = maxOffset;
    ySlider.max = maxOffset; if(+ySlider.value > maxOffset) ySlider.value = maxOffset;
    document.getElementById('sharpenOffsetXVal').textContent = xSlider.value;
    document.getElementById('sharpenOffsetYVal').textContent = ySlider.value;
  }
  function updateSharpenPreview(){
    const previewOn = document.getElementById('sharpenPreviewCheckbox').checked;
    clearTimeout(sharpenPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
    if(!previewOn) return;
    sharpenPreviewTimer = setTimeout(()=>{
      const gridSize = +document.getElementById('sharpenGridSizeSlider').value;
      const offsetX = +document.getElementById('sharpenOffsetXSlider').value;
      const offsetY = +document.getElementById('sharpenOffsetYSlider').value;
      const imgData = computeSharpenedData(gridSize, offsetX, offsetY);
      mpctx.clearRect(0, 0, W, H);
      if(imgData) mpctx.putImageData(imgData, 0, 0);
    }, 200);
  }
  function openSharpenPopup(){
    if(!layers[activeLayer]) return;
    updateSharpenOffsetRanges();
    const popup = document.getElementById('sharpenPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
    updateSharpenPreview();
  }
  function closeSharpenPopup(){
    document.getElementById('sharpenPopup').style.display = 'none';
    clearTimeout(sharpenPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
  }
  document.getElementById('sharpenBtn')?.addEventListener('click', openSharpenPopup);
  document.getElementById('fxSharpenBtn')?.addEventListener('click', openSharpenPopup);
  document.getElementById('sharpenCancelBtn').addEventListener('click', closeSharpenPopup);
  document.getElementById('sharpenPreviewCheckbox').addEventListener('change', updateSharpenPreview);
  document.getElementById('sharpenGridSizeSlider').addEventListener('input', e=>{
    document.getElementById('sharpenGridSizeVal').textContent = e.target.value;
    updateSharpenOffsetRanges();
    updateSharpenPreview();
  });
  document.getElementById('sharpenOffsetXSlider').addEventListener('input', e=>{
    document.getElementById('sharpenOffsetXVal').textContent = e.target.value;
    updateSharpenPreview();
  });
  document.getElementById('sharpenOffsetYSlider').addEventListener('input', e=>{
    document.getElementById('sharpenOffsetYVal').textContent = e.target.value;
    updateSharpenPreview();
  });
  document.getElementById('sharpenAutoDetectBtn').addEventListener('click', ()=>{
    const detected = autoDetectSharpenGridSize();
    const slider = document.getElementById('sharpenGridSizeSlider');
    slider.value = detected;
    document.getElementById('sharpenGridSizeVal').textContent = detected;
    document.getElementById('sharpenOffsetXSlider').value = 0;
    document.getElementById('sharpenOffsetYSlider').value = 0;
    updateSharpenOffsetRanges();
    updateSharpenPreview();
  });
  document.getElementById('sharpenApplyBtn').addEventListener('click', ()=>{
    const gridSize = +document.getElementById('sharpenGridSizeSlider').value;
    const offsetX = +document.getElementById('sharpenOffsetXSlider').value;
    const offsetY = +document.getElementById('sharpenOffsetYSlider').value;
    const imgData = computeSharpenedData(gridSize, offsetX, offsetY);
    if(imgData){
      pushHistory();
      layers[activeLayer].colorCtx.putImageData(imgData, 0, 0);
      render();
      refreshLayerThumbOnly();
    }
    closeSharpenPopup();
  });
  function refreshWeightedColorsList(){
    const list = document.getElementById('reduceColorsWeightedList');
    list.innerHTML = '';
    reduceColorsWeightedColors.forEach((wc, idx)=>{
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const swatch = document.createElement('div');
      swatch.style.cssText = 'width:20px;height:20px;border-radius:4px;flex-shrink:0;border:1px solid var(--line);background:' + wc.hex;
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0.1'; slider.max = '5'; slider.step = '0.1';
      slider.value = wc.multiplier;
      slider.style.flex = '1';
      const label = document.createElement('span');
      label.style.cssText = 'font-size:11px;width:34px;flex-shrink:0;';
      label.textContent = wc.multiplier.toFixed(1) + 'x';
      slider.addEventListener('input', e=>{
        wc.multiplier = +e.target.value;
        label.textContent = wc.multiplier.toFixed(1) + 'x';
        updateReduceColorsPreview();
      });
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn small'; removeBtn.textContent = '\u00d7'; removeBtn.style.padding = '2px 8px';
      removeBtn.addEventListener('click', ()=>{
        reduceColorsWeightedColors.splice(idx, 1);
        refreshWeightedColorsList();
        updateReduceColorsPreview();
      });
      row.appendChild(swatch); row.appendChild(slider); row.appendChild(label); row.appendChild(removeBtn);
      list.appendChild(row);
    });
  }
  document.getElementById('reduceColorsPickWeightBtn').addEventListener('click', ()=>{
    startColorPick(hex=>{
      const {r,g,b} = hexToRgb(hex);
      reduceColorsWeightedColors.push({r, g, b, hex, multiplier: 2});
      refreshWeightedColorsList();
      updateReduceColorsPreview();
    });
  });
  document.getElementById('reduceColorsNeighborhoodSlider').addEventListener('input', e=>{
    reduceColorsNeighborhood = +e.target.value;
    document.getElementById('reduceColorsNeighborhoodVal').textContent = reduceColorsNeighborhood;
    updateReduceColorsPreview();
  });
  function openReduceColorsPopup(){
    if(!layers[activeLayer]) return;
    const hist = buildColorHistogram(layers[activeLayer].colorCtx, W, H);
    document.getElementById('reduceColorsCurrentCount').textContent = 'This layer currently has ' + hist.size + ' unique color' + (hist.size===1?'':'s') + '.';
    const popup = document.getElementById('reduceColorsPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
    refreshWeightedColorsList();
    document.getElementById('reduceColorsNeighborhoodSlider').value = reduceColorsNeighborhood;
    document.getElementById('reduceColorsNeighborhoodVal').textContent = reduceColorsNeighborhood;
    updateReduceColorsPreview();
  }
  function closeReduceColorsPopup(){
    document.getElementById('reduceColorsPopup').style.display = 'none';
    clearTimeout(reduceColorsPreviewTimer);
    mpctx.clearRect(0, 0, W, H);
  }
  document.getElementById('reduceColorsBtn').addEventListener('click', openReduceColorsPopup);
  document.getElementById('reduceColorsCancelBtn').addEventListener('click', closeReduceColorsPopup);
  document.getElementById('reduceColorsPreviewCheckbox').addEventListener('change', updateReduceColorsPreview);
  document.getElementById('reduceColorsMaxSlider').addEventListener('input', e=>{
    document.getElementById('reduceColorsMaxVal').textContent = e.target.value;
    updateReduceColorsPreview();
  });
  document.getElementById('reduceColorsModeSelect').addEventListener('change', ()=>{
    const isConsolidate = reduceColorsMode() === 'consolidate';
    document.getElementById('reduceBlendControls').style.display = isConsolidate ? 'none' : 'block';
    document.getElementById('reduceConsolidateControls').style.display = isConsolidate ? 'block' : 'none';
    updateReduceColorsPreview();
  });
  ['rcHueTolSlider','rcHueCurveSlider','rcSatTolSlider','rcSatCurveSlider','rcValTolSlider','rcValCurveSlider'].forEach(id=>{
    document.getElementById(id).addEventListener('input', e=>{
      document.getElementById(id.replace('Slider','Val')).textContent = e.target.value;
      updateReduceColorsPreview();
    });
  });
  document.getElementById('reduceColorsApplyBtn').addEventListener('click', ()=>{
    if(reduceColorsMode() === 'consolidate'){
      const imgData = computeActiveReduceColorsData();
      if(!imgData) return;
      pushHistory();
      layers[activeLayer].colorCtx.putImageData(imgData, 0, 0);
      render();
      refreshLayerThumbOnly();
    } else {
      reduceColorsOnLayer(+document.getElementById('reduceColorsMaxSlider').value);
    }
    closeReduceColorsPopup();
  });

  let extractSeenColors = null;
  let extractOverCap = false;
  function openExtractPalettePopup(){
    if(!layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    const data = ctx.getImageData(0, 0, W, H).data;
    const seen = new Set();
    for(let i=0; i<data.length; i+=4){
      if(data[i+3] === 0) continue; // skip transparent pixels
      seen.add(rgbToHex(data[i], data[i+1], data[i+2]));
    }
    if(seen.size === 0){
      alert('No painted pixels found on the active layer.');
      return;
    }
    extractSeenColors = seen;
    extractOverCap = seen.size > MAX_PALETTE_COLORS;
    document.getElementById('extractPaletteInfo').textContent = 'This layer has ' + seen.size.toLocaleString() + ' unique color' + (seen.size===1?'':'s') + '.';
    document.getElementById('extractOverCapControls').style.display = extractOverCap ? 'block' : 'none';
    document.getElementById('extractModeSelect').value = 'add';
    document.getElementById('extractNewGroupCheckbox').checked = true;
    document.getElementById('extractGroupNameInput').value = 'Extracted Palette';
    updateExtractModeUI();
    const popup = document.getElementById('extractPalettePopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closeExtractPalettePopup(){
    document.getElementById('extractPalettePopup').style.display = 'none';
    extractSeenColors = null;
  }
  function updateExtractModeUI(){
    const mode = document.getElementById('extractModeSelect').value;
    document.getElementById('extractNewGroupRow').style.display = mode === 'replace' ? 'none' : 'flex';
    document.getElementById('extractModeHint').textContent = mode === 'replace'
      ? 'Replaces every color in the Main Palette and deletes other groups (they only reference Main Palette colors, so they can\'t survive it being replaced).'
      : 'Adds these colors to the Main Palette alongside what\'s already there.';
  }
  document.getElementById('extractPaletteBtn').addEventListener('click', openExtractPalettePopup);
  document.getElementById('extractCancelBtn').addEventListener('click', closeExtractPalettePopup);
  makePopupDraggable(document.getElementById('extractPalettePopup'), document.getElementById('extractPaletteDragHandle'));
  document.getElementById('extractModeSelect').addEventListener('change', updateExtractModeUI);
  document.getElementById('extractApplyBtn').addEventListener('click', ()=>{
    if(!extractSeenColors || !layers[activeLayer]) return;
    const ctx = layers[activeLayer].ctx;
    const mode = document.getElementById('extractModeSelect').value;
    const createGroup = document.getElementById('extractNewGroupCheckbox').checked;
    const name = document.getElementById('extractGroupNameInput').value.trim() || 'Extracted Palette';

    let finalHexes;
    if(extractOverCap){
      const reduceFirst = document.getElementById('extractOverCapModeSelect').value === 'reduce';
      if(reduceFirst){
        const imgData = computeReducedColorsData(MAX_PALETTE_COLORS);
        if(!imgData) return;
        pushHistory();
        ctx.putImageData(imgData, 0, 0);
        render();
        refreshLayerThumbOnly();
        const d2 = imgData.data;
        const seen2 = new Set();
        for(let i=0;i<d2.length;i+=4){ if(d2[i+3]===0) continue; seen2.add(rgbToHex(d2[i],d2[i+1],d2[i+2])); }
        finalHexes = [...seen2];
      } else {
        // Same median-cut quantization Reduce Colors uses, just computing the resulting
        // palette without writing it back onto the layer.
        const hist = buildColorHistogram(ctx, W, H);
        const reducedPalette = medianCutQuantize([...hist.values()], MAX_PALETTE_COLORS);
        finalHexes = reducedPalette.map(c=>rgbToHex(c.r,c.g,c.b));
      }
    } else {
      finalHexes = [...extractSeenColors];
    }

    const main = mainGroup();
    if(mode === 'replace'){
      const otherGroupCount = groups.length - 1;
      const warning = otherGroupCount > 0
        ? `This replaces every color in the Main Palette and deletes ${otherGroupCount} other group${otherGroupCount>1?'s':''} (they only reference Main Palette colors, so they can't survive it being replaced). Continue?`
        : 'This replaces every color in the Main Palette. Continue?';
      if(!confirm(warning)) return;
      main.colors = finalHexes.map(hex => ({ id: mainColorIdCounter++, hex }));
      main.name = name;
      groups = [main];
      selectedColors = new Set();
      selectPaletteIndex(0);
    } else {
      const existingHexes = new Set(main.colors.map(c=>c.hex));
      const newUniqueCount = finalHexes.filter(hex => !existingHexes.has(hex)).length;
      if(main.colors.length + newUniqueCount > MAX_PALETTE_COLORS){
        alert('Adding these colors would put the Main Palette over the ' + MAX_PALETTE_COLORS + '-color limit (' +
          main.colors.length + ' existing + ' + newUniqueCount + ' new colors). Try Replace instead, reduce the layer\'s colors first, or remove some existing palette colors.');
        return;
      }
      const refs = [];
      finalHexes.forEach(hex=>{
        let entry = main.colors.find(c=>c.hex===hex);
        if(!entry){
          entry = { id: mainColorIdCounter++, hex };
          main.colors.push(entry);
        }
        refs.push(entry.id);
      });
      if(createGroup){
        groups.unshift({ id: groupIdCounter++, name, isMain:false, colorRefs: refs, collapsed:false, columns:8 });
      }
    }
    refreshGroups();
    fitSidePanelToPalette();
    closeExtractPalettePopup();
  });

  const MAX_PALETTE_COLORS = 256;

  // ---------- Palette Builder ----------
  let pbColors = []; // [{hex, locked}]
  let pbSpread = 50, pbJitter = 50;
  let pbColorScheme = 'none';

  function randomFullSpectrumColor(){
    const h = Math.random()*360;
    const s = 0.4 + Math.random()*0.5;
    const l = 0.3 + Math.random()*0.45;
    return hslToHex(h, s, l);
  }
  function jitteredColorNear(baseHex, jitterPct){
    const {h,s,l} = hexToHsl(baseHex);
    // Jitter alone now controls how much color-space variation gets applied around the anchor —
    // 0 means an exact copy, 100 means the full available range.
    const usage = jitterPct/100;
    const newH = h + (Math.random()*2-1) * 90 * usage;
    const newS = Math.min(1, Math.max(0, s + (Math.random()*2-1) * 0.45 * usage));
    const newL = Math.min(0.95, Math.max(0.05, l + (Math.random()*2-1) * 0.4 * usage));
    return hslToHex(newH, newS, newL);
  }
  function nearestLockedWithinSpread(idx, spreadSwatches){
    // Spread is a SPATIAL concept — how many grid positions away a locked color's influence
    // reaches — not a color-space range. Find the closest locked swatch BY GRID POSITION, and
    // only use it as an anchor if it's within that many positions.
    let bestDist = Infinity, bestIdx = -1;
    pbColors.forEach((c, i)=>{
      if(!c.locked) return;
      const dist = Math.abs(i - idx);
      if(dist < bestDist){ bestDist = dist; bestIdx = i; }
    });
    if(bestIdx === -1 || bestDist > spreadSwatches) return null;
    return pbColors[bestIdx];
  }
  const COLOR_SCHEME_HUE_SHIFTS = {
    complementary: [180],
    splitComplementary: [150, 210],
    triadic: [120, 240],
    tetradic: [90, 180, 270],
    analogous: [30, -30],
  };
  function schemeColorFromLocked(){
    const locked = pbColors.filter(c=>c.locked);
    if(locked.length === 0 || pbColorScheme === 'none') return randomFullSpectrumColor();
    const anchor = locked[Math.floor(Math.random()*locked.length)];
    const {h} = hexToHsl(anchor.hex);
    // Some natural variation around the exact theoretical angle, plus fresh random
    // saturation/lightness, so scheme-influenced swatches still feel varied rather than
    // identical clones of each other.
    const s = 0.4 + Math.random()*0.5;
    const l = 0.3 + Math.random()*0.45;
    if(pbColorScheme === 'monochromatic'){
      return hslToHex(h, s, l); // same hue, varied saturation/lightness only
    }
    const shifts = COLOR_SCHEME_HUE_SHIFTS[pbColorScheme];
    if(!shifts) return randomFullSpectrumColor();
    const shift = shifts[Math.floor(Math.random()*shifts.length)];
    const hueJitter = (Math.random()*2-1) * 15;
    const newH = h + shift + hueJitter;
    return hslToHex(newH, s, l);
  }
  function generatePaletteBuilderColor(idx){
    const anchor = nearestLockedWithinSpread(idx, pbSpread);
    if(!anchor || Math.random() < 0.18){
      // No locked swatch is close enough to influence this position (or, even when one is,
      // keep a real chance of exploration) — lean toward the chosen color-theory relationship
      // to a locked color instead of a fully random hue, if one is selected.
      return pbColorScheme !== 'none' ? schemeColorFromLocked() : randomFullSpectrumColor();
    }
    return jitteredColorNear(anchor.hex, pbJitter);
  }
  function regeneratePaletteBuilderUnlocked(){
    pbColors.forEach((c, idx)=>{ if(!c.locked) c.hex = generatePaletteBuilderColor(idx); });
    renderPaletteBuilderGrid();
  }
  function renderPaletteBuilderGrid(){
    const grid = document.getElementById('pbGrid');
    grid.innerHTML = '';
    pbColors.forEach((c, idx)=>{
      const sw = document.createElement('div');
      sw.className = 'swatch' + (c.locked ? ' locked' : '');
      sw.style.background = c.hex;
      sw.title = c.hex + (c.locked ? ' (locked)' : '');
      sw.addEventListener('pointerdown', ev=>{
        if(ev.button !== 0) return;
        const startX = ev.clientX, startY = ev.clientY;
        let dragging = false;
        let currentIdx = idx;
        function onMove(mv){
          if(!dragging && (Math.abs(mv.clientX-startX)>4 || Math.abs(mv.clientY-startY)>4)) dragging = true;
          if(!dragging) return;
          const target = document.elementFromPoint(mv.clientX, mv.clientY);
          const targetSwatch = target && target.closest && target.closest('#pbGrid .swatch');
          if(targetSwatch){
            const targetIdx = [...grid.children].indexOf(targetSwatch);
            if(targetIdx !== -1 && targetIdx !== currentIdx){
              const [moved] = pbColors.splice(currentIdx, 1);
              pbColors.splice(targetIdx, 0, moved);
              currentIdx = targetIdx;
              renderPaletteBuilderGrid();
            }
          }
        }
        function onUp(){
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if(!dragging){
            // Handled directly here (not via a native 'click' listener), matching the
            // pointer-flow pattern used elsewhere in this app — a native click can be silently
            // suppressed if a re-render happens mid-interaction, which a drag-triggered
            // renderPaletteBuilderGrid() call could otherwise cause.
            pbColors[currentIdx].locked = !pbColors[currentIdx].locked;
            renderPaletteBuilderGrid();
          }
        }
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
      grid.appendChild(sw);
    });
  }
  function updatePaletteBuilderSpreadRange(){
    const spreadSlider = document.getElementById('pbSpreadSlider');
    const maxSpread = Math.max(1, pbColors.length - 1);
    spreadSlider.max = maxSpread;
    if(pbSpread > maxSpread){ pbSpread = maxSpread; spreadSlider.value = maxSpread; document.getElementById('pbSpreadVal').textContent = maxSpread; }
  }
  function openPaletteBuilderPopup(){
    const count = +document.getElementById('pbCountSlider').value;
    pbColors = Array.from({length: count}, ()=>({hex: randomFullSpectrumColor(), locked:false}));
    pbSpread = +document.getElementById('pbSpreadSlider').value;
    pbJitter = +document.getElementById('pbJitterSlider').value;
    pbColorScheme = document.getElementById('pbColorSchemeSelect').value;
    updatePaletteBuilderSpreadRange();
    renderPaletteBuilderGrid();
    const popup = document.getElementById('paletteBuilderPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closePaletteBuilderPopup(){
    document.getElementById('paletteBuilderPopup').style.display = 'none';
  }
  document.getElementById('buildPaletteBtn').addEventListener('click', openPaletteBuilderPopup);
  document.getElementById('pbCancelBtn').addEventListener('click', closePaletteBuilderPopup);
  makePopupDraggable(document.getElementById('paletteBuilderPopup'), document.getElementById('paletteBuilderDragHandle'));
  document.getElementById('pbCountSlider').addEventListener('input', e=>{
    const newCount = +e.target.value;
    document.getElementById('pbCountVal').textContent = newCount;
    if(newCount < pbColors.length){
      // Drop unlocked swatches first; only touch locked ones if going below the locked count itself
      const lockedOnes = pbColors.filter(c=>c.locked);
      const unlockedOnes = pbColors.filter(c=>!c.locked);
      pbColors = lockedOnes.length >= newCount
        ? lockedOnes.slice(0, newCount)
        : lockedOnes.concat(unlockedOnes.slice(0, newCount - lockedOnes.length));
    } else if(newCount > pbColors.length){
      const toAdd = newCount - pbColors.length;
      for(let i=0;i<toAdd;i++) pbColors.push({hex: generatePaletteBuilderColor(pbColors.length), locked:false});
    }
    updatePaletteBuilderSpreadRange();
    renderPaletteBuilderGrid();
  });
  document.getElementById('pbSpreadSlider').addEventListener('input', e=>{
    pbSpread = +e.target.value;
    document.getElementById('pbSpreadVal').textContent = pbSpread;
  });
  document.getElementById('pbJitterSlider').addEventListener('input', e=>{
    pbJitter = +e.target.value;
    document.getElementById('pbJitterVal').textContent = pbJitter;
  });
  document.getElementById('pbColorSchemeSelect').addEventListener('change', e=>{
    pbColorScheme = e.target.value;
  });
  document.getElementById('pbRegenerateBtn').addEventListener('click', regeneratePaletteBuilderUnlocked);
  function applyPaletteBuilderResult(mode){
    const hexColors = pbColors.map(c=>c.hex);
    const createGroup = document.getElementById('pbNewGroupCheckbox').checked;
    const groupName = document.getElementById('pbGroupNameInput').value.trim() || 'Built Palette';

    if(mode === 'replace'){
      const otherGroupCount = groups.length - 1;
      const warning = otherGroupCount > 0
        ? `This replaces every color in the Main Palette and deletes ${otherGroupCount} other group${otherGroupCount>1?'s':''} (they only reference Main Palette colors, so they can't survive it being replaced). Continue?`
        : 'This replaces every color in the Main Palette. Continue?';
      if(!confirm(warning)) return;
      const main = mainGroup();
      main.colors = hexColors.map(hex => ({ id: mainColorIdCounter++, hex }));
      main.name = groupName;
      groups = [main];
      selectedColors = new Set();
      selectPaletteIndex(0);
      refreshGroups();
      fitSidePanelToPalette();
      closePaletteBuilderPopup();
      return;
    }

    const main = mainGroup();
    const existingHexes = new Set(main.colors.map(c=>c.hex));
    const newUniqueCount = hexColors.filter(hex => !existingHexes.has(hex)).length;
    if(main.colors.length + newUniqueCount > MAX_PALETTE_COLORS){
      alert('Adding these colors would put the Main Palette over the ' + MAX_PALETTE_COLORS + '-color limit (' +
        main.colors.length + ' existing + ' + newUniqueCount + ' new colors). Remove some colors first, or use Replace Palette instead.');
      return;
    }
    const refs = [];
    hexColors.forEach(hex=>{
      let entry = main.colors.find(c=>c.hex===hex);
      if(!entry){
        entry = { id: mainColorIdCounter++, hex };
        main.colors.push(entry);
      }
      refs.push(entry.id);
    });
    if(createGroup){
      groups.unshift({ id: groupIdCounter++, name: groupName, isMain:false, colorRefs: refs, collapsed:false, columns:8 });
    }
    refreshGroups();
    fitSidePanelToPalette();
    closePaletteBuilderPopup();
  }
  document.getElementById('pbAddBtn').addEventListener('click', ()=> applyPaletteBuilderResult('add'));
  document.getElementById('pbReplaceBtn').addEventListener('click', ()=> applyPaletteBuilderResult('replace'));

  // ---------- Palette Tweak ----------
  function shortestHueDelta(from, to){
    let delta = (to - from) % 360;
    if(delta > 180) delta -= 360;
    if(delta < -180) delta += 360;
    return delta;
  }
  function tweakColor(hex, targetHue, hueAmountPct, satAdjust, lumAdjust){
    let {h,s,l} = hexToHsl(hex);
    if(hueAmountPct > 0){
      const delta = shortestHueDelta(h, targetHue);
      h = (h + delta * (hueAmountPct/100) + 360) % 360;
    }
    if(satAdjust !== 0){
      s = satAdjust > 0 ? s + (1-s)*(satAdjust/100) : s * (1 + satAdjust/100);
      s = Math.min(1, Math.max(0, s));
    }
    if(lumAdjust !== 0){
      l = lumAdjust > 0 ? l + (1-l)*(lumAdjust/100) : l * (1 + lumAdjust/100);
      l = Math.min(1, Math.max(0, l));
    }
    return hslToHex(h, s, l);
  }
  let ptHueTargetHue = 30; // degrees — a warm orange-ish default
  function ptCurrentSettings(){
    return {
      hueTarget: ptHueTargetHue,
      hueAmount: +document.getElementById('ptHueAmountSlider').value,
      sat: +document.getElementById('ptSatSlider').value,
      lum: +document.getElementById('ptLumSlider').value,
    };
  }
  function ptTargetColors(){
    const main = mainGroup();
    return document.getElementById('ptModeSelect').value === 'selected'
      ? main.colors.filter(c => selectedColors.has(c.hex))
      : main.colors;
  }
  function updatePtModeHint(){
    const count = document.getElementById('ptModeSelect').value === 'selected' ? ptTargetColors().length : mainGroup().colors.length;
    document.getElementById('ptModeHint').textContent = document.getElementById('ptModeSelect').value === 'selected'
      ? count + ' color' + (count===1?'':'s') + ' currently selected. Ctrl+click swatches in the Main Palette to change the selection.'
      : 'Changes every color in the Main Palette, everywhere it\'s used.';
  }
  function renderPaletteTweakPreview(){
    const grid = document.getElementById('ptPreviewGrid');
    grid.innerHTML = '';
    const settings = ptCurrentSettings();
    ptTargetColors().forEach(c=>{
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = tweakColor(c.hex, settings.hueTarget, settings.hueAmount, settings.sat, settings.lum);
      sw.title = c.hex;
      grid.appendChild(sw);
    });
  }
  // ---------- Shared HSL color picker widget ----------
  let hslPickerH = 0, hslPickerS = 1, hslPickerL = 0.5;
  let hslPickerOnChange = null;
  function hslPickerGetHex(){ return hslToHex(hslPickerH, hslPickerS, hslPickerL); }
  function drawHslPickerHueStrip(){
    const canvas = document.getElementById('hslPickerHueCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;
    for(let x=0; x<w; x++){
      ctx.fillStyle = hslToHex((x/w)*360, 1, 0.5);
      ctx.fillRect(x, 0, 1, h);
    }
    const markerX = (hslPickerH/360)*w;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
  }
  function refreshHslPickerUI(){
    drawHslPickerHueStrip();
    document.getElementById('hslPickerSatSlider').value = Math.round(hslPickerS*100);
    document.getElementById('hslPickerSatVal').textContent = Math.round(hslPickerS*100) + '%';
    document.getElementById('hslPickerLumSlider').value = Math.round(hslPickerL*100);
    document.getElementById('hslPickerLumVal').textContent = Math.round(hslPickerL*100) + '%';
    const hex = hslPickerGetHex();
    document.getElementById('hslPickerSwatch').style.background = hex;
    document.getElementById('hslPickerHexLabel').textContent = hex;
  }
  function hslPickerNotify(){
    refreshHslPickerUI();
    if(hslPickerOnChange) hslPickerOnChange(hslPickerGetHex());
  }
  function setHslPickerColor(hex){
    const {h,s,l} = hexToHsl(hex);
    hslPickerH = h; hslPickerS = s; hslPickerL = l;
    refreshHslPickerUI();
  }
  let hslActiveAnchorEl = null;

  function openHslColorPicker(initialHex, onChange, anchorEl, actionConfig){
    if (hslActiveAnchorEl && hslActiveAnchorEl.id !== 'colorEditPopup') {
      hslActiveAnchorEl.style.outline = '';
      hslActiveAnchorEl.style.outlineOffset = '';
    }
    hslActiveAnchorEl = anchorEl;
    if (hslActiveAnchorEl && hslActiveAnchorEl.id !== 'colorEditPopup' && hslActiveAnchorEl.id !== 'addStopColorBtn') {
      hslActiveAnchorEl.style.outline = '2px solid var(--accent)';
      hslActiveAnchorEl.style.outlineOffset = '1.5px';
    }

    const {h,s,l} = hexToHsl(initialHex || '#808080');
    hslPickerH = h; hslPickerS = s; hslPickerL = l;
    hslPickerOnChange = onChange || null;
    refreshHslPickerUI();
    const actionBtn = document.getElementById('hslPickerActionBtn');
    if(actionConfig){
      actionBtn.textContent = actionConfig.label;
      actionBtn.style.display = 'block';
      actionBtn.onclick = () => actionConfig.onAction(hslPickerGetHex());
    } else {
      actionBtn.style.display = 'none';
      actionBtn.onclick = null;
    }
    const popup = document.getElementById('hslPickerPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    if(anchorEl){
      const anchorRect = anchorEl.getBoundingClientRect();
      let left = anchorRect.right + 10;
      if(left + popupRect.width > window.innerWidth - 10) left = anchorRect.left - popupRect.width - 10;
      popup.style.left = Math.max(10, left) + 'px';
      popup.style.top = Math.max(10, Math.min(window.innerHeight - popupRect.height - 10, anchorRect.top)) + 'px';
    } else {
      popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
      popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
    }
  }
  function closeHslColorPicker(){
    document.getElementById('hslPickerPopup').style.display = 'none';
    hslPickerOnChange = null;
    if (hslActiveAnchorEl && hslActiveAnchorEl.id !== 'colorEditPopup') {
      hslActiveAnchorEl.style.outline = '';
      hslActiveAnchorEl.style.outlineOffset = '';
    }
    hslActiveAnchorEl = null;
  }
  document.getElementById('hslPickerCloseBtn').addEventListener('click', closeHslColorPicker);
  makePopupDraggable(document.getElementById('hslPickerPopup'), document.getElementById('hslPickerDragHandle'));
  {
    const hslHueCanvas = document.getElementById('hslPickerHueCanvas');
    let hslHueDragging = false;
    function hslHueFromEvent(e){
      const rect = hslHueCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      return (x/rect.width)*360;
    }
    hslHueCanvas.addEventListener('pointerdown', e=>{ hslHueDragging=true; hslPickerH = hslHueFromEvent(e); hslPickerNotify(); });
    window.addEventListener('pointermove', e=>{ if(hslHueDragging){ hslPickerH = hslHueFromEvent(e); hslPickerNotify(); } });
    window.addEventListener('pointerup', ()=>{ hslHueDragging=false; });
  }
  document.getElementById('hslPickerSatSlider').addEventListener('input', e=>{ hslPickerS = (+e.target.value)/100; hslPickerNotify(); });
  document.getElementById('hslPickerLumSlider').addEventListener('input', e=>{ hslPickerL = (+e.target.value)/100; hslPickerNotify(); });

  function drawHueTintStrip(){
    const canvas = document.getElementById('hueTintStripCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;
    for(let x=0; x<w; x++){
      ctx.fillStyle = hslToHex((x/w)*360, 1, 0.5);
      ctx.fillRect(x, 0, 1, h);
    }
    const markerX = (ptHueTargetHue/360)*w;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
  }
  function updateHueTintSwatch(){
    document.getElementById('ptHueTargetSwatch').style.background = hslToHex(ptHueTargetHue, 1, 0.5);
    document.getElementById('hueTintValueLabel').textContent = Math.round(ptHueTargetHue) + '°';
  }
  function setHueTintHue(hue){
    ptHueTargetHue = Math.max(0, Math.min(360, hue));
    drawHueTintStrip();
    updateHueTintSwatch();
    renderPaletteTweakPreview();
  }
  function positionHueTintPicker(){
    const tweakPopup = document.getElementById('paletteTweakPopup');
    const picker = document.getElementById('hueTintPickerPopup');
    const tweakRect = tweakPopup.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    let left = tweakRect.left - pickerRect.width - 10;
    if(left < 10) left = tweakRect.right + 10; // no room on the left — fall back to the right
    picker.style.left = Math.max(10, left) + 'px';
    picker.style.top = Math.max(10, tweakRect.top) + 'px';
  }
  function openPaletteTweakPopup(){
    document.getElementById('ptModeSelect').value = 'all';
    document.getElementById('ptHueAmountSlider').value = 0;
    document.getElementById('ptHueAmountVal').textContent = '0%';
    document.getElementById('ptSatSlider').value = 0;
    document.getElementById('ptSatVal').textContent = '0';
    document.getElementById('ptLumSlider').value = 0;
    document.getElementById('ptLumVal').textContent = '0';
    updatePtModeHint();
    updateHueTintSwatch();
    renderPaletteTweakPreview();
    const popup = document.getElementById('paletteTweakPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
    const picker = document.getElementById('hueTintPickerPopup');
    picker.style.display = 'block';
    drawHueTintStrip();
    positionHueTintPicker();
  }
  function closePaletteTweakPopup(){
    document.getElementById('paletteTweakPopup').style.display = 'none';
    document.getElementById('hueTintPickerPopup').style.display = 'none';
  }
  document.getElementById('tweakPaletteBtn').addEventListener('click', openPaletteTweakPopup);
  document.getElementById('ptCancelBtn').addEventListener('click', closePaletteTweakPopup);
  makePopupDraggable(document.getElementById('paletteTweakPopup'), document.getElementById('paletteTweakDragHandle'), positionHueTintPicker);
  document.getElementById('ptModeSelect').addEventListener('change', ()=>{ updatePtModeHint(); renderPaletteTweakPreview(); });
  document.getElementById('ptHueTargetSwatch').addEventListener('click', ()=>{
    const picker = document.getElementById('hueTintPickerPopup');
    if(picker.style.display === 'none'){ picker.style.display = 'block'; positionHueTintPicker(); }
  });
  {
    const hueStripCanvas = document.getElementById('hueTintStripCanvas');
    let hueStripDragging = false;
    function hueFromEvent(e){
      const rect = hueStripCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      return (x/rect.width)*360;
    }
    hueStripCanvas.addEventListener('pointerdown', e=>{ hueStripDragging = true; setHueTintHue(hueFromEvent(e)); });
    window.addEventListener('pointermove', e=>{ if(hueStripDragging) setHueTintHue(hueFromEvent(e)); });
    window.addEventListener('pointerup', ()=>{ hueStripDragging = false; });
  }
  document.getElementById('ptHueAmountSlider').addEventListener('input', e=>{
    document.getElementById('ptHueAmountVal').textContent = e.target.value + '%';
    renderPaletteTweakPreview();
  });
  document.getElementById('ptSatSlider').addEventListener('input', e=>{
    document.getElementById('ptSatVal').textContent = e.target.value;
    renderPaletteTweakPreview();
  });
  document.getElementById('ptLumSlider').addEventListener('input', e=>{
    document.getElementById('ptLumVal').textContent = e.target.value;
    renderPaletteTweakPreview();
  });
  document.getElementById('ptResetBtn').addEventListener('click', ()=>{
    document.getElementById('ptHueAmountSlider').value = 0;
    document.getElementById('ptHueAmountVal').textContent = '0%';
    document.getElementById('ptSatSlider').value = 0;
    document.getElementById('ptSatVal').textContent = '0';
    document.getElementById('ptLumSlider').value = 0;
    document.getElementById('ptLumVal').textContent = '0';
    renderPaletteTweakPreview();
  });
  document.getElementById('ptApplyBtn').addEventListener('click', ()=>{
    const settings = ptCurrentSettings();
    const mode = document.getElementById('ptModeSelect').value;
    const targetColors = ptTargetColors();
    if(mode === 'selected' && targetColors.length === 0){
      alert('No colors are currently selected. Ctrl+click one or more palette colors first, or switch to "Entire Palette".');
      return;
    }
    const warningMsg = mode === 'selected'
      ? 'This changes the ' + targetColors.length + ' selected color' + (targetColors.length===1?'':'s') + ' everywhere they\'re used, and can\'t be undone. Continue?'
      : 'This changes every color in the Main Palette everywhere it\'s used, and can\'t be undone. Continue?';
    if(!confirm(warningMsg)) return;
    targetColors.forEach(c=>{ c.hex = tweakColor(c.hex, settings.hueTarget, settings.hueAmount, settings.sat, settings.lum); });
    refreshGroups();
    fitSidePanelToPalette();
    closePaletteTweakPopup();
  });

  function refreshHeightSourceOptions(){
    const sel = document.getElementById('heightSourceSelect');
    const prevValue = sel.value;
    sel.innerHTML = '';
    layers.forEach((l, idx)=>{
      const opt = document.createElement('option');
      opt.value = idx; opt.textContent = l.name;
      sel.appendChild(opt);
    });
    if(heightSourceLayerIndex !== null && layers[heightSourceLayerIndex]){
      sel.value = heightSourceLayerIndex;
    } else if(prevValue !== '' && layers[+prevValue]){
      sel.value = prevValue;
      heightSourceLayerIndex = +prevValue;
    } else if(layers.length > 0){
      sel.value = 0;
      heightSourceLayerIndex = 0;
    } else {
      heightSourceLayerIndex = null;
    }
  }
  document.getElementById('heightPaintEnabled').addEventListener('change', e=>{
    heightPaintEnabled = e.target.checked;
    document.getElementById('heightPaintOptions').style.display = heightPaintEnabled ? 'block' : 'none';
    if(heightPaintEnabled) refreshHeightSourceOptions();
  });
  document.getElementById('heightSourceSelect').addEventListener('change', e=>{
    heightSourceLayerIndex = e.target.value === '' ? null : +e.target.value;
  });
  document.getElementById('heightModeSelect').addEventListener('change', e=>{
    heightMode = e.target.value;
    document.getElementById('heightRangeControls').style.display = (heightMode === 'range') ? 'block' : 'none';
  });
  document.getElementById('heightMinSlider').addEventListener('input', e=>{
    heightMin = Math.min(+e.target.value, heightMax);
    e.target.value = heightMin;
    document.getElementById('heightMinVal').textContent = heightMin;
  });
  document.getElementById('heightMaxSlider').addEventListener('input', e=>{
    heightMax = Math.max(+e.target.value, heightMin);
    e.target.value = heightMax;
    document.getElementById('heightMaxVal').textContent = heightMax;
  });
  document.getElementById('heightSoftnessSlider').addEventListener('input', e=>{
    heightSoftness = +e.target.value;
    document.getElementById('heightSoftnessVal').textContent = heightSoftness + '%';
  });

  let colorizeTargetHex = null;
  function updateColorizeTargetSwatch(){
    const sw = document.getElementById('colorizeTargetSwatch');
    if(sw) sw.style.background = colorizeTargetHex || 'transparent';
  }
  function openColorizeTargetPopup(){
    const popup = document.getElementById('colorizeTargetPopup');
    if(!popup) return;
    const grid = document.getElementById('colorizeTargetPaletteGrid');
    if(grid) grid.innerHTML = '';
    const palette = [...new Set(allColors())];
    if(colorizeTargetHex === null && palette.includes(fgColor)) colorizeTargetHex = fgColor;
    palette.forEach(hex=>{
      const sw = document.createElement('div');
      sw.className = 'swatch' + (hex === colorizeTargetHex ? ' selected' : '');
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener('click', ()=>{
        colorizeTargetHex = hex;
        if(grid) grid.querySelectorAll('.swatch').forEach(s=> s.classList.toggle('selected', s === sw));
        updateColorizeTargetSwatch();
      });
      if(grid) grid.appendChild(sw);
    });
    popup.style.display = 'flex';
    if(!popup.style.left || !popup.style.top){
      const sidePanel = document.querySelector('.side-panel');
      if(sidePanel){
        const panelRect = sidePanel.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        popup.style.left = Math.max(10, panelRect.left - popupRect.width - 10) + 'px';
        popup.style.top = Math.max(10, Math.min(window.innerHeight - popupRect.height - 10, 150)) + 'px';
      } else {
        const popupRect = popup.getBoundingClientRect();
        popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
        popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
      }
    }
  }
  function closeColorizeTargetPopup(){
    const popup = document.getElementById('colorizeTargetPopup');
    if(popup) popup.style.display = 'none';
  }
  const ctb = document.getElementById('colorizeTargetBtn');
  if(ctb) ctb.addEventListener('click', openColorizeTargetPopup);
  const ctsw = document.getElementById('colorizeTargetSwatch');
  if(ctsw) ctsw.addEventListener('click', openColorizeTargetPopup);
  const ctdb = document.getElementById('colorizeTargetDoneBtn');
  if(ctdb) ctdb.addEventListener('click', closeColorizeTargetPopup);
  const ctcCross = document.getElementById('colorizeTargetCloseCross');
  if(ctcCross) ctcCross.addEventListener('click', closeColorizeTargetPopup);
  makePopupDraggable(document.getElementById('colorizeTargetPopup'), document.getElementById('colorizeTargetDragHandle'));

  function openAboutPopup(){
    const popup = document.getElementById('aboutPopup');
    document.getElementById('aboutVersionInfo').textContent = 'Version: ' + APP_VERSION;

    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closeAboutPopup(){
    document.getElementById('aboutPopup').style.display = 'none';
  }
  document.getElementById('aboutBtn').addEventListener('click', openAboutPopup);
  document.getElementById('aboutCloseBtn').addEventListener('click', closeAboutPopup);

  // ---------- Tileset Tester & Studio State ----------
  let tilesetTesterTileSize = 32;
  let tilesetTesterCols = 12;
  let tilesetTesterRows = 12;
  let tilesetTesterGrid = [];
  let tilesetSelectedTile = { col: 0, row: 0 };
  let tilesetTesterActiveMode = 'color';
  let tilesetPaintDragging = false;
  let tilesetEraseDragging = false;

  function initTilesetTester() {
    if (tilesetTesterGrid.length !== tilesetTesterRows || (tilesetTesterGrid[0] && tilesetTesterGrid[0].length !== tilesetTesterCols)) {
      tilesetTesterGrid = Array(tilesetTesterRows).fill(null).map(() => Array(tilesetTesterCols).fill(null));
    }
    
    // Auto-size canvas styles
    const tCanvas = document.getElementById('tilesetTesterCanvas');
    const sCanvas = document.getElementById('tilesetSelectorCanvas');
    if (tCanvas) {
      tCanvas.width = tilesetTesterCols * tilesetTesterTileSize;
      tCanvas.height = tilesetTesterRows * tilesetTesterTileSize;
    }
    if (sCanvas) {
      sCanvas.width = W;
      sCanvas.height = H;
    }
  }

  function drawTilesetSelector() {
    const canvas = document.getElementById('tilesetSelectorCanvas');
    if (!canvas) return;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(displayCanvas, 0, 0);

    // Draw grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    for (let x = tilesetTesterTileSize; x < W; x += tilesetTesterTileSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = tilesetTesterTileSize; y < H; y += tilesetTesterTileSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Show Tile IDs
    if (document.getElementById('tilesetSelectorShowIDs')?.checked) {
      ctx.save();
      ctx.font = '8px monospace';
      const numColsOnSheet = Math.floor(W / tilesetTesterTileSize);
      const numRowsOnSheet = Math.floor(H / tilesetTesterTileSize);
      for (let r = 0; r < numRowsOnSheet; r++) {
        for (let c = 0; c < numColsOnSheet; c++) {
          const tileId = r * numColsOnSheet + c;
          const tx = c * tilesetTesterTileSize;
          const ty = r * tilesetTesterTileSize;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(tx + 1, ty + 1, 14 + (tileId >= 10 ? 5 : 0) + (tileId >= 100 ? 5 : 0), 10);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillText(tileId, tx + 2, ty + 9);
        }
      }
      ctx.restore();
    }

    // Draw selected outline
    ctx.save();
    const sx = tilesetSelectedTile.col * tilesetTesterTileSize;
    const sy = tilesetSelectedTile.row * tilesetTesterTileSize;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.strokeRect(sx + 1, sy + 1, tilesetTesterTileSize - 2, tilesetTesterTileSize - 2);
    ctx.restore();

    // Update label text
    const numColsOnSheet = Math.floor(W / tilesetTesterTileSize);
    const tileId = tilesetSelectedTile.row * numColsOnSheet + tilesetSelectedTile.col;
    const label = document.getElementById('tilesetSelectedInfo');
    if (label) {
      label.textContent = 'Selected: Tile #' + tileId + ' (' + tilesetSelectedTile.col + ', ' + tilesetSelectedTile.row + ')';
    }
  }

  function drawTilesetTesterArea() {
    const canvas = document.getElementById('tilesetTesterCanvas');
    if (!canvas) return;
    
    const W_t = tilesetTesterCols * tilesetTesterTileSize;
    const H_t = tilesetTesterRows * tilesetTesterTileSize;
    if (canvas.width !== W_t || canvas.height !== H_t) {
      canvas.width = W_t;
      canvas.height = H_t;
    }

    const tempColorCanvas = document.createElement('canvas');
    tempColorCanvas.width = W_t; tempColorCanvas.height = H_t;
    const tcCtx = tempColorCanvas.getContext('2d', { willReadFrequently: true });

    const tempHeightCanvas = document.createElement('canvas');
    tempHeightCanvas.width = W_t; tempHeightCanvas.height = H_t;
    const thCtx = tempHeightCanvas.getContext('2d', { willReadFrequently: true });
    thCtx.fillStyle = '#000000';
    thCtx.fillRect(0, 0, W_t, H_t);

    const tempRoughnessCanvas = document.createElement('canvas');
    tempRoughnessCanvas.width = W_t; tempRoughnessCanvas.height = H_t;
    const trCtx = tempRoughnessCanvas.getContext('2d', { willReadFrequently: true });
    trCtx.fillStyle = '#c8c8c8';
    trCtx.fillRect(0, 0, W_t, H_t);

    const layer = layers[activeLayer];
    const srcColorCanvas = displayCanvas;
    const srcHeightCanvas = layer ? layer.heightCanvas : null;
    const srcRoughnessCanvas = layer ? layer.roughnessCanvas : null;

    for (let r = 0; r < tilesetTesterRows; r++) {
      for (let c = 0; c < tilesetTesterCols; c++) {
        const tile = tilesetTesterGrid[r]?.[c];
        if (tile) {
          const sx = tile.col * tilesetTesterTileSize;
          const sy = tile.row * tilesetTesterTileSize;
          const dx = c * tilesetTesterTileSize;
          const dy = r * tilesetTesterTileSize;

          if (sx + tilesetTesterTileSize <= W && sy + tilesetTesterTileSize <= H) {
            tcCtx.drawImage(srcColorCanvas, sx, sy, tilesetTesterTileSize, tilesetTesterTileSize, dx, dy, tilesetTesterTileSize, tilesetTesterTileSize);
            if (srcHeightCanvas) {
              thCtx.drawImage(srcHeightCanvas, sx, sy, tilesetTesterTileSize, tilesetTesterTileSize, dx, dy, tilesetTesterTileSize, tilesetTesterTileSize);
            }
            if (srcRoughnessCanvas) {
              trCtx.drawImage(srcRoughnessCanvas, sx, sy, tilesetTesterTileSize, tilesetTesterTileSize, dx, dy, tilesetTesterTileSize, tilesetTesterTileSize);
            }
          }
        }
      }
    }

    const testerCtx = canvas.getContext('2d', { willReadFrequently: true });
    testerCtx.clearRect(0, 0, W_t, H_t);

    if (tilesetTesterActiveMode === 'height') {
      testerCtx.drawImage(tempHeightCanvas, 0, 0);
    } else if (tilesetTesterActiveMode === 'roughness') {
      testerCtx.drawImage(tempRoughnessCanvas, 0, 0);
    } else if (tilesetTesterActiveMode === 'lit') {
      const colorData = tcCtx.getImageData(0, 0, W_t, H_t).data;
      const heightData = thCtx.getImageData(0, 0, W_t, H_t).data;
      const roughnessData = trCtx.getImageData(0, 0, W_t, H_t).data;
      const outImg = testerCtx.createImageData(W_t, H_t);
      const out = outImg.data;

      const lightHeightPct = +document.getElementById('lightHeightSlider')?.value || 50;
      const ambient = (+document.getElementById('lightAmbientSlider')?.value || 20) / 100;
      const presetSelectVal = document.getElementById('lightboxPresetSelect')?.value || 'none';
      const reflectionMult = (+document.getElementById('lightboxIntensitySlider')?.value || 100) / 100;
      const specularMult = (+document.getElementById('specularBoostSlider')?.value || 100) / 100;
      const lightZ = (lightHeightPct / 100) * Math.max(W_t, H_t);
      const lightPxX = lightPosX * W_t;
      const lightPxY = lightPosY * H_t;
      const bumpStrength = 3;

      if (!lightboxImageData) {
        renderLightboxPreset(presetSelectVal);
      }
      const envData = lightboxImageData ? lightboxImageData.data : null;
      const envW = lightboxCanvas.width, envH = lightboxCanvas.height;

      const lightRadius = Math.max(W_t, H_t) * Math.max(0.15, (lightHeightPct / 100) * 0.5);
      const lightZSq = lightZ * lightZ;

      for (let y = 0; y < H_t; y++) {
        for (let x = 0; x < W_t; x++) {
          const i = (y * W_t + x) * 4;
          const alpha = colorData[i + 3];
          if (alpha === 0) {
            out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 0;
            continue;
          }

          const hL = heightData[(y * W_t + Math.max(0, x - 1)) * 4];
          const hR = heightData[(y * W_t + Math.min(W_t - 1, x + 1)) * 4];
          const hU = heightData[(Math.max(0, y - 1) * W_t + x) * 4];
          const hD = heightData[(Math.min(H_t - 1, y + 1) * W_t + x) * 4];
          const dx = (hR - hL) / 255 * bumpStrength;
          const dy = (hD - hU) / 255 * bumpStrength;
          let nx = -dx, ny = -dy, nz = 1;
          const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= nlen; ny /= nlen; nz /= nlen;

          const lx_raw = lightPxX - x, ly_raw = lightPxY - y, lz_raw = lightZ;
          const dist2DSq = lx_raw * lx_raw + ly_raw * ly_raw;
          const dist3D = Math.sqrt(dist2DSq + lightZSq) || 1;
          const lx = lx_raw / dist3D, ly = ly_raw / dist3D, lz = lz_raw / dist3D;

          const falloffRatio = Math.min(1, Math.sqrt(dist2DSq) / lightRadius);
          const falloff = Math.max(0, 1 - falloffRatio * falloffRatio);
          const pointFalloff = falloff * falloff;
          const attenuation = lightZSq / (dist3D * dist3D);

          const dot = Math.max(0, nx * lx + ny * ly + nz * lz);
          const pointIntensity = dot * attenuation * pointFalloff;

          let ambR = 0, ambG = 0, ambB = 0;
          if (ambient > 0) {
            if (presetSelectVal !== 'none' && envData) {
              const ambU = Math.max(0, Math.min(1, 0.5 + nx * 0.5));
              const ambV = Math.max(0, Math.min(1, 0.5 - ny * 0.5));
              const ambEx = Math.floor(ambU * (envW - 1));
              const ambEy = Math.floor(ambV * (envH - 1));
              const ambEi = (ambEy * envW + ambEx) * 4;
              ambR = ambient * (envData[ambEi] / 255);
              ambG = ambient * (envData[ambEi + 1] / 255);
              ambB = ambient * (envData[ambEi + 2] / 255);
            } else {
              ambR = ambient; ambG = ambient; ambB = ambient;
            }
          }

          const rVal = roughnessData[i];
          const normR = rVal / 255;
          const smoothness = 1 - normR;

          const hx = lx, hy = ly, hz = lz + 1;
          const hlen = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
          const nh = Math.max(0, nx * (hx / hlen) + ny * (hy / hlen) + nz * (hz / hlen));
          const specPower = Math.pow(2, smoothness * 7) + 1;
          const specFactor = Math.pow(nh, specPower) * Math.pow(smoothness, 1.2) * specularMult * attenuation * pointFalloff;

          let refR = 0, refG = 0, refB = 0;
          const lightFactor = ambient + pointIntensity;
          if (presetSelectVal !== 'none' && smoothness > 0.05 && envData && reflectionMult > 0 && lightFactor > 0) {
            const rx = 2 * nx * nz;
            const ry = 2 * ny * nz;
            const u = Math.max(0, Math.min(1, 0.5 + rx * 0.5));
            const v = Math.max(0, Math.min(1, 0.5 - ry * 0.5));
            const ex = Math.floor(u * (envW - 1));
            const ey = Math.floor(v * (envH - 1));
            const ei = (ey * envW + ex) * 4;

            const refStrength = Math.pow(smoothness, 1.5) * reflectionMult * Math.min(1, lightFactor);
            refR = envData[ei] * refStrength;
            refG = envData[ei + 1] * refStrength;
            refB = envData[ei + 2] * refStrength;
          }

          const litR = colorData[i] * (ambR + pointIntensity) + specFactor * 255 + refR;
          const litG = colorData[i + 1] * (ambG + pointIntensity) + specFactor * 255 + refG;
          const litB = colorData[i + 2] * (ambB + pointIntensity) + specFactor * 255 + refB;

          out[i] = Math.min(255, Math.round(litR));
          out[i + 1] = Math.min(255, Math.round(litG));
          out[i + 2] = Math.min(255, Math.round(litB));
          out[i + 3] = alpha;
        }
      }
      testerCtx.putImageData(outImg, 0, 0);
    } else {
      testerCtx.drawImage(tempColorCanvas, 0, 0);
    }

    // Grid Overlay
    if (document.getElementById('tilesetTesterShowGrid')?.checked) {
      testerCtx.save();
      testerCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      testerCtx.lineWidth = 1;
      for (let x = tilesetTesterTileSize; x < W_t; x += tilesetTesterTileSize) {
        testerCtx.beginPath(); testerCtx.moveTo(x, 0); testerCtx.lineTo(x, H_t); testerCtx.stroke();
      }
      for (let y = tilesetTesterTileSize; y < H_t; y += tilesetTesterTileSize) {
        testerCtx.beginPath(); testerCtx.moveTo(0, y); testerCtx.lineTo(W_t, y); testerCtx.stroke();
      }
      testerCtx.restore();
    }
  }

  function updateTilesetTester() {
    drawTilesetSelector();
    drawTilesetTesterArea();
  }

  function openTilesetTesterPopup() {
    const popup = document.getElementById('tilesetTesterPopup');
    popup.style.display = 'flex';
    
    // Center popup nicely
    const popupRect = popup.getBoundingClientRect();
    if (!popup.style.left) {
      popup.style.left = Math.max(10, (window.innerWidth - popupRect.width) / 2) + 'px';
      popup.style.top = Math.max(10, (window.innerHeight - popupRect.height) / 2) + 'px';
    }
    
    initTilesetTester();
    updateTilesetTester();
  }

  if (window.ResizeObserver && document.getElementById('tilesetTesterPopup')) {
    const ro = new ResizeObserver(() => {
      if (document.getElementById('tilesetTesterPopup').style.display !== 'none') {
        updateTilesetTester();
      }
    });
    ro.observe(document.getElementById('tilesetTesterPopup'));
  }

  function closeTilesetTesterPopup() {
    document.getElementById('tilesetTesterPopup').style.display = 'none';
  }

  // Bind Events
  document.getElementById('tilesetTesterBtn')?.addEventListener('click', openTilesetTesterPopup);
  document.getElementById('tilesetCloseBtn')?.addEventListener('click', closeTilesetTesterPopup);
  document.getElementById('tilesetTesterCloseCross')?.addEventListener('click', closeTilesetTesterPopup);

  document.getElementById('tilesetTileSizeSelect')?.addEventListener('change', e => {
    tilesetTesterTileSize = parseInt(e.target.value, 10);
    const numCols = Math.floor(W / tilesetTesterTileSize);
    const numRows = Math.floor(H / tilesetTesterTileSize);
    if (tilesetSelectedTile.col >= numCols) tilesetSelectedTile.col = 0;
    if (tilesetSelectedTile.row >= numRows) tilesetSelectedTile.row = 0;
    updateTilesetTester();
  });

  document.getElementById('tilesetTesterGridSizeSelect')?.addEventListener('change', e => {
    tilesetTesterCols = parseInt(e.target.value, 10);
    tilesetTesterRows = parseInt(e.target.value, 10);
    initTilesetTester();
    updateTilesetTester();
  });

  document.getElementById('tilesetClearTesterBtn')?.addEventListener('click', () => {
    tilesetTesterGrid = Array(tilesetTesterRows).fill(null).map(() => Array(tilesetTesterCols).fill(null));
    updateTilesetTester();
  });

  document.querySelectorAll('input[name="tilesetRenderMode"]').forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked) {
        if (e.target.id === 'tilesetModeColor') tilesetTesterActiveMode = 'color';
        else if (e.target.id === 'tilesetModeLit') tilesetTesterActiveMode = 'lit';
        else if (e.target.id === 'tilesetModeHeight') tilesetTesterActiveMode = 'height';
        else if (e.target.id === 'tilesetModeRoughness') tilesetTesterActiveMode = 'roughness';
        drawTilesetTesterArea();
      }
    });
  });

  document.getElementById('tilesetTesterShowGrid')?.addEventListener('change', () => {
    drawTilesetTesterArea();
  });
  document.getElementById('tilesetSelectorShowIDs')?.addEventListener('change', () => {
    drawTilesetSelector();
  });

  // Selector Interaction
  document.getElementById('tilesetSelectorCanvas')?.addEventListener('pointerdown', e => {
    const rect = e.target.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (W / rect.width);
    const clickY = (e.clientY - rect.top) * (H / rect.height);
    const col = Math.floor(clickX / tilesetTesterTileSize);
    const row = Math.floor(clickY / tilesetTesterTileSize);
    const numCols = Math.floor(W / tilesetTesterTileSize);
    const numRows = Math.floor(H / tilesetTesterTileSize);
    if (col >= 0 && col < numCols && row >= 0 && row < numRows) {
      tilesetSelectedTile = { col, row };
      drawTilesetSelector();
    }
  });

  // Tester Interactive Paint
  function handleTesterInteraction(e) {
    const rect = e.target.getBoundingClientRect();
    const W_t = tilesetTesterCols * tilesetTesterTileSize;
    const H_t = tilesetTesterRows * tilesetTesterTileSize;
    const clickX = (e.clientX - rect.left) * (W_t / rect.width);
    const clickY = (e.clientY - rect.top) * (H_t / rect.height);
    const tx = Math.floor(clickX / tilesetTesterTileSize);
    const ty = Math.floor(clickY / tilesetTesterTileSize);

    if (tx >= 0 && tx < tilesetTesterCols && ty >= 0 && ty < tilesetTesterRows) {
      if (tilesetPaintDragging) {
        tilesetTesterGrid[ty][tx] = { col: tilesetSelectedTile.col, row: tilesetSelectedTile.row };
        drawTilesetTesterArea();
      } else if (tilesetEraseDragging) {
        tilesetTesterGrid[ty][tx] = null;
        drawTilesetTesterArea();
      }
    }
  }

  document.getElementById('tilesetTesterCanvas')?.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (e.button === 2) {
      tilesetEraseDragging = true;
      tilesetPaintDragging = false;
    } else {
      tilesetPaintDragging = true;
      tilesetEraseDragging = false;
    }
    handleTesterInteraction(e);
  });

  window.addEventListener('pointermove', e => {
    if ((tilesetPaintDragging || tilesetEraseDragging) && e.target === document.getElementById('tilesetTesterCanvas')) {
      handleTesterInteraction(e);
    }
  });

  window.addEventListener('pointerup', () => {
    tilesetPaintDragging = false;
    tilesetEraseDragging = false;
  });

  document.getElementById('tilesetTesterCanvas')?.addEventListener('contextmenu', e => e.preventDefault());

  // Make popup draggable
  makePopupDraggable(document.getElementById('tilesetTesterPopup'), document.getElementById('tilesetTesterDragHandle'));

  // ---------- Theme Settings & Customizer ----------
  const BUILTIN_THEMES = {
    dark: { name: 'Dark (Default)', bg: '#17181c', panel: '#17181c', panel2: '#25272d', line: '#33353c', text: '#e7e6e2', textDim: '#9a9ba3', accent: '#d4a017', accentDim: '#8a6b1c', danger: '#c85c5c' },
    light: { name: 'Light', bg: '#f2f1ed', panel: '#f2f1ed', panel2: '#e9e8e3', line: '#d4d2ca', text: '#22221f', textDim: '#6b6a63', accent: '#a8760f', accentDim: '#c9963a', danger: '#b23b3b' },
    midnight: { name: 'Midnight', bg: '#05060a', panel: '#05060a', panel2: '#11141d', line: '#232838', text: '#dbe4f5', textDim: '#7a86a0', accent: '#4fc3f7', accentDim: '#2b7fa3', danger: '#e05c5c' },
    dracula: { name: 'Dracula', bg: '#282a36', panel: '#282a36', panel2: '#343746', line: '#6272a4', text: '#f8f8f2', textDim: '#a0a0b0', accent: '#ff79c6', accentDim: '#bd93f9', danger: '#ff5555' },
    monokai: { name: 'Monokai', bg: '#272822', panel: '#272822', panel2: '#38372e', line: '#49483e', text: '#f8f8f2', textDim: '#a5a59e', accent: '#a6e22e', accentDim: '#e6db74', danger: '#f92672' },
    nord: { name: 'Nord', bg: '#2e3440', panel: '#2e3440', panel2: '#3b4252', line: '#434c5e', text: '#eceff4', textDim: '#d8dee9', accent: '#88c0d0', accentDim: '#81a1c1', danger: '#bf616a' },
    'solarized-dark': { name: 'Solarized Dark', bg: '#002b36', panel: '#002b36', panel2: '#0f4350', line: '#2aa198', text: '#93a1a1', textDim: '#586e75', accent: '#268bd2', accentDim: '#2aa198', danger: '#dc322f' },
    'solarized-light': { name: 'Solarized Light', bg: '#fdf6e3', panel: '#fdf6e3', panel2: '#eee8d5', line: '#93a1a1', text: '#073642', textDim: '#657b83', accent: '#268bd2', accentDim: '#2aa198', danger: '#dc322f' },
    synthwave: { name: 'Synthwave / Cyberpunk', bg: '#1a102f', panel: '#1a102f', panel2: '#281845', line: '#4a2980', text: '#00f0ff', textDim: '#a880eb', accent: '#ff007f', accentDim: '#d6006e', danger: '#ff3860' },
    gruvbox: { name: 'Gruvbox Dark', bg: '#282828', panel: '#282828', panel2: '#32302f', line: '#504945', text: '#ebdbb2', textDim: '#a89984', accent: '#fe8019', accentDim: '#fabd2f', danger: '#fb4934' },
    emerald: { name: 'Emerald / Forest', bg: '#0d1f18', panel: '#0d1f18', panel2: '#142d23', line: '#234a3b', text: '#e0f2eb', textDim: '#7ca393', accent: '#2ecc71', accentDim: '#27ae60', danger: '#e74c3c' }
  };

  let activeThemeState = { type: 'preset', key: 'dark' };

  function rgbToHex(r, g, b) {
    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
  }

  function adjustBrightness(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const factor = 1 + percent / 100;
    return rgbToHex(r * factor, g * factor, b * factor);
  }

  function getLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function clearThemeInlineVars() {
    ['--bg', '--panel', '--panel-2', '--line', '--text', '--text-dim', '--accent', '--accent-dim', '--danger'].forEach(p => {
      document.documentElement.style.removeProperty(p);
    });
  }

  function getCustomThemesFromStorage() {
    try {
      const raw = localStorage.getItem('pixelart_custom_themes');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveCustomThemesToStorage(list) {
    try { localStorage.setItem('pixelart_custom_themes', JSON.stringify(list)); } catch(e){}
  }

  function syncThemeDropdowns(value) {
    const ts = document.getElementById('themeSelect');
    const mts = document.getElementById('modalThemePresetSelect');
    if (ts) ts.value = value;
    if (mts) mts.value = value;
  }

  function updateThemePickersFromObj(obj) {
    if (obj.bg) document.getElementById('themeBgColorInput').value = obj.bg;
    if (obj.panel2 || obj.section) document.getElementById('themeSectionColorInput').value = obj.panel2 || obj.section;
    if (obj.accent) document.getElementById('themeAccentColorInput').value = obj.accent;
    if (obj.text) document.getElementById('themeTextColorInput').value = obj.text;
    if (obj.line) document.getElementById('themeBorderColorInput').value = obj.line;
  }

  function refreshCustomThemesUI() {
    const customList = getCustomThemesFromStorage();
    const ts = document.getElementById('themeSelect');
    const mts = document.getElementById('modalThemePresetSelect');

    [ts, mts].forEach(sel => {
      if (!sel) return;
      Array.from(sel.options).forEach(opt => {
        if (opt.dataset.isCustom === 'true') sel.removeChild(opt);
      });
    });

    customList.forEach(ct => {
      [ts, mts].forEach(sel => {
        if (!sel) return;
        const opt = document.createElement('option');
        opt.value = 'custom_' + ct.id;
        opt.textContent = '⭐ ' + ct.name;
        opt.dataset.isCustom = 'true';
        sel.appendChild(opt);
      });
    });

    const listWrap = document.getElementById('savedCustomThemesList');
    if (listWrap) {
      listWrap.innerHTML = '';
      if (customList.length === 0) {
        listWrap.innerHTML = '<div style="font-size:10px; color:var(--text-dim); font-style:italic;">No saved custom themes yet</div>';
      } else {
        customList.forEach(ct => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:var(--panel); padding:4px 6px; border-radius:4px; border:1px solid var(--line); font-size:10px;';
          
          const title = document.createElement('span');
          title.textContent = ct.name;
          title.style.cssText = 'flex:1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; color:var(--text);';
          title.title = 'Click to apply this custom theme';
          title.addEventListener('click', () => applyTheme('custom_' + ct.id));

          const delBtn = document.createElement('button');
          delBtn.className = 'btn small';
          delBtn.textContent = '✕';
          delBtn.style.cssText = 'padding:1px 4px; font-size:9px; color:var(--danger); border:none; background:transparent; cursor:pointer;';
          delBtn.title = 'Delete saved theme';
          delBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            deleteCustomTheme(ct.id);
          });

          row.appendChild(title);
          row.appendChild(delBtn);
          listWrap.appendChild(row);
        });
      }
    }
  }

  function applyTheme(themeKeyOrObj, isUserEdit = false) {
    if (typeof themeKeyOrObj === 'string') {
      if (themeKeyOrObj === 'custom') {
        const themeObj = (activeThemeState && activeThemeState.data) ? activeThemeState.data : getCurrentThemeObject();
        applyThemeObject(themeObj);
        activeThemeState = { type: 'custom_live', data: themeObj };
        syncThemeDropdowns('custom');
        try { localStorage.setItem('pixelart_theme_selection', JSON.stringify(activeThemeState)); } catch(e){}
        return;
      }

      if (themeKeyOrObj.startsWith('custom_')) {
        const id = themeKeyOrObj.replace('custom_', '');
        const list = getCustomThemesFromStorage();
        const found = list.find(t => t.id === id);
        if (found) {
          applyThemeObject(found);
          activeThemeState = { type: 'custom_saved', id, data: found };
          syncThemeDropdowns(themeKeyOrObj);
          try { localStorage.setItem('pixelart_theme_selection', JSON.stringify(activeThemeState)); } catch(e){}
        }
        return;
      }

      if (BUILTIN_THEMES[themeKeyOrObj]) {
        clearThemeInlineVars();
        document.documentElement.dataset.theme = themeKeyOrObj;
        updateThemePickersFromObj(BUILTIN_THEMES[themeKeyOrObj]);
        activeThemeState = { type: 'preset', key: themeKeyOrObj };
        syncThemeDropdowns(themeKeyOrObj);
        try { localStorage.setItem('pixelart_theme_selection', JSON.stringify(activeThemeState)); } catch(e){}
        return;
      }
    } else if (typeof themeKeyOrObj === 'object' && themeKeyOrObj) {
      applyThemeObject(themeKeyOrObj);
      if (isUserEdit) {
        activeThemeState = { type: 'custom_live', data: themeKeyOrObj };
        syncThemeDropdowns('custom');
        try { localStorage.setItem('pixelart_theme_selection', JSON.stringify(activeThemeState)); } catch(e){}
      }
    }
  }

  function applyThemeObject(obj) {
    const bg = obj.bg || '#17181c';
    const section = obj.panel2 || obj.section || '#25272d';
    const accent = obj.accent || '#d4a017';
    
    const isDark = getLuminance(bg) < 0.4;
    const panel = bg; // The background color is also the color behind the section/card color
    const line = obj.line || (isDark ? adjustBrightness(section, 25) : adjustBrightness(section, -20));
    const text = obj.text || (isDark ? '#e7e6e2' : '#22221f');
    const textDim = obj.textDim || adjustBrightness(text, isDark ? -35 : 35);
    const accentDim = obj.accentDim || adjustBrightness(accent, -25);
    const danger = obj.danger || '#c85c5c';

    document.documentElement.dataset.theme = 'custom';
    document.documentElement.style.setProperty('--bg', bg);
    document.documentElement.style.setProperty('--panel', panel);
    document.documentElement.style.setProperty('--panel-2', section);
    document.documentElement.style.setProperty('--line', line);
    document.documentElement.style.setProperty('--text', text);
    document.documentElement.style.setProperty('--text-dim', textDim);
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-dim', accentDim);
    document.documentElement.style.setProperty('--danger', danger);

    updateThemePickersFromObj({ bg, section, accent, text, line });
  }

  function getCurrentThemeObject() {
    const isAdv = document.getElementById('themeAdvancedToggle').checked;
    return {
      bg: document.getElementById('themeBgColorInput').value,
      section: document.getElementById('themeSectionColorInput').value,
      accent: document.getElementById('themeAccentColorInput').value,
      text: isAdv ? document.getElementById('themeTextColorInput').value : undefined,
      line: isAdv ? document.getElementById('themeBorderColorInput').value : undefined
    };
  }

  function handleCustomPickerChange() {
    const themeObj = getCurrentThemeObject();
    applyTheme(themeObj, true);
  }

  function saveCurrentCustomTheme() {
    const nameInput = document.getElementById('customThemeNameInput');
    const name = (nameInput.value || '').trim() || 'Custom Theme ' + (getCustomThemesFromStorage().length + 1);
    const themeObj = getCurrentThemeObject();
    themeObj.id = 'theme_' + Date.now();
    themeObj.name = name;

    const list = getCustomThemesFromStorage();
    list.push(themeObj);
    saveCustomThemesToStorage(list);

    refreshCustomThemesUI();
    applyTheme('custom_' + themeObj.id);
    nameInput.value = '';
    showNotice('Custom theme "' + name + '" saved!');
  }

  function deleteCustomTheme(id) {
    let list = getCustomThemesFromStorage();
    list = list.filter(t => t.id !== id);
    saveCustomThemesToStorage(list);
    refreshCustomThemesUI();
    applyTheme('dark');
    showNotice('Custom theme deleted.');
  }

  function showNotice(msg) {
    if (typeof showToast === 'function') showToast(msg);
  }

  function getCanvasBlob(canvas, mimeType = 'image/png', quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create canvas blob'));
        }, mimeType, quality);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function saveBlobWithPrompt(blob, suggestedName, types) {
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: types || []
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, name: handle.name || suggestedName, method: 'handle' };
      } catch (err) {
        if (err.name === 'AbortError') {
          // User cancelled the file picker dialog
          return { success: false, cancelled: true };
        }
        console.warn('showSaveFilePicker failed, falling back to download:', err);
      }
    }
    // Fallback for browsers without File System Access API or when picker is blocked
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = suggestedName;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { success: true, name: suggestedName, method: 'download' };
  }

  async function exportThemeJson() {
    const themeObj = getCurrentThemeObject();
    themeObj.name = themeObj.name || 'Custom Theme';
    const jsonStr = JSON.stringify(themeObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = (themeObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'theme') + '.json';
    try {
      const res = await saveBlobWithPrompt(blob, filename, [
        { description: 'JSON Theme File', accept: { 'application/json': ['.json'] } }
      ]);
      if (res.success) {
        showNotice('Theme exported as "' + res.name + '"');
      }
    } catch(err) {
      console.error('Error exporting theme JSON:', err);
    }
  }

  function copyThemeJson() {
    const themeObj = getCurrentThemeObject();
    const jsonStr = JSON.stringify(themeObj, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      showNotice('Theme JSON copied to clipboard!');
    }).catch(() => {
      showNotice('Copy failed — check browser permissions.');
    });
  }

  function importThemeJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (obj && typeof obj === 'object' && (obj.bg || obj.accent)) {
          const name = obj.name || 'Imported Theme';
          obj.id = 'theme_' + Date.now();
          obj.name = name;
          const list = getCustomThemesFromStorage();
          list.push(obj);
          saveCustomThemesToStorage(list);
          refreshCustomThemesUI();
          applyTheme('custom_' + obj.id);
          showNotice('Theme "' + name + '" imported successfully!');
        } else {
          showNotice('Invalid theme JSON file.');
        }
      } catch (err) {
        showNotice('Failed to parse theme JSON.');
      }
    };
    reader.readAsText(file);
  }

  let themeSnapshotBeforeOpening = null;



  const appSettingsCancelBtn = document.getElementById('appSettingsCancelBtn');
  if (appSettingsCancelBtn) {
    appSettingsCancelBtn.addEventListener('click', cancelAppSettingsChanges);
  }
  
  // App Settings Wiring
  const appSettingsModal = document.getElementById('appSettingsModal');
  const tooltipDelaySlider = document.getElementById('tooltipDelaySlider');
  const tooltipDelayVal = document.getElementById('tooltipDelayVal');
  
  function openAppSettings() {
    closeFileMenu();
    themeSnapshotBeforeOpening = JSON.parse(JSON.stringify(activeThemeState));
    
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
    if (typeof closeHslColorPicker === 'function') closeHslColorPicker();
  }

  function cancelAppSettingsChanges() {
    if (themeSnapshotBeforeOpening) {
      if (themeSnapshotBeforeOpening.type === 'preset' && themeSnapshotBeforeOpening.key) {
        applyTheme(themeSnapshotBeforeOpening.key);
      } else if (themeSnapshotBeforeOpening.type === 'custom_saved' && themeSnapshotBeforeOpening.id) {
        applyTheme('custom_' + themeSnapshotBeforeOpening.id);
      } else if (themeSnapshotBeforeOpening.type === 'custom_live' && themeSnapshotBeforeOpening.data) {
        applyTheme(themeSnapshotBeforeOpening.data, true);
      }
    }
    closeAppSettings();
  }
  
  document.getElementById('appSettingsBtn').addEventListener('click', openAppSettings);
  document.getElementById('appSettingsCloseBtn').addEventListener('click', cancelAppSettingsChanges);
  document.getElementById('appSettingsOkBtn').addEventListener('click', closeAppSettings);
  
  tooltipDelaySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    tooltipDelayVal.textContent = val.toFixed(1) + 's';
    appSettings.tooltipDelay = val;
    saveAppSettings();
  });
  
  makePopupDraggable(appSettingsModal, document.getElementById('appSettingsDragHandle'));

  document.getElementById('modalThemePresetSelect').addEventListener('change', e => applyTheme(e.target.value));

  function initThemeColorPickerElement(id, defaultHex) {
    const el = document.getElementById(id);
    if (!el) return;
    let colorVal = defaultHex;
    Object.defineProperty(el, 'value', {
      get() { return colorVal; },
      set(newHex) {
        colorVal = newHex;
        el.style.backgroundColor = newHex;
      }
    });

    el.addEventListener('click', () => {
      openHslColorPicker(colorVal, (hex) => {
        el.value = hex;
        el.dispatchEvent(new Event('input'));
      }, el);
    });
  }

  initThemeColorPickerElement('themeBgColorInput', '#17181c');
  initThemeColorPickerElement('themeSectionColorInput', '#25272d');
  initThemeColorPickerElement('themeAccentColorInput', '#d4a017');
  initThemeColorPickerElement('themeTextColorInput', '#e7e6e2');
  initThemeColorPickerElement('themeBorderColorInput', '#33353c');

  document.getElementById('themeBgColorInput').addEventListener('input', handleCustomPickerChange);
  document.getElementById('themeSectionColorInput').addEventListener('input', handleCustomPickerChange);
  document.getElementById('themeAccentColorInput').addEventListener('input', handleCustomPickerChange);
  document.getElementById('themeTextColorInput').addEventListener('input', handleCustomPickerChange);
  document.getElementById('themeBorderColorInput').addEventListener('input', handleCustomPickerChange);

  document.getElementById('themeAdvancedToggle').addEventListener('change', e => {
    document.getElementById('themeAdvancedColorsWrap').style.display = e.target.checked ? 'flex' : 'none';
  });

  document.getElementById('saveCustomThemeBtn').addEventListener('click', saveCurrentCustomTheme);
  document.getElementById('exportThemeJsonBtn').addEventListener('click', exportThemeJson);
  document.getElementById('copyThemeJsonBtn').addEventListener('click', copyThemeJson);

  const importFileBtn = document.getElementById('importThemeJsonBtn');
  const importFileInput = document.getElementById('importThemeFileInput');
  importFileBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) importThemeJsonFile(e.target.files[0]);
  });

  document.getElementById('applyPastedThemeBtn').addEventListener('click', () => {
    const text = document.getElementById('themeJsonPasteArea').value.trim();
    if (!text) return;
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && (obj.bg || obj.accent)) {
        const name = obj.name || 'Pasted Theme';
        obj.id = 'theme_' + Date.now();
        obj.name = name;
        const list = getCustomThemesFromStorage();
        list.push(obj);
        saveCustomThemesToStorage(list);
        refreshCustomThemesUI();
        applyTheme('custom_' + obj.id);
        document.getElementById('themeJsonPasteArea').value = '';
        document.getElementById('themeJsonPasteArea').style.display = 'none';
        document.getElementById('applyPastedThemeBtn').style.display = 'none';
        showNotice('Pasted theme applied!');
      } else {
        showNotice('Invalid theme JSON structure.');
      }
    } catch(err) {
      showNotice('Error parsing pasted JSON.');
    }
  });

  refreshCustomThemesUI();
  try {
    const savedSel = localStorage.getItem('pixelart_theme_selection');
    if (savedSel) {
      const parsed = JSON.parse(savedSel);
      if (parsed.type === 'preset' && parsed.key) applyTheme(parsed.key);
      else if (parsed.type === 'custom_saved' && parsed.id) applyTheme('custom_' + parsed.id);
      else if (parsed.type === 'custom_live' && parsed.data) applyTheme(parsed.data);
    }
  } catch(e){}

  refreshGroups();

  function isHexColor(s){ return typeof s === 'string' && /^#?[0-9a-fA-F]{6}$/.test(s); }
  function normalizeHex(s){ return s.startsWith('#') ? s.toLowerCase() : ('#'+s.toLowerCase()); }

  function parsePaletteImport(text){
    text = text.trim();
    try {
      const obj = JSON.parse(text);
      if(Array.isArray(obj)) return { colors: obj.filter(isHexColor).map(h=>({hex:normalizeHex(h), name:''})), paletteName: null };
      if(obj && Array.isArray(obj.palette)) return { colors: obj.palette.filter(isHexColor).map(h=>({hex:normalizeHex(h), name:''})), paletteName: obj.name || null };
    } catch(e){ /* not JSON */ }

    if(/^GIMP Palette/i.test(text)){
      const lines = text.split('\n');
      const colors = [];
      let paletteName = null;
      for(const line of lines){
        const t = line.trim();
        if(!t) continue;
        if(/^GIMP Palette/i.test(t)) continue;
        const nameMatch = t.match(/^Name:\s*(.+)$/i);
        if(nameMatch){ paletteName = nameMatch[1].trim(); continue; }
        if(/^Columns:/i.test(t)) continue;
        if(t.startsWith('#')) continue;
        const parts = t.split(/\s+/);
        if(parts.length>=3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])){
          const colorName = parts.slice(3).join(' ').trim();
          colors.push({ hex: rgbToHex(+parts[0], +parts[1], +parts[2]), name: colorName });
        }
      }
      if(colors.length) return { colors, paletteName };
    }

    const found = text.match(/#?[0-9a-fA-F]{6}\b/g);
    if(found) return { colors: found.map(h=>({hex:normalizeHex(h), name:''})), paletteName: null };
    return { colors: [], paletteName: null };
  }

  function loadDefaultPalette(askConfirm = true){
    if(askConfirm){
      const otherGroupCount = groups.length - 1;
      const warning = otherGroupCount > 0
        ? `Resetting to the default palette will replace every color in the Main Palette (99 colors) and delete ${otherGroupCount} other group${otherGroupCount>1?'s':''}. Continue?`
        : 'Reset to the default 99-color palette? Continue?';
      if(!confirm(warning)) return;
    }

    const defaultPal = generateDefaultPaletteColors();
    groups = [
      { id: 0, name: 'Main Palette', isMain: true,
        colors: defaultPal.colors,
        collapsed: false, columns: 9 }
    ];
    groupIdCounter = 1;
    mainColorIdCounter = defaultPal.nextId;
    selectedColors = new Set();
    rangeAnchor = { groupId: null, index: null };
    const defaultWhiteIdx = allColors().indexOf('#ffffff');
    selectPaletteIndex(defaultWhiteIdx !== -1 ? defaultWhiteIdx : 0);
    refreshGroups();
    fitSidePanelToPalette();
    if(askConfirm && typeof showToast === 'function') showToast('Default palette loaded');
  }

  document.getElementById('loadDefaultPaletteBtn')?.addEventListener('click', ()=> loadDefaultPalette(true));

  document.getElementById('loadPalette').addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const parsed = parsePaletteImport(reader.result);
      if(parsed.colors.length === 0){
        alert('Could not find any colors in that file.');
        return;
      }
      const otherGroupCount = groups.length - 1;
      const warning = otherGroupCount > 0
        ? `Loading this palette will replace every color in the Main Palette and delete ${otherGroupCount} other group${otherGroupCount>1?'s':''} (they only reference Main Palette colors, so they can't survive it being replaced). Continue?`
        : 'Loading this palette will replace every color in the Main Palette. Continue?';
      if(!confirm(warning)) return;

      const main = mainGroup();
      main.colors = parsed.colors.map(c => ({ id: mainColorIdCounter++, hex: c.hex, name: c.name || '' }));
      main.name = parsed.paletteName || file.name.replace(/\.[^.]+$/, '') || main.name;
      groups = [main];
      selectedColors = new Set();
      selectPaletteIndex(0);
      refreshGroups();
      fitSidePanelToPalette();
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function exportGPL(){
    const main = mainGroup();
    let out = 'GIMP Palette\nName: ' + (main.name || 'Palette Spray Studio Export') + '\nColumns: 0\n#\n';
    main.colors.forEach(({hex, name})=>{
      const {r,g,b} = hexToRgb(hex);
      out += `${r} ${g} ${b}\t${(name && name.trim()) || hex}\n`;
    });
    return out;
  }
  document.getElementById('savePaletteBtn').addEventListener('click', async ()=>{
    const gplText = exportGPL();
    const blob = new Blob([gplText], {type:'text/plain'});
    const main = mainGroup();
    const baseName = sanitizeFilename(main.name) || (typeof projectName === 'function' ? projectName() : 'palette');
    const filename = (baseName || 'palette') + '.gpl';
    try {
      const res = await saveBlobWithPrompt(blob, filename, [
        { description: 'GIMP Palette File', accept: { 'text/plain': ['.gpl'] } }
      ]);
      if (res.success) {
        showToast(`Palette exported as "${res.name}"`);
      }
    } catch (err) {
      console.error('Error exporting palette:', err);
    }
  });

  // ---------- Gradients ----------
  function refreshGradientList(){
    const list = document.getElementById('gradientList');
    list.innerHTML = '';
    gradients.forEach((g, idx)=>{
      const row = document.createElement('div');
      row.className = 'lib-row';
      if (selectedGradientIndex === idx) {
        row.classList.add('active');
      }
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        selectedGradientIndex = idx;
        sourceKind = 'gradient';
        const skSel = document.getElementById('sourceKindSelect');
        if(skSel) {
          skSel.value = 'gradient';
        }
        const gSource = document.getElementById('gradientSourceSelect');
        if(gSource) {
          gSource.style.display = 'block';
          gSource.value = idx;
        }
        updateSpraySourceHint();
        refreshGradientList();
        syncActivePresetSettings();
      });

      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.background = cssGradientFromStops(g.stops);
      const name = document.createElement('div');
      name.className = 'lname';
      name.textContent = g.name;
      const editBtn = document.createElement('button');
      editBtn.className = 'btn small';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        buildingStops = [...g.stops];
        editingGradientIndex = idx;
        document.getElementById('gradientBuilder').style.display = 'block';
        refreshBuilder();
      });
      const delBtn = document.createElement('button');
      delBtn.className = 'btn small danger';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        gradients.splice(idx,1);
        if(selectedGradientIndex !== null){
          if(selectedGradientIndex === idx) selectedGradientIndex = null;
          else if(selectedGradientIndex > idx) selectedGradientIndex--;
        }
        refreshGradientList();
        populateGradientSourceDropdown();
        populatePalettizeGradientDropdown();
      });
      row.appendChild(bar); row.appendChild(name); row.appendChild(editBtn); row.appendChild(delBtn);
      list.appendChild(row);
    });
  }

  function refreshBuilder(){
    document.getElementById('gradientPreview').style.background = cssGradientFromStops(buildingStops);
    const chips = document.getElementById('stopChips');
    chips.innerHTML = '';
    const stopHexCounts = {};
    buildingStops.forEach((hex,idx)=>{
      const isPlaceholder = stopPtrDrag && idx === stopPtrDrag.insertAt;
      const occurrence = stopHexCounts[hex] = (stopHexCounts[hex]||0) + 1;
      const chip = document.createElement('div');
      chip.className = 'stop-chip' + (isPlaceholder ? ' ptr-placeholder' : '');
      chip.dataset.flipKey = hex + ':' + occurrence;
      chip.style.background = hex;
      chip.title = hex + ' (click to remove, drag to reorder)';
      chip.addEventListener('click', ()=>{ buildingStops.splice(idx,1); refreshBuilder(); });
      chip.addEventListener('pointerdown', (ev)=> beginStopPointerTracking(idx, ev));
      chips.appendChild(chip);
    });
    const bgrid = document.getElementById('builderPaletteGrid');
    bgrid.innerHTML = '';
    [...new Set(allColors())].forEach(hex=>{
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = hex;
      sw.title = 'Add ' + hex;
      sw.addEventListener('click', ()=>{ buildingStops.push(hex); refreshBuilder(); });
      bgrid.appendChild(sw);
    });
  }
  document.getElementById('newGradientBtn').addEventListener('click', ()=>{
    buildingStops = [];
    editingGradientIndex = null;
    document.getElementById('gradientBuilder').style.display = 'block';
    refreshBuilder();
  });
  document.getElementById('newGradientFromSelectionBtn').addEventListener('click', ()=>{
    buildingStops = allColors().filter(hex => selectedColors.has(hex));
    if(buildingStops.length === 0) buildingStops = [...new Set(allColors())];
    editingGradientIndex = null;
    document.getElementById('gradientBuilder').style.display = 'block';
    refreshBuilder();
  });
  document.getElementById('cancelGradientBtn').addEventListener('click', ()=>{
    document.getElementById('gradientBuilder').style.display = 'none';
    editingGradientIndex = null;
  });
  document.getElementById('addStopColorBtn').addEventListener('click', ()=>{
    openHslColorPicker('#7a9e5c', null, document.getElementById('addStopColorBtn'), {
      label: 'Add as Stop',
      onAction: (hex) => {
        buildingStops.push(hex);
        refreshBuilder();
      }
    });
  });
  document.getElementById('saveGradientBtn').addEventListener('click', async ()=>{
    if(buildingStops.length===0){ alert('Add at least one color stop first.'); return; }
    const defaultName = editingGradientIndex !== null ? gradients[editingGradientIndex].name : ('Gradient ' + (gradients.length+1));
    const name = await showCustomPrompt('Gradient name:', defaultName);
    if(name===null) return;
    let targetIdx = 0;
    if(editingGradientIndex !== null){
      gradients[editingGradientIndex] = {name, stops:[...buildingStops]};
      targetIdx = editingGradientIndex;
    } else {
      gradients.push({name, stops:[...buildingStops]});
      targetIdx = gradients.length - 1;
    }
    selectedGradientIndex = targetIdx;
    editingGradientIndex = null;
    document.getElementById('gradientBuilder').style.display='none';
    refreshGradientList();
    populateGradientSourceDropdown();
    const gSource = document.getElementById('gradientSourceSelect');
    if(gSource) {
      gSource.value = targetIdx;
    }
    populatePalettizeGradientDropdown();
    updateSourceKindAvailability();
    updateSpraySourceHint();
    syncActivePresetSettings();
  });

  // ---------- Layers panel ----------
  function refreshLayerPanel(){
    refreshHeightSourceOptions();
    const list = document.getElementById('layerList');
    if(list){
      list.innerHTML = '';
      for(let i=layers.length-1;i>=0;i--){
        const l = layers[i];
        const row = document.createElement('div');
        row.className = 'layer-row' + (i===activeLayer ? ' active' : '');
        if (currentDragType === 'layer' && i === currentDragIndex) {
          row.classList.add('dragging');
        }
        row.dataset.index = i;
        row.dataset.flipKey = 'layer-row-' + l.id;

        // Pointer-based Drag & Drop for Layer Panel List
        let startX = 0, startY = 0;
        let started = false;

        function onPointerMove(ev) {
          if (!started) {
            if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) {
              started = true;
              currentDragType = 'layer';
              currentDragIndex = i;
              blockLayerClick = true;
              pushHistory();
              captureCurrentFrameState();
              createListDragGhost(l.name, ev.clientX, ev.clientY);
              refreshLayerPanel();
              if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
            }
            return;
          }
          moveListDragGhost(ev.clientX, ev.clientY);

          const listContainer = document.getElementById('layerList');
          if (listContainer) {
            const allEls = [...listContainer.querySelectorAll('.layer-row')];
            let hoveredRowIdx = allEls.length - 1;
            for (let j = 0; j < allEls.length; j++) {
              const rect = allEls[j].getBoundingClientRect();
              if (ev.clientY < rect.top + rect.height / 2) {
                hoveredRowIdx = j;
                break;
              }
            }
            const newIndex = layers.length - 1 - hoveredRowIdx;

            if (newIndex !== currentDragIndex) {
              const fromIdx = currentDragIndex;
              const toIdx = newIndex;

              captureFlipSnapshot('#layerList .layer-row');

              frames.forEach(f => {
                if (f.layers) {
                  const [moved] = f.layers.splice(fromIdx, 1);
                  f.layers.splice(toIdx, 0, moved);
                }
              });

              if (activeLayer === fromIdx) {
                activeLayer = toIdx;
              } else if (activeLayer > fromIdx && activeLayer <= toIdx) {
                activeLayer--;
              } else if (activeLayer < fromIdx && activeLayer >= toIdx) {
                activeLayer++;
              }

              layers = frames[currentFrameIndex].layers;
              currentDragIndex = toIdx;

              refreshLayerPanel();
              if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
              render();

              playFlipAnimation('#layerList .layer-row');
            }
          }
        }

        function onPointerUp(ev) {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          if (started) {
            removeListDragGhost();
            currentDragType = null;
            currentDragIndex = -1;
            refreshLayerPanel();
            if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
            render();
          }
        }

        if (l.locked) row.classList.add('is-locked');

        row.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          if (ev.target.closest('[data-role="visibility"]') || ev.target.closest('[data-role="info"]') || ev.target.closest('[data-role="lock"]')) return;
          startX = ev.clientX;
          startY = ev.clientY;
          started = false;
          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        });

        const vis = document.createElement('input');
        vis.type = 'checkbox';
        vis.checked = l.visible;
        vis.dataset.role = 'visibility';
        vis.title = 'Toggle visibility';
        vis.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        vis.addEventListener('click', (ev) => ev.stopPropagation());
        vis.addEventListener('change', (ev) => {
          ev.stopPropagation();
          pushHistory();
          const isVis = ev.target.checked;
          frames.forEach(f => {
            if (f.layers && f.layers[i]) f.layers[i].visible = isVis;
          });
          refreshLayerPanel();
          render();
          updateHiddenLayerWarning();
          if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
        });

        const lockBtn = document.createElement('button');
        lockBtn.type = 'button';
        lockBtn.className = 'layer-lock-btn' + (l.locked ? ' active' : '');
        lockBtn.innerHTML = l.locked ? '🔒' : '🔓';
        lockBtn.title = l.locked ? 'Unlock layer (allow editing)' : 'Lock layer (prevent editing)';
        lockBtn.dataset.role = 'lock';
        lockBtn.style.background = 'none';
        lockBtn.style.border = 'none';
        lockBtn.style.cursor = 'pointer';
        lockBtn.style.fontSize = '12px';
        lockBtn.style.padding = '0 3px';
        lockBtn.style.lineHeight = '1';
        lockBtn.style.opacity = l.locked ? '1' : '0.4';
        lockBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        lockBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          pushHistory();
          const isLocked = !l.locked;
          frames.forEach(f => {
            if (f.layers && f.layers[i]) f.layers[i].locked = isLocked;
          });
          refreshLayerPanel();
          if (typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
          render();
        });

        const thumb = document.createElement('canvas');
        thumb.width = 24; thumb.height = 24;
        thumb.className = 'layer-thumb';
        const tctx = thumb.getContext('2d', { willReadFrequently: true });
        tctx.drawImage(l.canvas, 0,0,24,24);

        const name = document.createElement('div');
        name.className = 'layer-name';
        name.textContent = l.name;

        const infoBtn = document.createElement('button');
        infoBtn.className = 'layer-info-btn';
        infoBtn.textContent = 'i';
        infoBtn.title = 'Layer info';
        infoBtn.dataset.role = 'info';
        infoBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        infoBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openLayerInfoPopup(ev, i);
        });

        row.appendChild(vis);
        row.appendChild(lockBtn);
        row.appendChild(thumb);
        row.appendChild(name);
        row.appendChild(infoBtn);
        list.appendChild(row);
      }
    }
    updateHiddenLayerWarning();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
  }
  function updateHiddenLayerWarning(){
    const warn = document.getElementById('hiddenLayerWarning');
    if(!warn) return;
    const hidden = layers[activeLayer] && !layers[activeLayer].visible;
    warn.style.display = hidden ? 'block' : 'none';
  }
  function openLayerInfoPopup(ev, layerIndex){
    const popup = document.getElementById('layerInfoPopup');
    document.getElementById('layerInfoContent').textContent = 'Canvas size: ' + W + ' × ' + H + ' px';
    popup.style.display = 'block';
    const btnRect = ev.target.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    let left = btnRect.left, top = btnRect.bottom + 6;
    left = Math.min(left, window.innerWidth - popupRect.width - 10);
    top = Math.min(top, window.innerHeight - popupRect.height - 10);
    popup.style.left = Math.max(10, left) + 'px';
    popup.style.top = Math.max(10, top) + 'px';
  }
  document.getElementById('layerInfoCloseBtn')?.addEventListener('click', ()=>{
    document.getElementById('layerInfoPopup').style.display = 'none';
  });
  document.getElementById('layerInfoMergeDownBtn')?.addEventListener('click', ()=>{
    document.getElementById('layerInfoPopup').style.display = 'none';
    mergeActiveLayerDown();
  });
  document.getElementById('menuMergeLayerDownBtn')?.addEventListener('click', mergeActiveLayerDown);
  document.getElementById('layerList')?.addEventListener('click', ev=>{
    if (blockLayerClick) {
      blockLayerClick = false;
      return;
    }
    if (ev.target.closest('[data-role="visibility"]') || ev.target.closest('[data-role="info"]') || ev.target.closest('[data-role="lock"]')) {
      return;
    }
    const row = ev.target.closest('.layer-row');
    if(!row) return;
    const idx = +row.dataset.index;
    if(layers[idx] === undefined) return;
    
    activeLayer = idx;
    const opSlider = document.getElementById('layerOpacitySlider'); if(opSlider) opSlider.value = layers[idx].opacity;
    const opVal = document.getElementById('layerOpacityVal'); if(opVal) opVal.textContent = layers[idx].opacity + '%';
    refreshLayerPanel();
  });

  document.getElementById('addLayerBtn')?.addEventListener('click', ()=> addLayer());
  document.getElementById('dupLayerBtn')?.addEventListener('click', duplicateActiveLayer);
  document.getElementById('delLayerBtn')?.addEventListener('click', deleteActiveLayer);
  document.getElementById('upLayerBtn')?.addEventListener('click', moveActiveLayerUp);
  document.getElementById('downLayerBtn')?.addEventListener('click', moveActiveLayerDown);
  document.getElementById('layerOpacitySlider')?.addEventListener('input', e => updateLayerOpacity(+e.target.value));

  // ---------- Load image / new canvas / export ----------
  async function handleLoadedImage(img, filename){
    const asLayer = confirm(
      'Add this image as a new layer in the current project?\n\n' +
      'OK = add as a new layer here\n' +
      'Cancel = replace the current project entirely'
    );
    if(asLayer){
      const name = filename.replace(/\.[^.]+$/, '') || 'Loaded Image';
      if(img.width > W || img.height > H){
        // Grow (never shrink) the canvas to fit, so the image never gets silently clipped —
        // existing content stays exactly where it was, anchored at the top-left.
        pushHistory();
        W = Math.max(W, img.width); H = Math.max(H, img.height);
        resizeAllCanvasesToWH();
        fitCanvasToScreen(true);
        drawGridOverlay();
        addLayer(name, ctx => ctx.drawImage(img, 0, 0), true);
      } else {
        addLayer(name, ctx => ctx.drawImage(img, 0, 0));
      }
    } else {
      const confirmReplace = confirm(
        'This will replace your current project with this image. Anything not saved will be lost.\n\nContinue?'
      );
      if(!confirmReplace) return;
      const shouldSave = confirm('Save your current project first, before it gets replaced?');
      if(shouldSave) await saveProject(false); // awaited — buildProjectData() must run before the replace below overwrites this state
      const baseName = filename ? filename.replace(/\.[^.]+$/, '') : 'Untitled';
      await resetProjectToDefaults(img.width, img.height, 'Background', ctx=> ctx.drawImage(img,0,0), baseName);
    }
  }
  function loadImageFileAndHandle(file){
    const img = new Image();
    const onImageReady = ()=> handleLoadedImage(img, file.name);
    img.src = URL.createObjectURL(file);
    // img.decode() resolves only once the image is FULLY decoded and safe to drawImage —
    // onload alone can fire slightly before that point in some browsers, especially for large
    // images, which would silently draw nothing (or a partial frame) onto the new layer.
    if(typeof img.decode === 'function'){
      img.decode().then(onImageReady).catch(()=>{ img.onload = onImageReady; });
    } else {
      img.onload = onImageReady;
    }
  }
  document.getElementById('loadImage').addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    loadImageFileAndHandle(file);
    e.target.value = '';
  });

  // ---------- New Project Modal ----------
  const newProjectModalOverlay = document.getElementById('newProjectModalOverlay');
  const newProjPresetSelect = document.getElementById('newProjPresetSelect');
  const newProjWidthInput = document.getElementById('newProjWidthInput');
  const newProjHeightInput = document.getElementById('newProjHeightInput');
  const newProjLinkCheckbox = document.getElementById('newProjLinkCheckbox');
  const newProjCreateBtn = document.getElementById('newProjCreateBtn');
  const newProjCancelBtn = document.getElementById('newProjCancelBtn');

  function updatePresetDropdownFromInputs(){
    const w = parseInt(newProjWidthInput.value) || 0;
    const h = parseInt(newProjHeightInput.value) || 0;
    if(w === h && ['32','64','96','128','256','512','1024'].includes(String(w))){
      newProjPresetSelect.value = String(w);
    } else {
      newProjPresetSelect.value = 'custom';
    }
  }

  function openNewProjectModal(){
    newProjWidthInput.value = 512;
    newProjHeightInput.value = 512;
    newProjPresetSelect.value = '512';
    newProjLinkCheckbox.checked = true;
    newProjectModalOverlay.style.display = 'flex';
    setTimeout(()=> newProjWidthInput.focus(), 50);
  }

  function closeNewProjectModal(){
    newProjectModalOverlay.style.display = 'none';
  }

  document.getElementById('newCanvasBtn').addEventListener('click', openNewProjectModal);

  newProjPresetSelect.addEventListener('change', e=>{
    const val = e.target.value;
    if(val !== 'custom'){
      const num = parseInt(val) || 512;
      newProjWidthInput.value = num;
      newProjHeightInput.value = num;
    }
  });

  newProjWidthInput.addEventListener('input', ()=>{
    if(newProjLinkCheckbox.checked){
      newProjHeightInput.value = newProjWidthInput.value;
    }
    updatePresetDropdownFromInputs();
  });

  newProjHeightInput.addEventListener('input', ()=>{
    if(newProjLinkCheckbox.checked){
      newProjWidthInput.value = newProjHeightInput.value;
    }
    updatePresetDropdownFromInputs();
  });

  newProjLinkCheckbox.addEventListener('change', ()=>{
    if(newProjLinkCheckbox.checked){
      newProjHeightInput.value = newProjWidthInput.value;
      updatePresetDropdownFromInputs();
    }
  });

  const handleNewProjKeys = (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      newProjCreateBtn.click();
    } else if(e.key === 'Escape'){
      e.preventDefault();
      closeNewProjectModal();
    }
  };
  newProjWidthInput.addEventListener('keydown', handleNewProjKeys);
  newProjHeightInput.addEventListener('keydown', handleNewProjKeys);

  newProjectModalOverlay.addEventListener('click', e=>{
    if(e.target === newProjectModalOverlay){
      closeNewProjectModal();
    }
  });

  newProjCancelBtn.addEventListener('click', closeNewProjectModal);

  async function resetProjectToDefaults(w = 512, h = 512, initialLayerName = 'Layer 1', initialDrawFn = null, projName = 'Untitled'){
    if(typeof isPlaying !== 'undefined' && isPlaying && typeof stopPlayback === 'function'){
      stopPlayback();
    }
    if(typeof floatingSelection !== 'undefined' && floatingSelection && typeof anchorFloatingSelection === 'function'){
      anchorFloatingSelection();
    }
    if(typeof clearSelection === 'function') clearSelection();
    if(typeof updateSelectionUI === 'function') updateSelectionUI();

    projectFileHandle = null;
    activeSaveLocation = 'local';
    currentCloudFileId = null;
    currentCloudFileName = null;
    currentCloudProviderUsed = null;
    const projNameInput = document.getElementById('projectNameInput');
    if(projNameInput) projNameInput.value = projName || 'Untitled';
    if(typeof syncBackupUI === 'function') syncBackupUI();

    W = Math.max(1, Math.min(8192, parseInt(w) || 512));
    H = Math.max(1, Math.min(8192, parseInt(h) || 512));
    resizeAllCanvasesToWH();
    syncDocCompositeCanvasSize();

    undoStack = [];
    redoStack = [];
    pathUndoSnapshot = null;
    if(typeof pathSegments !== 'undefined') pathSegments = [];
    if(typeof updateHistoryButtons === 'function') updateHistoryButtons();

    onionSkinEnabled = false;
    onionSkinOpacity = 50;
    const onionSkinBtn = document.getElementById('onionSkinBtn');
    if(onionSkinBtn) onionSkinBtn.classList.remove('active');
    const osCheck = document.getElementById('tlOnionSkinCheckbox'); if(osCheck) osCheck.checked = false;
    const osSlider = document.getElementById('tlOnionSkinOpacitySlider'); if(osSlider) osSlider.value = 50;
    const osVal = document.getElementById('tlOnionSkinOpacityVal'); if(osVal) osVal.textContent = '50%';
    onionSkinCache = { prev: [], next: [] };

    // Reset Animation FPS & Timeline Opacity
    fps = 8;
    const fpsIn = document.getElementById('tlFpsInput'); if(fpsIn) fpsIn.value = 8;
    const tlOpIn = document.getElementById('tlLayerOpacitySlider'); if(tlOpIn) tlOpIn.value = 100;
    const tlOpVal = document.getElementById('tlLayerOpacityVal'); if(tlOpVal) tlOpVal.textContent = '100%';

    layerIdCounter = 1;
    frameIdCounter = 1;
    layers = [];
    addLayer(initialLayerName || 'Layer 1', initialDrawFn || null, true);
    frames = [makeFrame('Frame ' + frameIdCounter, layers, 0)];
    currentFrameIndex = 0;
    refreshFramesPanel();
    if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
    if(typeof refreshLayerPanel === 'function') refreshLayerPanel();

    loadDefaultPalette(false);
    fgColor = '#ffffff';
    selectedColors = new Set(['#ffffff']);
    const defaultWhiteIdx = (typeof allColors === 'function') ? allColors().indexOf('#ffffff') : -1;
    if(typeof selectPaletteIndex === 'function') selectPaletteIndex(defaultWhiteIdx !== -1 ? defaultWhiteIdx : 0);
    refreshGroups();
    updateSpraySourceHint();

    gradients = [];
    selectedGradientIndex = 0;
    buildingStops = [];
    editingGradientIndex = null;
    if(typeof refreshGradientList === 'function') refreshGradientList();
    if(typeof populateGradientSourceDropdown === 'function') populateGradientSourceDropdown();
    if(typeof populatePalettizeGradientDropdown === 'function') populatePalettizeGradientDropdown();

    stamps = [];
    selectedStampIndex = 0;
    if(typeof initDefaultSvgStamps === 'function') await initDefaultSvgStamps();
    if(typeof refreshStampList === 'function') refreshStampList();
    if(typeof populateStampDropdown === 'function') populateStampDropdown();
    const stampInv = document.getElementById('stampInvertCheckbox'); if(stampInv) stampInv.checked = false;
    const svgLw = document.getElementById('svgLineWidthSlider'); if(svgLw) svgLw.value = 2;
    const svgNf = document.getElementById('svgNoFillCheckbox'); if(svgNf) svgNf.checked = false;

    grids = [];
    gridMasterOn = false;
    snapToGridEnabled = false;
    gridIdCounter = 1;
    const gridMasterToggle = document.getElementById('gridMasterToggle');
    if(gridMasterToggle) gridMasterToggle.checked = false;
    const snapToGridToggle = document.getElementById('snapToGridToggle');
    if(snapToGridToggle) snapToGridToggle.checked = false;
    if(typeof refreshGridPanel === 'function') refreshGridPanel();
    if(typeof drawGridOverlay === 'function') drawGridOverlay();

    sprayPresets = JSON.parse(JSON.stringify(DEFAULT_BUILTIN_SPRAY_PRESETS));
    activeSprayPresetId = 'builtin-spray';
    sprayPresetIdCounter = 1;
    if(typeof refreshSprayPresetList === 'function') refreshSprayPresetList();

    vinePresets = JSON.parse(JSON.stringify(DEFAULT_BUILTIN_VINE_PRESETS));
    activeVinePresetId = 'builtin-vine-classic';
    vinePresetIdCounter = 1;
    if(typeof refreshVinePresetList === 'function') refreshVinePresetList();

    // Default Spray Brush Settings
    brushSize = 24;
    dabSize = 8;
    dabWidth = 8;
    dabHeight = 8;
    dabLockAspect = true;
    density = 30;
    falloff = 40;
    flow = 100;
    opacity = 100;
    dabShape = 'circle';
    sprayInterpolate = true;
    sprayCombineSameColor = false;
    pixelPerfect = true;

    const sSlider = document.getElementById('sizeSlider'); if(sSlider) sSlider.value = 24;
    const sVal = document.getElementById('sizeVal'); if(sVal) sVal.textContent = '24';
    const opSlider = document.getElementById('opacitySlider'); if(opSlider) opSlider.value = 100;
    const opVal = document.getElementById('opacityVal'); if(opVal) opVal.textContent = '100%';
    const flSlider = document.getElementById('flowSlider'); if(flSlider) flSlider.value = 100;
    const flVal = document.getElementById('flowVal'); if(flVal) flVal.textContent = '100%';
    const denSlider = document.getElementById('densitySlider'); if(denSlider) denSlider.value = 30;
    const denVal = document.getElementById('densityVal'); if(denVal) denVal.textContent = '30%';
    const foSlider = document.getElementById('falloffSlider'); if(foSlider) foSlider.value = 40;
    const foVal = document.getElementById('falloffVal'); if(foVal) foVal.textContent = '40%';
    const dwSlider = document.getElementById('dabWidthSlider'); if(dwSlider) dwSlider.value = 8;
    const dwVal = document.getElementById('dabWidthVal'); if(dwVal) dwVal.textContent = '8';
    const dhSlider = document.getElementById('dabHeightSlider'); if(dhSlider) dhSlider.value = 8;
    const dhVal = document.getElementById('dabHeightVal'); if(dhVal) dhVal.textContent = '8';
    const dlaCheck = document.getElementById('dabLockAspectCheckbox'); if(dlaCheck) dlaCheck.checked = true;
    const siCheck = document.getElementById('sprayInterpolateCheckbox'); if(siCheck) siCheck.checked = true;

    const pbms = document.getElementById('paintBlendModeSelect'); if(pbms) pbms.value = 'pixel-perfect';
    const sps = document.getElementById('sprayPresetSelect'); if(sps) sps.value = 'builtin-spray';

    document.querySelectorAll('.dab-shape-btn').forEach(b => b.classList.toggle('active', b.dataset.shape === 'circle'));

    const defaultSprayPreset = sprayPresets.find(p => p.id === 'builtin-spray');
    if(defaultSprayPreset && typeof applySprayPreset === 'function') applySprayPreset(defaultSprayPreset);
    if(typeof setTool === 'function') setTool('spray');

    sourceKind = 'palette';
    const sourceKindRadio = document.querySelector('input[name="sourceKind"][value="palette"]');
    if(sourceKindRadio) sourceKindRadio.checked = true;
    const sourceKindSel = document.getElementById('sourceKindSelect');
    if(sourceKindSel) sourceKindSel.value = 'palette';
    const gss = document.getElementById('gradientSourceSelect');
    if(gss) gss.style.display = 'none';

    // Reset Modes (Seamless, Height/Roughness, Lighting)
    seamlessModeEnabled = false;
    const seamlessToggle = document.getElementById('seamlessModeToggle'); if(seamlessToggle) seamlessToggle.checked = false;
    const sfSlider = document.getElementById('seamlessFadeSlider'); if(sfSlider) sfSlider.value = 16;
    const szSlider = document.getElementById('seamlessZoomSlider'); if(szSlider) szSlider.value = 1.0;
    const spCheck = document.getElementById('seamlessPalettizeCheckbox'); if(spCheck) spCheck.checked = false;

    editingHeightMode = false;
    editingRoughnessMode = false;
    const eht = document.getElementById('editingHeightToggle'); if(eht) eht.checked = false;
    const ert = document.getElementById('editingRoughnessToggle'); if(ert) ert.checked = false;
    if(typeof syncHeightEditSwap === 'function') syncHeightEditSwap();

    lightingPreviewEnabled = false;
    const lpe = document.getElementById('lightingPreviewEnabled'); if(lpe) lpe.checked = false;
    const clc = document.getElementById('canvasLightingCanvas'); if(clc) clc.style.display = 'none';
    const clg = document.getElementById('canvasLightingGizmoCanvas'); if(clg) clg.style.display = 'none';

    const colorHighlightBtn = document.getElementById('highlightOnCanvasBtn');
    if(colorHighlightBtn) colorHighlightBtn.classList.remove('active');
    colorHighlightActive = false;
    const colorHighlightCanvas = document.getElementById('colorHighlightCanvas');
    if(colorHighlightCanvas){
      const hctx = colorHighlightCanvas.getContext('2d');
      if(hctx) hctx.clearRect(0, 0, colorHighlightCanvas.width, colorHighlightCanvas.height);
    }

    // Reset Height Painting mode & controls
    heightPaintEnabled = false;
    heightSourceLayerIndex = null;
    heightMode = 'range';
    heightMin = 0;
    heightMax = 255;
    heightSoftness = 0;
    const hpe = document.getElementById('heightPaintEnabled'); if(hpe) hpe.checked = false;
    const hpo = document.getElementById('heightPaintOptions'); if(hpo) hpo.style.display = 'none';

    // Reset Taper Settings
    paintTaperEnabled = false;
    paintTaperStart = true;
    paintTaperFinish = false;
    paintTaperLength = 16;
    paintTaperOpacityFade = false;
    paintTaperSizePct = 100;
    paintTaperSpreadPct = 100;
    if(typeof updatePaintTaperUI === 'function') updatePaintTaperUI();

    // Reset Path & Freehand Settings
    pathStyle = 'default';
    const pathStyleSel = document.getElementById('pathStyleSelect'); if(pathStyleSel) pathStyleSel.value = 'default';
    freehandPathDetail = 30;
    const freehandDet = document.getElementById('freehandPathDetailSlider'); if(freehandDet) freehandDet.value = 30;
    const freehandDetVal = document.getElementById('freehandPathDetailVal'); if(freehandDetVal) freehandDetVal.textContent = '30';
    pathPoints = [];
    pathState = 'idle';
    pathSegments = [];
    pathUndoSnapshot = null;
    vineDensity = 50;
    vineDecorSize = 14;
    vineRotationJitter = 30;
    vineMaxTurnPct = 100;
    vineOffshootDensity = 20;
    vineOffshootLength = 40;
    vineSizeJitter = 15;
    vineEnableDecorations = true;
    if(typeof updateVineFreehandUI === 'function') updateVineFreehandUI();

    // Reset Soften Settings
    softenType = 'edge';
    softenHardness = 100;
    if(typeof updateSoftenUI === 'function') updateSoftenUI();

    // Reset Fill Tool Settings
    fillMode = 'connected';
    fillTolerance = 0;
    document.querySelectorAll('input[name="fillMode"]').forEach(r => r.checked = (r.value === 'connected'));
    const fillTolSlider = document.getElementById('fillToleranceSlider'); if(fillTolSlider) fillTolSlider.value = 0;
    const fillTolVal = document.getElementById('fillToleranceVal'); if(fillTolVal) fillTolVal.textContent = '0';

    // Reset Gradient Ordered Settings
    gradientOrdered = false;
    gradientCycleLength = 200;
    gradientDabsPerColor = 1;
    gradientSequentialStepMode = 'distance';
    const gradOrdChk = document.getElementById('gradientOrderedCheckbox'); if(gradOrdChk) gradOrdChk.checked = false;
    if(typeof updateGradientOrderedVisibility === 'function') updateGradientOrderedVisibility();

    // Reset Jitter & Rotation Settings
    sizeJitterAmt = 0; sizeJitterMin = 100; sizeJitterMax = 100;
    dabWidthJitterMin = 100; dabWidthJitterMax = 100;
    dabHeightJitterMin = 100; dabHeightJitterMax = 100;
    opacityJitterAmt = 0; opacityJitterMin = 100; opacityJitterMax = 100;
    rotationJitterAmt = 0; rotationMode = 'range'; rotationAlgorithm = 'rotsprite'; rotationMinAngle = 0; rotationMaxAngle = 0;
    rotationRanges = [{ min: 0, max: 0 }];
    activeRotationRangeIndex = 0;
    sprayTargetAnchorX = null; sprayTargetAnchorY = null;
    spraySnapToGrid = false;
    spraySnapClearCell = false;

    const sjMin = document.getElementById('sizeJitterMinSlider'); if(sjMin) sjMin.value = 100;
    const sjMax = document.getElementById('sizeJitterMaxSlider'); if(sjMax) sjMax.value = 100;
    const sjVal = document.getElementById('sizeJitterVal'); if(sjVal) sjVal.textContent = '100% - 100%';
    updateDualRangeFill(sjMin, sjMax, document.getElementById('sizeJitterFill'));

    const dwjMin = document.getElementById('dabWidthJitterMinSlider'); if(dwjMin) dwjMin.value = 100;
    const dwjMax = document.getElementById('dabWidthJitterMaxSlider'); if(dwjMax) dwjMax.value = 100;
    const dwjVal = document.getElementById('dabWidthJitterVal'); if(dwjVal) dwjVal.textContent = '100% - 100%';
    updateDualRangeFill(dwjMin, dwjMax, document.getElementById('dabWidthJitterFill'));

    const dhjMin = document.getElementById('dabHeightJitterMinSlider'); if(dhjMin) dhjMin.value = 100;
    const dhjMax = document.getElementById('dabHeightJitterMaxSlider'); if(dhjMax) dhjMax.value = 100;
    const dhjVal = document.getElementById('dabHeightJitterVal'); if(dhjVal) dhjVal.textContent = '100% - 100%';
    updateDualRangeFill(dhjMin, dhjMax, document.getElementById('dabHeightJitterFill'));

    const ojMin = document.getElementById('opacityJitterMinSlider'); if(ojMin) ojMin.value = 100;
    const ojMax = document.getElementById('opacityJitterMaxSlider'); if(ojMax) ojMax.value = 100;
    const ojVal = document.getElementById('opacityJitterVal'); if(ojVal) ojVal.textContent = '100% - 100%';
    updateDualRangeFill(ojMin, ojMax, document.getElementById('opacityJitterFill'));

    const snapChk = document.getElementById('spraySnapGridCheckbox'); if(snapChk) snapChk.checked = false;
    const snapClearChk = document.getElementById('spraySnapClearCellCheckbox'); if(snapClearChk) snapClearChk.checked = false;
    if(typeof updateSpraySnapGridUI === 'function') updateSpraySnapGridUI();

    const rmEl = document.getElementById('rotationModeSelect'); if(rmEl) rmEl.value = 'range';
    const raEl = document.getElementById('rotationAlgorithmSelect'); if(raEl) raEl.value = 'rotsprite';
    const rminEl = document.getElementById('rotationMinValInput'); if(rminEl) rminEl.value = 0;
    const rmaxEl = document.getElementById('rotationMaxValInput'); if(rmaxEl) rmaxEl.value = 0;
    if(typeof drawRotationDial === 'function') drawRotationDial();
    if(typeof updateSprayAnchorUI === 'function') updateSprayAnchorUI();

    // Reset Tool Buttons UI
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === 'spray'));

    fitCanvasToScreen(true);
    centerCanvas();
    fitSidePanelToPalette();
    render();
  }

  newProjCreateBtn.addEventListener('click', async ()=>{
    const w = Math.max(1, Math.min(8192, parseInt(newProjWidthInput.value) || 512));
    const h = Math.max(1, Math.min(8192, parseInt(newProjHeightInput.value) || 512));
    closeNewProjectModal();
    await resetProjectToDefaults(w, h);
  });

  function cropProjectToSelection(){
    if(!selection || selection.w < 1 || selection.h < 1){
      showToast('Make a selection first (Select tool), then Crop to Selection uses it as the new project bounds.');
      return;
    }
    showConfirmDialog({
      title: 'Crop to Selection',
      message: 'This crops EVERY layer in EVERY frame to the current selection, resizing the whole project. This cannot be undone. Continue?',
      confirmText: 'Crop Project',
      danger: true
    }, () => {
      anchorFloatingSelection(); // commit any pending floating move first
      if(!frames || frames.length === 0){
        frames = [makeFrame('Frame ' + frameIdCounter, layers, activeLayer)];
        currentFrameIndex = 0;
      }
      captureCurrentFrameState();
      const sx = selection.x, sy = selection.y, sw = selection.w, sh = selection.h;
      function cropCanvas(srcCanvas){
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        if(srcCanvas) ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
        return c;
      }
      frames.forEach(frame=>{
        if(!frame.layers) return;
        frame.layers.forEach(layer=>{
          const srcColor = layer.colorCanvas || layer.canvas;
          const newColor = cropCanvas(srcColor);
          layer.colorCanvas = newColor;
          layer.colorCtx = newColor.getContext('2d', { willReadFrequently: true });
          if(layer.heightCanvas){
            const newHeight = cropCanvas(layer.heightCanvas);
            layer.heightCanvas = newHeight;
            layer.heightCtx = newHeight.getContext('2d', { willReadFrequently: true });
          }
          if(layer.roughnessCanvas){
            const newRoughness = cropCanvas(layer.roughnessCanvas);
            layer.roughnessCanvas = newRoughness;
            layer.roughnessCtx = newRoughness.getContext('2d', { willReadFrequently: true });
          }
          layer.canvas = layer.colorCanvas;
          layer.ctx = layer.colorCtx;
        });
        frame.undoStack = [];
        frame.redoStack = [];
      });
      W = sw; H = sh;
      resizeAllCanvasesToWH();
      syncDocCompositeCanvasSize();
      layers = frames[currentFrameIndex].layers;
      activeLayer = Math.min(frames[currentFrameIndex].activeLayer, layers.length-1);
      undoStack = frames[currentFrameIndex].undoStack;
      redoStack = frames[currentFrameIndex].redoStack;
      clearSelection();
      syncHeightEditSwap();
      fitCanvasToScreen(true);
      centerCanvas();
      drawGridOverlay();
      refreshLayerPanel();
      refreshFramesPanel();
      if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
      render();
      showToast('Project cropped to ' + sw + '\u00d7' + sh);
    });
  }
  document.getElementById('cropToSelectionBtn').addEventListener('click', cropProjectToSelection);

  let scaleProjectAnchorRow = 1, scaleProjectAnchorCol = 1; // default: center
  function computeAnchorOffset(anchorRow, anchorCol, oldW, oldH, newW, newH){
    const dw = newW - oldW, dh = newH - oldH;
    const dx = anchorCol === 0 ? 0 : (anchorCol === 1 ? Math.round(dw/2) : dw);
    const dy = anchorRow === 0 ? 0 : (anchorRow === 1 ? Math.round(dh/2) : dh);
    return {dx, dy};
  }
  function updateScaleProjectUIState(){
    const scaleContentCheckbox = document.getElementById('scaleProjectScaleContent');
    const scaleContent = scaleContentCheckbox ? scaleContentCheckbox.checked : true;
    const anchorGrid = document.getElementById('scaleProjectAnchorGrid');
    const anchorHint = document.getElementById('scaleProjectAnchorHint');
    const anchorLabel = anchorGrid ? anchorGrid.previousElementSibling : null;
    if(anchorGrid){
      anchorGrid.style.opacity = scaleContent ? '0.35' : '1';
      anchorGrid.style.pointerEvents = scaleContent ? 'none' : 'auto';
    }
    if(anchorHint) anchorHint.style.opacity = scaleContent ? '0.35' : '1';
    if(anchorLabel && anchorLabel.classList.contains('field')) anchorLabel.style.opacity = scaleContent ? '0.35' : '1';
  }
  document.getElementById('scaleProjectScaleContent')?.addEventListener('change', updateScaleProjectUIState);

  function buildScaleProjectAnchorGrid(){
    const grid = document.getElementById('scaleProjectAnchorGrid');
    if(!grid) return;
    grid.innerHTML = '';
    for(let row=0; row<3; row++){
      for(let col=0; col<3; col++){
        const btn = document.createElement('button');
        btn.className = 'shape-btn' + (row===scaleProjectAnchorRow && col===scaleProjectAnchorCol ? ' active' : '');
        btn.style.padding = '0';
        btn.textContent = (row===1 && col===1) ? '\u25cf' : '';
        btn.addEventListener('click', ()=>{
          scaleProjectAnchorRow = row; scaleProjectAnchorCol = col;
          buildScaleProjectAnchorGrid();
        });
        grid.appendChild(btn);
      }
    }
  }
  function openScaleProjectPopup(){
    document.getElementById('scaleProjectWidth').value = W;
    document.getElementById('scaleProjectHeight').value = H;
    scaleProjectAnchorRow = 1; scaleProjectAnchorCol = 1;
    buildScaleProjectAnchorGrid();
    updateScaleProjectUIState();
    const popup = document.getElementById('scaleProjectPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closeScaleProjectPopup(){
    document.getElementById('scaleProjectPopup').style.display = 'none';
  }
  document.getElementById('scaleProjectBtn').addEventListener('click', openScaleProjectPopup);
  document.getElementById('scaleProjectCancelBtn').addEventListener('click', closeScaleProjectPopup);

  // Flip & Rotate Operations
  function flipCanvas(canvas, horizontal) {
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tctx = temp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(canvas, 0, 0);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (horizontal) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(temp, 0, 0);
    ctx.restore();
  }

  function rotateCanvas90(canvas, cw) {
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tctx = temp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(canvas, 0, 0);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(cw ? Math.PI / 2 : -Math.PI / 2);
    ctx.drawImage(temp, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();
  }

  function rotateCanvasProject90(canvas, cw) {
    const oldW = canvas.width;
    const oldH = canvas.height;
    const newW = oldH;
    const newH = oldW;

    const temp = document.createElement('canvas');
    temp.width = oldW;
    temp.height = oldH;
    const tctx = temp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(canvas, 0, 0);

    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, newW, newH);
    ctx.save();
    if (cw) {
      ctx.translate(newW, 0);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, newH);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(temp, 0, 0);
    ctx.restore();
  }

  function flipActiveLayer(horizontal) {
    const layer = layers[activeLayer];
    if (!layer) return;
    pushHistory();
    flipCanvas(layer.colorCanvas || layer.canvas, horizontal);
    if (layer.heightCanvas) flipCanvas(layer.heightCanvas, horizontal);
    if (layer.roughnessCanvas) flipCanvas(layer.roughnessCanvas, horizontal);
    render();
    refreshLayerPanel();
  }

  function rotateActiveLayer(cw) {
    const layer = layers[activeLayer];
    if (!layer) return;
    pushHistory();
    rotateCanvas90(layer.colorCanvas || layer.canvas, cw);
    if (layer.heightCanvas) rotateCanvas90(layer.heightCanvas, cw);
    if (layer.roughnessCanvas) rotateCanvas90(layer.roughnessCanvas, cw);
    render();
    refreshLayerPanel();
  }

  function flipProject(horizontal) {
    pushHistory();
    frames.forEach(frame => {
      if (!frame.layers) return;
      frame.layers.forEach(layer => {
        flipCanvas(layer.colorCanvas || layer.canvas, horizontal);
        if (layer.heightCanvas) flipCanvas(layer.heightCanvas, horizontal);
        if (layer.roughnessCanvas) flipCanvas(layer.roughnessCanvas, horizontal);
      });
    });
    render();
    refreshLayerPanel();
  }

  function rotateProject90(cw) {
    pushHistory();
    const oldW = W;
    const oldH = H;
    const newW = oldH;
    const newH = oldW;

    frames.forEach(frame => {
      if (!frame.layers) return;
      frame.layers.forEach(layer => {
        rotateCanvasProject90(layer.colorCanvas || layer.canvas, cw);
        layer.colorCtx = (layer.colorCanvas || layer.canvas).getContext('2d', { willReadFrequently: true });
        if (layer.heightCanvas) {
          rotateCanvasProject90(layer.heightCanvas, cw);
          layer.heightCtx = layer.heightCanvas.getContext('2d', { willReadFrequently: true });
        }
        if (layer.roughnessCanvas) {
          rotateCanvasProject90(layer.roughnessCanvas, cw);
          layer.roughnessCtx = layer.roughnessCanvas.getContext('2d', { willReadFrequently: true });
        }
        layer.canvas = layer.colorCanvas || layer.canvas;
        layer.ctx = layer.colorCtx;
      });
    });

    W = newW;
    H = newH;
    resizeAllCanvasesToWH();
    syncDocCompositeCanvasSize();
    clearSelection();
    syncHeightEditSwap();
    fitCanvasToScreen(true);
    centerCanvas();
    drawGridOverlay();
    refreshLayerPanel();
    refreshFramesPanel();
    render();
  }

  document.getElementById('flipLayerHBtn')?.addEventListener('click', () => flipActiveLayer(true));
  document.getElementById('flipLayerVBtn')?.addEventListener('click', () => flipActiveLayer(false));
  document.getElementById('rotateLayer90CWBtn')?.addEventListener('click', () => rotateActiveLayer(true));
  document.getElementById('rotateLayer90CCWBtn')?.addEventListener('click', () => rotateActiveLayer(false));

  document.getElementById('flipProjectHBtn')?.addEventListener('click', () => flipProject(true));
  document.getElementById('flipProjectVBtn')?.addEventListener('click', () => flipProject(false));
  document.getElementById('rotateProject90CWBtn')?.addEventListener('click', () => rotateProject90(true));
  document.getElementById('rotateProject90CCWBtn')?.addEventListener('click', () => rotateProject90(false));
  document.getElementById('scaleProjectWidth').addEventListener('input', e=>{
    if(document.getElementById('scaleProjectLockAspect').checked){
      const newW = +e.target.value || W;
      document.getElementById('scaleProjectHeight').value = Math.round(newW * (H/W));
    }
  });
  document.getElementById('scaleProjectHeight').addEventListener('input', e=>{
    if(document.getElementById('scaleProjectLockAspect').checked){
      const newH = +e.target.value || H;
      document.getElementById('scaleProjectWidth').value = Math.round(newH * (W/H));
    }
  });
  document.getElementById('scaleProjectApplyBtn').addEventListener('click', ()=>{
    const newW = Math.max(1, parseInt(document.getElementById('scaleProjectWidth').value) || W);
    const newH = Math.max(1, parseInt(document.getElementById('scaleProjectHeight').value) || H);
    const scaleContent = document.getElementById('scaleProjectScaleContent').checked;
    if(newW === W && newH === H){ closeScaleProjectPopup(); return; }
    showConfirmDialog({
      title: 'Scale Project',
      message: 'This resizes EVERY layer in EVERY frame to ' + newW + '×' + newH + '. This cannot be undone. Continue?',
      confirmText: 'Scale Project',
      danger: true
    }, () => {
      anchorFloatingSelection();
      if(!frames || frames.length === 0){
        frames = [makeFrame('Frame ' + frameIdCounter, layers, activeLayer)];
        currentFrameIndex = 0;
      }
      captureCurrentFrameState();

      const oldW = W;
      const oldH = H;

      function transformCanvas(srcCanvas){
        const c = document.createElement('canvas');
        c.width = newW; c.height = newH;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        if(ctx.mozImageSmoothingEnabled !== undefined) ctx.mozImageSmoothingEnabled = false;
        if(ctx.webkitImageSmoothingEnabled !== undefined) ctx.webkitImageSmoothingEnabled = false;
        if(ctx.msImageSmoothingEnabled !== undefined) ctx.msImageSmoothingEnabled = false;

        if(!srcCanvas) return c;

        if(scaleContent){
          const sW = srcCanvas.width || oldW;
          const sH = srcCanvas.height || oldH;
          if(sW > 0 && sH > 0){
            const sCtx = srcCanvas.getContext ? srcCanvas.getContext('2d', { willReadFrequently: true }) : null;
            if(sCtx){
              const sData = sCtx.getImageData(0, 0, sW, sH);
              const s32 = new Uint32Array(sData.data.buffer);
              const dData = ctx.createImageData(newW, newH);
              const d32 = new Uint32Array(dData.data.buffer);
              for(let dy = 0; dy < newH; dy++){
                const sy = Math.min(sH - 1, Math.floor((dy + 0.5) * sH / newH));
                const sRow = sy * sW;
                const dRow = dy * newW;
                for(let dx = 0; dx < newW; dx++){
                  const sx = Math.min(sW - 1, Math.floor((dx + 0.5) * sW / newW));
                  d32[dRow + dx] = s32[sRow + sx];
                }
              }
              ctx.putImageData(dData, 0, 0);
            } else {
              ctx.drawImage(srcCanvas, 0, 0, newW, newH);
            }
          }
        } else {
          const {dx, dy} = computeAnchorOffset(scaleProjectAnchorRow, scaleProjectAnchorCol, oldW, oldH, newW, newH);
          ctx.drawImage(srcCanvas, dx, dy);
        }
        return c;
      }

      frames.forEach(frame=>{
        if(!frame.layers) return;
        frame.layers.forEach(layer=>{
          const srcColor = layer.colorCanvas || layer.canvas;
          const newColor = transformCanvas(srcColor);
          layer.colorCanvas = newColor;
          layer.colorCtx = newColor.getContext('2d', { willReadFrequently: true });
          if(layer.heightCanvas){
            const newHeight = transformCanvas(layer.heightCanvas);
            layer.heightCanvas = newHeight;
            layer.heightCtx = newHeight.getContext('2d', { willReadFrequently: true });
          }
          if(layer.roughnessCanvas){
            const newRoughness = transformCanvas(layer.roughnessCanvas);
            layer.roughnessCanvas = newRoughness;
            layer.roughnessCtx = newRoughness.getContext('2d', { willReadFrequently: true });
          }
          layer.canvas = layer.colorCanvas;
          layer.ctx = layer.colorCtx;
        });
        frame.undoStack = [];
        frame.redoStack = [];
      });

      W = newW; H = newH;
      resizeAllCanvasesToWH();
      syncDocCompositeCanvasSize();
      layers = frames[currentFrameIndex].layers;
      activeLayer = Math.min(frames[currentFrameIndex].activeLayer, layers.length-1);
      undoStack = frames[currentFrameIndex].undoStack;
      redoStack = frames[currentFrameIndex].redoStack;
      clearSelection();
      syncHeightEditSwap();
      fitCanvasToScreen(true);
      centerCanvas();
      drawGridOverlay();
      refreshLayerPanel();
      refreshFramesPanel();
      if(typeof refreshMatrixTimeline === 'function') refreshMatrixTimeline();
      render();
      closeScaleProjectPopup();
      showToast('Project resized to ' + newW + '×' + newH);
    });
  });

  function ensureSelectionLifted(){
    if(!selection || selection.w < 1 || selection.h < 1) return false;
    if(floatingSelection && floatingSelection.x === selection.x && floatingSelection.y === selection.y &&
       floatingSelection.w === selection.w && floatingSelection.h === selection.h){
      return true; // already floating and matches the current selection
    }
    if(!layers[activeLayer] || !layers[activeLayer].visible) return false;
    pushHistory();
    const sel = selection;
    const lifted = document.createElement('canvas');
    lifted.width = sel.w; lifted.height = sel.h;
    lifted.getContext('2d', { willReadFrequently: true }).drawImage(layers[activeLayer].canvas, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h);
    layers[activeLayer].ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
    floatingSelection = { canvas: lifted, x: sel.x, y: sel.y, w: sel.w, h: sel.h };
    return true;
  }

  function flipSelection(horizontal){
    if(!selection || selection.w < 1 || selection.h < 1){
      if(typeof showToast === 'function') showToast('Make a selection first');
      return;
    }
    if(!ensureSelectionLifted()) return;
    flipCanvas(floatingSelection.canvas, horizontal);
    render();
    drawSelectionOverlay();
    if(typeof showToast === 'function') showToast('Selection flipped ' + (horizontal ? 'horizontally' : 'vertically'));
  }

  function rotateSelection(cw){
    if(!selection || selection.w < 1 || selection.h < 1){
      if(typeof showToast === 'function') showToast('Make a selection first');
      return;
    }
    if(!ensureSelectionLifted()) return;

    const oldW = floatingSelection.canvas.width;
    const oldH = floatingSelection.canvas.height;
    const newW = oldH;
    const newH = oldW;

    const rotated = document.createElement('canvas');
    rotated.width = newW;
    rotated.height = newH;
    const rctx = rotated.getContext('2d', { willReadFrequently: true });
    rctx.save();
    if(cw){
      rctx.translate(newW, 0);
      rctx.rotate(Math.PI / 2);
    } else {
      rctx.translate(0, newH);
      rctx.rotate(-Math.PI / 2);
    }
    rctx.drawImage(floatingSelection.canvas, 0, 0);
    rctx.restore();

    floatingSelection.canvas = rotated;
    floatingSelection.w = newW;
    floatingSelection.h = newH;
    selection.w = newW;
    selection.h = newH;

    render();
    drawSelectionOverlay();
    if(typeof showToast === 'function') showToast('Selection rotated 90° ' + (cw ? 'CW' : 'CCW'));
  }

  document.getElementById('flipSelectionHBtn')?.addEventListener('click', () => flipSelection(true));
  document.getElementById('flipSelectionVBtn')?.addEventListener('click', () => flipSelection(false));
  document.getElementById('rotateSelection90CWBtn')?.addEventListener('click', () => rotateSelection(true));
  document.getElementById('rotateSelection90CCWBtn')?.addEventListener('click', () => rotateSelection(false));

  document.getElementById('selectFlipHBtn')?.addEventListener('click', () => flipSelection(true));
  document.getElementById('selectFlipVBtn')?.addEventListener('click', () => flipSelection(false));
  document.getElementById('selectRotateCWBtn')?.addEventListener('click', () => rotateSelection(true));
  document.getElementById('selectRotateCCWBtn')?.addEventListener('click', () => rotateSelection(false));

  function openScaleSelectionPopup(){
    if(!selection || selection.w < 1 || selection.h < 1){
      alert('Make a selection first.');
      return;
    }
    document.getElementById('scaleSelectionWidth').value = selection.w;
    document.getElementById('scaleSelectionHeight').value = selection.h;
    const popup = document.getElementById('scaleSelectionPopup');
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, (window.innerWidth - popupRect.width)/2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - popupRect.height)/2) + 'px';
  }
  function closeScaleSelectionPopup(){
    document.getElementById('scaleSelectionPopup').style.display = 'none';
  }
  document.getElementById('scaleSelectionBtn')?.addEventListener('click', openScaleSelectionPopup);
  document.getElementById('menuScaleSelectionBtn')?.addEventListener('click', openScaleSelectionPopup);
  document.getElementById('scaleSelectionCancelBtn')?.addEventListener('click', closeScaleSelectionPopup);
  document.getElementById('scaleSelectionWidth').addEventListener('input', e=>{
    if(document.getElementById('scaleSelectionLockAspect').checked && selection){
      const newW = +e.target.value || selection.w;
      document.getElementById('scaleSelectionHeight').value = Math.round(newW * (selection.h/selection.w));
    }
  });
  document.getElementById('scaleSelectionHeight').addEventListener('input', e=>{
    if(document.getElementById('scaleSelectionLockAspect').checked && selection){
      const newH = +e.target.value || selection.h;
      document.getElementById('scaleSelectionWidth').value = Math.round(newH * (selection.w/selection.h));
    }
  });
  document.getElementById('scaleSelectionApplyBtn').addEventListener('click', ()=>{
    if(!selection) return;
    const newW = Math.max(1, parseInt(document.getElementById('scaleSelectionWidth').value) || selection.w);
    const newH = Math.max(1, parseInt(document.getElementById('scaleSelectionHeight').value) || selection.h);
    if(!ensureSelectionLifted()){
      alert('Could not scale the selection.');
      return;
    }
    const scaled = document.createElement('canvas');
    scaled.width = newW; scaled.height = newH;
    const scaledCtx = scaled.getContext('2d', { willReadFrequently: true });
    scaledCtx.imageSmoothingEnabled = false;
    if(scaledCtx.mozImageSmoothingEnabled !== undefined) scaledCtx.mozImageSmoothingEnabled = false;
    if(scaledCtx.webkitImageSmoothingEnabled !== undefined) scaledCtx.webkitImageSmoothingEnabled = false;
    if(scaledCtx.msImageSmoothingEnabled !== undefined) scaledCtx.msImageSmoothingEnabled = false;

    const sW = floatingSelection.w;
    const sH = floatingSelection.h;
    const sCtx = floatingSelection.canvas.getContext ? floatingSelection.canvas.getContext('2d', { willReadFrequently: true }) : null;
    if(sCtx && sW > 0 && sH > 0){
      const sData = sCtx.getImageData(0, 0, sW, sH);
      const s32 = new Uint32Array(sData.data.buffer);
      const dData = scaledCtx.createImageData(newW, newH);
      const d32 = new Uint32Array(dData.data.buffer);
      for(let dy = 0; dy < newH; dy++){
        const sy = Math.min(sH - 1, Math.floor((dy + 0.5) * sH / newH));
        const sRow = sy * sW;
        const dRow = dy * newW;
        for(let dx = 0; dx < newW; dx++){
          const sx = Math.min(sW - 1, Math.floor((dx + 0.5) * sW / newW));
          d32[dRow + dx] = s32[sRow + sx];
        }
      }
      scaledCtx.putImageData(dData, 0, 0);
    } else {
      scaledCtx.drawImage(floatingSelection.canvas, 0, 0, floatingSelection.w, floatingSelection.h, 0, 0, newW, newH);
    }

    floatingSelection.canvas = scaled;
    floatingSelection.w = newW;
    floatingSelection.h = newH;
    selection = { x: floatingSelection.x, y: floatingSelection.y, w: newW, h: newH };
    drawSelectionOverlay();
    render();
    closeScaleSelectionPopup();
  });


  function sanitizeFilename(name){
    const trimmed = (name || '').trim() || 'Untitled';
    return trimmed.replace(/[\\/:*?"<>|]/g, '_');
  }
  function projectName(){
    return sanitizeFilename(document.getElementById('projectNameInput').value);
  }

  // ---------- Texture Maps Export Helpers (Color, Height, Roughness) ----------
  function getAutoHeightCanvas(layer) {
    if (!layer) return null;
    if (layer.heightCanvas) return layer.heightCanvas;
    const colCanvas = layer.colorCanvas || layer.canvas;
    if (!colCanvas) return null;
    const hc = document.createElement('canvas');
    hc.width = W; hc.height = H;
    const hctx = hc.getContext('2d', { willReadFrequently: true });
    const colCtx = colCanvas.getContext ? colCanvas.getContext('2d', { willReadFrequently: true }) : null;
    if (!colCtx) return null;
    const imgData = colCtx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const hImgData = hctx.createImageData(W, H);
    const hd = hImgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      hd[i] = lum; hd[i + 1] = lum; hd[i + 2] = lum; hd[i + 3] = data[i + 3];
    }
    hctx.putImageData(hImgData, 0, 0);
    return hc;
  }

  function getAutoRoughnessCanvas(layer) {
    if (!layer) return null;
    if (layer.roughnessCanvas) return layer.roughnessCanvas;
    const colCanvas = layer.colorCanvas || layer.canvas;
    if (!colCanvas) return null;
    const rc = document.createElement('canvas');
    rc.width = W; rc.height = H;
    const rctx = rc.getContext('2d', { willReadFrequently: true });
    const colCtx = colCanvas.getContext ? colCanvas.getContext('2d', { willReadFrequently: true }) : null;
    if (!colCtx) return null;
    const imgData = colCtx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const rImgData = rctx.createImageData(W, H);
    const rd = rImgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        rd[i] = 255; rd[i + 1] = 255; rd[i + 2] = 255; rd[i + 3] = 0;
        continue;
      }
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const roughnessVal = Math.max(0, Math.min(255, Math.round(255 - lum * 0.8)));
      rd[i] = roughnessVal; rd[i + 1] = roughnessVal; rd[i + 2] = roughnessVal; rd[i + 3] = data[i + 3];
    }
    rctx.putImageData(rImgData, 0, 0);
    return rc;
  }

  function buildCompositeExportCanvas(type = 'color', targetLayers = null) {
    const list = targetLayers || layers.filter(l => l.visible);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    list.forEach(l => {
      if (!l.visible) return;
      ctx.globalAlpha = l.opacity / 100;
      if (type === 'height') {
        const hc = getAutoHeightCanvas(l);
        if (hc) ctx.drawImage(hc, 0, 0);
      } else if (type === 'roughness') {
        const rc = getAutoRoughnessCanvas(l);
        if (rc) ctx.drawImage(rc, 0, 0);
      } else {
        const sc = l.colorCanvas || l.canvas;
        if (sc) ctx.drawImage(sc, 0, 0);
      }
    });
    ctx.globalAlpha = 1;
    return c;
  }

  function buildSpriteSheetExportCanvas(type = 'color') {
    captureCurrentFrameState();
    const sheet = document.createElement('canvas');
    sheet.width = W * frames.length;
    sheet.height = H;
    const sctx = sheet.getContext('2d', { willReadFrequently: true });
    frames.forEach((f, i) => {
      (f.layers || []).forEach(l => {
        if (!l.visible) return;
        sctx.globalAlpha = l.opacity / 100;
        if (type === 'height') {
          const hc = getAutoHeightCanvas(l);
          if (hc) sctx.drawImage(hc, i * W, 0);
        } else if (type === 'roughness') {
          const rc = getAutoRoughnessCanvas(l);
          if (rc) sctx.drawImage(rc, i * W, 0);
        } else {
          const sc = l.colorCanvas || l.canvas;
          if (sc) sctx.drawImage(sc, i * W, 0);
        }
      });
    });
    sctx.globalAlpha = 1;
    return sheet;
  }

  async function saveCanvasAsPng(canvas, defaultFilename, description = 'PNG Image') {
    try {
      const blob = await getCanvasBlob(canvas, 'image/png');
      const res = await saveBlobWithPrompt(blob, defaultFilename, [
        { description, accept: { 'image/png': ['.png'] } }
      ]);
      if (res && res.success) {
        showToast(`Exported "${res.name}"`);
        return true;
      }
    } catch (err) {
      console.warn('saveBlobWithPrompt failed or was aborted:', err);
    }
    try {
      const blob = await getCanvasBlob(canvas, 'image/png');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = defaultFilename;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`Exported "${defaultFilename}"`);
      return true;
    } catch (e) {
      const link = document.createElement('a');
      link.download = defaultFilename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(`Exported "${defaultFilename}"`);
      return true;
    }
  }

  async function exportFlattenedPNG() {
    render();
    const c = buildCompositeExportCanvas('color');
    await saveCanvasAsPng(c, projectName() + '.png', 'PNG Color Image');
  }

  async function exportSingleMap(type = 'height', forActiveLayerOnly = false) {
    render();
    const pName = projectName();
    let canvasToExport = null;
    let filename = '';

    if (forActiveLayerOnly) {
      const l = layers[activeLayer];
      if (!l) return;
      const safeName = sanitizeFilename(l.name) || ('Layer' + (activeLayer + 1));
      if (type === 'height') {
        canvasToExport = getAutoHeightCanvas(l);
        filename = `${pName}_${safeName}_height.png`;
      } else if (type === 'roughness') {
        canvasToExport = getAutoRoughnessCanvas(l);
        filename = `${pName}_${safeName}_roughness.png`;
      } else {
        canvasToExport = l.colorCanvas || l.canvas;
        filename = `${pName}_${safeName}.png`;
      }
    } else {
      if (type === 'height') {
        canvasToExport = buildCompositeExportCanvas('height');
        filename = `${pName}_height.png`;
      } else if (type === 'roughness') {
        canvasToExport = buildCompositeExportCanvas('roughness');
        filename = `${pName}_roughness.png`;
      } else {
        canvasToExport = buildCompositeExportCanvas('color');
        filename = `${pName}.png`;
      }
    }

    if (canvasToExport) {
      await saveCanvasAsPng(canvasToExport, filename, `${type === 'height' ? 'Heightmap' : type === 'roughness' ? 'Roughness Map' : 'Color Map'} PNG`);
    }
  }

  async function exportLayersSeparately(visibleLayers, includeColor = true, includeHeight = false, includeRoughness = false) {
    const pName = projectName();
    const filesToSave = [];

    visibleLayers.forEach((l, i) => {
      const safeName = sanitizeFilename(l.name) || ('Layer' + (i + 1));
      if (includeColor) {
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        const tctx = tmp.getContext('2d', { willReadFrequently: true });
        tctx.globalAlpha = l.opacity / 100;
        const sc = l.colorCanvas || l.canvas;
        if (sc) tctx.drawImage(sc, 0, 0);
        filesToSave.push({
          filename: `${pName}_${safeName}.png`,
          canvas: tmp
        });
      }
      if (includeHeight) {
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        const tctx = tmp.getContext('2d', { willReadFrequently: true });
        tctx.globalAlpha = l.opacity / 100;
        const hc = getAutoHeightCanvas(l);
        if (hc) tctx.drawImage(hc, 0, 0);
        filesToSave.push({
          filename: `${pName}_${safeName}_height.png`,
          canvas: tmp
        });
      }
      if (includeRoughness) {
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        const tctx = tmp.getContext('2d', { willReadFrequently: true });
        tctx.globalAlpha = l.opacity / 100;
        const rc = getAutoRoughnessCanvas(l);
        if (rc) tctx.drawImage(rc, 0, 0);
        filesToSave.push({
          filename: `${pName}_${safeName}_roughness.png`,
          canvas: tmp
        });
      }
    });

    if (filesToSave.length === 0) {
      showToast('No maps selected to export.');
      return;
    }

    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        showToast(`Exporting ${filesToSave.length} files to folder...`);
        let savedCount = 0;
        for (let i = 0; i < filesToSave.length; i++) {
          const item = filesToSave[i];
          const blob = await getCanvasBlob(item.canvas, 'image/png');
          const fileHandle = await dirHandle.getFileHandle(item.filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          savedCount++;
        }
        showToast(`Exported ${savedCount} files to "${dirHandle.name}"`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Directory picker failed or was denied, falling back:', err);
      }
    }

    // Fallback: staggered downloads
    filesToSave.forEach((item, idx) => {
      setTimeout(async () => {
        try {
          const blob = await getCanvasBlob(item.canvas, 'image/png');
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = item.filename;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (e) {
          const link = document.createElement('a');
          link.download = item.filename;
          link.href = item.canvas.toDataURL('image/png');
          link.click();
        }
      }, idx * 150);
    });
    showToast(`Exporting ${filesToSave.length} files...`);
  }

  // ---------- Export Modal Controller ----------
  let currentExportPreviewTab = 'color';

  function updateExportModalFilenames() {
    const pName = projectName();
    const fCol = document.getElementById('exportFilenameColor');
    const fH = document.getElementById('exportFilenameHeight');
    const fR = document.getElementById('exportFilenameRoughness');
    if (fCol) fCol.textContent = `${pName}.png`;
    if (fH) fH.textContent = `${pName}_height.png`;
    if (fR) fR.textContent = `${pName}_roughness.png`;
  }

  function updateExportModalPreview(tab = 'color') {
    currentExportPreviewTab = tab;
    const btnColor = document.getElementById('exportPreviewTabColor');
    const btnH = document.getElementById('exportPreviewTabHeight');
    const btnR = document.getElementById('exportPreviewTabRoughness');
    const label = document.getElementById('exportPreviewLabel');
    const prevCanvas = document.getElementById('exportModalPreviewCanvas');
    if (!prevCanvas) return;

    if (btnColor) btnColor.classList.toggle('primary', tab === 'color');
    if (btnH) btnH.classList.toggle('primary', tab === 'height');
    if (btnR) btnR.classList.toggle('primary', tab === 'roughness');

    if (label) {
      if (tab === 'color') label.textContent = 'Showing: Composite Color (Albedo) Map';
      else if (tab === 'height') label.textContent = 'Showing: Composite Height Map (Displacement)';
      else if (tab === 'roughness') label.textContent = 'Showing: Composite Roughness Map (Gloss/PBR)';
    }

    const compCanvas = buildCompositeExportCanvas(tab);
    prevCanvas.width = compCanvas.width;
    prevCanvas.height = compCanvas.height;
    const pctx = prevCanvas.getContext('2d', { willReadFrequently: true });
    pctx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
    pctx.drawImage(compCanvas, 0, 0);
  }

  function openExportModal(initialTab = 'color') {
    render();
    updateExportModalFilenames();

    // Check if project already has custom height/roughness painted
    const hasAnyHeight = layers.some(l => l && l.heightCanvas);
    const hasAnyRoughness = layers.some(l => l && l.roughnessCanvas);

    const cbColor = document.getElementById('exportIncludeColor');
    const cbHeight = document.getElementById('exportIncludeHeight');
    const cbRoughness = document.getElementById('exportIncludeRoughness');
    if (cbColor) cbColor.checked = true;
    if (cbHeight && !cbHeight._userTouched) cbHeight.checked = hasAnyHeight;
    if (cbRoughness && !cbRoughness._userTouched) cbRoughness.checked = hasAnyRoughness;

    updateExportModalPreview(initialTab);

    const overlay = document.getElementById('exportModalOverlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function closeExportModal() {
    const overlay = document.getElementById('exportModalOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  document.getElementById('exportModalCloseBtn')?.addEventListener('click', closeExportModal);
  document.getElementById('exportModalCancelBtn')?.addEventListener('click', closeExportModal);
  document.getElementById('exportModalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('exportModalOverlay')) {
      closeExportModal();
    }
  });

  document.getElementById('exportPreviewTabColor')?.addEventListener('click', () => updateExportModalPreview('color'));
  document.getElementById('exportPreviewTabHeight')?.addEventListener('click', () => updateExportModalPreview('height'));
  document.getElementById('exportPreviewTabRoughness')?.addEventListener('click', () => updateExportModalPreview('roughness'));

  document.getElementById('exportIncludeHeight')?.addEventListener('change', e => {
    e.target._userTouched = true;
    if (e.target.checked) updateExportModalPreview('height');
  });
  document.getElementById('exportIncludeRoughness')?.addEventListener('change', e => {
    e.target._userTouched = true;
    if (e.target.checked) updateExportModalPreview('roughness');
  });
  document.getElementById('exportIncludeColor')?.addEventListener('change', e => {
    if (e.target.checked) updateExportModalPreview('color');
  });

  document.getElementById('exportModalSubmitBtn')?.addEventListener('click', async () => {
    const includeColor = !!document.getElementById('exportIncludeColor')?.checked;
    const includeHeight = !!document.getElementById('exportIncludeHeight')?.checked;
    const includeRoughness = !!document.getElementById('exportIncludeRoughness')?.checked;

    if (!includeColor && !includeHeight && !includeRoughness) {
      showToast('Please select at least one map (Color, Height, or Roughness) to export.');
      return;
    }

    const targetMode = document.querySelector('input[name="exportTargetMode"]:checked')?.value || 'flattened';
    closeExportModal();

    const pName = projectName();

    if (targetMode === 'flattened') {
      const tasks = [];
      if (includeColor) tasks.push({ canvas: buildCompositeExportCanvas('color'), filename: `${pName}.png`, desc: 'Color Image' });
      if (includeHeight) tasks.push({ canvas: buildCompositeExportCanvas('height'), filename: `${pName}_height.png`, desc: 'Height Map' });
      if (includeRoughness) tasks.push({ canvas: buildCompositeExportCanvas('roughness'), filename: `${pName}_roughness.png`, desc: 'Roughness Map' });

      for (let i = 0; i < tasks.length; i++) {
        await saveCanvasAsPng(tasks[i].canvas, tasks[i].filename, tasks[i].desc);
      }
    } else if (targetMode === 'layers') {
      const visibleLayers = layers.filter(l => l.visible);
      await exportLayersSeparately(visibleLayers, includeColor, includeHeight, includeRoughness);
    } else if (targetMode === 'spritesheet') {
      if (includeColor) {
        const sc = buildSpriteSheetExportCanvas('color');
        await saveCanvasAsPng(sc, `${pName}_spritesheet.png`, 'Color Sprite Sheet');
      }
      if (includeHeight) {
        const hc = buildSpriteSheetExportCanvas('height');
        await saveCanvasAsPng(hc, `${pName}_spritesheet_height.png`, 'Height Sprite Sheet');
      }
      if (includeRoughness) {
        const rc = buildSpriteSheetExportCanvas('roughness');
        await saveCanvasAsPng(rc, `${pName}_spritesheet_roughness.png`, 'Roughness Sprite Sheet');
      }
    }
  });

  // Wire up File Menu and Sidebar Buttons
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    openExportModal('color');
  });
  document.getElementById('exportHeightBtn')?.addEventListener('click', () => {
    exportSingleMap('height', false);
  });
  document.getElementById('exportRoughnessBtn')?.addEventListener('click', () => {
    exportSingleMap('roughness', false);
  });
  document.getElementById('exportLayerHeightBtn')?.addEventListener('click', () => {
    exportSingleMap('height', true);
  });
  document.getElementById('exportLayerRoughnessBtn')?.addEventListener('click', () => {
    exportSingleMap('roughness', true);
  });

  async function exportSpriteSheet() {
    captureCurrentFrameState();
    const sheet = buildSpriteSheetExportCanvas('color');
    const filename = projectName() + '_spritesheet.png';
    await saveCanvasAsPng(sheet, filename, 'Sprite Sheet Image');
  }
  document.getElementById('exportSpriteSheetBtn').addEventListener('click', exportSpriteSheet);
  function exportAnimatedGif(){
    if(frames.length <= 1){
      alert('Add at least one more frame first — there\'s nothing to animate with just one.');
      return;
    }
    captureCurrentFrameState();
    try {
      showToast('Rendering GIF…');
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: getGifWorkerUrl(),
        width: W,
        height: H,
        background: '#ffffff'
      });
      const delayMs = Math.max(20, Math.round(1000/playbackFps));
      frames.forEach(f=>{
        // GIF has no true alpha blending (only fully opaque or fully transparent), so each
        // frame is flattened onto a white background first for predictable, artifact-free output.
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        const tctx = tmp.getContext('2d', { willReadFrequently: true });
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, W, H);
        f.layers.forEach(l=>{
          if(!l.visible) return;
          tctx.globalAlpha = l.opacity/100;
          tctx.drawImage(l.canvas, 0, 0);
        });
        tctx.globalAlpha = 1;
        gif.addFrame(tmp, {delay: delayMs, copy: true});
      });
      gif.on('finished', async blob=>{
        const filename = projectName() + '.gif';
        try {
          const res = await saveBlobWithPrompt(blob, filename, [
            { description: 'GIF Animation', accept: { 'image/gif': ['.gif'] } }
          ]);
          if (res.success) {
            showToast(`Exported "${res.name}"`);
          }
        } catch(err) {
          console.error('Error exporting GIF:', err);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = filename;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          showToast('GIF exported');
        }
      });
      gif.render();
    } catch(err){
      console.error(err);
      alert('Could not render the animated GIF. Your browser may not support a feature gif.js needs (Web Workers).');
    }
  }
  document.getElementById('exportGifBtn').addEventListener('click', exportAnimatedGif);

  // ---------- Project save/load (everything: layers, palette, gradients, stamps, saved palettes, grids, tool settings) ----------
  function buildProjectData(){
    captureCurrentFrameState();
    return {
      type: 'palette-spray-studio-project',
      version: 6,
      name: document.getElementById('projectNameInput').value,
      autoFullscreen,
      backupsEnabled: !!backupDirHandle,
      width: W,
      height: H,
      onionSkinEnabled,
      onionSkinOpacity,
      activeLayer,
      layers: layers.map(l=>({
        name:l.name, visible:l.visible, locked:!!l.locked, opacity:l.opacity, data:l.colorCanvas.toDataURL(),
        heightData: l.heightCanvas ? l.heightCanvas.toDataURL() : null,
        roughnessData: l.roughnessCanvas ? l.roughnessCanvas.toDataURL() : null
      })),
      currentFrameIndex,
      frames: frames.map(f => ({
        name: f.name,
        activeLayer: f.activeLayer,
        layers: f.layers.map(l=>({
          name:l.name, visible:l.visible, locked:!!l.locked, opacity:l.opacity, data:l.colorCanvas.toDataURL(),
          heightData: l.heightCanvas ? l.heightCanvas.toDataURL() : null,
          roughnessData: l.roughnessCanvas ? l.roughnessCanvas.toDataURL() : null
        }))
      })),
      groups: groups.map(g => g.isMain
        ? {id:g.id, name:g.name, isMain:true, colors:g.colors.map(c=>({id:c.id, hex:c.hex, name:c.name||''})), collapsed:g.collapsed, columns:g.columns}
        : {id:g.id, name:g.name, isMain:false, colorRefs:[...g.colorRefs], collapsed:g.collapsed, columns:g.columns}
      ),
      selectedColors: [...selectedColors],
      gradients: gradients.map(g=>({name:g.name, stops:[...g.stops]})),
      stamps: stamps.map(s=>({
        name:s.name,
        mask:s.mask.toDataURL(),
        w:s.mask.width,
        h:s.mask.height,
        inverted:!!s.inverted,
        pivotX: (s.pivotX !== undefined ? s.pivotX : 0.5),
        pivotY: (s.pivotY !== undefined ? s.pivotY : 0.5),
        isSvg: !!s.isSvg,
        svgString: s.svgString || null,
        svgLineWidth: s.svgLineWidth !== undefined ? s.svgLineWidth : null,
        svgNoFill: s.svgNoFill !== undefined ? !!s.svgNoFill : null
      })),
      grids: grids.map(g=>({...g})),
      gridMasterOn,
      sprayPresets: sprayPresets.map(p=>({
        id: p.id,
        name: p.name,
        builtin: !!p.builtin,
        savedSettings: p.savedSettings ? JSON.parse(JSON.stringify(p.savedSettings)) : JSON.parse(JSON.stringify(p.settings)),
        settings: JSON.parse(JSON.stringify(p.settings))
      })),
      activeSprayPresetId: activeSprayPresetId,
      tool: {
        tool, brushSize, opacity, sourceKind, selectedGradientIndex, selectedStampIndex,
        dabShape, brushShape, brushMode, sprayMode, softenType, softenHardness, density, dabSize, dabWidth, dabHeight, dabLockAspect,
        sizeJitterAmt, sizeJitterMin, sizeJitterMax, dabWidthJitterMin, dabWidthJitterMax, dabHeightJitterMin, dabHeightJitterMax, opacityJitterAmt, opacityJitterMin, opacityJitterMax,
        rotationJitterAmt, rotationMode, rotationAlgorithm, rotationMinAngle, rotationMaxAngle,
        rotationRanges: Array.isArray(rotationRanges) ? JSON.parse(JSON.stringify(rotationRanges)) : [{ min: rotationMinAngle, max: rotationMaxAngle }],
        activeRotationRangeIndex,
        sprayTargetAnchorX, sprayTargetAnchorY, spraySnapToGrid, spraySnapClearCell,
        falloff, flow, pixelPerfect, brushPixelPerfect, colorizeTargetHex, sprayCombineSameColor, sprayInterpolate,
        heightPaintEnabled, heightSourceLayerIndex, heightMode, heightMin, heightMax, heightSoftness
      }
    };
  }
  const BACKUP_SUBFOLDER_NAME = 'Palette Spray Studio Backups';
  let projectFileHandle = null; // File System Access handle, when supported — lets Save overwrite in place
  let backupDirHandle = null; // File System Access directory handle for the chosen backups folder, when enabled
  let backupIntervalTimer = null;
  let activeSaveLocation = 'local';
  let currentCloudFileId = null;
  let currentCloudProviderUsed = null;
  let currentCloudFileName = null;

  function backupFileStamp(){
    const ts = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}`;
  }

  function startBackupIntervalTimer(){
    clearInterval(backupIntervalTimer);
    const hasLocal = !!backupDirHandle;
    const hasCloud = document.getElementById('cloudBackupsCheckbox')?.checked;
    if (!hasLocal && !hasCloud) return;
    const minutes = Math.max(1, +document.getElementById('backupIntervalInput').value || 10);
    backupIntervalTimer = setInterval(()=>{ writeBackupCopy(); }, minutes*60000);
  }

  const BACKUP_DB_NAME = 'pss-backup-handles';
  const BACKUP_STORE_NAME = 'handles';
  function openBackupDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(BACKUP_DB_NAME, 1);
      req.onupgradeneeded = ()=>{ req.result.createObjectStore(BACKUP_STORE_NAME); };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }
  async function saveBackupHandleToDB(handle){
    try {
      const db = await openBackupDB();
      await new Promise((resolve,reject)=>{
        const tx = db.transaction(BACKUP_STORE_NAME, 'readwrite');
        tx.objectStore(BACKUP_STORE_NAME).put(handle, 'lastBackupDir');
        tx.oncomplete = resolve;
        tx.onerror = ()=> reject(tx.error);
      });
    } catch(err){ console.warn('Could not save backup folder handle', err); }
  }
  async function loadBackupHandleFromDB(){
    try {
      const db = await openBackupDB();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(BACKUP_STORE_NAME, 'readonly');
        const req = tx.objectStore(BACKUP_STORE_NAME).get('lastBackupDir');
        req.onsuccess = ()=> resolve(req.result || null);
        req.onerror = ()=> reject(req.error);
      });
    } catch(err){ console.warn('Could not load backup folder handle', err); return null; }
  }
  function syncBackupUI() {
    const btn = document.getElementById('backupToggleBtn');
    const intervalLabel = document.getElementById('backupIntervalLabel');
    const maxLabel = document.getElementById('backupMaxLabel');
    const locInd = document.getElementById('saveLocationIndicator');
    
    if (activeSaveLocation === 'cloud') {
      const provName = currentCloudProviderUsed === 'onedrive' ? 'OneDrive' : 'Google Drive';
      const provTag = currentCloudProviderUsed === 'onedrive' ? 'MS' : 'GD';
      if (locInd) { locInd.textContent = `☁️ [${provTag}]`; locInd.title = `Cloud File (${provName}: ${currentCloudFileName || 'project'})`; }
      const menuSave = document.getElementById('saveProjectBtn');
      if (menuSave) menuSave.innerHTML = `Save to ${provName}`;
      const cloudOn = document.getElementById('cloudBackupsCheckbox')?.checked;
      btn.textContent = cloudOn ? `Backups: On (${provName})` : 'Backups: Off (☁️)';
      btn.classList.toggle('primary', cloudOn);
      if(intervalLabel) intervalLabel.style.display = cloudOn ? 'inline-flex' : 'none';
      if(maxLabel) maxLabel.style.display = 'none'; 
    } else {
      if (locInd) { locInd.textContent = '💻'; locInd.title = 'Local File'; }
      const menuSave = document.getElementById('saveProjectBtn');
      if (menuSave) menuSave.innerHTML = 'Save Project';
      const localOn = !!backupDirHandle;
      btn.textContent = localOn ? 'Backups: On' : 'Backups: Off';
      btn.classList.toggle('primary', localOn);
      if(intervalLabel) intervalLabel.style.display = localOn ? 'inline-flex' : 'none';
      if(maxLabel) maxLabel.style.display = localOn ? 'inline-flex' : 'none';
    }
  }

  function refreshBackupButtonStyle(){
    syncBackupUI();
  }

  async function toggleBackups(){
    if (activeSaveLocation === 'cloud') {
      const cb = document.getElementById('cloudBackupsCheckbox');
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change')); // Triggers toast & localStorage
      }
      syncBackupUI();
      return;
    }

    if(backupDirHandle){
      backupDirHandle = null;
      clearInterval(backupIntervalTimer);
      backupIntervalTimer = null;
      syncBackupUI();
      showToast('Local backups turned off');
      return;
    }
    if(typeof window.showDirectoryPicker !== 'function'){
      alert('Automatic backups need a Chromium-based browser (Chrome, Edge, etc.) — this browser doesn\'t support choosing a folder to write into. Save As still lets you make dated copies by hand.');
      return;
    }
    try {
      const dir = await window.showDirectoryPicker();
      let targetHandle;
      if (dir.name === BACKUP_SUBFOLDER_NAME) {
        targetHandle = dir;
      } else {
        targetHandle = await dir.getDirectoryHandle(BACKUP_SUBFOLDER_NAME, {create:true});
      }
      backupDirHandle = targetHandle;
      saveBackupHandleToDB(dir);
      syncBackupUI();
      startBackupIntervalTimer();
      const displayFolderName = (dir.name === BACKUP_SUBFOLDER_NAME) ? dir.name : (dir.name + '/' + BACKUP_SUBFOLDER_NAME);
      showToast('Backups on — into "' + displayFolderName + '", every save plus every ' + document.getElementById('backupIntervalInput').value + ' min');
    } catch(err){
      if(err.name !== 'AbortError'){ console.error(err); alert('Could not access that folder for backups.'); }
    }
  }
  async function tryReenableBackupsFromProject(){
    const storedDir = await loadBackupHandleFromDB();
    if(!storedDir){
      if(confirm('This project previously had backups enabled. Choose a backup folder now?')) toggleBackups();
      return;
    }
    if(!confirm('This project previously had backups enabled (into "' + storedDir.name + '"). Re-enable backups into that folder?')) return;
    try {
      const perm = await storedDir.requestPermission({mode:'readwrite'});
      if(perm === 'granted'){
        if (storedDir.name === BACKUP_SUBFOLDER_NAME) {
          backupDirHandle = storedDir;
        } else {
          backupDirHandle = await storedDir.getDirectoryHandle(BACKUP_SUBFOLDER_NAME, {create:true});
        }
        document.getElementById('backupToggleBtn').textContent = 'Backups: On';
        document.getElementById('backupIntervalLabel').style.display = 'inline-flex';
        document.getElementById('backupMaxLabel').style.display = 'inline-flex';
        refreshBackupButtonStyle();
        startBackupIntervalTimer();
        const displayFolderName = (storedDir.name === BACKUP_SUBFOLDER_NAME) ? storedDir.name : (storedDir.name + '/' + BACKUP_SUBFOLDER_NAME);
        showToast('Backups re-enabled into "' + displayFolderName + '"');
      } else {
        toggleBackups(); // permission denied — fall back to a fresh folder picker
      }
    } catch(err){
      console.warn(err);
      toggleBackups(); // stored handle unusable — fall back to a fresh folder picker
    }
  }
  document.getElementById('backupToggleBtn').addEventListener('click', toggleBackups);
  document.getElementById('backupIntervalInput').addEventListener('change', startBackupIntervalTimer);

  async function pruneOldBackups(){
    if(!backupDirHandle) return;
    const maxFiles = Math.max(1, +document.getElementById('backupMaxFilesInput').value || 10);
    const currentProj = projectName();
    const projPssprojSuffix = `_${currentProj}.pssproj`;
    const projJsonSuffix = `_${currentProj}.json`;
    try {
      const names = [];
      for await (const [name, handle] of backupDirHandle.entries()){
        if(handle.kind === 'file' && (name.endsWith(projPssprojSuffix) || name.endsWith(projJsonSuffix))){
          names.push(name);
        }
      }
      names.sort(); // timestamp-first filenames sort chronologically as plain strings
      while(names.length > maxFiles){
        const oldest = names.shift();
        try { await backupDirHandle.removeEntry(oldest); } catch(e){ console.warn('Could not remove old backup', oldest, e); }
      }
    } catch(err){
      console.warn('Backup pruning failed:', err);
    }
  }

  // Cloud Storage Provider State & Normalization Utilities
  let currentCloudProvider = localStorage.getItem('active_cloud_provider') || 'gdrive'; // 'gdrive' or 'onedrive'
  let gdriveToken = localStorage.getItem('gdrive_token') || null;
  let onedriveToken = localStorage.getItem('onedrive_token') || null;

  function normalizePath(rawPath) {
    if (!rawPath) return '/';
    let p = String(rawPath).trim().replace(/\\/g, '/');
    if (!p.startsWith('/')) p = '/' + p;
    p = p.replace(/\/+/g, '/');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  }

  function getTargetFolderPath(prov = currentCloudProvider) {
    const key = prov === 'onedrive' ? 'onedrive_folder_path' : 'gdrive_folder_path';
    let saved = localStorage.getItem(key);
    if (!saved) {
      const legacy = localStorage.getItem('cloud_folder_name');
      if (legacy) saved = legacy;
    }
    return normalizePath(saved || '/Palette Spray Studio');
  }

  function getCloudBackupFolderPath(prov = currentCloudProvider) {
    const targetPath = getTargetFolderPath(prov);
    if (targetPath.endsWith(BACKUP_SUBFOLDER_NAME)) {
      return targetPath;
    }
    if (targetPath === '/' || targetPath === '') {
      return '/' + BACKUP_SUBFOLDER_NAME;
    }
    return targetPath + '/' + BACKUP_SUBFOLDER_NAME;
  }

  function getTargetFolderId(prov = currentCloudProvider) {
    const key = prov === 'onedrive' ? 'onedrive_folder_id' : 'gdrive_folder_id';
    return localStorage.getItem(key) || null;
  }

  function setTargetFolder(path, folderId, prov = currentCloudProvider) {
    const normPath = normalizePath(path);
    const pathKey = prov === 'onedrive' ? 'onedrive_folder_path' : 'gdrive_folder_path';
    const idKey = prov === 'onedrive' ? 'onedrive_folder_id' : 'gdrive_folder_id';
    localStorage.setItem(pathKey, normPath);
    if (folderId && folderId !== 'root') {
      localStorage.setItem(idKey, folderId);
    } else {
      localStorage.removeItem(idKey);
    }
    const inputEl = document.getElementById('cloudTargetFolderInput');
    if (inputEl) inputEl.value = normPath;
  }

  async function resolveGoogleDriveFolder(targetPath, knownFolderId) {
    if (!gdriveToken) return { id: 'root', path: '/' };
    const normPath = normalizePath(targetPath);
    if (normPath === '/' || normPath === '') return { id: 'root', path: '/' };

    if (knownFolderId && knownFolderId !== 'root') {
      try {
        const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${knownFolderId}?fields=id,name,trashed`, {
          headers: { 'Authorization': `Bearer ${gdriveToken}` }
        });
        if (verifyRes.ok) {
          const vData = await verifyRes.json();
          if (!vData.trashed) return { id: knownFolderId, path: normPath };
        }
      } catch (e) {}
    }

    const segments = normPath.split('/').filter(Boolean);
    let currentParentId = 'root';
    for (const seg of segments) {
      const q = encodeURIComponent(`'${currentParentId}' in parents and name = '${seg.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${gdriveToken}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          gdriveToken = null;
          localStorage.removeItem('gdrive_token');
          if (typeof checkCloudAuthStatus === 'function') checkCloudAuthStatus();
        }
        return { id: currentParentId, path: normPath };
      }
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        currentParentId = data.files[0].id;
      } else {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gdriveToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: seg,
            mimeType: 'application/vnd.google-apps.folder',
            parents: currentParentId !== 'root' ? [currentParentId] : undefined
          })
        });
        if (!createRes.ok) return { id: currentParentId, path: normPath };
        const newFolder = await createRes.json();
        currentParentId = newFolder.id;
      }
    }
    return { id: currentParentId, path: normPath };
  }

  async function resolveOneDriveFolder(targetPath, knownFolderId) {
    if (!onedriveToken) return { id: 'root', path: '/' };
    const normPath = normalizePath(targetPath);
    if (normPath === '/' || normPath === '') return { id: 'root', path: '/' };

    if (knownFolderId && knownFolderId !== 'root') {
      try {
        const verifyRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${knownFolderId}`, {
          headers: { 'Authorization': `Bearer ${onedriveToken}` }
        });
        if (verifyRes.ok) {
          return { id: knownFolderId, path: normPath };
        }
      } catch (e) {}
    }

    const segments = normPath.split('/').filter(Boolean);
    let currentParentId = 'root';
    for (const seg of segments) {
      let listUrl = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
      if (currentParentId !== 'root') {
        listUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${currentParentId}/children`;
      }
      const listRes = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${onedriveToken}` } });
      if (!listRes.ok) {
        if (listRes.status === 401) {
          onedriveToken = null;
          localStorage.removeItem('onedrive_token');
          if (typeof checkCloudAuthStatus === 'function') checkCloudAuthStatus();
        }
        return { id: currentParentId, path: normPath };
      }
      const data = await listRes.json();
      const existing = (data.value || []).find(item => item.folder && item.name.toLowerCase() === seg.toLowerCase());
      if (existing) {
        currentParentId = existing.id;
      } else {
        let createUrl = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
        if (currentParentId !== 'root') {
          createUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${currentParentId}/children`;
        }
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${onedriveToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: seg,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        });
        if (!createRes.ok) return { id: currentParentId, path: normPath };
        const newFolder = await createRes.json();
        currentParentId = newFolder.id;
      }
    }
    return { id: currentParentId, path: normPath };
  }

  async function pruneCloudBackupsGDrive(folderId, currentProj, maxFiles){
    if (!gdriveToken || !folderId) return;
    try {
      const query = encodeURIComponent(`'${folderId}' in parents and (name contains '_${currentProj}.pssproj' or name contains '_${currentProj}.json') and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime)&pageSize=100`, {
        headers: { 'Authorization': `Bearer ${gdriveToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const files = (data.files || []).filter(f => f.name && (f.name.endsWith(`_${currentProj}.pssproj`) || f.name.endsWith(`_${currentProj}.json`)));
      files.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));
      while (files.length > maxFiles) {
        const oldest = files.shift();
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${oldest.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${gdriveToken}` }
          });
        } catch(e) { console.warn('Failed to prune GDrive backup', oldest.name, e); }
      }
    } catch(err){ console.warn('GDrive pruning error:', err); }
  }

  async function pruneCloudBackupsOneDrive(folderId, currentProj, maxFiles){
    if (!onedriveToken) return;
    try {
      let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100';
      if (folderId && folderId !== 'root') {
        url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=100`;
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${onedriveToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const files = (data.value || []).filter(f => f.name && (f.name.endsWith(`_${currentProj}.pssproj`) || f.name.endsWith(`_${currentProj}.json`)));
      files.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));
      while (files.length > maxFiles) {
        const oldest = files.shift();
        try {
          await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${oldest.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${onedriveToken}` }
          });
        } catch(e) { console.warn('Failed to prune OneDrive backup', oldest.name, e); }
      }
    } catch(err){ console.warn('OneDrive pruning error:', err); }
  }

  async function writeBackupCopy(){
    // 1. Local backup (FileSystem Access)
    if(backupDirHandle){
      try {
        const fileHandle = await backupDirHandle.getFileHandle(`${backupFileStamp()}_${projectName()}.pssproj`, {create:true});
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(buildProjectData()));
        await writable.close();
        await pruneOldBackups();
      } catch(err){
        console.warn('Local backup copy failed:', err);
      }
    }

    // 2. Cloud backups (always saves to the active cloud service inside the 'Palette Spray Studio Backups' folder)
    const cloudBackupsEnabled = document.getElementById('cloudBackupsCheckbox')?.checked;
    if (cloudBackupsEnabled) {
      const activeProv = currentCloudProviderUsed || currentCloudProvider || 'gdrive';
      const fileName = `backup_${backupFileStamp()}_${projectName()}.pssproj`;
      const projectDataStr = JSON.stringify(buildProjectData());
      const maxCloudFiles = Math.max(1, +document.getElementById('backupMaxFilesInput')?.value || 10);
      const backupPath = getCloudBackupFolderPath(activeProv);

      // Active is Google Drive
      if (activeProv === 'gdrive' && gdriveToken) {
        try {
          const { id: backupFolderId } = await resolveGoogleDriveFolder(backupPath);
          const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: (backupFolderId && backupFolderId !== 'root') ? [backupFolderId] : undefined
          };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', new Blob([projectDataStr], { type: 'application/json' }));

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gdriveToken}` },
            body: form
          });
          if (res.ok) {
            await pruneCloudBackupsGDrive(backupFolderId, projectName(), maxCloudFiles);
          }
        } catch (err) {
          console.warn('Cloud backup to Google Drive failed:', err);
        }
      }

      // Active is OneDrive
      if (activeProv === 'onedrive' && onedriveToken) {
        try {
          const { id: backupFolderId } = await resolveOneDriveFolder(backupPath);
          let url;
          if (backupFolderId && backupFolderId !== 'root') {
            url = `https://graph.microsoft.com/v1.0/me/drive/items/${backupFolderId}:/${encodeURIComponent(fileName)}:/content`;
          } else {
            url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(fileName)}:/content`;
          }
          const res = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${onedriveToken}`,
              'Content-Type': 'application/json'
            },
            body: projectDataStr
          });
          if (res.ok) {
            await pruneCloudBackupsOneDrive(backupFolderId, projectName(), maxCloudFiles);
          }
        } catch (err) {
          console.warn('Cloud backup to OneDrive failed:', err);
        }
      }
    }
  }

  document.getElementById('fullscreenBtn').addEventListener('click', ()=>{
    if(!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen().catch(()=>{});
    }
  });

  // ---------- File menu (hamburger) ----------
  const fileMenu = document.getElementById('fileMenu');
  const fileMenuBtn = document.getElementById('fileMenuBtn');
  function closeFileMenu(){
    fileMenu.style.display = 'none';
    fileMenu.querySelectorAll('.menu-item-submenu.open').forEach(el => el.classList.remove('open'));
  }
  function toggleFileMenu(){
    if(fileMenu.style.display === 'block'){
      closeFileMenu();
    } else {
      fileMenu.style.display = 'block';
    }
  }
  fileMenuBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); toggleFileMenu(); });
  document.addEventListener('click', (ev)=>{
    if(fileMenu.style.display === 'block' && !fileMenu.contains(ev.target) && ev.target !== fileMenuBtn){
      closeFileMenu();
    }
  });
  fileMenu.querySelectorAll('.menu-item').forEach(item=>{
    if (item.classList.contains('submenu-toggle')) {
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const parent = item.closest('.menu-item-submenu');
        if (parent) {
          const wasOpen = parent.classList.contains('open');
          fileMenu.querySelectorAll('.menu-item-submenu.open').forEach(el => el.classList.remove('open'));
          if (!wasOpen) parent.classList.add('open');
        }
      });
    } else {
      item.addEventListener('click', ()=>{ closeFileMenu(); });
    }
  });

  document.getElementById('autoFullscreenCheckbox').addEventListener('change', e=>{
    autoFullscreen = e.target.checked;
  });
  const supportsFSAccess = typeof window.showSaveFilePicker === 'function';

  async function writeProjectToHandle(handle){
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(buildProjectData()));
    await writable.close();
  }
  function downloadProjectFallback(){
    const blob = new Blob([JSON.stringify(buildProjectData())], {type:'application/json'});
    const link = document.createElement('a');
    link.download = projectName() + '.pssproj';
    link.href = URL.createObjectURL(blob);
    link.click();
  }
  function showToast(msg){
    let toast = document.getElementById('toastNotice');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'toastNotice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(()=> toast.classList.remove('show'), 2200);
  }
  async function saveProject(forceNewLocation){
    if (activeSaveLocation === 'cloud' && !forceNewLocation && currentCloudFileId) {
      const provName = currentCloudProviderUsed === 'onedrive' ? 'OneDrive' : 'Google Drive';
      showToast(`Saving to ${provName}...`);
      const projectDataStr = JSON.stringify(buildProjectData());
      try {
        if (currentCloudProviderUsed === 'gdrive') {
          if (!gdriveToken) { alert('Please sign in to Google Drive first.'); return; }
          const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${currentCloudFileId}?uploadType=media`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${gdriveToken}`, 'Content-Type': 'application/json' },
            body: projectDataStr
          });
          if (!res.ok) throw new Error('Upload failed');
          showToast(`Saved "${currentCloudFileName}" to Google Drive`);
        } else {
          if (!onedriveToken) {
            const refreshed = (typeof silentRefreshOneDrive === 'function') ? await silentRefreshOneDrive() : false;
            if (!refreshed || !onedriveToken) {
              loginOneDrive(async () => {
                await saveProject(false);
              });
              return;
            }
          }
          let res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${currentCloudFileId}/content`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${onedriveToken}`, 'Content-Type': 'application/json' },
            body: projectDataStr
          });
          if (res.status === 401) {
            const refreshed = (typeof silentRefreshOneDrive === 'function') ? await silentRefreshOneDrive() : false;
            if (refreshed && onedriveToken) {
              res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${currentCloudFileId}/content`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${onedriveToken}`, 'Content-Type': 'application/json' },
                body: projectDataStr
              });
            }
          }
          if (!res.ok) throw new Error('Upload failed');
          showToast(`Saved "${currentCloudFileName}" to OneDrive`);
        }
        await writeBackupCopy();
      } catch (err) {
        console.error('Cloud save failed:', err);
        alert(`Could not save to ${provName}. Your project is kept safely in memory.`);
      }
      return;
    }

    if(!supportsFSAccess){
      showToast('Project downloaded');
      await writeBackupCopy();
      return;
    }
    try {
      if(forceNewLocation || !projectFileHandle){
        projectFileHandle = await window.showSaveFilePicker({
          suggestedName: projectName() + '.pssproj',
          types: [{ description: 'Palette Spray Studio project', accept: {'application/json': ['.pssproj']} }]
        });
      }
      await writeProjectToHandle(projectFileHandle);
      showToast('Project saved');
      await writeBackupCopy();
    } catch(err){
      if(err.name !== 'AbortError'){
        console.error(err);
        alert('Could not save the project file. Falling back to download.');
        downloadProjectFallback();
        showToast('Project downloaded');
        await writeBackupCopy();
      }
    }
  }
  document.getElementById('saveProjectBtn').addEventListener('click', ()=> saveProject(false));
  document.getElementById('topbarSaveBtn').addEventListener('click', ()=> saveProject(false));
  document.getElementById('saveProjectAsBtn').addEventListener('click', ()=> saveProject(true));
  function decodeLayersData(layerDataArr, w, h){
    return Promise.all((layerDataArr||[]).map(ld=> new Promise(res=>{
      const img = new Image();
      img.onload = ()=>{
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d', { willReadFrequently: true }).drawImage(img,0,0);
        const ctx = c.getContext('2d', { willReadFrequently: true });
        const layerObj = {
          name: ld.name || 'Layer',
          canvas: c, ctx, colorCanvas: c, colorCtx: ctx,
          heightCanvas: null, heightCtx: null,
          roughnessCanvas: null, roughnessCtx: null,
          visible: ld.visible !== false,
          locked: !!ld.locked,
          opacity: (typeof ld.opacity === 'number') ? ld.opacity : 100
        };
        const promises = [];
        if(ld.heightData){
          promises.push(new Promise(r1=>{
            const himg = new Image();
            himg.onload = ()=>{
              const hc = document.createElement('canvas');
              hc.width = w; hc.height = h;
              hc.getContext('2d', { willReadFrequently: true }).drawImage(himg,0,0);
              layerObj.heightCanvas = hc;
              layerObj.heightCtx = hc.getContext('2d', { willReadFrequently: true });
              r1();
            };
            himg.src = ld.heightData;
          }));
        }
        if(ld.roughnessData){
          promises.push(new Promise(r2=>{
            const rimg = new Image();
            rimg.onload = ()=>{
              const rc = document.createElement('canvas');
              rc.width = w; rc.height = h;
              rc.getContext('2d', { willReadFrequently: true }).drawImage(rimg,0,0);
              layerObj.roughnessCanvas = rc;
              layerObj.roughnessCtx = rc.getContext('2d', { willReadFrequently: true });
              r2();
            };
            rimg.src = ld.roughnessData;
          }));
        }
        Promise.all(promises).then(()=> res(layerObj));
      };
      img.src = ld.data;
    })));
  }
  function loadProjectData(proj){
    if(!proj || !Array.isArray(proj.layers) || !proj.width || !proj.height){
      alert('That doesn\'t look like a valid project file.');
      return;
    }
    pushHistory();

    const layerPromise = decodeLayersData(proj.layers, proj.width, proj.height);
    const framesPromise = Array.isArray(proj.frames)
      ? Promise.all(proj.frames.map(fd => decodeLayersData(fd.layers, proj.width, proj.height).then(decodedLayers => ({
          name: fd.name,
          layers: decodedLayers,
          activeLayer: fd.activeLayer || 0
        }))))
      : Promise.resolve(null);

    const stampSrc = Array.isArray(proj.stamps) ? proj.stamps : [];
    const stampPromise = Promise.all(stampSrc.map(sd=> new Promise(res=>{
      const img = new Image();
      img.onload = ()=>{
        const c = document.createElement('canvas');
        c.width = sd.w || img.width; c.height = sd.h || img.height;
        c.getContext('2d', { willReadFrequently: true }).drawImage(img,0,0);
        res({
          name: sd.name || 'Stamp',
          mask: c,
          inverted: !!sd.inverted,
          pivotX: (sd.pivotX !== undefined ? sd.pivotX : 0.5),
          pivotY: (sd.pivotY !== undefined ? sd.pivotY : 0.5),
          isSvg: !!sd.isSvg,
          svgString: sd.svgString || null,
          svgLineWidth: sd.svgLineWidth !== undefined ? sd.svgLineWidth : null,
          svgNoFill: sd.svgNoFill !== undefined ? !!sd.svgNoFill : null
        });
      };
      img.src = sd.mask;
    })));

    Promise.all([layerPromise, stampPromise, framesPromise]).then(([newLayers, newStamps, newFramesData])=>{
      W = proj.width; H = proj.height;
      resizeAllCanvasesToWH();
      syncDocCompositeCanvasSize();
      clearSelection();

      document.getElementById('projectNameInput').value = proj.name || 'Untitled';
      autoFullscreen = !!proj.autoFullscreen;
      document.getElementById('autoFullscreenCheckbox').checked = autoFullscreen;
      if(autoFullscreen && !document.fullscreenElement){
        document.documentElement.requestFullscreen().catch(()=>{});
      }

      layers = newLayers.length ? newLayers : [makeLayer('Layer 1')];
      activeLayer = Math.min(proj.activeLayer || 0, layers.length-1);
      undoStack = []; redoStack = [];

      if(newFramesData && newFramesData.length){
        frames = newFramesData.map(fd => makeFrame(
          fd.name || ('Frame ' + frameIdCounter),
          fd.layers.length ? fd.layers : [makeLayer('Layer 1')],
          0
        ));
        frames.forEach((f, i) => { f.activeLayer = Math.min(newFramesData[i].activeLayer, f.layers.length-1); });
        currentFrameIndex = Math.min(proj.currentFrameIndex || 0, frames.length-1);
        layers = frames[currentFrameIndex].layers;
        activeLayer = frames[currentFrameIndex].activeLayer;
        undoStack = frames[currentFrameIndex].undoStack;
        redoStack = frames[currentFrameIndex].redoStack;
      } else {
        // Older project format, saved before animation frames existed — wrap the single loaded
        // layer stack as one frame so everything downstream keeps working unchanged.
        frames = [makeFrame('Frame ' + frameIdCounter, layers, activeLayer)];
        currentFrameIndex = 0;
      }
      refreshFramesPanel();

      if(Array.isArray(proj.groups) && proj.groups.length){
        const isRefFormat = proj.groups.some(g => g.isMain === true ||
          (Array.isArray(g.colors) && g.colors.length && typeof g.colors[0] === 'object'));
        if(isRefFormat){
          groups = proj.groups.map(g=>{
            if(g.isMain || Array.isArray(g.colors)){
              const colors = Array.isArray(g.colors) ? g.colors.map(c=>({
                id: (typeof c.id === 'number') ? c.id : mainColorIdCounter++,
                hex: isHexColor(c.hex) ? normalizeHex(c.hex) : '#000000',
                name: c.name || ''
              })) : [];
              return { id:(typeof g.id==='number')?g.id:groupIdCounter++, name:g.name||'Main Palette', isMain:true, colors, collapsed:!!g.collapsed, columns:g.columns||9 };
            }
            return { id:(typeof g.id==='number')?g.id:groupIdCounter++, name:g.name||'Group', isMain:false, colorRefs:Array.isArray(g.colorRefs)?[...g.colorRefs]:[], collapsed:!!g.collapsed, columns:g.columns||9 };
          });
          if(!groups.some(g=>g.isMain)){
            groups.unshift({ id: groupIdCounter++, name:'Main Palette', isMain:true, colors:[], collapsed:false, columns:9 });
          }
          mainColorIdCounter = Math.max(mainColorIdCounter, ...groups.filter(g=>g.isMain).flatMap(g=>g.colors.map(c=>c.id)), 0) + 1;
        } else {
          // Backward compatibility: the earlier format had every group holding its own flat
          // hex-string array with no shared source. Consolidate into one Main Palette (deduped)
          // plus reference groups, matching the current architecture.
          const mainMap = new Map();
          const mainColors = [];
          function ensureMain(hex){
            if(!mainMap.has(hex)){
              const id = mainColorIdCounter++;
              mainMap.set(hex, id);
              mainColors.push({id, hex});
            }
            return mainMap.get(hex);
          }
          const refGroups = proj.groups.map(g=>{
            const hexList = Array.isArray(g.colors) ? g.colors.filter(isHexColor).map(normalizeHex) : [];
            return { id: groupIdCounter++, name: g.name || 'Group', isMain:false, colorRefs: hexList.map(ensureMain), collapsed: !!g.collapsed, columns: g.columns||9 };
          });
          groups = [{ id: groupIdCounter++, name:'Main Palette', isMain:true, colors: mainColors, collapsed:false, columns:9 }, ...refGroups];
        }
        groupIdCounter = groups.reduce((m,g)=>Math.max(m, g.id||0), 0) + 1;
      } else if(Array.isArray(proj.palette) && proj.palette.length){
        // Backward compatibility: oldest project files stored one flat palette array, no groups at all
        const clean = proj.palette.filter(isHexColor).map(normalizeHex);
        groups = [{ id: groupIdCounter++, name: 'Main Palette', isMain:true, colors: clean.map(hex=>({id:mainColorIdCounter++, hex})), collapsed:false, columns:9 }];
      }
      selectedColors = new Set(
        Array.isArray(proj.selectedColors) ? proj.selectedColors.filter(h=>allColors().includes(h)) : []
      );

      gradients = Array.isArray(proj.gradients)
        ? proj.gradients.map(g=>({name:g.name, stops:[...(g.stops||[])]})) : [];
      stamps = newStamps;
      grids = Array.isArray(proj.grids) ? proj.grids.map(g=>({...g})) : [];
      gridMasterOn = !!proj.gridMasterOn;
      gridIdCounter = grids.reduce((m,g)=>Math.max(m, g.id||0), 0) + 1;

      if(Array.isArray(proj.sprayPresets) && proj.sprayPresets.length > 0){
        sprayPresets = proj.sprayPresets.map(p=>({
          id: p.id,
          name: p.name,
          builtin: !!p.builtin,
          savedSettings: p.savedSettings ? JSON.parse(JSON.stringify(p.savedSettings)) : JSON.parse(JSON.stringify(p.settings || {})),
          settings: JSON.parse(JSON.stringify(p.settings || {}))
        }));
        sprayPresets.forEach(p=>{
          if(p.id.startsWith('preset-')){
            const num = parseInt(p.id.replace('preset-', ''), 10);
            if(!isNaN(num) && num >= sprayPresetIdCounter) sprayPresetIdCounter = num + 1;
          }
        });
      }
      if(proj.activeSprayPresetId && sprayPresets.some(p=>p.id === proj.activeSprayPresetId)){
        activeSprayPresetId = proj.activeSprayPresetId;
      } else if(sprayPresets.length > 0){
        activeSprayPresetId = sprayPresets[0].id;
      }

      const t = proj.tool || {};
      brushSize = t.brushSize ?? brushSize;
      opacity = t.opacity ?? opacity;
      sourceKind = t.sourceKind ?? sourceKind;
      selectedGradientIndex = (typeof t.selectedGradientIndex === 'number') ? t.selectedGradientIndex : null;
      selectedStampIndex = (typeof t.selectedStampIndex === 'number') ? t.selectedStampIndex : null;
      dabShape = t.dabShape ?? dabShape;
      brushShape = t.brushShape ?? brushShape;
      brushMode = t.brushMode ?? brushMode;
      sprayMode = t.sprayMode ?? sprayMode;
      softenType = t.softenType ?? 'edge';
      softenHardness = t.softenHardness ?? 100;
      heightPaintEnabled = !!t.heightPaintEnabled;
      heightSourceLayerIndex = (typeof t.heightSourceLayerIndex === 'number') ? t.heightSourceLayerIndex : null;
      heightMode = t.heightMode ?? heightMode;
      heightMin = t.heightMin ?? heightMin;
      heightMax = t.heightMax ?? heightMax;
      heightSoftness = t.heightSoftness ?? heightSoftness;
      colorizeTargetHex = t.colorizeTargetHex ?? colorizeTargetHex;
      density = t.density ?? density;
      dabSize = t.dabSize ?? dabSize;
      dabWidth = t.dabWidth ?? dabWidth;
      dabHeight = t.dabHeight ?? dabHeight;
      dabLockAspect = (t.dabLockAspect !== false);
      sizeJitterAmt = t.sizeJitterAmt ?? sizeJitterAmt;
      sizeJitterMin = t.sizeJitterMin ?? sizeJitterMin;
      sizeJitterMax = t.sizeJitterMax ?? sizeJitterMax;
      dabWidthJitterMin = t.dabWidthJitterMin ?? dabWidthJitterMin;
      dabWidthJitterMax = t.dabWidthJitterMax ?? dabWidthJitterMax;
      dabHeightJitterMin = t.dabHeightJitterMin ?? dabHeightJitterMin;
      dabHeightJitterMax = t.dabHeightJitterMax ?? dabHeightJitterMax;
      opacityJitterAmt = t.opacityJitterAmt ?? opacityJitterAmt;
      opacityJitterMin = t.opacityJitterMin ?? opacityJitterMin;
      opacityJitterMax = t.opacityJitterMax ?? opacityJitterMax;
      rotationJitterAmt = t.rotationJitterAmt ?? rotationJitterAmt;
      rotationMode = t.rotationMode ?? rotationMode;
      rotationAlgorithm = t.rotationAlgorithm || 'rotsprite';
      rotationMinAngle = t.rotationMinAngle ?? rotationMinAngle;
      rotationMaxAngle = t.rotationMaxAngle ?? rotationMaxAngle;
      if(t.rotationRanges && Array.isArray(t.rotationRanges) && t.rotationRanges.length > 0){
        rotationRanges = JSON.parse(JSON.stringify(t.rotationRanges));
        activeRotationRangeIndex = Math.max(0, Math.min(rotationRanges.length - 1, t.activeRotationRangeIndex ?? 0));
      } else {
        rotationRanges = [{ min: rotationMinAngle, max: rotationMaxAngle }];
        activeRotationRangeIndex = 0;
      }
      sprayTargetAnchorX = t.sprayTargetAnchorX ?? null;
      sprayTargetAnchorY = t.sprayTargetAnchorY ?? null;
      spraySnapToGrid = !!t.spraySnapToGrid;
      spraySnapClearCell = !!t.spraySnapClearCell;
      falloff = t.falloff ?? falloff;
      flow = t.flow ?? flow;
      pixelPerfect = !!t.pixelPerfect;
      brushPixelPerfect = (t.brushPixelPerfect !== false);
      sprayCombineSameColor = !!t.sprayCombineSameColor;
      sprayInterpolate = (t.sprayInterpolate !== false);

      // Sync every control in the UI to the restored state
      setTool(t.tool || 'spray');
      const szSl = document.getElementById('sizeSlider'); if(szSl) szSl.value = brushSize;
      const szV = document.getElementById('sizeVal'); if(szV) szV.textContent = brushSize;
      const opSl = document.getElementById('opacitySlider'); if(opSl) opSl.value = opacity;
      const opV = document.getElementById('opacityVal'); if(opV) opV.textContent = opacity + '%';
      const skSel = document.getElementById('sourceKindSelect'); if(skSel) skSel.value = sourceKind;
      const gsSel = document.getElementById('gradientSourceSelect'); if(gsSel) gsSel.style.display = (sourceKind==='gradient') ? 'block' : 'none';
      const denSl = document.getElementById('densitySlider'); if(denSl) denSl.value = density;
      const denV = document.getElementById('densityVal'); if(denV) denV.textContent = density + '%';
      const dabSl = document.getElementById('dabSlider'); if(dabSl) dabSl.value = dabSize;
      const dabV = document.getElementById('dabVal'); if(dabV) dabV.textContent = dabSize;

      const dwEl = document.getElementById('dabWidthSlider'); if(dwEl) dwEl.value = dabWidth;
      const dwvEl = document.getElementById('dabWidthVal'); if(dwvEl) dwvEl.textContent = dabWidth;
      const dhEl = document.getElementById('dabHeightSlider'); if(dhEl) dhEl.value = dabHeight;
      const dhvEl = document.getElementById('dabHeightVal'); if(dhvEl) dhvEl.textContent = dabHeight;
      const dlaEl = document.getElementById('dabLockAspectCheckbox'); if(dlaEl) dlaEl.checked = dabLockAspect;

      const sjminEl = document.getElementById('sizeJitterMinSlider'); if(sjminEl) sjminEl.value = sizeJitterMin;
      const sjmaxEl = document.getElementById('sizeJitterMaxSlider'); if(sjmaxEl) sjmaxEl.value = sizeJitterMax;
      const sjvEl = document.getElementById('sizeJitterVal'); if(sjvEl) sjvEl.textContent = sizeJitterMin + '% - ' + sizeJitterMax + '%';
      updateDualRangeFill(sjminEl, sjmaxEl, document.getElementById('sizeJitterFill'));

      const dwjminEl = document.getElementById('dabWidthJitterMinSlider'); if(dwjminEl) dwjminEl.value = dabWidthJitterMin;
      const dwjmaxEl = document.getElementById('dabWidthJitterMaxSlider'); if(dwjmaxEl) dwjmaxEl.value = dabWidthJitterMax;
      const dwjvEl = document.getElementById('dabWidthJitterVal'); if(dwjvEl) dwjvEl.textContent = dabWidthJitterMin + '% - ' + dabWidthJitterMax + '%';
      updateDualRangeFill(dwjminEl, dwjmaxEl, document.getElementById('dabWidthJitterFill'));

      const dhjminEl = document.getElementById('dabHeightJitterMinSlider'); if(dhjminEl) dhjminEl.value = dabHeightJitterMin;
      const dhjmaxEl = document.getElementById('dabHeightJitterMaxSlider'); if(dhjmaxEl) dhjmaxEl.value = dabHeightJitterMax;
      const dhjvEl = document.getElementById('dabHeightJitterVal'); if(dhjvEl) dhjvEl.textContent = dabHeightJitterMin + '% - ' + dabHeightJitterMax + '%';
      updateDualRangeFill(dhjminEl, dhjmaxEl, document.getElementById('dabHeightJitterFill'));

      const ojminEl = document.getElementById('opacityJitterMinSlider'); if(ojminEl) ojminEl.value = opacityJitterMin;
      const ojmaxEl = document.getElementById('opacityJitterMaxSlider'); if(ojmaxEl) ojmaxEl.value = opacityJitterMax;
      const ojvEl = document.getElementById('opacityJitterVal'); if(ojvEl) ojvEl.textContent = opacityJitterMin + '% - ' + opacityJitterMax + '%';
      updateDualRangeFill(ojminEl, ojmaxEl, document.getElementById('opacityJitterFill'));

      const rmEl = document.getElementById('rotationModeSelect'); if(rmEl) rmEl.value = rotationMode;
      const raEl = document.getElementById('rotationAlgorithmSelect'); if(raEl) raEl.value = rotationAlgorithm;
      const rminEl = document.getElementById('rotationMinValInput'); if(rminEl) rminEl.value = rotationMinAngle;
      const rmaxEl = document.getElementById('rotationMaxValInput'); if(rmaxEl) rmaxEl.value = rotationMaxAngle;
      drawRotationDial();

      const ssgEl = document.getElementById('spraySnapGridCheckbox'); if(ssgEl) ssgEl.checked = spraySnapToGrid;
      const ssccEl = document.getElementById('spraySnapClearCellCheckbox'); if(ssccEl) ssccEl.checked = spraySnapClearCell;
      if(typeof updateSpraySnapGridUI === 'function') updateSpraySnapGridUI();
      updateSprayAnchorUI();
      drawStampPivotCanvas();
      const sjEl = document.getElementById('sizeJitterSlider'); if(sjEl) sjEl.value = sizeJitterAmt;
      const sjvAmtEl = document.getElementById('sizeJitterVal'); if(sjvAmtEl && t.sizeJitterMin === undefined) sjvAmtEl.textContent = sizeJitterAmt + '%';
      const ojEl = document.getElementById('opacityJitterSlider'); if(ojEl) ojEl.value = opacityJitterAmt;
      const ojvAmtEl = document.getElementById('opacityJitterVal'); if(ojvAmtEl && t.opacityJitterMin === undefined) ojvAmtEl.textContent = opacityJitterAmt + '%';
      const rjEl = document.getElementById('rotationJitterSlider'); if(rjEl) rjEl.value = rotationJitterAmt;
      const rjvEl = document.getElementById('rotationJitterVal'); if(rjvEl) rjvEl.textContent = rotationJitterAmt + '%';
      const foEl = document.getElementById('falloffSlider'); if(foEl) foEl.value = falloff;
      const fovEl = document.getElementById('falloffVal'); if(fovEl) fovEl.textContent = falloff + '%';
      const flEl = document.getElementById('flowSlider'); if(flEl) flEl.value = flow;
      const flvEl = document.getElementById('flowVal'); if(flvEl) flvEl.textContent = flow + '%';
      const bppc = document.getElementById('brushPixelPerfectCheckbox'); if(bppc) bppc.checked = brushPixelPerfect;
      const spic = document.getElementById('sprayInterpolateCheckbox'); if(spic) spic.checked = sprayInterpolate;

      const pbms = document.getElementById('paintBlendModeSelect');
      if (pbms) {
        if (pixelPerfect) pbms.value = 'pixel-perfect';
        else if (sprayCombineSameColor) pbms.value = 'combine-same';
        else pbms.value = 'default';
      }

      updateBrushPixelPerfectAvailability();
      document.querySelectorAll('.shape-btn[data-shape]').forEach(b=>b.classList.toggle('active', b.dataset.shape===dabShape));
      document.querySelectorAll('.shape-btn[data-brush-shape]').forEach(b=>b.classList.toggle('active', b.dataset.brushShape===brushShape));
      const bss = document.getElementById('brushStampSourceSelect'); if(bss) bss.style.display = (brushShape==='stamp') ? 'block' : 'none';
      const ss = document.getElementById('stampSourceSelect'); if(ss) ss.style.display = (dabShape==='stamp') ? 'block' : 'none';
      document.querySelectorAll('.shape-btn[data-brush-mode]').forEach(b=>b.classList.toggle('active', b.dataset.brushMode===brushMode));
      document.querySelectorAll('.shape-btn[data-spray-mode]').forEach(b=>b.classList.toggle('active', b.dataset.sprayMode===sprayMode));
      const bbh = document.getElementById('brushBlurHint'); if(bbh) bbh.style.display = (brushMode==='blur') ? 'block' : 'none';
      updateSoftenUI();
      updateColorizeTargetSwatch();
      const hpe = document.getElementById('heightPaintEnabled'); if(hpe) hpe.checked = heightPaintEnabled;
      const hpo = document.getElementById('heightPaintOptions'); if(hpo) hpo.style.display = heightPaintEnabled ? 'block' : 'none';
      const hms = document.getElementById('heightModeSelect'); if(hms) hms.value = heightMode;
      const hrc = document.getElementById('heightRangeControls'); if(hrc) hrc.style.display = (heightMode==='range') ? 'block' : 'none';
      const hminS = document.getElementById('heightMinSlider'); if(hminS) hminS.value = heightMin;
      const hminV = document.getElementById('heightMinVal'); if(hminV) hminV.textContent = heightMin;
      const hmaxS = document.getElementById('heightMaxSlider'); if(hmaxS) hmaxS.value = heightMax;
      const hmaxV = document.getElementById('heightMaxVal'); if(hmaxV) hmaxV.textContent = heightMax;
      const hsoftS = document.getElementById('heightSoftnessSlider'); if(hsoftS) hsoftS.value = heightSoftness;
      const hsoftV = document.getElementById('heightSoftnessVal'); if(hsoftV) hsoftV.textContent = heightSoftness + '%';
      refreshHeightSourceOptions();
      const gmt = document.getElementById('gridMasterToggle'); if(gmt) gmt.checked = gridMasterOn;

      refreshGradientList();
      populateGradientSourceDropdown();
      populatePalettizeGradientDropdown();
      refreshStampList();
      populateStampDropdown();
      refreshGridPanel();
      drawGridOverlay();

      if(proj.onionSkinEnabled !== undefined) onionSkinEnabled = !!proj.onionSkinEnabled;
      if(proj.onionSkinOpacity !== undefined) onionSkinOpacity = +proj.onionSkinOpacity || 50;
      const osCheck = document.getElementById('tlOnionSkinCheckbox'); if(osCheck) osCheck.checked = onionSkinEnabled;
      const osSlider = document.getElementById('tlOnionSkinOpacitySlider'); if(osSlider) osSlider.value = onionSkinOpacity;
      const osVal = document.getElementById('tlOnionSkinOpacityVal'); if(osVal) osVal.textContent = onionSkinOpacity + '%';
      rebuildOnionSkinCache();

      setFg(allColors()[0] || fgColor);
      refreshGroups();
      refreshLayerPanel();
      fitCanvasToScreen(true);
      centerCanvas();
      fitSidePanelToPalette();
      render();
      updateSpraySourceHint();
      if(proj.backupsEnabled && !backupDirHandle) tryReenableBackupsFromProject();
    });
  }
  document.getElementById('loadProjectBtn').addEventListener('click', async ()=>{
    if(typeof window.showOpenFilePicker === 'function'){
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Palette Spray Studio project', accept: {'application/json': ['.pssproj', '.json']} }]
        });
        const file = await handle.getFile();
        const text = await file.text();
        let proj;
        try { proj = JSON.parse(text); }
        catch(err){ alert('Could not read that project file.'); return; }
        projectFileHandle = handle; // future Saves overwrite this same file
        activeSaveLocation = 'local';
        currentCloudFileId = null;
        currentCloudProviderUsed = null;
        currentCloudFileName = null;
        syncBackupUI();
        loadProjectData(proj);
        return;
      } catch(err){
        if(err.name === 'AbortError') return; // user cancelled the picker, do nothing
        // fall through to classic file input on any other error
      }
    }
    document.getElementById('loadProjectInput').click();
  });
  document.getElementById('loadProjectInput').addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    projectFileHandle = null; // loaded via classic input, no handle to overwrite later
    const reader = new FileReader();
    reader.onload = ()=>{
      let proj;
      try { proj = JSON.parse(reader.result); }
      catch(err){ alert('Could not read that project file.'); return; }
      activeSaveLocation = 'local';
      currentCloudFileId = null;
      currentCloudProviderUsed = null;
      currentCloudFileName = null;
      syncBackupUI();
      loadProjectData(proj);
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ---------- Cloud Storage Manager (Google Drive & OneDrive) ----------
  const cloudOverlay = document.getElementById('cloudStorageModalOverlay');
  const cloudModalCloseBtn = document.getElementById('cloudModalCloseBtn');
  const cloudInstructionsToggleBtn = document.getElementById('cloudInstructionsToggleBtn');
  const cloudInstructionsPanel = document.getElementById('cloudInstructionsPanel');
  const cloudInstructionsCloseBtn = document.getElementById('cloudInstructionsCloseBtn');
  const cloudInstrTabGDrive = document.getElementById('cloudInstrTabGDrive');
  const cloudInstrTabOneDrive = document.getElementById('cloudInstrTabOneDrive');
  const cloudInstrTabBackups = document.getElementById('cloudInstrTabBackups');
  const cloudInstrContentGDrive = document.getElementById('cloudInstrContentGDrive');
  const cloudInstrContentOneDrive = document.getElementById('cloudInstrContentOneDrive');
  const cloudInstrContentBackups = document.getElementById('cloudInstrContentBackups');

  function setCloudInstructionsTab(tabKey) {
    if (cloudInstrTabGDrive) cloudInstrTabGDrive.classList.toggle('primary', tabKey === 'gdrive');
    if (cloudInstrTabOneDrive) cloudInstrTabOneDrive.classList.toggle('primary', tabKey === 'onedrive');
    if (cloudInstrTabBackups) cloudInstrTabBackups.classList.toggle('primary', tabKey === 'backups');
    if (cloudInstrContentGDrive) cloudInstrContentGDrive.style.display = (tabKey === 'gdrive') ? 'block' : 'none';
    if (cloudInstrContentOneDrive) cloudInstrContentOneDrive.style.display = (tabKey === 'onedrive') ? 'block' : 'none';
    if (cloudInstrContentBackups) cloudInstrContentBackups.style.display = (tabKey === 'backups') ? 'block' : 'none';
  }

  function toggleCloudInstructionsPanel(forceState) {
    if (!cloudInstructionsPanel) return;
    const isCurrentlyOpen = cloudInstructionsPanel.style.display !== 'none';
    const shouldOpen = (typeof forceState === 'boolean') ? forceState : !isCurrentlyOpen;
    cloudInstructionsPanel.style.display = shouldOpen ? 'block' : 'none';
    if (cloudInstructionsToggleBtn) {
      cloudInstructionsToggleBtn.classList.toggle('primary', shouldOpen);
    }
    if (shouldOpen) {
      setCloudInstructionsTab(currentCloudProvider === 'onedrive' ? 'onedrive' : 'gdrive');
    }
  }

  if (cloudInstructionsToggleBtn) {
    cloudInstructionsToggleBtn.addEventListener('click', () => toggleCloudInstructionsPanel());
  }
  if (cloudInstructionsCloseBtn) {
    cloudInstructionsCloseBtn.addEventListener('click', () => toggleCloudInstructionsPanel(false));
  }
  if (cloudInstrTabGDrive) cloudInstrTabGDrive.addEventListener('click', () => setCloudInstructionsTab('gdrive'));
  if (cloudInstrTabOneDrive) cloudInstrTabOneDrive.addEventListener('click', () => setCloudInstructionsTab('onedrive'));
  if (cloudInstrTabBackups) cloudInstrTabBackups.addEventListener('click', () => setCloudInstructionsTab('backups'));

  const cloudToggleGDrive = document.getElementById('cloudToggleGDrive');
  const cloudToggleOneDrive = document.getElementById('cloudToggleOneDrive');
  const cloudAuthStatus = document.getElementById('cloudAuthStatus');
  const cloudAuthBtn = document.getElementById('cloudAuthBtn');
  const cloudSaveFilenameInput = document.getElementById('cloudSaveFilenameInput');
  const cloudSaveSubmitBtn = document.getElementById('cloudSaveSubmitBtn');
  const cloudFileList = document.getElementById('cloudFileList');
  const cloudRefreshListBtn = document.getElementById('cloudRefreshListBtn');

  // Folder & Backup Target Config Inputs
  const cloudTargetFolderInput = document.getElementById('cloudTargetFolderInput');
  const cloudSetFolderBtn = document.getElementById('cloudSetFolderBtn');
  const cloudBackupsCheckbox = document.getElementById('cloudBackupsCheckbox');

  // Load persistence configurations from localStorage
  if (cloudTargetFolderInput) {
    cloudTargetFolderInput.value = getTargetFolderPath(currentCloudProvider);
  }
  if (cloudBackupsCheckbox) {
    cloudBackupsCheckbox.checked = localStorage.getItem('cloud_backups_enabled') === 'true';
  }

  function openCloudStorageModal(provider) {
    const prov = provider || currentCloudProvider || 'gdrive';
    switchCloudProvider(prov);
    if (cloudOverlay) cloudOverlay.style.display = 'flex';
    const projName = (typeof projectName === 'function') ? projectName() : 'Untitled';
    if (cloudSaveFilenameInput) cloudSaveFilenameInput.value = projName + '.pssproj';
    checkCloudAuthStatus();
  }

  function closeCloudStorageModal() {
    if (cloudOverlay) cloudOverlay.style.display = 'none';
  }

  if (cloudModalCloseBtn) cloudModalCloseBtn.addEventListener('click', closeCloudStorageModal);
  if (cloudOverlay) {
    cloudOverlay.addEventListener('click', (e) => {
      if (e.target === cloudOverlay) closeCloudStorageModal();
    });
  }

  document.getElementById('cloudDrivesBtn')?.addEventListener('click', () => { closeFileMenu(); openCloudStorageModal(currentCloudProvider); });

  function switchCloudProvider(provider) {
    currentCloudProvider = provider;
    localStorage.setItem('active_cloud_provider', provider);

    // Update Slider Toggle Buttons UI
    if (cloudToggleGDrive && cloudToggleOneDrive) {
      if (provider === 'gdrive') {
        cloudToggleGDrive.style.background = 'var(--accent)';
        cloudToggleGDrive.style.color = 'var(--accent-text, #fff)';
        cloudToggleGDrive.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        cloudToggleOneDrive.style.background = 'transparent';
        cloudToggleOneDrive.style.color = 'var(--text-dim)';
        cloudToggleOneDrive.style.boxShadow = 'none';
      } else {
        cloudToggleOneDrive.style.background = 'var(--accent)';
        cloudToggleOneDrive.style.color = 'var(--accent-text, #fff)';
        cloudToggleOneDrive.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        cloudToggleGDrive.style.background = 'transparent';
        cloudToggleGDrive.style.color = 'var(--text-dim)';
        cloudToggleGDrive.style.boxShadow = 'none';
      }
    }

    if (cloudTargetFolderInput) {
      cloudTargetFolderInput.value = getTargetFolderPath(provider);
    }
    if (cloudSaveSubmitBtn) {
      cloudSaveSubmitBtn.innerHTML = (provider === 'onedrive') ? '☁️ Save to OneDrive' : '☁️ Save to Google Drive';
    }
    if (cloudSaveFilenameInput) {
      cloudSaveFilenameInput.placeholder = (provider === 'onedrive') ? 'project-name.pssproj (OneDrive)' : 'project-name.pssproj (Google Drive)';
    }
    if (cloudInstructionsPanel && cloudInstructionsPanel.style.display !== 'none') {
      setCloudInstructionsTab(provider);
    }
    if (cloudFolderBrowserSection && cloudFolderBrowserSection.style.display !== 'none') {
      cloudFolderBrowserSection.style.display = 'none';
    }
    checkCloudAuthStatus();
    syncBackupUI();
  }

  if (cloudToggleGDrive) cloudToggleGDrive.addEventListener('click', () => switchCloudProvider('gdrive'));
  if (cloudToggleOneDrive) cloudToggleOneDrive.addEventListener('click', () => switchCloudProvider('onedrive'));

  function applyTargetFolderInput() {
    const raw = cloudTargetFolderInput ? cloudTargetFolderInput.value : '';
    const norm = normalizePath(raw || '/Palette Spray Studio');
    setTargetFolder(norm, null, currentCloudProvider);
    showToast(`Target cloud folder set to: "${norm}"`);
    loadCloudFileList();
  }

  if (cloudSetFolderBtn) {
    cloudSetFolderBtn.addEventListener('click', applyTargetFolderInput);
  }
  if (cloudTargetFolderInput) {
    cloudTargetFolderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyTargetFolderInput();
      }
    });
  }

  if (cloudBackupsCheckbox) {
    cloudBackupsCheckbox.addEventListener('change', () => {
      localStorage.setItem('cloud_backups_enabled', cloudBackupsCheckbox.checked ? 'true' : 'false');
      if (cloudBackupsCheckbox.checked) {
        showToast('Automatic cloud backups enabled for ' + (currentCloudProvider === 'onedrive' ? 'OneDrive' : 'Google Drive'));
        startBackupIntervalTimer();
      } else {
        showToast('Automatic cloud backups disabled');
      }
    });
  }

  const cloudBrowseFoldersBtn = document.getElementById('cloudBrowseFoldersBtn');
  const cloudFolderBrowserSection = document.getElementById('cloudFolderBrowserSection');
  const cloudFolderBrowserList = document.getElementById('cloudFolderBrowserList');
  const cloudCloseBrowserBtn = document.getElementById('cloudCloseBrowserBtn');
  const cloudBrowserUpBtn = document.getElementById('cloudBrowserUpBtn');
  const cloudBrowserPathLabel = document.getElementById('cloudBrowserPathLabel');
  const cloudBrowserNewFolderBtn = document.getElementById('cloudBrowserNewFolderBtn');
  const cloudBrowserNewFolderDiv = document.getElementById('cloudBrowserNewFolderDiv');
  const cloudBrowserNewFolderInput = document.getElementById('cloudBrowserNewFolderInput');
  const cloudBrowserCreateFolderBtn = document.getElementById('cloudBrowserCreateFolderBtn');
  const cloudBrowserSelectCurrentBtn = document.getElementById('cloudBrowserSelectCurrentBtn');

  let cloudBrowserPath = [{ id: 'root', name: 'Root', path: '/' }];

  if (cloudBrowseFoldersBtn) {
    cloudBrowseFoldersBtn.addEventListener('click', () => {
      if (cloudFolderBrowserSection.style.display === 'none') {
        cloudBrowserPath = [{ id: 'root', name: 'Root', path: '/' }];
        cloudFolderBrowserSection.style.display = 'flex';
        if (cloudBrowserNewFolderDiv) cloudBrowserNewFolderDiv.style.display = 'none';
        fetchCloudFolders();
      } else {
        cloudFolderBrowserSection.style.display = 'none';
      }
    });
  }

  if (cloudCloseBrowserBtn) {
    cloudCloseBrowserBtn.addEventListener('click', () => {
      cloudFolderBrowserSection.style.display = 'none';
    });
  }

  if (cloudBrowserUpBtn) {
    cloudBrowserUpBtn.addEventListener('click', () => {
      if (cloudBrowserPath.length > 1) {
        cloudBrowserPath.pop();
        fetchCloudFolders();
      }
    });
  }

  if (cloudBrowserNewFolderBtn) {
    cloudBrowserNewFolderBtn.addEventListener('click', () => {
      if (!cloudBrowserNewFolderDiv) return;
      cloudBrowserNewFolderDiv.style.display = cloudBrowserNewFolderDiv.style.display === 'none' ? 'flex' : 'none';
      if (cloudBrowserNewFolderDiv.style.display === 'flex' && cloudBrowserNewFolderInput) cloudBrowserNewFolderInput.focus();
    });
  }

  if (cloudBrowserCreateFolderBtn) {
    cloudBrowserCreateFolderBtn.addEventListener('click', async () => {
      if (!cloudBrowserNewFolderInput) return;
      const name = cloudBrowserNewFolderInput.value.trim();
      if (!name) return;
      const currentFolder = cloudBrowserPath[cloudBrowserPath.length - 1];
      
      cloudBrowserCreateFolderBtn.disabled = true;
      try {
        if (currentCloudProvider === 'gdrive') {
          const res = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gdriveToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: name, 
              mimeType: 'application/vnd.google-apps.folder', 
              parents: currentFolder.id !== 'root' ? [currentFolder.id] : undefined 
            })
          });
          if (res.ok) fetchCloudFolders();
        } else {
          let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
          if (currentFolder.id !== 'root') url = `https://graph.microsoft.com/v1.0/me/drive/items/${currentFolder.id}/children`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${onedriveToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })
          });
          if (res.ok) fetchCloudFolders();
        }
        cloudBrowserNewFolderInput.value = '';
        cloudBrowserNewFolderDiv.style.display = 'none';
      } catch (err) {
        console.warn('Error creating folder', err);
      }
      cloudBrowserCreateFolderBtn.disabled = false;
    });
  }

  if (cloudBrowserSelectCurrentBtn) {
    cloudBrowserSelectCurrentBtn.addEventListener('click', () => {
      const currentFolder = cloudBrowserPath[cloudBrowserPath.length - 1];
      const fullPath = currentFolder.path || '/';
      setTargetFolder(fullPath, currentFolder.id, currentCloudProvider);
      cloudFolderBrowserSection.style.display = 'none';
      showToast(`Target folder set to: "${fullPath}"`);
      loadCloudFileList();
    });
  }

  async function fetchCloudFolders() {
    if (!cloudFolderBrowserList) return;
    const currentFolder = cloudBrowserPath[cloudBrowserPath.length - 1];
    const displayPath = currentFolder.path || '/';
    if (cloudBrowserPathLabel) {
      cloudBrowserPathLabel.textContent = displayPath;
      cloudBrowserPathLabel.title = displayPath;
    }
    if (cloudBrowserUpBtn) cloudBrowserUpBtn.disabled = cloudBrowserPath.length <= 1;

    cloudFolderBrowserList.innerHTML = '<div style="text-align:center; padding:10px; font-size:11px; color:var(--text-dim);">Loading folder structure...</div>';

    if (currentCloudProvider === 'gdrive') {
      if (!gdriveToken) {
        cloudFolderBrowserList.innerHTML = '<div style="text-align:center; padding:10px; font-size:11px; color:var(--text-dim);">Please sign in to Google Drive first</div>';
        return;
      }
      try {
        const q = encodeURIComponent(`'${currentFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=50`, {
          headers: { 'Authorization': `Bearer ${gdriveToken}` }
        });
        if (res.status === 401) {
          gdriveToken = null;
          localStorage.removeItem('gdrive_token');
          checkCloudAuthStatus();
          return;
        }
        const data = await res.json();
        renderFolderBrowser(data.files || []);
      } catch (err) {
        cloudFolderBrowserList.innerHTML = '<div style="text-align:center; padding:10px; font-size:11px; color:var(--danger);">Error loading directories</div>';
      }
    } else {
      if (!onedriveToken) {
        cloudFolderBrowserList.innerHTML = '<div style="text-align:center; padding:10px; font-size:11px; color:var(--text-dim);">Please sign in to OneDrive first</div>';
        return;
      }
      try {
        let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
        if (currentFolder.id !== 'root') url = `https://graph.microsoft.com/v1.0/me/drive/items/${currentFolder.id}/children`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${onedriveToken}` }
        });
        if (res.status === 401) {
          onedriveToken = null;
          localStorage.removeItem('onedrive_token');
          checkCloudAuthStatus();
          return;
        }
        const data = await res.json();
        const folders = (data.value || []).filter(item => item.folder);
        renderFolderBrowser(folders);
      } catch (err) {
        cloudFolderBrowserList.innerHTML = '<div style="text-align:center; padding:10px; font-size:11px; color:var(--danger);">Error loading directories</div>';
      }
    }
  }

  function renderFolderBrowser(folders) {
    if (!cloudFolderBrowserList) return;
    cloudFolderBrowserList.innerHTML = '';

    if (folders.length === 0) {
      cloudFolderBrowserList.innerHTML = '<div style="text-align:center; padding:10px; font-size:11px; color:var(--text-dim);">No subfolders found</div>';
      return;
    }

    const currentFolder = cloudBrowserPath[cloudBrowserPath.length - 1];
    const parentPath = (currentFolder.path === '/' || !currentFolder.path) ? '' : currentFolder.path;

    folders.forEach(folder => {
      const folderFullPath = parentPath + '/' + folder.name;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:4px 6px; border-radius:4px; margin-top:2px;';
      
      const navArea = document.createElement('div');
      navArea.style.cssText = 'flex:1; display:flex; align-items:center; gap:6px; cursor:pointer; font-size:11px; overflow:hidden;';
      navArea.innerHTML = `<span style="flex-shrink:0;">📁</span> <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${folder.name}</span>`;
      
      navArea.addEventListener('click', () => {
        cloudBrowserPath.push({ id: folder.id, name: folder.name, path: folderFullPath });
        fetchCloudFolders();
      });

      const selBtn = document.createElement('button');
      selBtn.className = 'btn small';
      selBtn.textContent = 'Select';
      selBtn.style.cssText = 'font-size:10px; padding:2px 6px; flex-shrink:0; margin-left:8px;';
      selBtn.addEventListener('click', () => {
        setTargetFolder(folderFullPath, folder.id, currentCloudProvider);
        cloudFolderBrowserSection.style.display = 'none';
        showToast(`Target folder set to: "${folderFullPath}"`);
        loadCloudFileList();
      });

      row.appendChild(navArea);
      row.appendChild(selBtn);

      row.addEventListener('mouseover', () => row.style.background = 'var(--panel-2)');
      row.addEventListener('mouseout', () => row.style.background = 'transparent');
      
      cloudFolderBrowserList.appendChild(row);
    });
  }

  let isCheckingOneDriveExpiry = false;
  let isSilentRefreshingOneDrive = false;
  let onedriveLoginCallback = null;

  async function silentRefreshOneDrive() {
    if (isSilentRefreshingOneDrive) return false;
    const defaultMsClientId = '59ecbd95-c151-4cc4-a50b-3eb0887cca38';
    const clientId = localStorage.getItem('ms_client_id') || defaultMsClientId;
    const redirectUri = window.location.href.split('#')[0].split('?')[0];
    const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=Files.ReadWrite%20User.Read&response_mode=fragment&prompt=none`;

    isSilentRefreshingOneDrive = true;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = authUrl;
    document.body.appendChild(iframe);

    return new Promise((resolve) => {
      let resolved = false;
      const onMsg = (e) => {
        if (e.data && e.data.type === 'ONEDRIVE_AUTH_SUCCESS' && e.data.token) {
          if (!resolved) {
            resolved = true;
            window.removeEventListener('message', onMsg);
            try { iframe.remove(); } catch(e){}
            isSilentRefreshingOneDrive = false;
            resolve(true);
          }
        }
      };
      window.addEventListener('message', onMsg);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener('message', onMsg);
          try { iframe.remove(); } catch(e){}
          isSilentRefreshingOneDrive = false;
          resolve(false);
        }
      }, 7500);
    });
  }

  async function checkCloudAuthStatus() {
    if (currentCloudProvider === 'gdrive') {
      if (gdriveToken) {
        cloudAuthStatus.textContent = 'Connected to Google Drive';
        cloudAuthStatus.style.color = 'var(--text)';
        cloudAuthBtn.textContent = 'Sign Out';
        cloudAuthBtn.className = 'btn small danger';
        loadCloudFileList();
      } else {
        cloudAuthStatus.textContent = 'Google Drive Disconnected';
        cloudAuthStatus.style.color = 'var(--text-dim)';
        cloudAuthBtn.textContent = 'Sign In with Google';
        cloudAuthBtn.className = 'btn small primary';
        if (cloudFileList) cloudFileList.innerHTML = '<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-dim);">Sign in to Google Drive to view and save files</div>';
      }
    } else {
      if (onedriveToken) {
        const savedAt = parseInt(localStorage.getItem('onedrive_token_saved_at') || '0');
        const expiresIn = parseInt(localStorage.getItem('onedrive_token_expires_in') || '3600');
        const ageSec = (Date.now() - savedAt) / 1000;
        if (savedAt > 0 && ageSec > (expiresIn - 600) && !isCheckingOneDriveExpiry) {
          isCheckingOneDriveExpiry = true;
          silentRefreshOneDrive().finally(() => { isCheckingOneDriveExpiry = false; });
        }
        cloudAuthStatus.textContent = 'Connected to OneDrive';
        cloudAuthStatus.style.color = 'var(--text)';
        cloudAuthBtn.textContent = 'Sign Out';
        cloudAuthBtn.className = 'btn small danger';
        loadCloudFileList();
      } else {
        cloudAuthStatus.textContent = 'OneDrive Disconnected';
        cloudAuthStatus.style.color = 'var(--text-dim)';
        cloudAuthBtn.textContent = 'Sign In with Microsoft';
        cloudAuthBtn.className = 'btn small primary';
        if (cloudFileList) cloudFileList.innerHTML = '<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-dim);">Sign in to Microsoft OneDrive to view and save files</div>';
      }
    }
  }

  setInterval(() => {
    if (onedriveToken) {
      checkCloudAuthStatus();
    }
  }, 5 * 60 * 1000);

  if (cloudAuthBtn) {
    cloudAuthBtn.addEventListener('click', () => {
      if (currentCloudProvider === 'gdrive') {
        if (gdriveToken) {
          gdriveToken = null;
          localStorage.removeItem('gdrive_token');
          checkCloudAuthStatus();
          showToast('Signed out of Google Drive');
        } else {
          loginGoogleDrive();
        }
      } else {
        if (onedriveToken) {
          onedriveToken = null;
          localStorage.removeItem('onedrive_token');
          localStorage.removeItem('onedrive_token_saved_at');
          localStorage.removeItem('onedrive_token_expires_in');
          checkCloudAuthStatus();
          showToast('Signed out of OneDrive');
        } else {
          loginOneDrive();
        }
      }
    });
  }

  async function loginGoogleDrive() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      alert('Google Identity Services library loading... Please check your internet connection.');
      return;
    }

    const customClientId = localStorage.getItem('gdrive_custom_client_id');
    const clientId = customClientId || '224808766646-bh7l19slj886iuuost5d05u655fhav8o.apps.googleusercontent.com';

    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive',
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          gdriveToken = tokenResponse.access_token;
          localStorage.setItem('gdrive_token', gdriveToken);
          checkCloudAuthStatus();
          showToast('Signed in to Google Drive');
        } else if (tokenResponse && tokenResponse.error) {
          console.error('Google OAuth error:', tokenResponse);
          alert('Google sign-in was not completed: ' + (tokenResponse.error_description || tokenResponse.error));
        }
      }
    });
    client.requestAccessToken();
  }

  function loginOneDrive(callback) {
    if (typeof callback === 'function') onedriveLoginCallback = callback;
    const defaultMsClientId = '59ecbd95-c151-4cc4-a50b-3eb0887cca38';
    const clientId = localStorage.getItem('ms_client_id') || defaultMsClientId;
    const redirectUri = window.location.href.split('#')[0].split('?')[0];
    const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=Files.ReadWrite%20User.Read&response_mode=fragment&prompt=select_account`;

    const authWindow = window.open(authUrl, 'OneDrive Auth', 'width=520,height=620');
    if (!authWindow) {
      alert('Popup blocked. Please allow popups for OneDrive authentication.');
      return;
    }

    const timer = setInterval(() => {
      try {
        if (authWindow.closed) {
          clearInterval(timer);
          const savedToken = localStorage.getItem('onedrive_token');
          if (savedToken && savedToken !== onedriveToken) {
            onedriveToken = savedToken;
            checkCloudAuthStatus();
            showToast('Signed in to OneDrive');
            if (onedriveLoginCallback) {
              const cb = onedriveLoginCallback;
              onedriveLoginCallback = null;
              cb();
            }
          }
          return;
        }
        if (authWindow.location && authWindow.location.href && authWindow.location.href.includes('access_token=')) {
          const hash = authWindow.location.hash || authWindow.location.search;
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get('access_token');
          const exp = params.get('expires_in');
          if (token) {
            onedriveToken = token;
            localStorage.setItem('onedrive_token', onedriveToken);
            localStorage.setItem('onedrive_token_saved_at', Date.now().toString());
            if (exp) localStorage.setItem('onedrive_token_expires_in', exp);
            try { authWindow.close(); } catch(e){}
            clearInterval(timer);
            checkCloudAuthStatus();
            showToast('Signed in to OneDrive');
            if (onedriveLoginCallback) {
              const cb = onedriveLoginCallback;
              onedriveLoginCallback = null;
              cb();
            }
          }
        }
      } catch (err) {
        // Cross-origin polling expected until redirect completes
      }
    }, 400);
  }

  // Handle postMessage token communication between popup / iframe and main app
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ONEDRIVE_AUTH_SUCCESS' && event.data.token) {
      onedriveToken = event.data.token;
      localStorage.setItem('onedrive_token', onedriveToken);
      localStorage.setItem('onedrive_token_saved_at', Date.now().toString());
      if (event.data.expiresIn) {
        localStorage.setItem('onedrive_token_expires_in', event.data.expiresIn.toString());
      }
      checkCloudAuthStatus();
      showToast('OneDrive connected');
      if (onedriveLoginCallback) {
        const cb = onedriveLoginCallback;
        onedriveLoginCallback = null;
        cb();
      }
    }
  });

  // Extract access token if app was opened/redirected with token in URL fragment
  try {
    const currentHash = window.location.hash;
    if (currentHash && currentHash.includes('access_token=')) {
      const params = new URLSearchParams(currentHash.substring(1));
      const token = params.get('access_token');
      const exp = params.get('expires_in');
      if (token) {
        onedriveToken = token;
        localStorage.setItem('onedrive_token', onedriveToken);
        localStorage.setItem('onedrive_token_saved_at', Date.now().toString());
        if (exp) localStorage.setItem('onedrive_token_expires_in', exp);
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'ONEDRIVE_AUTH_SUCCESS', token: token, expiresIn: exp }, '*');
            window.close();
          } catch(e) {}
        } else if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({ type: 'ONEDRIVE_AUTH_SUCCESS', token: token, expiresIn: exp }, '*');
          } catch(e) {}
        } else {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
      }
    }
  } catch (e) {}

  async function loadCloudFileList() {
    if (!cloudFileList) return;
    cloudFileList.innerHTML = '<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-dim);">Loading cloud files...</div>';

    if (currentCloudProvider === 'gdrive') {
      if (!gdriveToken) return;
      try {
        const targetPath = getTargetFolderPath('gdrive');
        const targetFolderId = getTargetFolderId('gdrive');
        const { id: folderId } = await resolveGoogleDriveFolder(targetPath, targetFolderId);
        if (folderId && folderId !== targetFolderId) {
          localStorage.setItem('gdrive_folder_id', folderId);
        }

        const query = encodeURIComponent(`'${folderId}' in parents and (name contains '.pssproj' or name contains '.json') and trashed = false`);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=50`, {
          headers: { 'Authorization': `Bearer ${gdriveToken}` }
        });
        if (res.status === 401) {
          gdriveToken = null;
          localStorage.removeItem('gdrive_token');
          checkCloudAuthStatus();
          return;
        }
        const data = await res.json();
        renderCloudFileList(data.files || [], 'gdrive');
      } catch (err) {
        console.error(err);
        cloudFileList.innerHTML = '<div style="text-align:center; padding:16px; font-size:12px; color:var(--danger);">Error fetching files from Google Drive</div>';
      }
    } else {
      if (!onedriveToken) return;
      try {
        const targetPath = getTargetFolderPath('onedrive');
        const targetFolderId = getTargetFolderId('onedrive');
        const { id: folderId } = await resolveOneDriveFolder(targetPath, targetFolderId);
        if (folderId && folderId !== targetFolderId) {
          localStorage.setItem('onedrive_folder_id', folderId);
        }

        let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100';
        if (folderId && folderId !== 'root') {
          url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=100`;
        }
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${onedriveToken}` }
        });
        if (res.status === 401) {
          onedriveToken = null;
          localStorage.removeItem('onedrive_token');
          checkCloudAuthStatus();
          return;
        }
        if (res.status === 404) {
          renderCloudFileList([], 'onedrive');
          return;
        }
        const data = await res.json();
        const filtered = (data.value || []).filter(item => item.name.endsWith('.pssproj') || item.name.endsWith('.json'));
        renderCloudFileList(filtered, 'onedrive');
      } catch (err) {
        console.error(err);
        cloudFileList.innerHTML = '<div style="text-align:center; padding:16px; font-size:12px; color:var(--danger);">Error fetching files from OneDrive</div>';
      }
    }
  }

  if (cloudRefreshListBtn) cloudRefreshListBtn.addEventListener('click', loadCloudFileList);

  function renderCloudFileList(files, provider) {
    if (!cloudFileList) return;
    if (files.length === 0) {
      cloudFileList.innerHTML = '<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-dim);">No saved .pssproj files found in target folder</div>';
      return;
    }
    cloudFileList.innerHTML = '';
    files.forEach(file => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:var(--panel); border:1px solid var(--line); border-radius:4px; font-size:12px;';

      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; margin-right:8px; font-weight:500; color:var(--text);';
      nameEl.textContent = file.name;

      const dateStr = file.modifiedTime || file.lastModifiedDateTime || '';
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : '';

      const infoEl = document.createElement('span');
      infoEl.style.cssText = 'font-size:10px; color:var(--text-dim); margin-right:8px; flex-shrink:0;';
      infoEl.textContent = formattedDate;

      const actionsDiv = document.createElement('div');
      actionsDiv.style.cssText = 'display:flex; gap:4px; flex-shrink:0;';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn small primary';
      loadBtn.style.padding = '2px 8px';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => loadCloudFile(file.id || file.name, file.name, provider));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn small danger';
      delBtn.style.padding = '2px 6px';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete file';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete "${file.name}" from ${provider === 'gdrive' ? 'Google Drive' : 'OneDrive'}?`)) {
          return;
        }
        await deleteCloudFile(file.id || file.name, file.name, provider);
      });

      actionsDiv.appendChild(loadBtn);
      actionsDiv.appendChild(delBtn);

      row.appendChild(nameEl);
      row.appendChild(infoEl);
      row.appendChild(actionsDiv);
      cloudFileList.appendChild(row);
    });
  }

  async function deleteCloudFile(fileId, fileName, provider) {
    showToast('Deleting file from cloud...');
    try {
      if (provider === 'gdrive') {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${gdriveToken}` }
        });
        if (res.ok || res.status === 204) {
          showToast(`Deleted "${fileName}" from Google Drive`);
          loadCloudFileList();
        } else {
          throw new Error('Failed to delete file');
        }
      } else {
        const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${onedriveToken}` }
        });
        if (res.ok || res.status === 204) {
          showToast(`Deleted "${fileName}" from OneDrive`);
          loadCloudFileList();
        } else {
          throw new Error('Failed to delete file');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting file from cloud storage.');
    }
  }

  async function loadCloudFile(fileId, fileName, provider) {
    showToast('Downloading project from cloud...');
    try {
      let jsonText = '';
      if (provider === 'gdrive') {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${gdriveToken}` }
        });
        jsonText = await res.text();
      } else {
        const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
          headers: { 'Authorization': `Bearer ${onedriveToken}` }
        });
        jsonText = await res.text();
      }

      let proj;
      try { proj = JSON.parse(jsonText); }
      catch (e) { alert('Failed to parse project file from cloud.'); return; }

      loadProjectData(proj);
      activeSaveLocation = 'cloud';
      currentCloudFileId = fileId;
      currentCloudProviderUsed = provider;
      currentCloudFileName = fileName;
      syncBackupUI();
      closeCloudStorageModal();
      showToast(`Loaded "${fileName}" from Cloud`);
    } catch (err) {
      console.error(err);
      alert('Error downloading file from cloud storage.');
    }
  }

  if (cloudSaveSubmitBtn) {
    cloudSaveSubmitBtn.addEventListener('click', async () => {
      let fileName = cloudSaveFilenameInput.value ? cloudSaveFilenameInput.value.trim() : 'project.pssproj';
      if (!fileName.endsWith('.pssproj') && !fileName.endsWith('.json')) fileName += '.pssproj';

      const projectDataStr = JSON.stringify(buildProjectData());

      showToast('Saving to cloud...');
      if (currentCloudProvider === 'gdrive') {
        if (!gdriveToken) { alert('Please sign in to Google Drive first.'); return; }
        try {
          const targetPath = getTargetFolderPath('gdrive');
          const targetFolderId = getTargetFolderId('gdrive');
          const { id: folderId } = await resolveGoogleDriveFolder(targetPath, targetFolderId);
          if (folderId && folderId !== targetFolderId) {
            localStorage.setItem('gdrive_folder_id', folderId);
          }

          const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: folderId !== 'root' ? [folderId] : undefined
          };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', new Blob([projectDataStr], { type: 'application/json' }));

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gdriveToken}` },
            body: form
          });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          showToast(`Saved "${fileName}" to Google Drive`);
          
          activeSaveLocation = 'cloud';
          currentCloudFileId = data.id;
          currentCloudProviderUsed = 'gdrive';
          currentCloudFileName = fileName;
          syncBackupUI();

          loadCloudFileList();
          await writeBackupCopy();
        } catch (err) {
          console.error(err);
          alert('Failed to save file to Google Drive.');
        }
      } else {
        if (!onedriveToken) { alert('Please sign in to OneDrive first.'); return; }
        try {
          const targetPath = getTargetFolderPath('onedrive');
          const targetFolderId = getTargetFolderId('onedrive');
          const { id: folderId } = await resolveOneDriveFolder(targetPath, targetFolderId);
          if (folderId && folderId !== targetFolderId) {
            localStorage.setItem('onedrive_folder_id', folderId);
          }

          let url;
          if (folderId && folderId !== 'root') {
            url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/content`;
          } else {
            url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(fileName)}:/content`;
          }

          const res = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${onedriveToken}`,
              'Content-Type': 'application/json'
            },
            body: projectDataStr
          });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          showToast(`Saved "${fileName}" to OneDrive`);

          activeSaveLocation = 'cloud';
          currentCloudFileId = data.id || fileName;
          currentCloudProviderUsed = 'onedrive';
          currentCloudFileName = fileName;
          syncBackupUI();

          loadCloudFileList();
          await writeBackupCopy();
        } catch (err) {
          console.error(err);
          alert('Failed to save file to OneDrive.');
        }
      }
    });
  }

  // ---------- Zoom controls ----------
  document.getElementById('zoomInBtn').addEventListener('click', ()=> setZoom(zoom*1.25));
  document.getElementById('zoomOutBtn').addEventListener('click', ()=> setZoom(zoom*0.8));
  document.getElementById('zoomFitBtn').addEventListener('click', ()=> fitCanvasToScreen(true));

  window.addEventListener('resize', ()=> fitCanvasToScreen(false));

  // ---------- Path tool toolbar controls ----------
  document.getElementById('pathCommitAllBtn').addEventListener('click', () => {
    finishCurrentPath();
  });
  document.getElementById('pathCancelAllBtn').addEventListener('click', () => {
    cancelCurrentPath();
  });
  const pathCloseBtn = document.getElementById('pathModalCloseBtn');
  if (pathCloseBtn) {
    pathCloseBtn.addEventListener('click', () => {
      cancelCurrentPath();
    });
  }
  makePopupDraggable(document.getElementById('pathOverlayToolbar'), document.getElementById('pathModalDragHandle'));

  // ---------- Resizable side panels ----------
  function makeResizer(handle, panel, side){
    let dragging = false, startX = 0, startWidth = 0;
    handle.addEventListener('pointerdown', e=>{
      dragging = true;
      startX = e.clientX;
      startWidth = panel.getBoundingClientRect().width;
      handle.classList.add('active');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('pointermove', e=>{
      if(!dragging) return;
      const delta = e.clientX - startX;
      let newWidth = side === 'left' ? startWidth + delta : startWidth - delta;
      newWidth = Math.max(160, Math.min(800, newWidth));
      panel.style.flex = '0 0 ' + newWidth + 'px';
      panel.style.width = newWidth + 'px';
      fitCanvasToScreen(false);
    });
    window.addEventListener('pointerup', ()=>{
      if(dragging){ dragging = false; handle.classList.remove('active'); document.body.style.userSelect = ''; }
    });
  }
  makeResizer(document.getElementById('leftResizer'), document.querySelector('.tools-panel'), 'left');
  makeResizer(document.getElementById('rightResizer'), document.querySelector('.side-panel'), 'right');

  function makeVResizer(handle, target, opts){
    if(!handle || !target) return;
    let dragging = false, startY = 0, startHeight = 0;
    handle.addEventListener('pointerdown', e=>{
      dragging = true;
      startY = e.clientY;
      startHeight = target.getBoundingClientRect().height;
      handle.classList.add('active');
      target.classList.add('resizing');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('pointermove', e=>{
      if(!dragging) return;
      const delta = e.clientY - startY;
      let newHeight = startHeight - delta;
      newHeight = Math.max(opts.min || 80, Math.min(opts.max || 900, newHeight));
      target.style.height = newHeight + 'px';
      if(opts && typeof opts.onResize === 'function') opts.onResize();
    });
    window.addEventListener('pointerup', ()=>{
      if(dragging){
        dragging = false;
        handle.classList.remove('active');
        target.classList.remove('resizing');
        document.body.style.userSelect = '';
      }
    });
  }
  makeVResizer(document.getElementById('layerListResizer'), document.getElementById('layerList'), {min:120, max:900});
  makeVResizer(document.getElementById('frameListResizer'), document.getElementById('frameList'), {min:80, max:600});

  // ---------- Keyboard shortcuts ----------
  window.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && ptrDrag){ cancelSwatchDrag(); return; }
    if(e.key === 'Escape' && stopPtrDrag){ cancelStopDrag(); return; }

    // Ctrl-combo shortcuts always work, even with focus in a text field or dropdown — these
    // key combinations never show up in normal typed text, unlike the single-letter tool
    // shortcuts below, which do need to stay clear of text input.
    if(e.ctrlKey && e.key.toLowerCase()==='z' && e.shiftKey){ e.preventDefault(); redo(); return; }
    if(e.ctrlKey && e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); return; }
    if(e.ctrlKey && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
    if(e.ctrlKey && e.key.toLowerCase()==='s'){ e.preventDefault(); document.getElementById('exportBtn').click(); return; }

    const tag = (e.target.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'select' || tag === 'textarea') return;

    if(e.key === 'Escape' && isPathTool() && pathState !== 'idle'){
      e.preventDefault();
      cancelCurrentPath();
      return;
    }
    if(e.key === 'Enter' && isPathTool() && pathState === 'end_placed'){
      e.preventDefault();
      commitVineSegment([pathPoints[0], pathPoints[1]]);
      return;
    }

    // Canvas copy/paste — deliberately placed after the text-field guard above, so normal
    // text copy/paste inside inputs (e.g. the project name field) is never hijacked.
    if(e.ctrlKey && e.key.toLowerCase()==='v'){ e.preventDefault(); pasteFromClipboard(); return; }
    if(e.ctrlKey && e.key.toLowerCase()==='c'){ e.preventDefault(); copySelectionToClipboard(); return; }

    if(e.code === 'Space' && toolBeforeSpace === null){
      toolBeforeSpace = tool;
      displayCanvas.classList.add('pan-cursor');
      canvasWrap.classList.add('pan-cursor');
      e.preventDefault();
      return;
    }

    if(e.key === 'b' || e.key === 'B' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P') setTool('spray');
    if(e.key === 'e' || e.key === 'E'){ setTool('spray'); sprayMode = 'eraser'; updateSprayModeUI(); syncActivePresetSettings(); }
    if(e.key === 'c' || e.key === 'C'){ setTool('spray'); sprayMode = 'colorize'; updateSprayModeUI(); syncActivePresetSettings(); }
    if(e.key === 'g' || e.key === 'G') setTool('vine');
    if(e.key === 'k' || e.key === 'K') setTool('colorpick');
    if(e.key === 'h' || e.key === 'H') setTool('pan');
    if(e.key === 'm' || e.key === 'M') setTool('select');
    if(e.key === 'r' || e.key === 'R') setTool('measure');
    if(e.key === 'l' || e.key === 'L'){ setLightingPreviewEnabled(!lightingPreviewEnabled); }
    if(e.key === 'Delete'){ e.preventDefault(); clearLayerOrSelection(); }
    if(e.key === '['){ brushSize = Math.max(1, brushSize-4); document.getElementById('sizeSlider').value = brushSize; document.getElementById('sizeVal').textContent = brushSize; updateBrushPixelPerfectAvailability(); syncActivePresetSettings(); }
    if(e.key === ']'){ brushSize = Math.min(150, brushSize+4); document.getElementById('sizeSlider').value = brushSize; document.getElementById('sizeVal').textContent = brushSize; updateBrushPixelPerfectAvailability(); syncActivePresetSettings(); }
    if(e.key === '0'){ fitCanvasToScreen(true); }
    if(e.key === '1'){ setZoom(1); }
    if(e.key === '+' || e.key === '='){ setZoom(zoom*1.25); }
    if(e.key === '-'){ setZoom(zoom*0.8); }
  });
  window.addEventListener('keyup', e=>{
    if(e.code === 'Space' && toolBeforeSpace !== null){
      const prev = toolBeforeSpace;
      toolBeforeSpace = null;
      displayCanvas.classList.toggle('pan-cursor', prev==='pan');
      canvasWrap.classList.toggle('pan-cursor', prev==='pan');
      e.preventDefault();
    }
  });

  // ---------- Slider steppers (+/- buttons on every range input) ----------
  function applyStepper(slider){
    if(slider.dataset.stepperApplied || !slider.parentNode || slider.closest('.dual-range-wrap')) return;
    slider.dataset.stepperApplied = '1';
    const wrap = document.createElement('div');
    wrap.className = 'stepper-wrap';
    slider.parentNode.insertBefore(wrap, slider);
    const minus = document.createElement('button');
    minus.type = 'button'; minus.className = 'stepper-btn'; minus.textContent = '−';
    const plus = document.createElement('button');
    plus.type = 'button'; plus.className = 'stepper-btn'; plus.textContent = '+';
    wrap.appendChild(minus);
    wrap.appendChild(slider);
    wrap.appendChild(plus);
    function step(dir){
      const st = +slider.step || 1;
      const min = slider.min !== '' ? +slider.min : -Infinity;
      const max = slider.max !== '' ? +slider.max : Infinity;
      let v = (+slider.value || 0) + dir*st;
      v = Math.max(min, Math.min(max, v));
      slider.value = v;
      slider.dispatchEvent(new Event('input', {bubbles:true}));
    }
    minus.addEventListener('click', ()=> step(-1));
    plus.addEventListener('click', ()=> step(1));
  }

  // Margin scratchpad fade: subtract a fixed alpha amount from every painted pixel on a
  // steady tick. Linear rather than exponential — each mark reaches exactly zero alpha in a
  // predictable, finite time instead of asymptotically approaching it. Only ever touches the
  // alpha channel, never color, avoiding any compositing-related tint from the erase itself.
  const MF_TICK_MS = 200;
  const MF_FADE_MS = 10000;
  const MF_SUBTRACT_PER_TICK = 255 * (MF_TICK_MS / MF_FADE_MS);
  let mfFadeAccumulator = 0;
  setInterval(()=>{
    if(!marginHasContent) return; // nothing to fade — skip the scan entirely
    mfFadeAccumulator += MF_SUBTRACT_PER_TICK;
    const subtractAmount = Math.floor(mfFadeAccumulator);
    if(subtractAmount < 1) return;
    mfFadeAccumulator -= subtractAmount;
    try {
      const imgData = mfCtx.getImageData(0,0,marginFadeCanvas.width,marginFadeCanvas.height);
      const d = imgData.data;
      let changed = false;
      for(let i=3;i<d.length;i+=4){
        if(d[i] > 0){
          d[i] = Math.max(0, d[i] - subtractAmount);
          changed = true;
        }
      }
      if(changed){
        mfCtx.putImageData(imgData,0,0);
      } else {
        marginHasContent = false; // fully faded — stop scanning until something new is painted
      }
    } catch(e){ /* non-critical, skip this tick on error */ }
  }, MF_TICK_MS);

  // Defensive safeguard: periodically force the visible canvas to redraw from the real
  // layer data, independent of whatever triggered the last paint action. This guards
  // against the display ever going visually stale relative to the permanent layer content.
  setInterval(()=> render(), 400);

  // ---------- Panel Section Manager (Pin & Move Up/Down) ----------
  function initPanelSectionManager() {
    const leftPanel = document.querySelector('.tools-panel');
    const rightPanel = document.querySelector('.side-panel');

    function setupPanel(panelEl, storageKey) {
      if (!panelEl) return;
      const sections = [...panelEl.querySelectorAll('.section[data-section-id]')];
      if (sections.length === 0) return;

      sections.forEach(sec => {
        let hdr = sec.querySelector('.sec-hdr');
        if (!hdr) {
          hdr = document.createElement('div');
          hdr.className = 'sec-hdr';

          const h3 = sec.querySelector('h3');
          const titleWrap = document.createElement('div');
          titleWrap.className = 'sec-hdr-title';

          if (h3) {
            titleWrap.appendChild(h3);
          } else {
            const defaultH3 = document.createElement('h3');
            defaultH3.textContent = sec.dataset.title || 'Section';
            titleWrap.appendChild(defaultH3);
          }

          const ctrls = document.createElement('div');
          ctrls.className = 'sec-hdr-ctrls';

          const pinBtn = document.createElement('button');
          pinBtn.className = 'sec-btn sec-pin-btn';
          pinBtn.title = 'Pin section to top';
          pinBtn.textContent = '📌';

          const upBtn = document.createElement('button');
          upBtn.className = 'sec-btn sec-up-btn';
          upBtn.title = 'Move section up';
          upBtn.textContent = '▲';

          const downBtn = document.createElement('button');
          downBtn.className = 'sec-btn sec-down-btn';
          downBtn.title = 'Move section down';
          downBtn.textContent = '▼';

          ctrls.appendChild(pinBtn);
          ctrls.appendChild(upBtn);
          ctrls.appendChild(downBtn);

          hdr.appendChild(titleWrap);
          hdr.appendChild(ctrls);

          sec.insertBefore(hdr, sec.firstChild);

          const id = sec.dataset.sectionId;
          pinBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            toggleSectionPin(panelEl, storageKey, id);
          });
          upBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            moveSection(panelEl, storageKey, id, -1);
          });
          downBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            moveSection(panelEl, storageKey, id, 1);
          });
        }
      });

      renderPanelOrder(panelEl, storageKey);
    }

    function getSavedState(storageKey, defaultIds) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return defaultIds.map(id => ({ id, pinned: false }));
    }

    function saveState(storageKey, stateArray) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(stateArray));
      } catch (e) {}
    }

    function renderPanelOrder(panelEl, storageKey) {
      const secEls = [...panelEl.querySelectorAll('.section[data-section-id]')];
      const defaultIds = secEls.map(s => s.dataset.sectionId);
      let state = getSavedState(storageKey, defaultIds);

      const presentIds = new Set(defaultIds);
      state = state.filter(item => presentIds.has(item.id));
      const inState = new Set(state.map(item => item.id));
      defaultIds.forEach(id => {
        if (!inState.has(id)) state.push({ id, pinned: false });
      });

      const pinnedList = state.filter(s => s.pinned);
      const unpinnedList = state.filter(s => !s.pinned);
      const orderedState = [...pinnedList, ...unpinnedList];

      saveState(storageKey, orderedState);

      const secMap = new Map(secEls.map(el => [el.dataset.sectionId, el]));
      orderedState.forEach((item) => {
        const el = secMap.get(item.id);
        if (el) {
          panelEl.appendChild(el);

          if (item.pinned) {
            el.classList.add('pinned-section');
          } else {
            el.classList.remove('pinned-section');
          }

          const pinBtn = el.querySelector('.sec-pin-btn');
          if (pinBtn) {
            if (item.pinned) {
              pinBtn.classList.add('active');
              pinBtn.title = 'Unpin section';
            } else {
              pinBtn.classList.remove('active');
              pinBtn.title = 'Pin section to top';
            }
          }

          const upBtn = el.querySelector('.sec-up-btn');
          const downBtn = el.querySelector('.sec-down-btn');

          const group = item.pinned ? pinnedList : unpinnedList;
          const posInGroup = group.findIndex(g => g.id === item.id);

          if (upBtn) upBtn.disabled = (posInGroup <= 0);
          if (downBtn) downBtn.disabled = (posInGroup >= group.length - 1);
        }
      });
    }

    function toggleSectionPin(panelEl, storageKey, id) {
      const secEls = [...panelEl.querySelectorAll('.section[data-section-id]')];
      const defaultIds = secEls.map(s => s.dataset.sectionId);
      let state = getSavedState(storageKey, defaultIds);

      const target = state.find(s => s.id === id);
      if (target) {
        target.pinned = !target.pinned;
        state = state.filter(s => s.id !== id);
        if (target.pinned) {
          const lastPinnedIndex = state.reduce((acc, curr, idx) => curr.pinned ? idx : acc, -1);
          state.splice(lastPinnedIndex + 1, 0, target);
        } else {
          const firstUnpinnedIndex = state.findIndex(s => !s.pinned);
          if (firstUnpinnedIndex !== -1) {
            state.splice(firstUnpinnedIndex, 0, target);
          } else {
            state.push(target);
          }
        }
        saveState(storageKey, state);
        renderPanelOrder(panelEl, storageKey);
      }
    }

    function moveSection(panelEl, storageKey, id, delta) {
      const secEls = [...panelEl.querySelectorAll('.section[data-section-id]')];
      const defaultIds = secEls.map(s => s.dataset.sectionId);
      let state = getSavedState(storageKey, defaultIds);

      const idx = state.findIndex(s => s.id === id);
      if (idx === -1) return;

      const item = state[idx];
      const targetIdx = idx + delta;

      if (targetIdx >= 0 && targetIdx < state.length) {
        const neighbor = state[targetIdx];
        if (neighbor.pinned === item.pinned) {
          state[idx] = neighbor;
          state[targetIdx] = item;
          saveState(storageKey, state);
          renderPanelOrder(panelEl, storageKey);
        }
      }
    }

    setupPanel(leftPanel, 'pixelart_panel_sections_left');
    setupPanel(rightPanel, 'pixelart_panel_sections_right');
  }

  // ---------- Init ----------
  resizeAllCanvasesToWH();
  syncDocCompositeCanvasSize();
  initPixiForStamps();
  setTool(tool); // sync the options panel to whichever tool is actually active by default
  updateBrushPixelPerfectAvailability();
  document.querySelectorAll('input[type=range]').forEach(applyStepper);
  updateSelectionUI();
  const defaultWhiteIdx = allColors().indexOf('#ffffff');
  selectPaletteIndex(defaultWhiteIdx !== -1 ? defaultWhiteIdx : 0);
  refreshGroups();
  addLayer('Layer 1', null, true);
  frames = [makeFrame('Frame ' + frameIdCounter, layers, 0)];
  currentFrameIndex = 0;
  refreshFramesPanel();
  fitCanvasToScreen(true);
  centerCanvas();
  let startupFitDone = false;
  if (window.ResizeObserver && canvasWrap) {
    const mainWrapRO = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.contentRect.height > 150 && !startupFitDone) {
          startupFitDone = true;
          fitCanvasToScreen(true);
          centerCanvas();
        }
      }
    });
    mainWrapRO.observe(canvasWrap);
  }
  setTimeout(() => {
    fitCanvasToScreen(true);
    centerCanvas();
  }, 100);
  centerCanvas();
  fitSidePanelToPalette();
  updateHistoryButtons();
  refreshGradientList();
  populateGradientSourceDropdown();
  populatePalettizeGradientDropdown();
  initDefaultSvgStamps();
  refreshStampList();
  populateStampDropdown();
  refreshVinePresetList();
  if (activeVinePresetId) {
    const defaultPreset = vinePresets.find(p => p.id === activeVinePresetId);
    if (defaultPreset) applyVinePreset(defaultPreset);
  }
  initMatrixTimeline();
  refreshGridPanel();
  drawGridOverlay();
  refreshMatrixTimeline();
  initPanelSectionManager();
  syncBackupUI();

  (function initDelayedTooltips(){
    const tooltipEl = document.createElement('div');
    tooltipEl.id = 'customHoverTooltip';
    tooltipEl.style.cssText = 'position:fixed; z-index:99999; display:none; max-width:280px; padding:6px 10px; background:#181824; border:1px solid var(--accent, #4f46e5); border-radius:6px; color:#f1f5f9; font-size:11px; line-height:1.4; box-shadow:0 8px 24px rgba(0,0,0,0.7); pointer-events:none; word-wrap:break-word; font-family:sans-serif;';
    document.body.appendChild(tooltipEl);

    let hoverTimer = null;
    let activeTarget = null;

    function hideTooltip(){
      if(hoverTimer){
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      tooltipEl.style.display = 'none';
      activeTarget = null;
    }

    function showTooltip(target, text){
      if(!text) return;
      tooltipEl.innerHTML = text;
      tooltipEl.style.display = 'block';

      const rect = target.getBoundingClientRect();
      let left = rect.right + 10;
      let top = rect.top + (rect.height / 2) - (tooltipEl.offsetHeight / 2);

      if(left + tooltipEl.offsetWidth > window.innerWidth - 10){
        left = rect.left - tooltipEl.offsetWidth - 10;
      }
      if(left < 10){
        left = Math.max(10, rect.left);
        top = rect.bottom + 8;
      }

      if(top + tooltipEl.offsetHeight > window.innerHeight - 10){
        top = window.innerHeight - tooltipEl.offsetHeight - 10;
      }
      if(top < 10) top = 10;

      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top = top + 'px';
    }

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip], [title]');
      if(!target) {
        if(activeTarget) hideTooltip();
        return;
      }
      if(target === activeTarget) return;

      hideTooltip();
      activeTarget = target;

      let text = target.getAttribute('data-tooltip');
      if(!text && target.hasAttribute('title')){
        text = target.getAttribute('title');
        target.setAttribute('data-tooltip', text);
        target.removeAttribute('title');
      }

      if(!text) return;

      hoverTimer = setTimeout(() => {
        showTooltip(target, text);
      }, appSettings.tooltipDelay * 1000);
    });

    document.addEventListener('mouseout', (e) => {
      if(activeTarget && !activeTarget.contains(e.relatedTarget)){
        hideTooltip();
      }
    });

    document.addEventListener('mousedown', hideTooltip);
    window.addEventListener('scroll', hideTooltip, true);
  })();
})();

// ---------- Progressive Web App (PWA) Register & Install logic ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
      .catch((err) => console.warn("Service Worker registration failed:", err));
  });
}

let deferredPrompt = null;
const pwaInstallBtn = document.getElementById("pwaInstallBtn");
const pwaDivider = document.getElementById("pwaDivider");
const isPwaStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator && window.navigator.standalone === true);

if (!isPwaStandalone) {
  if (pwaInstallBtn) pwaInstallBtn.style.display = "block";
  if (pwaDivider) pwaDivider.style.display = "block";
}

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent default install bar
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI to show install button
  if (pwaInstallBtn) pwaInstallBtn.style.display = "block";
  if (pwaDivider) pwaDivider.style.display = "block";
});

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener("click", () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }
        deferredPrompt = null;
        pwaInstallBtn.style.display = "none";
        if (pwaDivider) pwaDivider.style.display = "none";
      });
    } else {
      if (typeof showToast === 'function') {
        showToast("To install, use the Install option in your browser menu (or the icon in the address bar).");
      }
    }
  });
}

window.addEventListener("appinstalled", () => {
  console.log("PWA was installed");
  deferredPrompt = null;
  if (pwaInstallBtn) pwaInstallBtn.style.display = "none";
  if (pwaDivider) pwaDivider.style.display = "none";
});
