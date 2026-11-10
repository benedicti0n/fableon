(async () => {
  const payload = window.__STAGE2C4_PAYLOAD;
  const decode = async (b64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + b64;
    await image.decode();
    return image;
  };
  const partMap = new Map();
  for (const part of payload.parts) {
    partMap.set(part.id, {
      id: part.id,
      image: await decode(part.base64),
      offsetX: part.offsetX,
      offsetY: part.offsetY,
      width: part.width,
      height: part.height,
      sha256: part.sha256 || "",
    });
  }
  const backgroundMap = new Map();
  for (const [id, bg] of Object.entries(payload.backgrounds)) {
    backgroundMap.set(
      id,
      await Promise.all(
        bg.layers.map(async (layer) => ({
          id,
          image: await decode(layer.base64),
          depth: layer.depth,
          opacity: layer.opacity,
          ...(layer.drawX !== undefined ? { drawX: layer.drawX } : {}),
          ...(layer.drawY !== undefined ? { drawY: layer.drawY } : {}),
          ...(layer.drawWidth !== undefined ? { drawWidth: layer.drawWidth } : {}),
          ...(layer.drawHeight !== undefined ? { drawHeight: layer.drawHeight } : {}),
        })),
      ),
    );
  }
  const api = globalThis.FableonStage2C4;
  const renderer = new api.FolkRenderer(
    { manifest: {}, parts: partMap, backgrounds: backgroundMap },
    payload.config,
  );
  window.__stage2c4 = {
    render: (frame, width, height) => renderer.renderFrameDataUrl(frame, width, height),
    renderRig: (frame, node, extra, width, height) =>
      renderer.renderRigTestDataUrl(frame, width, height, "artisan", node, extra),
  };
  window.__ready = true;
})().catch((error) => {
  window.__stage2c4Error = error instanceof Error ? error.message : String(error);
});
