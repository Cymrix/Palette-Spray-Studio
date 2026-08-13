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
      captureCurrentFrameState();
      const sx = selection.x, sy = selection.y, sw = selection.w, sh = selection.h;
      function cropCanvas(srcCanvas){
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        c.getContext('2d').drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
        return c;
      }
      frames.forEach(frame=>{
        frame.layers.forEach(layer=>{
          const newColor = cropCanvas(layer.colorCanvas);
          layer.colorCanvas = newColor;
          layer.colorCtx = newColor.getContext('2d');
          if(layer.heightCanvas){
            const newHeight = cropCanvas(layer.heightCanvas);
            layer.heightCanvas = newHeight;
            layer.heightCtx = newHeight.getContext('2d');
          }
          if(layer.roughnessCanvas){
            const newRoughness = cropCanvas(layer.roughnessCanvas);
            layer.roughnessCanvas = newRoughness;
            layer.roughnessCtx = newRoughness.getContext('2d');
          }
          layer.canvas = layer.colorCanvas;
          layer.ctx = layer.colorCtx;
        });
        frame.undoStack = [];
        frame.redoStack = [];
      });
      W = sw; H = sh;
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
      showToast('Project cropped to ' + sw + '\u00d7' + sh);
    });
  }
