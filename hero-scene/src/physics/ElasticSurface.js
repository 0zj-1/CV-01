import { Vector3 } from "three";

// Reduced mass-spring surface. Particle velocities persist between steps;
// motion comes from forces, never from an animation curve or mesh scaling.
export class ElasticSurface {
  constructor(geometry, plush) {
    const a = geometry.attributes.position.array;
    this.rest = [];
    // Farthest-point sampling spreads physical nodes across the authored shape.
    this.rest.push(new Vector3(a[0], a[1], a[2]));
    for (let n = 1; n < 32; n++) {
      let best = -1,
        candidate = new Vector3();
      for (let i = 0; i < a.length; i += 3) {
        const p = new Vector3(a[i], a[i + 1], a[i + 2]);
        const d = Math.min(...this.rest.map((r) => r.distanceToSquared(p)));
        if (d > best) {
          best = d;
          candidate.copy(p);
        }
      }
      this.rest.push(candidate);
    }
    this.positions = this.rest.map((p) => p.clone());
    this.velocities = this.rest.map(() => new Vector3());
    this.forces = this.rest.map(() => new Vector3());
    this.links = [];
    for (let i = 0; i < 32; i++)
      for (let j = i + 1; j < 32; j++)
        this.links.push([i, j, this.rest[i].distanceTo(this.rest[j])]);
    this.stiffness = plush ? 15 : 42;
    this.damping = plush ? 8 : 3.8;
    this.anchor = plush ? 8 : 20;
    this.bindings = new Map();
    this.bind(geometry);
  }
  bind(geometry) {
    if (this.bindings.has(geometry)) return;
    const rest = Float32Array.from(geometry.attributes.position.array),
      weights = [];
    for (let i = 0; i < rest.length; i += 3) {
      const p = new Vector3(rest[i], rest[i + 1], rest[i + 2]);
      const nearest = this.rest
        .map((r, k) => [k, 1 / Math.max(0.0001, r.distanceToSquared(p))])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const total = nearest.reduce((s, x) => s + x[1], 0);
      weights.push(nearest.map(([k, w]) => [k, w / total]));
    }
    this.bindings.set(geometry, { rest, weights });
  }
  impulse(direction, strength) {
    const n = direction.clone().normalize();
    for (let i = 0; i < 32; i++) {
      const facing = Math.max(0, this.rest[i].clone().normalize().dot(n));
      this.velocities[i].addScaledVector(
        n,
        -Math.min(strength, 2.5) * facing * facing,
      );
    }
  }
  step(h, acceleration, grabPoint = null) {
    const delta = new Vector3();
    for (let i = 0; i < 32; i++) {
      this.forces[i]
        .copy(this.rest[i])
        .sub(this.positions[i])
        .multiplyScalar(this.anchor)
        .addScaledVector(this.velocities[i], -this.damping)
        .addScaledVector(acceleration, -0.55);
    }
    // Internal springs conserve pairwise momentum and resist volume collapse.
    for (const [i, j, length] of this.links) {
      delta.copy(this.positions[j]).sub(this.positions[i]);
      const d = delta.length();
      if (d < 1e-8) continue;
      delta.multiplyScalar(((d - length) * this.stiffness) / (d * 8));
      this.forces[i].add(delta);
      this.forces[j].sub(delta);
    }
    for (let i = 0; i < 32; i++) {
      this.velocities[i].addScaledVector(this.forces[i], h);
      this.positions[i].addScaledVector(this.velocities[i], h);
      // Bound extreme solver excursions from teleporting a pointer.
      delta.copy(this.positions[i]).sub(this.rest[i]);
      if (delta.length() > 0.35) {
        this.positions[i].copy(this.rest[i]).add(delta.setLength(0.35));
        this.velocities[i].multiplyScalar(0.5);
      }
    }
    if (grabPoint) {
      let nearest = 0;
      for (let i = 1; i < 32; i++)
        if (
          this.rest[i].distanceToSquared(grabPoint) <
          this.rest[nearest].distanceToSquared(grabPoint)
        )
          nearest = i;
      // The picked node follows the hand; other nodes retain inertia and stretch.
      this.positions[nearest].copy(this.rest[nearest]);
      this.velocities[nearest].set(0, 0, 0);
    }
  }
  updateMeshes() {
    for (const [geometry, { rest, weights }] of this.bindings) {
      const a = geometry.attributes.position.array;
      for (let i = 0; i < weights.length; i++) {
        let x = 0,
          y = 0,
          z = 0;
        for (const [k, w] of weights[i]) {
          x += (this.positions[k].x - this.rest[k].x) * w;
          y += (this.positions[k].y - this.rest[k].y) * w;
          z += (this.positions[k].z - this.rest[k].z) * w;
        }
        a[i * 3] = rest[i * 3] + x;
        a[i * 3 + 1] = rest[i * 3 + 1] + y;
        a[i * 3 + 2] = rest[i * 3 + 2] + z;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  }
}
