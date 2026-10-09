// Cross-dissolve at the Part hand-over. The outgoing Part's last frame is
// copied onto an overlay canvas and faded out over the incoming Part, so the
// small differences between the two hand-over spheres (refraction, highlight
// placement, flow pattern) blend instead of cutting in one frame.
export const handoff = { request: false, overlay: null, duration: 250 };

// Wraps renderer.render: right after the on-screen render of the frame that
// requested it, copies the canvas to the overlay and starts the fade.
export function installHandoffDissolve(gl) {
  const render = gl.render.bind(gl);
  gl.render = (scene, camera) => {
    render(scene, camera);
    const overlay = handoff.overlay;
    if (!handoff.request || !overlay || gl.getRenderTarget() !== null) return;
    handoff.request = false;
    const source = gl.domElement;
    if (overlay.width !== source.width || overlay.height !== source.height) {
      overlay.width = source.width;
      overlay.height = source.height;
    }
    // Same task as the render, so the drawing buffer still holds this frame.
    const context = overlay.getContext("2d");
    context.clearRect(0, 0, overlay.width, overlay.height);
    context.drawImage(source, 0, 0);
    overlay.style.transition = "none";
    overlay.style.opacity = "1";
    // Let the incoming Part draw its first frame underneath, then fade.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        overlay.style.transition = `opacity ${handoff.duration}ms cubic-bezier(.45,0,.25,1)`;
        overlay.style.opacity = "0";
      }),
    );
  };
}
