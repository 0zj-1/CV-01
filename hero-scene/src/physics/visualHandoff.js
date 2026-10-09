// Let the visible mesh follow a physics correction without exposing Rapier's
// one-step penetration resolution as a sudden pop.
export function advanceVisualPose(position, rotation, targetPosition, targetRotation, dt) {
  const alpha = 1 - Math.exp(-Math.min(dt, 0.05) / 0.2);
  position.lerp(targetPosition, alpha);
  rotation.slerp(targetRotation, alpha);
}

export function localVisualPose(bodyPosition, bodyRotation, visualPosition, visualRotation, outPosition, outRotation) {
  inverse.copy(bodyRotation).invert();
  outPosition.copy(visualPosition).sub(bodyPosition).applyQuaternion(inverse);
  outRotation.copy(inverse).multiply(visualRotation);
}

export function continueExitPose(startPosition, startRotation, orbitDelta, outPosition, outRotation) {
  outPosition.copy(startPosition).applyQuaternion(orbitDelta);
  outRotation.copy(orbitDelta).multiply(startRotation);
}
import { Quaternion, Vector3 } from "three";

const inverse = new Quaternion();

const carrySpin = new Quaternion();
const carryAxis = new Vector3();
// Display-phase momentum keeps moving into the exit and fades out, instead of
// every piece freezing on the last display frame.
export const exitCarryTime = 0.5;
export function carryExitMomentum(velocity, spin, t, outPosition, outRotation) {
  const travel = exitCarryTime * (1 - Math.exp(-t / exitCarryTime));
  if (velocity) outPosition.addScaledVector(velocity, travel);
  const rate = spin ? spin.length() : 0;
  if (rate > 1e-5) {
    carrySpin.setFromAxisAngle(carryAxis.copy(spin).divideScalar(rate), rate * travel);
    outRotation.premultiply(carrySpin);
  }
}
