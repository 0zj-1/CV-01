import { useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  ConvexHullCollider,
  CuboidCollider,
} from "@react-three/rapier";
import { Box3, Vector3, Matrix4, Quaternion, Euler, Color, Float32BufferAttribute } from "three";
import { assetClass, assetScale } from "../config/assetMap";
import { physicsPresets } from "../config/physicsPresets";
import { projectPresets } from "../config/projectPresets";
import SoftGlassMaterial from "./SoftGlassMaterial";
import FurMaterial from "./FurMaterial";
import DiamondMaterial from "./DiamondMaterial";
import SoftFabricMaterial from "./SoftFabricMaterial";
import P02Material from "./P02Material";
import P03Material from "./P03Material";
import MarbleCross from "./MarbleCross";
import StoneAssembly from "./StoneAssembly";
import { mainGrowth, heroGrowth, isAssembledStone } from "../config/entrance";
import { ElasticSurface } from "../physics/ElasticSurface";
import { advanceVisualPose, localVisualPose } from "../physics/visualHandoff";
import { isCoverForeground, applyCoverForeground } from '../config/cover';

const lavender = new Color("#b491eb");
const blue = new Color("#8cb8f3");
const mint = new Color("#75ded0");
function tintP02Cylinder(geometry, name) {
  if (name !== "P02_Cylinder_01" && name !== "P02_Cylinder_02") return;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const shade = new Color();
  for (let i = 0; i < positions.count; i++) {
    let t = (positions.getY(i) - min.y) / Math.max(0.001, max.y - min.y);
    if (name === "P02_Cylinder_02") t = 1 - t;
    if (t < 0.5) shade.copy(lavender).lerp(blue, t * 2);
    else shade.copy(blue).lerp(mint, (t - 0.5) * 2);
    shade.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

function Piece({
  asset,
  project,
  settings,
  mobile,
  bodies,
  telemetry,
  environment,
  drag,
  intro,
  nextProject,
  previousProject,
  cycling = false,
  active = true,
}) {
  const body = useRef(),
    visual = useRef(),
    stage = useRef();
  const preset = physicsPresets[asset.kind];
  useLayoutEffect(() => {
    if (isCoverForeground(asset.name)) return applyCoverForeground(stage.current);
  }, [asset]);
  const cross = useMemo(() => {
    if (asset.name !== project.crossName) return null;
    asset.geometry.computeBoundingBox();
    const b = asset.geometry.boundingBox.getSize(new Vector3());
    const size = Math.max(b.x, b.y, b.z) / 3;
    const q = new Quaternion().setFromEuler(new Euler(0.25, 0.45, 0.6));
    return {
      half: size / 2,
      positions: [
        [0, 0, 0],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ].map((d) =>
        new Vector3(...d).multiplyScalar(size).applyQuaternion(q).toArray(),
      ),
    };
  }, [asset, project.crossName]);
  const motion = useRef({
    last: null,
    velocity: new Vector3(),
    accumulator: 0,
  });
  const visualPose = useRef({
    active: false,
    position: new Vector3(),
    rotation: new Quaternion(),
    bodyPosition: new Vector3(),
    bodyRotation: new Quaternion(),
  });
  const soft = asset.kind === "MAIN_SOFT_GLASS" || asset.kind === "FURRY_SOFT";
  const surface = useMemo(
    () =>
      soft
        ? new ElasticSurface(asset.geometry, asset.kind === "FURRY_SOFT")
        : null,
    [asset, soft],
  );
  useEffect(() => {
    bodies.current.set(asset.name, {
      body: body.current,
      home: asset.position,
      preset,
      radius: asset.radius,
      stage: stage.current,
      visualPose,
    });
    return () => bodies.current.delete(asset.name);
  }, [asset, bodies, preset]);
  useFrame((_, dt) => {
    // Hidden Parts in the cycling hero do no per-frame work.
    if (!active || !body.current || !stage.current) return;
    const pose = visualPose.current;
    if (intro.current.phase !== "hold" || !intro.current.done) {
      stage.current.position.set(0, 0, 0);
      stage.current.quaternion.identity();
      pose.active = false;
      return;
    }
    const p = body.current.translation();
    const q = body.current.rotation();
    pose.bodyPosition.set(p.x, p.y, p.z);
    pose.bodyRotation.set(q.x, q.y, q.z, q.w);
    if (!pose.active) {
      pose.position.copy(pose.bodyPosition);
      pose.rotation.copy(pose.bodyRotation);
      pose.active = true;
    }
    advanceVisualPose(pose.position, pose.rotation, pose.bodyPosition, pose.bodyRotation, dt);
    localVisualPose(
      pose.bodyPosition,
      pose.bodyRotation,
      pose.position,
      pose.rotation,
      stage.current.position,
      stage.current.quaternion,
    );
  });
  useFrame((_, dt) => {
    if (!surface || !active) return;
    if (!intro.current.done) {
      if (asset.kind === "MAIN_SOFT_GLASS") {
        const growth = (cycling ? heroGrowth : mainGrowth)(
          intro.current.phase,
          intro.current.animationTime ?? 0,
        );
        const rest = surface.bindings.get(asset.geometry).rest;
        const a = asset.geometry.attributes.position.array;
        const radius = asset.radius * 0.65;
        for (let i = 0; i < a.length; i += 3) {
          const length = Math.hypot(rest[i], rest[i + 1], rest[i + 2]) || 1;
          for (let j = 0; j < 3; j++)
            a[i + j] =
              rest[i + j] * ((radius / length) * (1 - growth) + growth);
        }
        asset.geometry.attributes.position.needsUpdate = true;
        asset.geometry.computeVertexNormals();
        asset.geometry.computeBoundingSphere();
        surface.positions.forEach((p, i) => p.copy(surface.rest[i]));
        surface.velocities.forEach((v) => v.set(0, 0, 0));
      }
      motion.current.last = null;
      motion.current.velocity.set(0, 0, 0);
      return;
    }
    const s = motion.current,
      p = body.current.translation();
    const current = new Vector3(p.x, p.y, p.z);
    const velocity = s.last
      ? current.clone().sub(s.last).divideScalar(Math.max(dt, 0.001))
      : new Vector3();
    const acceleration = velocity
      .clone()
      .sub(s.velocity)
      .divideScalar(Math.max(dt, 0.001));
    acceleration.clampLength(0, 30);
    const q = body.current.rotation();
    acceleration.applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w).invert());
    s.last = current;
    s.velocity.copy(velocity);
    s.accumulator += Math.min(dt, 0.05);
    while (s.accumulator >= 1 / 120) {
      const draggingMain =
        asset.kind === "MAIN_SOFT_GLASS" && drag.current?.name === asset.name;
      if (draggingMain && drag.current.clickImpulse) {
        surface.impulse(drag.current.localPoint, 0.5);
        drag.current.clickImpulse = false;
      }
      if (draggingMain && drag.current.delta.lengthSq() > 1e-8) {
        const q = body.current.rotation();
        const localDelta = drag.current.delta
          .clone()
          .applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w).invert());
        surface.impulse(localDelta, Math.min(0.9, localDelta.length() * 8));
        drag.current.delta.set(0, 0, 0);
      }
      surface.damping =
        ((asset.kind === "FURRY_SOFT" ? 8 : 3.8) * settings.recoverySpeed) / 13;
      surface.step(
        1 / 120,
        acceleration,
        drag.current?.name === asset.name ? drag.current.localPoint : null,
      );
      s.accumulator -= 1 / 120;
    }
    surface.updateMeshes();
  });
  const hit = (e) => {
    telemetry.current.collisions++;
    const otherName = [...bodies.current.entries()].find(
      ([, item]) => item.body === e.other.rigidBody,
    )?.[0];
    if (otherName && asset.name < otherName) {
      const pair = `${asset.name} / ${otherName}`;
      const pairs = (telemetry.current.contactPairs ??= {});
      pairs[pair] = (pairs[pair] || 0) + 1;
    }
    if (asset.kind === "MAIN_SOFT_GLASS" || asset.kind === "FURRY_SOFT") {
      const v = body.current.linvel(),
        other = e.other.rigidBody,
        ov = other?.linvel() || { x: 0, y: 0, z: 0 };
      const speed = Math.hypot(v.x - ov.x, v.y - ov.y, v.z - ov.z);
      if (speed < 0.025) return;
      if (other) {
        const p = body.current.translation(),
          q = body.current.rotation(),
          op = other.translation();
        const direction = new Vector3(
          op.x - p.x,
          op.y - p.y,
          op.z - p.z,
        ).applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w).invert());
        surface.impulse(
          direction,
          (speed * 1.8 * settings.squashAmount) / 0.14,
        );
      }
      telemetry.current.softResponses++;
    }
  };
  return (
    <RigidBody
      ref={body}
      name={asset.name}
      position={asset.position.toArray()}
      colliders={false}
      restitution={preset.restitution * settings.restitutionMultiplier}
      friction={preset.friction}
      linearDamping={preset.linearDamping * settings.dampingMultiplier}
      angularDamping={preset.angularDamping * settings.dampingMultiplier}
      canSleep={false}
      onCollisionEnter={hit}
    >
      {cross ? (
        cross.positions.map((position, i) => (
          <CuboidCollider
            key={i}
            args={[cross.half, cross.half, cross.half]}
            position={position}
            rotation={[0.25, 0.45, 0.6]}
            mass={preset.mass / 7}
          />
        ))
      ) : (
        <ConvexHullCollider args={[asset.collider]} mass={preset.mass} />
      )}
      <group
        ref={stage}
        visible={false}
        userData={{ dragName: asset.name }}
      >
        <group ref={visual}>
          {asset.kind === "FURRY_SOFT" ? (
            <FurMaterial
              geometry={asset.geometry}
              settings={settings}
              surface={surface}
            />
          ) : asset.name === project.crossName ? (
            <MarbleCross geometry={asset.geometry} intro={intro} />
          ) : isAssembledStone(asset.name) ? (
            <StoneAssembly
              name={asset.name}
              geometry={asset.geometry}
              radius={asset.radius}
              offset={asset.fromMain.toArray()}
              intro={intro}
            />
          ) : (
            <mesh
              geometry={asset.geometry}
              castShadow={asset.kind !== "MAIN_SOFT_GLASS" && asset.kind !== "SMALL_GLASS" && !asset.name.startsWith("P02_Cylinder")}
              receiveShadow
            >
              {asset.kind === "MAIN_SOFT_GLASS" ? (
                <SoftGlassMaterial
                  settings={settings}
                  mobile={mobile}
                  environment={environment}
                  project={project.id}
                  nextProject={nextProject}
                  previousProject={previousProject}
                  cycling={cycling}
                  intro={intro}
                  active={active}
                />
              ) : project.id === "p02" ? (
                <P02Material name={asset.name} />
              ) : project.id === "p03" ? (
                <P03Material name={asset.name} />
              ) : asset.kind === "SMALL_GLASS" ? (
                <DiamondMaterial environment={environment} />
              ) : asset.name === "P01_Disc_01" || asset.name === "P01_Sphere_01" ? (
                <SoftFabricMaterial
                  /* Slightly muted vs. the old standard material: Neutral tone mapping
                     no longer washes the colour out, so the same hex reads stronger. */
                  color={asset.name === "P01_Disc_01" ? "#e3c7c0" : "#d6a28e"}
                  radius={asset.radius}
                  quilt={asset.name === "P01_Sphere_01"}
                />
              ) : (
                <meshStandardMaterial
                  color={
                    asset.name === project.crossName
                      ? "#d3c6b6"
                      : asset.name === "P01_Disc_01"
                        ? "#e8c5bd"
                        : project.id === "p02"
                          ? "#a9b8cf"
                          : "#d99d84"
                  }
                  roughness={0.58}
                  metalness={0.03}
                />
              )}
            </mesh>
          )}
          {asset.attachments?.map((child) => (
            <mesh
              key={child.name}
              geometry={child.geometry}
              position={child.offset.toArray()}
              castShadow
              receiveShadow
            >
              <P03Material name={child.name} />
            </mesh>
          ))}
        </group>
      </group>
    </RigidBody>
  );
}
export default function P01Model({ project, ...props }) {
  const { scene } = useGLTF(project.modelPath);
  const assets = useMemo(() => {
    scene.updateMatrixWorld(true);
    const rotation = new Matrix4().makeRotationY(Math.PI / 2),
      items = [];
    const bounds = new Box3();
    scene.traverse((node) => {
      if (node.isMesh) {
        const g = node.geometry
          .clone()
          .applyMatrix4(node.matrixWorld)
          .applyMatrix4(rotation)
          .scale(assetScale, assetScale, assetScale);
        g.computeBoundingBox();
        bounds.union(g.boundingBox);
        items.push({ name: node.name, geometry: g });
      }
    });
    const center = bounds.getCenter(new Vector3());
    const result = items.map((a) => {
      const p = a.geometry.boundingBox.getCenter(new Vector3());
      a.geometry.translate(-p.x, -p.y, -p.z);
      const meshScale = project.meshScales?.[a.name] ?? 1;
      a.geometry.scale(meshScale, meshScale, meshScale);
      const meshRotation = project.meshRotations?.[a.name];
      if (meshRotation) a.geometry.rotateX(meshRotation[0]).rotateY(meshRotation[1]).rotateZ(meshRotation[2]);
      if (project.id === "p02") tintP02Cylinder(a.geometry, a.name);
      a.geometry.computeBoundingSphere();
      return {
        ...a,
        kind: assetClass(a.name, project.id),
        position: p.sub(center),
        radius: a.geometry.boundingSphere.radius,
        collider: Float32Array.from(
          a.geometry.attributes.position.array,
          (v) => v * 0.9,
        ),
      };
    });
    const main = result.find((asset) => asset.name === project.mainName)?.position;
    for (const asset of result) {
      const offset = project.companionOffsets[asset.name];
      if (offset) asset.position.copy(main).add(new Vector3(...offset));
      asset.fromMain = asset.position.clone().sub(main);
    }
    // Nested pieces (e.g. P03's rings and bead) ride on one body so physics
    // can never push the set apart; the parent hull covers the whole set.
    for (const [parentName, childNames] of Object.entries(project.attachments ?? {})) {
      const parent = result.find((asset) => asset.name === parentName);
      if (!parent) continue;
      parent.attachments = childNames
        .map((name) => result.find((asset) => asset.name === name))
        .filter(Boolean)
        .map((child) => ({ ...child, offset: child.position.clone().sub(parent.position) }));
      const points = [parent.collider];
      for (const child of parent.attachments)
        points.push(
          Float32Array.from(
            child.geometry.attributes.position.array,
            (v, i) => (v + child.offset.getComponent(i % 3)) * 0.9,
          ),
        );
      parent.collider = new Float32Array(points.reduce((n, p) => n + p.length, 0));
      points.reduce((at, p) => (parent.collider.set(p, at), at + p.length), 0);
    }
    const attached = new Set(Object.values(project.attachments ?? {}).flat());
    return result.filter((asset) => !attached.has(asset.name));
  }, [scene, project]);
  useEffect(
    () => () =>
      assets.forEach((a) => {
        a.geometry.dispose();
        a.attachments?.forEach((child) => child.geometry.dispose());
      }),
    [assets],
  );
  return assets.map((asset) => (
    <Piece key={asset.name} asset={asset} project={project} {...props} />
  ));
}
// Fetch the models right away; when the host page asks us to wait, only warm
// the HTTP cache (no parsing on the shared main thread until we start).
for (const preset of Object.values(projectPresets))
  if (new URLSearchParams(location.search).has("wait")) fetch(preset.modelPath);
  else useGLTF.preload(preset.modelPath);
