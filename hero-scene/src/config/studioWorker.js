import { generateStudio, studioSize } from "./studioPixels.js";

// Builds studio pixels off the main thread (see prepareStudios).
self.onmessage = ({ data: theme }) => {
  const pixels = generateStudio(theme, studioSize.width, studioSize.height);
  self.postMessage({ theme, pixels }, [pixels.buffer]);
};
