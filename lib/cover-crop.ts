import type { CoverCrop } from '../content/projects/types';

export const cropTransform = (crop: CoverCrop['normal']) =>
  `translate(${(50 - crop.x) * (crop.scale - 1)}%, ${(50 - crop.y) * (crop.scale - 1)}%) scale(${crop.scale})`;
