  let noBlendStencilCanvas = null, noBlendStencilCtx = null;
  function paintNoBlend(realCtx, cw, ch, bx, by, bw, bh, drawFn, colorHex){
    bx = Math.floor(bx); by = Math.floor(by);
    bw = Math.ceil(bw); bh = Math.ceil(bh);
    if(bw <= 0 || bh <= 0) return;
    if(!noBlendScratchCanvas){
      noBlendScratchCanvas = document.createElement('canvas');
      noBlendScratchCtx = noBlendScratchCanvas.getContext('2d');
      noBlendStencilCanvas = document.createElement('canvas');
      noBlendStencilCtx = noBlendStencilCanvas.getContext('2d');
    }
    if(noBlendScratchCanvas.width !== bw || noBlendScratchCanvas.height !== bh){
      noBlendScratchCanvas.width = bw;
      noBlendScratchCanvas.height = bh;
      noBlendStencilCanvas.width = bw;
      noBlendStencilCanvas.height = bh;
    } else {
      noBlendScratchCtx.clearRect(0, 0, bw, bh);
      noBlendStencilCtx.clearRect(0, 0, bw, bh);
    }

    // 1. Draw stencil on noBlendStencilCanvas with forced 100% opacity
    noBlendStencilCtx.save();
    noBlendStencilCtx.translate(-bx, -by);
    const stencilProxy = new Proxy(noBlendStencilCtx, {
      set(target, prop, value){
        target[prop] = (prop === 'globalAlpha') ? 1 : value;
        return true;
      },
      get(target, prop){
        const v = target[prop];
        return (typeof v === 'function') ? v.bind(target) : v;
      }
    });
    drawFn(stencilProxy);
    noBlendStencilCtx.restore();

    // 2. Draw actual shape on noBlendScratchCanvas with correct opacity/color
    noBlendScratchCtx.save();
    noBlendScratchCtx.translate(-bx, -by);
    drawFn(noBlendScratchCtx);
    noBlendScratchCtx.restore();

    // 3. Composite onto realCtx
    realCtx.save();
    realCtx.globalCompositeOperation = 'destination-out';
    realCtx.drawImage(noBlendStencilCanvas, bx, by);
    realCtx.globalCompositeOperation = 'source-over';
    realCtx.drawImage(noBlendScratchCanvas, bx, by);
    realCtx.restore();
  }

  function paintCombineSameColor(realCtx, cw, ch, bx, by, bw, bh, colorHex, opacityVal, drawFn){
    bx = Math.floor(bx); by = Math.floor(by);
    bw = Math.ceil(bw); bh = Math.ceil(bh);
    if(bw <= 0 || bh <= 0) return;

    if(!noBlendScratchCanvas){
      noBlendScratchCanvas = document.createElement('canvas');
      noBlendScratchCtx = noBlendScratchCanvas.getContext('2d');
      noBlendStencilCanvas = document.createElement('canvas');
      noBlendStencilCtx = noBlendStencilCanvas.getContext('2d');
    }
    if(noBlendScratchCanvas.width !== bw || noBlendScratchCanvas.height !== bh){
      noBlendScratchCanvas.width = bw; noBlendScratchCanvas.height = bh;
      noBlendStencilCanvas.width = bw; noBlendStencilCanvas.height = bh;
    } else {
      noBlendScratchCtx.clearRect(0, 0, bw, bh);
      noBlendStencilCtx.clearRect(0, 0, bw, bh);
    }

    noBlendStencilCtx.save();
    noBlendStencilCtx.translate(-bx, -by);
    const stencilProxy = new Proxy(noBlendStencilCtx, {
      set(target, prop, value){ target[prop] = (prop === 'globalAlpha') ? 1 : value; return true; },
      get(target, prop){ const v = target[prop]; return (typeof v === 'function') ? v.bind(target) : v; }
    });
    drawFn(stencilProxy);
    noBlendStencilCtx.restore();
    const stencilData = noBlendStencilCtx.getImageData(0, 0, bw, bh).data;

    noBlendScratchCtx.save();
    noBlendScratchCtx.translate(-bx, -by);
    drawFn(noBlendScratchCtx);
    noBlendScratchCtx.restore();
    const scratchData = noBlendScratchCtx.getImageData(0, 0, bw, bh).data;

    const rx0 = Math.max(0, bx), ry0 = Math.max(0, by);
    const rx1 = Math.min(cw, bx+bw), ry1 = Math.min(ch, by+bh);
    if(rx1 <= rx0 || ry1 <= ry0) return;
    const rw = rx1-rx0, rh = ry1-ry0;
    const realImg = realCtx.getImageData(rx0, ry0, rw, rh);
    const realData = realImg.data;
    const sRgb = hexToRgb(colorHex);

    for(let yy=0; yy<rh; yy++){
      for(let xx=0; xx<rw; xx++){
        const sx = (rx0+xx)-bx, sy = (ry0+yy)-by;
        const sIdx = (sy*bw+sx)*4;
        if(stencilData[sIdx+3] === 0) continue;

        const rIdx = (yy*rw+xx)*4;
        const sA = scratchData[sIdx+3];
        const tA = realData[rIdx+3];

        let isSameColor = false;
        if (tA > 0) {
          const rDiff = Math.abs(realData[rIdx] - sRgb.r);
          const gDiff = Math.abs(realData[rIdx+1] - sRgb.g);
          const bDiff = Math.abs(realData[rIdx+2] - sRgb.b);
          const maxDiff = tA < 30 ? 50 : (tA < 80 ? 30 : 15);
          isSameColor = (rDiff <= maxDiff && gDiff <= maxDiff && bDiff <= maxDiff);
        }

        if(tA === 0){
          realData[rIdx]   = sRgb.r;
          realData[rIdx+1] = sRgb.g;
          realData[rIdx+2] = sRgb.b;
          realData[rIdx+3] = sA;
        } else if(isSameColor){
          const finalA = Math.min(255, Math.round(tA + sA * (1 - tA/255)));
          realData[rIdx]   = sRgb.r;
          realData[rIdx+1] = sRgb.g;
          realData[rIdx+2] = sRgb.b;
          realData[rIdx+3] = finalA;
        } else {
          // Different colors: standard source-over blend
          const alphaOut = sA + tA * (1 - sA/255);
          if (alphaOut > 0) {
            realData[rIdx]   = Math.round((sRgb.r * sA + realData[rIdx] * tA * (1 - sA/255)) / alphaOut);
            realData[rIdx+1] = Math.round((sRgb.g * sA + realData[rIdx+1] * tA * (1 - sA/255)) / alphaOut);
            realData[rIdx+2] = Math.round((sRgb.b * sA + realData[rIdx+2] * tA * (1 - sA/255)) / alphaOut);
            realData[rIdx+3] = Math.round(alphaOut);
          }
        }
      }
    }
    realCtx.putImageData(realImg, rx0, ry0);
  }

  function paintEraserDab(realCtx, cw, ch, bx, by, bw, bh, drawFn){
    bx = Math.floor(bx); by = Math.floor(by);
    bw = Math.ceil(bw); bh = Math.ceil(bh);
    if(bw <= 0 || bh <= 0) return;

    if(!noBlendStencilCanvas){
      noBlendStencilCanvas = document.createElement('canvas');
      noBlendStencilCtx = noBlendStencilCanvas.getContext('2d');
    }
    if(noBlendStencilCanvas.width !== bw || noBlendStencilCanvas.height !== bh){
      noBlendStencilCanvas.width = bw; noBlendStencilCanvas.height = bh;
    } else {
      noBlendStencilCtx.clearRect(0, 0, bw, bh);
    }

    noBlendStencilCtx.save();
    noBlendStencilCtx.translate(-bx, -by);
    drawFn(noBlendStencilCtx);
    noBlendStencilCtx.restore();

    realCtx.save();
    realCtx.globalCompositeOperation = 'destination-out';
    realCtx.drawImage(noBlendStencilCanvas, bx, by);
