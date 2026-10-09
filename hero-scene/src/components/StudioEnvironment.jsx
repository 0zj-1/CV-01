import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { studios } from "../config/fade";
import { studioPixels, studioSize } from "../config/studioPixels";
import {
  DataTexture,
  FloatType,
  RGBAFormat,
  EquirectangularReflectionMapping,
  LinearFilter,
  LinearSRGBColorSpace,
  PMREMGenerator,
} from "three";

// Local HDR softboxes and dark flags create surface-dependent colored reflections.
export function createStudioTexture(theme = "default") {
  const { width, height } = studioSize,
    data = studioPixels(theme);
  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
export function useStudioTexture(theme) {
  const texture = useMemo(() => createStudioTexture(theme), [theme]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
export default function StudioEnvironment({ texture, intensity, active = true, partId }) {
  const { gl, scene } = useThree();
  // Prefiltered once per Part; only the active Part assigns it to the scene,
  // so switching Parts never regenerates it.
  const target = useMemo(() => {
    const generator = new PMREMGenerator(gl),
      result = generator.fromEquirectangular(texture);
    generator.dispose();
    return result;
  }, [gl, texture]);
  useEffect(() => {
    // Registered for the cycling hero's environment fade.
    if (partId) studios[partId] = { equirect: texture, env: target.texture };
    return () => {
      if (partId && studios[partId]?.env === target.texture) delete studios[partId];
      target.dispose();
    };
  }, [target, texture, partId]);
  useEffect(() => {
    if (!active) return;
    const previous = scene.environment;
    scene.environment = target.texture;
    return () => {
      if (scene.environment === target.texture) scene.environment = previous;
    };
  }, [scene, target, active]);
  useEffect(() => {
    if (active) scene.environmentIntensity = intensity;
  }, [scene, intensity, active]);
  return null;
}
