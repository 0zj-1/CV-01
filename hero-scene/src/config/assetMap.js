export function assetClass(name, projectId = "p01") {
  if (name === `${projectId.toUpperCase()}_MainBlob`) return "MAIN_SOFT_GLASS";
  if (projectId === "p01" && name === "P01_FurryBall") return "FURRY_SOFT";
  if (
    (projectId === "p01" &&
      ["P01_Cross", "P01_Disc_01", "P01_Sphere_01"].includes(name)) ||
    (projectId === "p02" &&
      ["P02_Cube", "P02_Plate_01", "P02_Sphere"].includes(name)) ||
    (projectId === "p03" &&
      (name.startsWith("P03_Stone") || name.startsWith("P03_Ring") || name === "P03_Sphere"))
  )
    return "HARD_RESIN";
  return "SMALL_GLASS";
}
// A single global rotation reproduces the source Blender viewport (-X view).
// Mesh silhouettes are retained; project presets place support pieces for display.
export const assetScale = 4;
