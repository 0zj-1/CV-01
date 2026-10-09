import { useBeforePhysicsStep } from "@react-three/rapier";
import { useThree } from "@react-three/fiber";
import { useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { Quaternion, Euler, Vector3 } from "three";
import {
  mainEntrance,
  supportEntrance,
  entranceDuration,
  displayDuration,
  exitDuration,
  heroTransitionSpeed,
  handoffScale as handoffStageScale,
  mainGrowth,
  heroGrowth,
  mainExit,
  supportExit,
  assemblyPose,
  gelSpin,
  orbitRate,
} from "../config/entrance";
import {
  setMainBodyTranslationLock,
  setMainBodyRotationLock,
} from "../physics/rigidBodyPolicy";
import { continueExitPose, carryExitMomentum } from "../physics/visualHandoff";
import { warmup } from "../config/warmup";
import { handoff } from "../config/handoff";

export default function EntranceController({
  bodies,
  intro,
  telemetry,
  drag,
  project,
  onCycle,
  handoffIn = false,
  active = true,
  activation = 0,
}) {
  const camera = useThree((state) => state.camera);
  // Read by the physics callback. Written during render: physics can resume
  // stepping a newly active Part before the callback sees its new props.
  const live = useRef({});
  live.current = { active, handoffIn };
  const handoffScale = (item) => handoffStageScale(camera, item.radius);
  const scratch = useMemo(
    () => ({
      q: new Quaternion(),
      group: new Quaternion(),
      delta: new Quaternion(),
      holdEnd: new Quaternion(),
      spin: new Quaternion(),
      e: new Euler(),
      p: new Vector3(),
    }),
    [],
  );
  const previewTime = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = Number(params.get("introAt"));
    return import.meta.env.DEV &&
      params.has("introAt") &&
      Number.isFinite(value)
      ? Math.max(0, Math.min(entranceDuration, value))
      : null;
  }, []);
  useEffect(() => {
    intro.current.time = 0;
    intro.current.done = false;
    intro.current.phase = "enter";
    intro.current.animationTime = 0;
    intro.current.orbitTime = 0;
  }, [intro]);
  // Layout effect: runs before the next frame is drawn, so the first frame of
  // the newly active Part is already its hand-over pose.
  useLayoutEffect(() => {
    // Every time this Part becomes the active one it replays from the start.
    if (!active) return;
    const state = intro.current;
    Object.assign(state, { time: 0, done: false, phase: "enter", animationTime: 0, orbitTime: 0, cycled: false });
    drag.current = null;
    for (const [name, item] of bodies.current) {
      if (name !== project.mainName || !handoffIn) {
        item.stage.visible = false;
        continue;
      }
      // Arriving from a hand-over: on screen as the previous Part's sphere from
      // the first frame, so the switch never shows an empty set.
      item.body.setTranslation({ x: 0, y: 0, z: 0 }, true);
      item.stage.position.set(0, 0, 0);
      item.stage.quaternion.identity();
      item.stage.scale.setScalar(handoffScale(item));
      item.stage.visible = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activation]);
  useBeforePhysicsStep(() => {
    telemetry.current.bodies = bodies.current.size;
    if (bodies.current.size !== project.expectedBodies) return;
    // Cycling hero: hold the first entrance until every Part is compiled.
    if (onCycle && !warmup.done) return;
    if (!live.current.active) return;
    const arriving = live.current.handoffIn;
    const state = intro.current;
    state.orbitTime += 1 / 60;
    if (state.phase === "hold") {
      // Keep the full arrangement available throughout interaction and settling.
      state.time += 1 / 60;
      if (
        state.time < displayDuration ||
        (import.meta.env.DEV &&
          new URLSearchParams(location.search).has("hold"))
      )
        return;
      state.phase = "exit";
      state.time = 0;
      state.done = false;
      // The exit keeps orbiting from here at the display rate.
      state.exitOrbit = state.orbitTime;
      drag.current = null;
      for (const [name, item] of bodies.current) {
        const visible = item.visualPose.current;
        const p = item.body.translation();
        const q = item.body.rotation();
        const v = item.body.linvel();
        const w = item.body.angvel();
        // Carry each piece's own drift and spin; the orbit share is removed
        // because the exit pose already continues the orbit. The gel only orbits.
        item.exitVelocity =
          name === project.mainName
            ? null
            : new Vector3(v.x - orbitRate * p.z, v.y, v.z + orbitRate * p.x).clampLength(0, 1.5);
        item.exitSpin =
          name === project.mainName ? null : new Vector3(w.x, w.y, w.z).clampLength(0, 3);
        item.exitPosition = visible.active
          ? visible.position.clone()
          : new Vector3(p.x, p.y, p.z);
        item.exitRotation = visible.active
          ? visible.rotation.clone()
          : new Quaternion(q.x, q.y, q.z, q.w);
        // The exit starts exactly where the rendered mesh was on the last hold frame.
        item.stage.position.set(0, 0, 0);
        item.stage.quaternion.identity();
        item.body.setTranslation(item.exitPosition, true);
        item.body.setRotation(item.exitRotation, true);
      }
    }
    const exiting = state.phase === "exit";
    state.time += (1 / 60) * (onCycle ? heroTransitionSpeed : 1);
    const t = previewTime ?? state.time;
    state.animationTime = t;
    if (exiting && t >= exitDuration) {
      // Cycling: hand over to the next Part while everything is hidden; the
      // Part remounts, so this one simply stays hidden until then.
      if (onCycle) {
        // The gel stays on screen as the hand-over sphere until the next Part
        // replaces it; only the supports are hidden.
        for (const [name, item] of bodies.current)
          if (name !== project.mainName) item.stage.visible = false;
        if (!state.cycled) {
          state.cycled = true;
          // This frame (the outgoing sphere's last) is captured for the dissolve.
          handoff.request = true;
          onCycle();
        }
        return;
      }
      // Reset only while the objects are fully hidden, so every entrance
      // reconstructs the authored white-model view.
      state.orbitTime = 0;
      state.phase = "enter";
      state.time = 0;
      state.animationTime = 0;
      state.done = false;
      for (const item of bodies.current.values()) item.stage.visible = false;
      return;
    }
    const pose = assemblyPose(
      state.phase,
      Math.min(t, exiting ? exitDuration : entranceDuration),
      state.orbitTime,
    );
    scratch.group.setFromEuler(scratch.e.set(pose.pitch, pose.yaw, 0, "YXZ"));
    if (exiting) {
      const end = assemblyPose("hold", 0, state.exitOrbit ?? state.orbitTime);
      scratch.holdEnd.setFromEuler(scratch.e.set(end.pitch, end.yaw, 0, "YXZ"));
      scratch.delta.copy(scratch.group).multiply(scratch.holdEnd.invert());
    }
    for (const [name, item] of bodies.current) {
      const { body, home, stage } = item;
      if (!exiting && t >= entranceDuration) {
        scratch.p.copy(home).applyQuaternion(scratch.group);
        body.setTranslation(scratch.p, true);
        body.setRotation(
          { x: scratch.group.x, y: scratch.group.y, z: scratch.group.z, w: scratch.group.w },
          true,
        );
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setBodyType(name === project.mainName ? 2 : 0, true);
        if (name === project.mainName) {
          setMainBodyTranslationLock(body, false);
          setMainBodyRotationLock(body, false);
        }
        for (let i = 0; i < body.numColliders(); i++) {
          body.collider(i).setEnabled(true);
          body.collider(i).setMass(item.preset.mass / body.numColliders());
        }
        body.recomputeMassPropertiesFromColliders();
        const visible = item.visualPose.current;
        if (!visible.active) {
          visible.position.copy(scratch.p);
          visible.rotation.copy(scratch.group);
          visible.active = true;
        }
        stage.scale.setScalar(1);
        stage.visible = true;
        continue;
      }
      if (name === project.mainName) {
        setMainBodyTranslationLock(body, false);
        setMainBodyRotationLock(body, false);
      }
      body.setBodyType(2, true);
      for (let i = 0; i < body.numColliders(); i++)
        body.collider(i).setEnabled(false);
      if (name === project.mainName) {
        let [rx, ry, rz, scale, lift] = exiting
          ? mainExit(t)
          : mainEntrance(t);
        if (exiting) {
          continueExitPose(
            item.exitPosition ?? home,
            item.exitRotation ?? scratch.group,
            scratch.delta,
            scratch.p,
            scratch.q,
          );
          carryExitMomentum(item.exitVelocity, item.exitSpin, t, scratch.p, scratch.q);
          scratch.spin.setFromEuler(scratch.e.set(rx, ry + gelSpin("exit", t), rz));
          scratch.q.multiply(scratch.spin);
        } else {
          scratch.q.setFromEuler(scratch.e.set(rx, ry + gelSpin("enter", t), rz));
          scratch.q.premultiply(scratch.group);
          scratch.p.copy(home).applyQuaternion(scratch.group);
        }
        if (onCycle && exiting) {
          // Settle into the hand-over sphere at the screen centre instead of
          // shrinking away; the morph to a sphere runs alongside (heroGrowth).
          const k = 1 - heroGrowth("exit", t);
          scale = 1 + (handoffScale(item) - 1) * k;
          scratch.p.multiplyScalar(1 - k);
        } else if (arriving && !exiting) {
          // Start from the previous Part's hand-over sphere and grow into place.
          const g = heroGrowth("enter", t);
          scale = handoffScale(item) + (1 - handoffScale(item)) * g;
          scratch.p.multiplyScalar(g);
        }
        body.setNextKinematicRotation({
          x: scratch.q.x,
          y: scratch.q.y,
          z: scratch.q.z,
          w: scratch.q.w,
        });
        scratch.p.y += lift;
        body.setNextKinematicTranslation({
          x: scratch.p.x,
          y: scratch.p.y,
          z: scratch.p.z,
        });
        stage.scale.setScalar(scale);
        stage.visible = true;
      } else {
        const p =
          name === project.crossName
            ? 1
            : exiting
              ? supportExit(name, t)
              : supportEntrance(name, t);
        stage.visible = p > 0.001;
        stage.scale.setScalar(Math.max(0.001, p));
        if (exiting) {
          continueExitPose(
            item.exitPosition ?? home,
            item.exitRotation ?? scratch.group,
            scratch.delta,
            scratch.p,
            scratch.q,
          );
          carryExitMomentum(item.exitVelocity, item.exitSpin, t, scratch.p, scratch.q);
        } else scratch.p.copy(home).applyQuaternion(scratch.group);
        scratch.p.multiplyScalar(0.72 + 0.28 * p);
        body.setNextKinematicTranslation({
          x: scratch.p.x,
          y: scratch.p.y,
          z: scratch.p.z,
        });
        scratch.spin.setFromEuler(
          scratch.e.set((1 - p) * 0.22, (1 - p) * -0.4, (1 - p) * 0.32),
        );
        if (exiting) scratch.q.multiply(scratch.spin);
        else scratch.q.copy(scratch.group).multiply(scratch.spin);
        body.setNextKinematicRotation({
          x: scratch.q.x,
          y: scratch.q.y,
          z: scratch.q.z,
          w: scratch.q.w,
        });
      }
    }
    if (!exiting && t >= entranceDuration) {
      state.done = true;
      state.phase = "hold";
      state.time = 0;
    }
    telemetry.current.phase = state.phase;
    telemetry.current.entranceProgress = Math.min(1, t / entranceDuration);
  });
  return null;
}
