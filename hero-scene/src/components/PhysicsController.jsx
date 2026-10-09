import { useRef } from "react";
import { useBeforePhysicsStep } from "@react-three/rapier";
import { Vector3, Quaternion, Euler } from "three";
import { assemblyPose } from "../config/entrance";
import {
  setMainBodyTranslationLock,
  setMainBodyRotationLock,
} from "../physics/rigidBodyPolicy";
const step = 1 / 60;
export default function PhysicsController({
  bodies,
  pointer,
  settings,
  telemetry,
  drag,
  intro,
  project,
}) {
  const elapsed = useRef(0),
    lastClick = useRef(0),
    scratch = useRef({
      force: new Vector3(),
      home: new Vector3(),
      group: new Quaternion(),
      error: new Quaternion(),
      rotation: new Quaternion(),
      euler: new Euler(),
    });
  useBeforePhysicsStep(() => {
    if (!intro.current.done || intro.current.phase !== "hold") return;
    const t = (elapsed.current += step),
      clicked = lastClick.current !== pointer.current.click;
    const pose = assemblyPose("hold", 0, intro.current.orbitTime);
    const s = scratch.current;
    s.group.setFromEuler(s.euler.set(pose.pitch, pose.yaw, 0, "YXZ"));
    lastClick.current = pointer.current.click;
    let maxDeviation = 0;
    for (const [i, item] of [...bodies.current.values()].entries()) {
      const { body, home, preset } = item;
      if (!body) continue;
      if (item.stage.userData.dragName === project.mainName) {
        // The gel keeps its authored center while its surface responds to contact.
        const center = s.home.copy(home).applyQuaternion(s.group);
        body.setNextKinematicTranslation(center);
        body.setNextKinematicRotation(s.group);
        continue;
      }
      if (drag.current?.name === item.stage.userData.dragName) {
        body.setNextKinematicTranslation({
          x: drag.current.target.x,
          y: drag.current.target.y,
          z: drag.current.target.z,
        });
        continue;
      }
      // The entrance controller establishes the authored main rotation and
      // keeps it locked; avoiding a per-step dynamic rotation write prevents
      // Rapier aliasing errors while the object is being held.
      const p = body.translation(),
        v = body.linvel(),
        phase = i * 2.399;
      const drift = settings.floatingStrength;
      const rotatedHome = s.home.copy(home).applyQuaternion(s.group);
      const target = {
        x:
          rotatedHome.x +
          drift *
            0.22 *
            (Math.sin(t * 0.43 + phase) +
              0.35 * Math.sin(t * 0.713 + phase * 2)),
        y: rotatedHome.y + drift * 0.25 * Math.sin(t * 0.51 + phase),
        z: rotatedHome.z + drift * 0.1 * Math.cos(t * 0.37 + phase),
      };
      const k = settings.returnStrength * preset.home * preset.mass * 3.0;
      const force = s.force.set(
        (target.x - p.x) * k,
        (target.y - p.y) * k,
        (target.z - p.z) * k,
      );
      // Soft containment around each authored region, in addition to the weak home spring.
      for (const axis of ["x", "y", "z"]) {
        const delta = p[axis] - rotatedHome[axis];
        const limit = axis === "z" ? 0.5 : 0.85;
        if (Math.abs(delta) > limit)
          force[axis] -=
            Math.sign(delta) *
            (Math.abs(delta) - limit) ** 2 *
            settings.boundaryStrength;
      }
      // Drag targets must not flee as the pointer approaches. Empty-space clicks
      // retain the original small radial disturbance.
      if (pointer.current.active && !drag.current && clicked) {
        const dx = p.x - pointer.current.point.x,
          dy = p.y - pointer.current.point.y;
        const d = Math.hypot(dx, dy),
          range = item.radius + 0.65;
        if (d < range) {
          const f = (1 - d / range) ** 2;
          const nx = d > 0.01 ? dx / d : 0.6,
            ny = d > 0.01 ? dy / d : 0.8;
          force.x += nx * f * settings.pointerForce;
          force.y += ny * f * settings.pointerForce;
          body.applyTorqueImpulse(
            { x: ny * f * 0.001, y: nx * f * 0.001, z: -nx * f * 0.002 },
            true,
          );
          if (clicked) {
            body.applyImpulse(
              {
                x: nx * f * settings.clickImpulse,
                y: ny * f * settings.clickImpulse,
                z: -f * settings.clickImpulse * 0.15,
              },
              true,
            );
            telemetry.current.clickResponses++;
          }
        }
      }
      body.applyImpulse(
        { x: force.x * step, y: force.y * step, z: force.z * step },
        true,
      );
      // The same shared yaw/pitch turns each physical body about the origin.
      // Relative motion remains with Rapier, while the assembly has one viewpoint.
      const q = body.rotation();
      s.rotation.set(q.x, q.y, q.z, q.w);
      s.error.copy(s.group).multiply(s.rotation.invert());
      const sign = s.error.w < 0 ? -1 : 1;
      body.applyTorqueImpulse(
        {
          x: s.error.x * sign * preset.mass * 5 * step,
          y: s.error.y * sign * preset.mass * 5 * step,
          z: s.error.z * sign * preset.mass * 5 * step,
        },
        true,
      );
      const speed = Math.hypot(v.x, v.y, v.z);
      if (speed > 0.85)
        body.setLinvel(
          {
            x: (v.x * 0.85) / speed,
            y: (v.y * 0.85) / speed,
            z: (v.z * 0.85) / speed,
          },
          true,
        );
      maxDeviation = Math.max(
        maxDeviation,
        Math.hypot(
          p.x - rotatedHome.x,
          p.y - rotatedHome.y,
          p.z - rotatedHome.z,
        ),
      );
    }
    telemetry.current.maxDeviation = maxDeviation;
    telemetry.current.bodies = bodies.current.size;
    if (Math.round(t * 60) % 60 === 0)
      telemetry.current.bodyStatus = [...bodies.current.entries()].map(
        ([name, item]) => ({
          name,
          type: item.body.bodyType(),
          mass: item.body.mass(),
          enabled: item.body.collider(0).isEnabled(),
          speed: Math.hypot(...Object.values(item.body.linvel())),
        }),
      );
  });
  return null;
}
