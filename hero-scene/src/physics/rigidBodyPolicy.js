export function setMainBodyTranslationLock(body, locked) {
  body.setEnabledTranslations(!locked, !locked, !locked, true);
  if (locked) body.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

export function setMainBodyRotationLock(body, locked) {
  body.setEnabledRotations(!locked, !locked, !locked, true);
  if (locked) body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
