import { useMemo, useEffect } from "react";
import { MeshPhysicalMaterial, Color } from "three";

// Soft textile (reference: knit / quilted shapes). Sheen gives the bright
// grazing rim of fibres, a procedural weave bumps the normal and breaks up the
// roughness, and the optional quilt adds stitched seams. All object space, so
// the GLB needs no UVs and the look holds while the piece rotates.
export default function SoftFabricMaterial({ color, radius, quilt = false }) {
  const material = useMemo(() => {
    const base = new Color(color);
    const m = new MeshPhysicalMaterial({
      color: base,
      roughness: 0.82,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.45,
      sheenColor: base.clone().lerp(new Color("#ffffff"), 0.35),
      envMapIntensity: 0.9,
    });
    // About 70 threads across the piece, whatever its size.
    const weave = (35 / Math.max(radius, 0.01)).toFixed(3);
    const seams = (2.2 / Math.max(radius, 0.01)).toFixed(3);
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 fabricPosition;varying vec3 fabricNormal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nfabricPosition=position;fabricNormal=normal;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
        varying vec3 fabricPosition;varying vec3 fabricNormal;
        float fabricHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        // Plain weave: alternating over/under threads, each a rounded ridge.
        float fabricWeave(vec2 uv){
          vec2 cell=floor(uv),f=fract(uv);
          float over=mod(cell.x+cell.y,2.);
          float warp=sin(f.x*PI),weft=sin(f.y*PI);
          float h=mix(warp*(.55+.45*weft),weft*(.55+.45*warp),over);
          return h*(.85+.3*fabricHash(cell));
        }
        float fabricHeight(vec3 p,vec3 n){
          vec3 w=pow(abs(n),vec3(4.));w/=w.x+w.y+w.z;
          float s=${weave};
          float h=fabricWeave(p.yz*s)*w.x+fabricWeave(p.xz*s)*w.y+fabricWeave(p.xy*s)*w.z;
          ${quilt ? `// Diamond quilting: stitched seams pull the padding inward.
          vec3 q=p*${seams};
          float d1=abs(fract(q.x+q.y+q.z*.5)-.5),d2=abs(fract(q.x-q.y-q.z*.5)-.5);
          float pillow=sqrt(sin(min(d1,d2)*PI));
          h=h*.35*pillow+pillow*3.;` : ""}
          return h;
        }
      `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
        float fabricH=fabricHeight(fabricPosition,normalize(fabricNormal));
        // Fade the bump when threads shrink below a pixel so it cannot alias.
        float fabricFade=1.-smoothstep(.35,.9,fwidth(fabricPosition.x*${weave})+fwidth(fabricPosition.y*${weave}));
        {
          // Same derivative bump as three's perturbNormalArb.
          vec3 dpx=normalize(dFdx(-vViewPosition)),dpy=normalize(dFdy(-vViewPosition));
          vec2 dh=vec2(dFdx(fabricH),dFdy(fabricH))*.22*mix(.2,1.,fabricFade);
          vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);
          float det=dot(dpx,r1)*faceDirection;
          normal=normalize(abs(det)*normal-sign(det)*(dh.x*r1+dh.y*r2));
        }`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
        // Thread tops are slightly smoother than the gaps between them.
        roughnessFactor=clamp(roughnessFactor+.1-.14*fabricWeave(fabricPosition.xy*${weave}),.55,1.);`,
        )
        .replace(
          "#include <aomap_fragment>",
          `#include <aomap_fragment>
        ${quilt ? `// Seams sit in shadow.
        {vec3 q=fabricPosition*${seams};
        float d1=abs(fract(q.x+q.y+q.z*.5)-.5),d2=abs(fract(q.x-q.y-q.z*.5)-.5);
        float cavity=mix(.55,1.,smoothstep(0.,.12,min(d1,d2)));
        reflectedLight.indirectDiffuse*=cavity;reflectedLight.directDiffuse*=mix(.75,1.,cavity);}` : ""}`,
        );
    };
    m.customProgramCacheKey = () => `soft-fabric-v2-${quilt}-${weave}`;
    return m;
  }, [color, radius, quilt]);
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}
