import type { PartConfig } from '../types';
export const part01: PartConfig = {
  id: '01', title: 'Fluid Bloom', subtitle: 'WARM / SOFT / ALIVE',
  description: 'Softness creates possibility.', background: '#d8bbae', ink: '#342925', accent: '#ffcbb3',
  seed: 0.3, softness: 1, stretch: 1,
  main: { id: 'bloom-glass', shape: 'liquid', surface: 'liquid', position: [0.15, 0.2, 0.25], size: [1.6, 1.95, 1.15], rotation: [0, 0, -0.25], color: '#fff0e7', material: { attenuationColor: '#f3a89d', attenuationDistance: 3, iridescence: 0.45 } },
  supports: [
    { id: 'bloom-rubber-fold', shape: 'block', surface: 'rubber', position: [1.35, -0.75, -0.35], size: [0.7, 1.4, 0.62], rotation: [0.2, 0.25, -0.2], color: '#d98680' },
    { id: 'bloom-ceramic-fin', shape: 'block', surface: 'ceramic', position: [-1.25, 0.05, -0.7], size: [0.48, 2.4, 0.68], rotation: [0, -0.35, 0.1], color: '#f5e8d5' },
    { id: 'bloom-woven-pebble', shape: 'oval', surface: 'fabric', position: [-1.3, -1.15, 0.6], size: [0.65, 0.48, 0.5], rotation: [0, 0, -0.2], color: '#be6f71' },
    { id: 'bloom-frosted-petal', shape: 'film', surface: 'plastic', position: [0.45, -1.3, 0.9], size: [0.9, 0.18, 0.55], rotation: [0.25, 0, -0.15], color: '#fff3e3' },
    { id: 'bloom-resin-seed', shape: 'facet', surface: 'resin', position: [1.42, -1.3, 0.8], size: [0.22, 0.3, 0.23], color: '#eed4b1' },
  ],
};
