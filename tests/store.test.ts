import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminCredentials, validateProject } from '../lib/store';
import { mediaType } from '../lib/media';
import { project01 } from '../content/projects/project-01';

test('project validation accepts valid content and rejects unsafe media paths', () => {
  const project = validateProject({ ...project01, published: true, placement: 'selected', order: 0 });
  assert.equal(project.slug, project01.slug);
  assert.throws(() => validateProject({ ...project, cover: '/uploads/../secret', published: true }));
});

test('admin credentials are salted and passwords are never stored', () => {
  const first = createAdminCredentials('TEST@example.com', 'a-long-test-password');
  const second = createAdminCredentials('test@example.com', 'a-long-test-password');
  assert.equal(first.email, 'test@example.com');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert(!JSON.stringify(first).includes('a-long-test-password'));
});

test('upload signatures accept supported media and reject HTML or SVG', () => {
  assert.equal(mediaType(Buffer.from('<svg/>')), null);
  assert.equal(mediaType(Buffer.from('<html/>')), null);
  assert.equal(mediaType(Buffer.from([137,80,78,71,13,10,26,10]))?.mime, 'image/png');
  assert.equal(mediaType(Buffer.from('%PDF-1.7\n'))?.mime, 'application/pdf');
});
