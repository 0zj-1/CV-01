import test from 'node:test';
import assert from 'node:assert/strict';
import { createResolutionState, advanceResolution } from '../src/config/performance.js';

function run(state, fps, seconds) {
  for (let i = 0; i < fps * seconds; i++) advanceResolution(state, 1 / fps);
}

test('sustained slow rendering reduces resolution and respects the lower bound', () => {
  const state = createResolutionState();
  run(state, 30, 2);
  assert(state.dpr < 0.85);
  run(state, 30, 20);
  assert.equal(state.dpr, 0.65);
});

test('resolution only rises after several stable seconds and never exceeds native size', () => {
  const state = createResolutionState();
  state.dpr = 0.7;
  run(state, 60, 3);
  assert.equal(state.dpr, 0.7);
  run(state, 60, 4);
  assert(state.dpr > 0.7);
  run(state, 60, 60);
  assert.equal(state.dpr, 1);
});

test('a resume or loading stall does not lower quality or count toward recovery', () => {
  const state = createResolutionState();
  run(state, 60, 3);
  advanceResolution(state, 2);
  assert.equal(state.dpr, 0.85);
  run(state, 60, 3);
  assert.equal(state.dpr, 0.85);
});

test('borderline performance holds quality instead of oscillating', () => {
  const state = createResolutionState();
  run(state, 57, 15);
  assert.equal(state.dpr, 0.85);
});
