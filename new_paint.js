  let noBlendScratchCanvas = null, noBlendScratchCtx = null;
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

    const sRgb = colorHex ? hexToRgb(colorHex) : null;

    for(let yy=0; yy<rh; yy++){
      for(let xx=0; xx<rw; xx++){
        const sx = (rx0+xx)-bx, sy = (ry0+yy)-by;
        const sIdx = (sy*bw+sx)*4;
        const stencilA = stencilData[sIdx+3];
        if(stencilA === 0) continue;

        const rIdx = (yy*rw+xx)*4;
        const sA = scratchData[sIdx+3];
        const tA = realData[rIdx+3];

        const outA = tA * (1 - stencilA/255);
        const finalA = sA + outA * (1 - sA/255);

        if(finalA > 0){
          if(sRgb){
            realData[rIdx]   = sRgb.r;
            realData[rIdx+1] = sRgb.g;
            realData[rIdx+2] = sRgb.b;
          } else {
            // Strict replacement without blending RGB when colorHex is missing
            const sR = scratchData[sIdx], sG = scratchData[sIdx+1], sB = scratchData[sIdx+2];
            realData[rIdx]   = sR;
            realData[rIdx+1] = sG;
            realData[rIdx+2] = sB;
          }
          realData[rIdx+3] = Math.round(finalA);
        }
      }
    }
    realCtx.putImageData(realImg, rx0, ry0);
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

        const finalA = sA + tA * (1 - sA/255);
        if(finalA > 0){
          realData[rIdx]   = sRgb.r;
          realData[rIdx+1] = sRgb.g;
          realData[rIdx+2] = sRgb.b;
          realData[rIdx+3] = Math.round(finalA);
        }
      }
    }
    realCtx.putImageData(realImg, rx0, ry0);
  }
