import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Vector3, Vector2, Raycaster } from "three";
export default function PointerInteractor({
  pointer,
  bodies,
  drag,
  intro,
  telemetry,
  project,
  embed = false,
}) {
  const { gl, camera } = useThree();
  useEffect(() => {
    const canvas = gl.domElement,
      plane = new Plane(new Vector3(0, 0, 1), 0),
      ray = new Raycaster(),
      uv = new Vector2(),
      hit = new Vector3();
    function updateRay(e) {
      const r = canvas.getBoundingClientRect();
      uv.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(uv, camera);
    }
    function move(e) {
      updateRay(e);
      pointer.current.active = !!ray.ray.intersectPlane(
        plane,
        pointer.current.point,
      );
      if (!drag.current) return;
      if (ray.ray.intersectPlane(drag.current.plane, hit)) {
        const nextTarget = hit.clone().add(drag.current.offset);
        const item = bodies.current.get(drag.current.name);
        const halfHeight =
            (camera.position.z - drag.current.target.z) *
            Math.tan((camera.fov * Math.PI) / 360),
          halfWidth = halfHeight * camera.aspect;
        const margin = item.radius * 0.6;
        nextTarget.x = Math.max(
          -halfWidth + margin,
          Math.min(halfWidth - margin, nextTarget.x),
        );
        nextTarget.y = Math.max(
          -halfHeight + margin,
          Math.min(halfHeight - margin, nextTarget.y),
        );
        drag.current.delta.copy(nextTarget).sub(drag.current.target);
        drag.current.target.copy(nextTarget);
        telemetry.current.dragDistance = drag.current.target.distanceTo(
          drag.current.start,
        );
      }
    }
    function down(e) {
      if (e.button !== 0 || !intro.current.done) return;
      updateRay(e);
      const hits = ray.intersectObjects(
        [...bodies.current.values()].map((i) => i.stage),
        true,
      );
      // Picking follows the cover's visible foreground rather than the rear glass.
      hits.sort((a, b) => Number(b.object.renderOrder === 101) - Number(a.object.renderOrder === 101));
      // Small moving diamonds get a modest screen-space picking tolerance.
      if (!hits.length) {
        const rect = canvas.getBoundingClientRect();
        let closest = 14,
          candidate = null;
        for (const item of bodies.current.values()) {
          if (item.radius > 0.4) continue;
          const p = item.body.translation(),
            screen = new Vector3(p.x, p.y, p.z).project(camera);
          const distance = Math.hypot(
            ((screen.x + 1) * rect.width) / 2 + rect.left - e.clientX,
            ((1 - screen.y) * rect.height) / 2 + rect.top - e.clientY,
          );
          if (distance < closest) {
            closest = distance;
            candidate = {
              object: item.stage,
              point: new Vector3(p.x, p.y, p.z),
            };
          }
        }
        if (candidate) hits.push(candidate);
      }
      if (!hits.length) {
        move(e);
        pointer.current.click++;
        return;
      }
      let object = hits[0].object;
      while (object && !object.userData.dragName) object = object.parent;
      const name = object?.userData.dragName,
        item = bodies.current.get(name);
      if (!item) return;
      const p = item.body.translation(),
        start = new Vector3(p.x, p.y, p.z);
      drag.current = {
        name,
        localPoint: item.stage.worldToLocal(hits[0].point.clone()),
        plane: new Plane(new Vector3(0, 0, 1), -hits[0].point.z),
        offset: start.clone().sub(hits[0].point),
        start,
        target: start.clone(),
        delta: new Vector3(),
        clickImpulse: name === project.mainName,
      };
      if (name !== project.mainName) item.body.setBodyType(2, true);
      item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      telemetry.current.draggedObject = name;
      telemetry.current.dragCount = (telemetry.current.dragCount || 0) + 1;
    }
    function release(e) {
      if (drag.current) {
        const item = bodies.current.get(drag.current.name);
        if (item) {
          if (drag.current.name !== project.mainName) item.body.setBodyType(0, true);
          // Release into the home spring without a throw impulse.
          item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
        drag.current = null;
      }
      if (e?.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      pointer.current.active = false;
      canvas.style.cursor = "grab";
    }
    function leave() {
      if (!drag.current) pointer.current.active = false;
    }
    canvas.style.cursor = "grab";
    // Embedded in the site, vertical swipes must still scroll the page; touch
    // drags then move objects sideways only. Mouse dragging is unaffected.
    canvas.style.touchAction = embed ? "pan-y" : "none";
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("lostpointercapture", release);
    canvas.addEventListener("pointerleave", leave);
    window.addEventListener("blur", release);
    return () => {
      release();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
      canvas.removeEventListener("lostpointercapture", release);
      canvas.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", release);
    };
  }, [gl, camera, pointer, bodies, drag, intro, telemetry, project, embed]);
  return null;
}
