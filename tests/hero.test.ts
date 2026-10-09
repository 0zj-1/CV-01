import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, transitionAt, TIMING, cycleDuration } from '../components/Hero/transitions/SceneTransition';
import { stepSpring, RESPONSE } from '../components/Hero/interactions/MaterialResponse';
import { part01 } from '../components/Hero/config/part01.config';
import { part02 } from '../components/Hero/config/part02.config';
import { part03 } from '../components/Hero/config/part03.config';
test('scene must become invisible before lifecycle resets', () => {
  assert.equal(phaseAt(0), 'INTRO');
  assert.equal(phaseAt(TIMING.intro), 'INTERACTIVE');
  assert.equal(phaseAt(TIMING.intro + TIMING.interactive), 'OUTRO');
  assert.equal(transitionAt(cycleDuration() - 0.01).visible, false);
  assert.equal(transitionAt(TIMING.intro).scale, 1);
});
test('material spring converges independently of display rate', () => {
  for (const profile of Object.values(RESPONSE)) {
    for (const fps of [30, 60, 120]) {
      const state = { value: 1, velocity: 0 };
      for (let i = 0; i < fps * 5; i++) stepSpring(state, 0, 1 / fps, profile.stiffness, profile.damping);
      assert(Math.abs(state.value) < 0.001);
      assert(Math.abs(state.velocity) < 0.001);
    }
  }
});
test('parts have unique mesh names and one dominant liquid body each', () => {
  const names = new Set<string>();
  for (const part of [part01, part02, part03]) {
    for (const object of [part.main, ...part.supports]) { assert(!names.has(object.id)); names.add(object.id); }
    assert(part.supports.every(s => s.surface !== 'liquid'));
    assert(part.supports.every(s => s.size[0] * s.size[1] < part.main.size[0] * part.main.size[1]));
  }
});
