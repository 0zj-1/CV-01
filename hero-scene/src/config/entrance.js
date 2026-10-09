// User-directed growth: sphere to gel, central cube to six-armed cross.
export const entranceDuration = 1.8;
export const displayDuration = 5;
export const exitDuration = 1.2;
// Cycling hero: entrances and exits play this much faster (the hold keeps its
// length). Every transition timing reads the same clock, so all scale together.
export const heroTransitionSpeed = 1.25;
// Cycling: the gel leaves as a sphere of this diameter (fraction of the view
// height, screen centre) and the next Part's gel starts from the same sphere.
export const handoffSphere = 0.28;
// Stage scale that makes a gel's sphere form (65% of its bounding radius) the
// hand-over sphere on screen, whatever this Part's camera distance and lens.
// Colour / tone fade between Parts: one smooth curve across the outgoing
// Part's exit and the incoming Part's entrance, so it neither rushes into the
// hand-over nor pauses there. Returns how far the fade has gone (0 → 1).
const fadeDuration = exitDuration + entranceDuration;
export function partFade(phase, t) {
  return smooth((phase === "exit" ? t : exitDuration + t) / fadeDuration);
}
export function handoffScale(camera, radius) {
  return (handoffSphere * camera.position.length() * Math.tan((camera.fov * Math.PI) / 360)) / (radius * 0.65);
}
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  const p = clamp(x);
  return p * p * (3 - 2 * p);
};
const p02SupportOrder = ["P02_Cube", "P02_Cylinder_01", "P02_Cylinder_02", "P02_Cylinder_03", "P02_Cylinder_04", "P02_Plate_01", "P02_Sphere", "P02_Cone"];
const p03SupportOrder = ["P03_Stone_02", "P03_Stone_01", "P03_Stone_03", "P03_Ring_01", "P03_Ring_02", "P03_Sphere", "P03_Amber_01", "P03_Amber_02", "P03_Amber_03", "P03_Amber_04"];
// The assembled composition turns as one around the scene origin. The same
// pose is used for the physics homes and for the kinematic entrance/exit.
// The entrance turns at the same constant rate as the display, so the hand-off
// has no visible braking; only the exit adds an accelerating turn.
export const orbitRate = 0.09;
export function assemblyPose(phase, t, orbitTime) {
  const slowYaw = orbitTime * orbitRate;
  const burst = phase === "exit" ? 0.45 * smooth(t / exitDuration) : 0;
  return {
    yaw: slowYaw + burst,
    pitch: Math.sin(orbitTime * 0.13) * 0.045,
  };
}
export function gelSpin(phase, t) {
  if (phase === "exit") return 0.9 * smooth(t / exitDuration);
  return 0;
}
// Central cube first, then six face-attached cubes; no radial sectors.
export function crossSegmentScale(i, phase, t) {
  if (phase === "hold") return 1;
  if (phase === "exit") return 1 - smooth((t - 0.015 - (5 - i) * 0.018) / 0.28);
  return smooth((t - 0.68 - i * 0.065) / 0.4);
}
export function crossCenterScale(phase, t) {
  if (phase === "hold") return 1;
  return phase === "exit"
    ? 1 - smooth((t - 0.05) / 0.28)
    : smooth((t - 0.4) / 0.32);
}
export function mainGrowth(phase, t) {
  return phase === "hold"
    ? 1
    : phase === "exit"
      ? (1 - clamp(t / exitDuration)) ** 2
      : smooth(t / entranceDuration);
}
// Cycling hero: the gel's shape and size (1 = full shape, 0 = hand-over
// sphere). The exit accelerates into the sphere and the entrance leaves it at
// the same speed (x² over 1.2 s and 1 − (1 − x)³ over 1.8 s both move at 1.67/s
// there), so the gel passes through the sphere without pausing on it.
export function heroGrowth(phase, t) {
  if (phase === "hold") return 1;
  if (phase === "exit") return 1 - clamp(t / exitDuration) ** 2;
  return 1 - (1 - clamp(t / entranceDuration)) ** 3;
}
export function supportExit(name, t) {
  const p02Order = p02SupportOrder.indexOf(name);
  const p03Order = p03SupportOrder.indexOf(name);
  const delay =
    p02Order >= 0
      ? 0.01 + (7 - p02Order) * 0.014
      : p03Order >= 0
        ? 0.01 + (9 - p03Order) * 0.012
      : name === "P01_FurryBall"
      ? 0.04
      : name === "P01_Disc_01"
        ? 0.09
        : name === "P01_Sphere_01"
          ? 0.08
          : 0.02 + Number(name.slice(-2)) * 0.012;
  return 1 - smooth((t - delay) / 0.34);
}
export function mainExit(t) {
  return [0, 0, 0, 0.025 + 0.975 * mainGrowth("exit", t), 0];
}
export function mainEntrance(t) {
  return [0, 0, 0, 0.025 + 0.975 * mainGrowth("enter", t), 0];
}
// P03 stones assemble from fragments (reference: 3D Card Header part 3).
// "stream": the two rear stones trail in from their outer side.
// "burst": the front stone gathers into a small clump beside the gel, then
// expands into place with its cracks closing last. Timings are in seconds.
export const stoneEntrance = {
  P03_Stone_03: { start: 0.3, mode: "stream", sweep: 0.5, flight: 0.42 },
  P03_Stone_02: { start: 0.42, mode: "stream", sweep: 0.5, flight: 0.42 },
  P03_Stone_01: { start: 0.85, mode: "burst", sweep: 0.12, flight: 0.5 },
};
const stoneStart = Object.fromEntries(
  Object.entries(stoneEntrance).map(([name, s]) => [name, s.start]),
);
export function isAssembledStone(name) {
  return name in stoneStart;
}
// Seconds since this stone began assembling; large once the stone is whole.
export function stoneBuildTime(name, phase, t) {
  return phase === "enter" ? t - (stoneStart[name] ?? 0) : 99;
}
export function supportEntrance(name, t) {
  // Fragments do the reveal, so the stone body sits at full scale from its start.
  if (isAssembledStone(name)) return t >= stoneStart[name] ? 1 : 0;
  const p02Order = p02SupportOrder.indexOf(name);
  const p03Order = p03SupportOrder.indexOf(name);
  const delay =
    p02Order >= 0
      ? 0.58 + p02Order * 0.07
      : p03Order >= 0
        ? 0.55 + p03Order * 0.07
      : name === "P01_FurryBall"
      ? 0.7
      : name === "P01_Cross"
        ? 0.74
        : name === "P01_Sphere_01"
          ? 0.72
          : name === "P01_Disc_01"
            ? 0.95
            : 0.8 + Number(name.slice(-2)) * 0.055;
  const p = Math.max(0, Math.min(1, (t - delay) / (entranceDuration - delay)));
  return 1 - (1 - p) ** 3;
}
