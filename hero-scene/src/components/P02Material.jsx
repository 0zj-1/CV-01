import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

// The rear ball has UVs, unlike the retopologized foreground cross.
function LavenderBall() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#bcb0d8";
    context.fillRect(0, 0, 512, 256);
    let seed = 31;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 180; i++) {
      context.fillStyle = random() < 0.6 ? "#9381b8" : "#e8e0f1";
      context.beginPath();
      context.arc(random() * 512, random() * 256, 0.4 + random() * 1.1, 0, Math.PI * 2);
      context.fill();
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <meshPhysicalMaterial map={texture} roughness={0.48} metalness={0} clearcoat={0.15} />;
}

// Use object-space flecks because this source mesh has no UV coordinates.
function SpeckledCross() {
  const speckles = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 specklePoint;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nspecklePoint = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 specklePoint;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 grid = specklePoint * 17.0;
        vec3 cell = floor(grid);
        float grain = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float fleck = (1.0 - smoothstep(0.13, 0.28, length(fract(grid) - 0.5))) * step(0.66, grain);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.11, 0.17), fleck);`);
  };
  return <meshStandardMaterial color="#e4ded1" roughness={0.82} metalness={0} onBeforeCompile={speckles} />;
}

export default function P02Material({ name }) {
  if (name === "P02_Cube") return <SpeckledCross />;
  if (name === "P02_Sphere") return <LavenderBall />;
  if (name === "P02_Cone")
    return <meshPhysicalMaterial color="#b8a9de" roughness={0.47} metalness={0} clearcoat={0.14} />;
  if (name === "P02_Plate_01")
    return <meshPhysicalMaterial color="#c6b8e4" roughness={0.32} metalness={0} transmission={0.35} thickness={0.32} ior={1.36} envMapIntensity={1.35} />;
  if (name === "P02_Cylinder_01" || name === "P02_Cylinder_02")
    return <meshPhysicalMaterial vertexColors transparent opacity={0.78} depthWrite={false} roughness={0.14} metalness={0} transmission={0.55} thickness={0.22} ior={1.36} envMapIntensity={0.7} clearcoat={0.25} clearcoatRoughness={0.12} iridescence={0.1} />;
  return <meshPhysicalMaterial color="#d1cbea" roughness={0.12} metalness={0.18} transmission={0.55} thickness={0.25} ior={1.45} envMapIntensity={2.1} iridescence={0.65} />;
}
