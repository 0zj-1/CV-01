import { ShaderChunk, CustomToneMapping } from "three";

// One tone curve for the whole renderer that blends ACES (P02/P03) and
// Neutral (P01). The blend weight rides on toneMappingExposure, a uniform
// every material already receives, so moving it between Parts is continuous
// and never recompiles a shader (switching renderer.toneMapping would).
// Exposure itself stays at 1: the copied curves below ignore it.
const source = ShaderChunk.tonemapping_pars_fragment;
function copyCurve(name, rename) {
  const start = source.indexOf(`vec3 ${name}(`);
  let depth = 0,
    end = source.indexOf("{", start);
  for (; end < source.length; end++) {
    if (source[end] === "{") depth++;
    if (source[end] === "}" && --depth === 0) break;
  }
  return source
    .slice(start, end + 1)
    .replace(`vec3 ${name}(`, `vec3 ${rename}(`)
    .replaceAll("toneMappingExposure", "1.0");
}
const placeholder = "vec3 CustomToneMapping( vec3 color ) { return color; }";
if (!source.includes(placeholder)) throw new Error("three tone mapping chunk changed; update toneBlend.js");
ShaderChunk.tonemapping_pars_fragment = source.replace(
  placeholder,
  `${copyCurve("ACESFilmicToneMapping", "blendACES")}
${copyCurve("NeutralToneMapping", "blendNeutral")}
vec3 CustomToneMapping( vec3 color ) {
  return mix( blendACES( color ), blendNeutral( color ), clamp( toneMappingExposure, 0.0, 1.0 ) );
}`,
);

export const blendedToneMapping = CustomToneMapping;
// Neutral share of each Part's curve.
export const partNeutral = { p01: 1, p02: 0, p03: 0 };
