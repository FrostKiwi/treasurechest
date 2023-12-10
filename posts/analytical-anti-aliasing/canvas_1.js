const canvas = document.querySelector("canvas");
const gl = ctx.canvas.getContext('webgl', { preserveDrawingBuffer: false });
const resizeObserver = new ResizeObserver(onResize);
resizeObserver.observe(ctx.canvas, { box: 'content-box' });
