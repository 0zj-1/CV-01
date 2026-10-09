import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SelectedWorks from '../components/SelectedWorks';
import { project01 } from '../content/projects/project-01';

test('selected works show the edited cover instead of the detail page featured media', () => {
  const html = renderToStaticMarkup(React.createElement(SelectedWorks, { works: [{
    ...project01,
    cover: '/uploads/edited-cover.png',
    featuredMedia: '/uploads/detail-video.mp4',
    videos: ['/uploads/detail-video.mp4'],
    coverCrop: { normal: { x: 20, y: 75, scale: 1.5 }, hover: { x: 20, y: 75, scale: 1.62 } },
  }] }));
  assert.match(html, /src="\/uploads\/edited-cover.png"/);
  assert.doesNotMatch(html, /src="\/uploads\/detail-video.mp4"/);
  assert.match(html, /--cover-normal-transform:translate\(15%, -12.5%\) scale\(1.5\)/);
});
