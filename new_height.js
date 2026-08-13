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
