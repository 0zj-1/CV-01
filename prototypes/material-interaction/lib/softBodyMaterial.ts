import { MeshPhysicalMaterial, Vector3 } from 'three';
import type { IUniform, MeshPhysicalMaterialParameters } from 'three';

/**
 * Local surface deformation, injected into a standard PBR material.
 *
 * Why `onBeforeCompile` instead of a ShaderMaterial: we want a real dent *and*
 * real lighting. Patching MeshPhysicalMaterial keeps clearcoat, sheen, the
 * environment map and everything else, and only takes over two chunks — the
 * object-space normal and the object-space position.
 *
 * The displacement is a height field over the rest surface, centred on the
 * raycast hit:
 *
 *   depth(p) = amount * indentation * falloff(|p - hit| / radius)
 *   p'       = p - axis * depth(p)
 *
 * with a smoothstep falloff so the rim of the dent meets the undisturbed
 * surface with a continuous derivative.
 *
 * Shading normals matter as much as the shape: a displaced position with an
 * unchanged normal reads as a texture, not a dent. For a height field h along
 * the normal, the perturbed normal is `normalize(n - grad_t h)`. Here
 * `h = -depth`, and depth depends only on the distance r to the hit, so the
 * tangential gradient is radial and the whole correction collapses to
 *
 *   n' = normalize(n + tHat * amount * indentation * |d falloff / dr|)
 *
 * where `tHat` is the unit tangential direction pointing at the hit. Normals on
 * the crater wall therefore tilt inward, which is what makes the dent catch the
 * light.
 *
 * `amount` is driven by a react-spring value and is allowed to go negative on
 * release: the dent then becomes a slight outward bulge, which is exactly the
 * overshoot an inflated skin has.
 */

export interface DentUniforms {
  /** Dent centre, mesh local space. */
  uHit: IUniform<Vector3>;
  /** Outward surface normal at the dent centre, local space. */
  uHitNormal: IUniform<Vector3>;
  /** Outward axis the force acts along (-ray direction), local space. */
  uPressAxis: IUniform<Vector3>;
  /** Spring-driven press amount. 1 = fully held, <0 = recovery overshoot. */
  uAmount: IUniform<number>;
  uIndent: IUniform<number>;
  uRadius: IUniform<number>;
  uBulge: IUniform<number>;
  uSquash: IUniform<number>;
  uAxisBlend: IUniform<number>;
  uNormalSharpness: IUniform<number>;
  uWobbleAmp: IUniform<number>;
  uWobblePhase: IUniform<number>;
  uWobbleAxis: IUniform<Vector3>;
  uWobbleSpread: IUniform<number>;
}

const DENT_CHUNK = /* glsl */ `
uniform vec3 uHit;
uniform vec3 uHitNormal;
uniform vec3 uPressAxis;
uniform float uAmount;
uniform float uIndent;
uniform float uRadius;
uniform float uBulge;
uniform float uSquash;
uniform float uAxisBlend;
uniform float uNormalSharpness;
uniform float uWobbleAmp;
uniform float uWobblePhase;
uniform vec3 uWobbleAxis;
uniform float uWobbleSpread;

vec3 mipDentPosition;
vec3 mipDentNormal;

void mipDent(vec3 pos, vec3 nrm) {
  vec3 delta = pos - uHit;
  float r = length(delta);
  float radius = max(uRadius, 1e-4);

  // Falloff: 1 at the hit, 0 at the rim, flat derivative at both ends.
  float s = clamp(1.0 - r / radius, 0.0, 1.0);
  float falloff = s * s * (3.0 - 2.0 * s);
  // |d falloff / dr|, used for the shading normal.
  float slope = (6.0 * s - 6.0 * s * s) / radius;

  // Only the side of the body facing the press gives way.
  float facing = smoothstep(-0.1, 0.55, dot(nrm, uHitNormal));
  float amp = uAmount * uIndent * facing;

  // Push along the surface normal (balloon) or along the force axis (foam:
  // avoids splitting the geometry where two faces meet at an edge).
  vec3 blended = mix(nrm, uPressAxis, uAxisBlend);
  float blendedLength = length(blended);
  vec3 axis = blendedLength > 1e-4 ? blended / blendedLength : nrm;

  vec3 p = pos - axis * (amp * falloff);

  // Far field bulge: the volume displaced by the dent has to go somewhere.
  float far = smoothstep(radius, radius * 2.6, r);
  p += nrm * (uAmount * uIndent * uBulge * far);

  // Whole-body squash along the press axis, with the perpendicular directions
  // spreading out to roughly keep the volume.
  float axial = dot(pos, uHitNormal);
  float squash = uAmount * uSquash;
  p -= uHitNormal * (axial * squash);
  p += (pos - uHitNormal * axial) * (squash * 0.5);

  // Release wobble: a decaying wave travelling across the body, driven from JS.
  float bodyLength = length(pos);
  vec3 bodyDirection = bodyLength > 1e-4 ? pos / bodyLength : nrm;
  p += nrm * (uWobbleAmp * sin(uWobblePhase + dot(bodyDirection, uWobbleAxis) * uWobbleSpread));

  // Tangential direction pointing back at the dent centre.
  vec3 toward = -delta;
  vec3 tangential = toward - nrm * dot(toward, nrm);
  float tangentialLength = length(tangential);
  vec3 tHat = tangentialLength > 1e-5 ? tangential / tangentialLength : vec3(0.0);

  mipDentPosition = p;
  mipDentNormal = normalize(nrm + tHat * (amp * slope * uNormalSharpness));
}
`;

export function createDentMaterial(params: MeshPhysicalMaterialParameters): {
  material: MeshPhysicalMaterial;
  uniforms: DentUniforms;
} {
  const uniforms: DentUniforms = {
    uHit: { value: new Vector3(0, 0, 1e3) },
    uHitNormal: { value: new Vector3(0, 0, 1) },
    uPressAxis: { value: new Vector3(0, 0, 1) },
    uAmount: { value: 0 },
    uIndent: { value: 0 },
    uRadius: { value: 1 },
    uBulge: { value: 0 },
    uSquash: { value: 0 },
    uAxisBlend: { value: 0 },
    uNormalSharpness: { value: 1 },
    uWobbleAmp: { value: 0 },
    uWobblePhase: { value: 0 },
    uWobbleAxis: { value: new Vector3(0, 0, 1) },
    uWobbleSpread: { value: 2 },
  };

  const material = new MeshPhysicalMaterial(params);

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DENT_CHUNK}`)
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
  mipDent(position, objectNormal);
  objectNormal = mipDentNormal;`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = mipDentPosition;');
  };

  // Without this every dent material would share the cached program of a plain
  // MeshPhysicalMaterial and the injection would silently do nothing.
  material.customProgramCacheKey = () => 'material-interaction-dent-v1';

  return { material, uniforms };
}
