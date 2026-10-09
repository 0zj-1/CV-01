import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, DoubleSide } from 'three';

globalThis.location = { search: '?cover', origin: 'https://portfolio.test' };
let receive;
globalThis.window = { parent: {}, addEventListener: (_, callback) => { receive = callback; } };
const { applyCoverForeground, isCoverForeground, cover } = await import('../src/config/cover.js');

test('foreground pieces keep depth and material appearance, then restore their original render state', () => {
  const root = new Group();
  const material = new MeshStandardMaterial({ side: DoubleSide });
  const mesh = new Mesh(new BoxGeometry(), material);
  root.add(mesh);
  const undo = applyCoverForeground(root);
  assert.equal(mesh.renderOrder, 101);
  assert.equal(material.transparent, true);
  assert.equal(material.opacity, 1);
  assert.equal(material.depthTest, true);
  assert.equal(material.depthWrite, true);
  assert.equal(material.forceSinglePass, true);
  assert.equal(material.side, DoubleSide);
  undo();
  assert.equal(mesh.renderOrder, 0);
  assert.equal(material.transparent, false);
  assert.equal(material.forceSinglePass, false);
  mesh.geometry.dispose(); material.dispose();
});

test('only selected opaque satellites enter the foreground queue', () => {
  assert(isCoverForeground('P01_Cross'));
  assert(isCoverForeground('P02_Cube'));
  assert(isCoverForeground('P03_Ring_01'));
  assert(!isCoverForeground('P01_MainBlob'));
  assert(!isCoverForeground('P01_Sphere_01'));
  assert(!isCoverForeground('P01_Diamond_01'));
});

test('cover messages accept only the same-origin parent and finite opacity', () => {
  const message = { origin: location.origin, source: window.parent, data: { type: 'hero:cover-opacity', opacity: .4 } };
  receive({ ...message, origin: 'https://other.test' });
  receive({ ...message, source: {} });
  receive({ ...message, data: { ...message.data, opacity: NaN } });
  assert.equal(cover.opacity, 1);
  receive(message);
  assert.equal(cover.opacity, .4);
  receive({ ...message, data: { ...message.data, opacity: 2 } });
  assert.equal(cover.opacity, 1);
});
