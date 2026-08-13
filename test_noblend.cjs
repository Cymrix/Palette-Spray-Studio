const { createCanvas } = require('canvas');
const realCanvas = createCanvas(10, 10);
const realCtx = realCanvas.getContext('2d');

realCtx.fillStyle = 'rgba(0,0,255,1)';
realCtx.fillRect(0,0,10,10);

const stencil = createCanvas(10,10);
const stencilCtx = stencil.getContext('2d');
stencilCtx.fillStyle = 'rgba(255,255,255,1)'; // stencil with alpha 1
stencilCtx.fillRect(0,0,10,10);

const scratch = createCanvas(10,10);
const scratchCtx = scratch.getContext('2d');
scratchCtx.fillStyle = 'rgba(255,100,0,0.5)'; // brush with alpha 0.5
scratchCtx.fillRect(0,0,10,10);

realCtx.globalCompositeOperation = 'destination-out';
realCtx.drawImage(stencil, 0,0);
realCtx.globalCompositeOperation = 'source-over';
realCtx.drawImage(scratch, 0,0);

const data = realCtx.getImageData(0,0,1,1).data;
console.log("Resulting pixel:", data);
