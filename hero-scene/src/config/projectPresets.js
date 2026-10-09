export const projectPresets = {
  p01: {
    id: "p01",
    label: "01 — FLUID BLOOM",
    modelPath: `${import.meta.env.BASE_URL}models/P01.glb`,
    mainName: "P01_MainBlob",
    crossName: "P01_Cross",
    expectedBodies: 10,
    // Website hero: on-screen size multiplier so all three Parts read the same
    // size (measured composition diagonal 0.61 of the frame → target 0.80).
    heroScale: 1.31,
    companionOffsets: {
      P01_Cross: [0.82, -0.78, 1.0],
      P01_Disc_01: [-1.35, 0.28, -0.4],
      P01_FurryBall: [-1.05, 1.05, -0.45],
      P01_Sphere_01: [1.22, 0.4, -0.75],
    },
  },
  p02: {
    id: "p02",
    label: "02 — STRUCTURE",
    modelPath: `${import.meta.env.BASE_URL}models/P02.glb`,
    mainName: "P02_MainBlob",
    crossName: null,
    expectedBodies: 9,
    heroScale: 0.89, // measured diagonal 0.90 → 0.80
    meshScales: {
      P02_Cone: 0.82,
      P02_Plate_01: 0.82,
    },
    meshRotations: {
      P02_Cylinder_04: [0, 0.75, 0.25],
    },
    // Match the P02 white model: small rods above/below, long tubes at both
    // sides, a rear sphere, the front cross and a plate on each lower side.
    companionOffsets: {
      P02_Cube: [0.6, -0.55, 1.45],
      P02_Cylinder_01: [-2.65, 0.75, 1.85],
      P02_Cylinder_02: [2.65, 0.85, 1.0],
      P02_Cylinder_03: [1.7, -1.95, 0.2],
      P02_Cylinder_04: [-1.45, 2.05, 0.2],
      P02_Plate_01: [1.25, -0.55, 0.9],
      P02_Sphere: [-1.2, 1.2, -0.65],
      P02_Cone: [-1.85, -1.58, 1.15],
    },
  },
  p03: {
    id: "p03",
    label: "03 — CONDENSED CONTRAST",
    modelPath: `${import.meta.env.BASE_URL}models/P03.glb`,
    mainName: "P03_MainBlob",
    crossName: null,
    // Ring_02 and the gold bead are attached to Ring_01 as one rigid set.
    expectedBodies: 9,
    heroScale: 1.116, // measured diagonal 0.86 → 0.80 (0.93), then enlarged 1.2× by request
    attachments: { P03_Ring_01: ["P03_Ring_02", "P03_Sphere"] },
    // Long lens: the white model is an orthographic view, so rear stones must
    // not be shrunk by perspective.
    lensFov: 10,
    // No offsets or scale overrides: the GLB keeps the white model's exact
    // sizes and placement (Hero_P03_MainGlass_v001.blend, Layout -X view).
    companionOffsets: {},
  },
};

// Order of the automatic cycle in embed mode.
export const projectCycle = ["p01", "p02", "p03"];

export function getProject(id = "p01") {
  return projectPresets[id] ?? projectPresets.p01;
}

export function projectFromLocation() {
  return getProject(new URLSearchParams(location.search).get("project"));
}
