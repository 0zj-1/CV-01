# Three-part Hero prototype

Preview route: `/lab/hero`. Import `HeroRoute` to embed the client-only module.
The portfolio homepage and material interaction bench are unchanged.

## Edit a Part

- `parts/Part01_FluidBloom.tsx` → `config/part01.config.ts`: warm glass, rubber, woven pebble, ceramic fin and frosted leaf.
- `parts/Part02_TensionStructure.tsx` → `config/part02.config.ts`: cool glass, plastic spine, metal bracket, terrazzo and optical leaf.
- `parts/Part03_CondensedContrast.tsx` → `config/part03.config.ts`: smoked glass, stone keel, ceramic tablet, brushed arch and amber shard.

Each configuration owns its geometry choice, dimensions, rest positions, material overrides, copy and palette. All meshes have unique names. Only the active Part is mounted.

## Interaction and lifecycle

`HeroSceneManager.tsx` owns the clock. Change durations in `transitions/SceneTransition.ts` (seconds). The frame loop runs INTRO → INTERACTIVE → OUTRO → HIDDEN, then remounts the next Part with fresh state. Changing parts or resetting follows the same exit path. Dragging never restarts the clock. Pointer capture is released at outro, cancel, window blur, or unmount. Objects retain their last position until hidden; a new mount clears drag offsets, hover, spring velocity and deformation uniforms.

`objects/InteractiveObject.tsx` handles screen-plane dragging and material response. `interactions/MaterialResponse.ts` controls spring stiffness, damping, indentation and rigid travel. It reuses the existing bench's PBR deformation shader in `prototypes/material-interaction/lib/softBodyMaterial.ts`.

`materials/appearance.ts` contains optical settings. `objects/geometry.ts` builds the initial procedural models. Replace those with authored meshes later without changing the lifecycle.

Reduced motion disables automatic cycling, idle distortion and movement transitions. Users can still select each Part and drag. Narrow screens cap pixel ratio, reduce geometry segments and omit the smallest accent. Hidden pages suspend the render clock. WebGL failure/context loss has a readable fallback.

## Verify

Use Node 24. `npm run dev:vinext -- --port 3010`, then open `http://localhost:3010/lab/hero`.
Run `npm test`, `npm run typecheck`, and `npm run build:vinext`.

Manual checks: pause the loop; drag a support and release; verify it stays; switch away and back; verify it resets. Repeat with a held pointer through an automatic transition. Test all three material families and reduced motion.

This is an interactive procedural prototype, not the final offline-rendered artwork in the PRD. Fabric uses geometric grain and sheen rather than simulated hair; stone uses procedural grain; no collision solver is included. Desktop 60fps is a target, not a measured guarantee. No external model or HDR requests are needed.
