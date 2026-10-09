# Material Interaction Prototype

An isolated bench for one question: **can you tell what something is made of just by
pressing it?** Four bodies — balloon, rubber, foam, hard object — each answering a mouse
press differently.

Route: **`/lab/material`**

## It does not touch the portfolio

Everything lives in this folder. The only files outside it are
`app/lab/material/page.tsx` (six lines, imports `MaterialLabRoute`) and the dependencies
in `package.json`. No existing page, layout, stylesheet, background video, text animation,
cursor behaviour or portfolio content was modified.

Styles are a CSS module (`material-lab.module.css`) with no global or element selectors,
so nothing can leak either way. three.js, drei and leva are behind a `next/dynamic`
`ssr: false` boundary, so they build into a chunk that only this route loads — the
portfolio pages' bundles are unchanged.

## Layout

```
materialProfiles.ts            every tunable number, for every material
types.ts                       the controller <-> body contract
MaterialResponseController.tsx  central raycast + pointer state machine
MaterialLab.tsx                 the scene: camera framing, lights, the four bodies
MaterialLabRoute.tsx            ssr:false boundary
useDebugControls.ts             leva panel, writes over the profiles
lib/geometry.ts                 welded, unit-scale geometry
lib/softBodyMaterial.ts         the deformation shader
objects/SoftBodyObject.tsx      balloon / rubber / foam
objects/HardObject.tsx          the rigid body
```

## How it works

**One controller owns the pointer.** `MaterialResponseController` listens on `window` in
the capture phase, raycasts the registered meshes itself, resolves `materialType` to a
profile, and dispatches `press` / `drag` / `release` to that body's responder. Bodies
never handle pointer events. Doing it centrally buys three things R3F's per-mesh events
do not: a drag that keeps tracking after the cursor leaves the mesh, a press that cannot
be stolen by a body you drag across, and the ability to veto the orbit camera for the
duration of a press (hence the capture phase — it has to run before OrbitControls' own
listener).

Hit normals are barycentric-interpolated from the vertex normals rather than taken from
`face.normal`, which would quantise the dent axis into visible facets as you drag.

**Soft bodies deform in the vertex shader.** `lib/softBodyMaterial.ts` patches
`MeshPhysicalMaterial` through `onBeforeCompile`, so the dent keeps real PBR lighting —
clearcoat, sheen, environment reflections. The displacement is a height field centred on
the raycast hit, with a smoothstep falloff that meets the undisturbed surface with a
continuous derivative. The mesh transform is never scaled or moved.

Shading normals matter as much as the shape: a displaced position with an unchanged normal
reads as a texture, not a dent. Because the depth depends only on the distance to the hit,
the tangential gradient is radial and the corrected normal collapses to a tilt toward the
hit point, proportional to the falloff's slope. That tilt is what makes the crater catch
the light. The derivation is in the file's header comment.

**One spring value drives everything.** A `@react-spring/three` value goes to 1 while
held and springs back to 0 on release, and is deliberately allowed to cross below zero —
the dent then becomes a slight outward bulge, which is the overshoot an inflated skin has.
On top of that, release starts a decaying travelling wave (`uWobbleAmp` / `uWobblePhase`,
driven per frame) whose amplitude scales with how deep the surface actually was when you
let go, so a light tap jiggles less than a full press.

**The rigid body never deforms.** It retreats a hair along the force direction, tilts by
`r × F` when struck off-centre, loses a fraction of a percent of scale, and snaps back on
a stiff spring. The numbers are tiny on purpose: the read comes from the timing, not the
displacement. Anything you can clearly see moving stops feeling solid.

### Why no Rapier

Rapier simulates rigid bodies. A balloon dimpling under a fingertip is local *surface*
deformation, which a rigid-body solver cannot express — you would be faking it with a
scaled proxy, which is exactly the "simple scale animation pretending to be a dent" this
prototype avoids. A soft-body/FEM solver could do it properly but costs far more than the
visual difference is worth here. If a genuinely rigid stack or collision pile is ever
needed, Rapier is the right tool for *that* and can sit alongside this.

## Tuning

Every number is in `materialProfiles.ts`; nothing is hard-coded in a component. The leva
panel writes over those defaults live — indentation, radius, spring stiffness and damping,
wobble strength/frequency/decay, rebound, and the hard object's travel distance, plus
bulge, global squash, press axis, normal tilt and drag follow.

The damping ratio is `damping / (2 * sqrt(stiffness))`: below 1 overshoots and wobbles, at
or above 1 settles dead. That single number is most of the difference between the balloon
(~0.35, loose and sloshy) and the foam (~1.2, no bounce at all).

**Scene → log profiles** prints the current values as JSON and copies them to the
clipboard, ready to paste back into `materialProfiles.ts`.

## Mounting it in the portfolio later

The bench is a stage, not the reusable part. To put a pressable body into a real page,
take the pieces:

```tsx
<Canvas>
  <MaterialProfileProvider profiles={MATERIAL_PROFILES}>
    <MaterialResponseController>
      <SoftBodyObject
        materialType="balloon"
        geometry={geometry}
        position={[0, 0, 0]}
        materialParams={BODY_APPEARANCE.balloon}
      />
    </MaterialResponseController>
  </MaterialProfileProvider>
</Canvas>
```

`MaterialProfileProvider` and `MaterialResponseController` must both be inside a `Canvas`.
Drop `useMaterialDebugControls` and leva in production — pass `MATERIAL_PROFILES` (or
`cloneProfiles()`) straight in.

Geometry must be **unit scale with its dimensions baked in** (`lib/geometry.ts` does this),
because the shader reads `indentation` and `radius` in local units and applies no scale
correction. A scaled mesh would deform by the wrong amount.

## Known limitations

- Raycasting tests the **rest** geometry, not the deformed surface: the dent is GPU-only.
  With dents this shallow the contact point stays accurate enough to drag, but a very deep
  indentation will read slightly proud of the visible surface.
- Soft bodies cast no shadow map (the depth material has no dent, so it would disagree
  with the lit surface). Grounding comes from `ContactShadows` instead.
- `.npmrc` sets `legacy-peer-deps=true`: `@react-three/fiber@9` pins its react peer range
  to `<19.3` while this project runs react 19.3. The combination works, but a plain
  `npm install` fails on ERESOLVE without the flag.
