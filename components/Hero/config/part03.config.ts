import type { PartConfig } from '../types';
export const part03: PartConfig = {
  id: '03', title: 'Condensed Contrast', subtitle: 'DEEP / TEXTURE / REFINED',
  description: 'Different materials — a stronger me.', background: '#282623', ink: '#eee6da', accent: '#ffb97d',
  seed: 2.9, softness: 0.13, stretch: 0.55,
  main: { id: 'condensed-glass', shape: 'liquid', surface: 'liquid', position: [0.08, 0.22, 0.3], size: [1.6, 1.95, 1.12], rotation: [0, -0.2, -0.2], color: '#b3a293', material: { transmission: 0.88, attenuationColor: '#39291f', attenuationDistance: 0.9, iridescence: 0.08, roughness: 0.075 } },
  supports: [
    { id: 'condensed-stone-keel', shape: 'block', surface: 'stone', position: [-1.2, -0.5, -0.45], size: [0.8, 1.9, 0.78], rotation: [0.1, -0.25, 0.15], color: '#494643' },
    { id: 'condensed-brushed-arch', shape: 'arc', surface: 'metal', position: [1.25, 0, -0.65], size: [0.7, 1, 0.75], rotation: [0.1, 0.3, 0], color: '#b9a796' },
    { id: 'condensed-ceramic-tablet', shape: 'oval', surface: 'ceramic', position: [-1, -1.27, 0.75], size: [0.55, 0.38, 0.45], rotation: [0.1, 0, -0.3], color: '#272625' },
    { id: 'condensed-amber-shard', shape: 'facet', surface: 'resin', position: [1.2, -1.08, 0.9], size: [0.4, 0.55, 0.38], rotation: [0.2, 0.2, 0.15], color: '#d57927' },
    { id: 'condensed-small-stud', shape: 'facet', surface: 'metal', position: [-0.3, -1.55, 1], size: [0.15, 0.12, 0.18], color: '#a39278' },
  ],
};
