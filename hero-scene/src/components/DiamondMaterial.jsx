// Balance transmission with shaded facets: a transparent canvas gives Three
// a white transmission backdrop, so full transmission washes out these stones.
export default function DiamondMaterial() {
  return (
    <meshPhysicalMaterial
      color="#c4cedd"
      metalness={0}
      transmission={0.55}
      thickness={0.45}
      ior={2.417}
      roughness={0.08}
      envMapIntensity={0.65}
      dispersion={0.045}
      attenuationColor="#c8d8ed"
      attenuationDistance={0.8}
      flatShading
    />
  );
}
