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
      captureCurrentFrameState();
      function transformCanvas(srcCanvas){
        const c = document.createElement('canvas');
        c.width = newW; c.height = newH;
        const ctx = c.getContext('2d');
        if(scaleContent){
          ctx.drawImage(srcCanvas, 0, 0, newW, newH);
        } else {
          const {dx, dy} = computeAnchorOffset(scaleProjectAnchorRow, scaleProjectAnchorCol, W, H, newW, newH);
          ctx.drawImage(srcCanvas, dx, dy);
        }
        return c;
      }
      frames.forEach(frame=>{
        frame.layers.forEach(layer=>{
          const newColor = transformCanvas(layer.colorCanvas);
          layer.colorCanvas = newColor;
          layer.colorCtx = newColor.getContext('2d');
          if(layer.heightCanvas){
            const newHeight = transformCanvas(layer.heightCanvas);
            layer.heightCanvas = newHeight;
            layer.heightCtx = newHeight.getContext('2d');
          }
          if(layer.roughnessCanvas){
            const newRoughness = transformCanvas(layer.roughnessCanvas);
            layer.roughnessCanvas = newRoughness;
            layer.roughnessCtx = newRoughness.getContext('2d');
          }
          layer.canvas = layer.colorCanvas;
          layer.ctx = layer.colorCtx;
        });
        frame.undoStack = [];
        frame.redoStack = [];
      });
      W = newW; H = newH;
      resizeAllCanvasesToWH();
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
      render();
      closeScaleProjectPopup();
      showToast('Project resized to ' + newW + '×' + newH);
    });
  });
