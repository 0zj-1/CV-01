import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocale, localizeProject } from '../lib/locale';
import { project01 } from '../content/projects/project-01';
import { validateProject } from '../lib/store';

test('unsupported saved languages fall back to English', () => {
  assert.equal(normalizeLocale('zh-Hant'), 'zh-Hant');
  assert.equal(normalizeLocale('fr'), 'en');
  assert.equal(normalizeLocale(null), 'en');
});
test('translations override individual fields while media and untranslated content remain intact', () => {
  const original = { ...project01, description: 'New unpublished copy', translations: { 'zh-Hant': { title: '作品一', detail: { headline: '中文標題' } } } };
  const translated = localizeProject(original, 'zh-Hant');
  assert.equal(translated.title, '作品一');
  assert.equal(translated.description, original.description);
  assert.equal(translated.detail.headline, '中文標題');
  assert.equal(translated.images, original.images);
  assert.equal(localizeProject(original, 'en'), original);
  assert.equal(original.title, 'Project 01');
});
test('saved Chinese fields survive validation and oversized or malformed translations are rejected', () => {
  const input = { ...project01, published: true, placement: 'selected', order: 0, translations: { 'zh-Hant': { description: ' 中文說明 ', detail: { introduction: '作品介紹' } } } };
  const saved = validateProject(input);
  assert.equal(saved.translations?.['zh-Hant']?.description, '中文說明');
  assert.equal(saved.translations?.['zh-Hant']?.detail?.introduction, '作品介紹');
  assert.throws(() => validateProject({ ...input, translations: { 'zh-Hant': { title: 'a'.repeat(161) } } }));
  assert.throws(() => validateProject({ ...input, translations: { 'zh-Hant': 'invalid' } }));
});

test('clearing a prepared translation uses English and revised source copy is not given an outdated translation', () => {
  assert.equal(localizeProject({ ...project01, translations: { 'zh-Hant': { description: '' } } }, 'zh-Hant').description, project01.description);
  assert.equal(localizeProject({ ...project01, description: 'Revised original' }, 'zh-Hant').description, 'Revised original');
});
