import { Leva, useControls, folder } from "leva";
import { glassPreset, furPreset } from "../config/materialPresets";
export function useDebugControls(mobile) {
  return useControls({
    Physics: folder({
      floatingStrength: { value: 0.32, min: 0, max: 1 },
      returnStrength: { value: 1.1, min: 0.2, max: 3 },
      boundaryStrength: { value: 5, min: 1, max: 12 },
      pointerForce: { value: 1, min: 0, max: 4 },
      clickImpulse: { value: 0.28, min: 0, max: 1 },
      restitutionMultiplier: { value: 1, min: 0, max: 2 },
      dampingMultiplier: { value: 1, min: 0.4, max: 3 },
    }),
    Glass: folder(
      {
        transmission: { value: glassPreset.transmission, min: 0, max: 1 },
        roughness: { value: glassPreset.roughness, min: 0.03, max: 0.5 },
        ior: { value: glassPreset.ior, min: 1.1, max: 1.6 },
        thickness: { value: glassPreset.thickness, min: 0.1, max: 3 },
        envIntensity: { value: glassPreset.envIntensity, min: 0, max: 3 },
        attenuation: { value: glassPreset.attenuation, min: 0.3, max: 8 },
        chromaticAberration: {
          value: glassPreset.chromaticAberration,
          min: 0,
          max: 0.15,
          step: 0.005,
        },
      },
      { collapsed: true },
    ),
    Fur: folder(
      {
        shellCount: {
          value: mobile ? 16 : furPreset.shellCount,
          min: 8,
          max: 48,
          step: 1,
        },
        furLength: { value: furPreset.furLength, min: 0.04, max: 0.35 },
        furDensity: { value: furPreset.furDensity, min: 40, max: 180, step: 1 },
        fuzzIntensity: { value: furPreset.fuzzIntensity, min: 0.2, max: 2 },
      },
      { collapsed: true },
    ),
    "Soft response": folder(
      {
        squashAmount: { value: 0.14, min: 0, max: 0.3 },
        recoverySpeed: { value: 13, min: 6, max: 22 },
      },
      { collapsed: true },
    ),
    Camera: folder(
      {
        FOV: { value: 32, min: 25, max: 45 },
        distance: { value: 13, min: 10, max: 18 },
      },
      { collapsed: true },
    ),
    Lighting: folder(
      {
        keyIntensity: { value: 4, min: 0, max: 20 },
        environmentIntensity: { value: 1, min: 0.2, max: 2 },
      },
      { collapsed: true },
    ),
  });
}
export default function DebugControls({ project }) {
  return import.meta.env.DEV ||
    new URLSearchParams(location.search).has("debug") ? (
    <Leva
      collapsed
      titleBar={{
        title: `${project?.id?.toUpperCase() ?? "P01"} · Material & motion`,
      }}
    />
  ) : null;
}
