import type { PartConfig } from '../types';
export const part02: PartConfig = {
  id: '02', title: 'Tension Structure', subtitle: 'COOL / STRUCTURE / DIGITAL',
  description: 'Stretching between reality and imagination.', background: '#8b99b0', ink: '#192b40', accent: '#aecfff',
  seed: 1.7, softness: 0.65, stretch: 1.3,
  main: { id: 'tension-glass', shape: 'liquid', surface: 'liquid', position: [0.12, 0.15, 0.25], size: [1.45, 2, 1.05], rotation: [0, 0.12, -0.35], color: '#e5efff', material: { attenuationColor: '#7b9cd3', attenuationDistance: 3, iridescence: 0.7 } },
  supports: [
    { id: 'tension-plastic-spine', shape: 'block', surface: 'plastic', position: [-1.18, -0.05, -0.65], size: [0.5, 2.3, 0.65], rotation: [0, 0.2, -0.06], color: '#cbd4ec' },
    { id: 'tension-metal-bracket', shape: 'arc', surface: 'metal', position: [1.03, 0.45, -0.9], size: [1, 1.35, 0.65], rotation: [0.1, 0.2, -0.3], color: '#bccbd8' },
    { id: 'tension-terrazzo-pebble', shape: 'oval', surface: 'stone', position: [-1.18, -1.3, 0.72], size: [0.5, 0.4, 0.48], color: '#dee0de' },
    { id: 'tension-optical-leaf', shape: 'film', surface: 'plastic', position: [1, -0.92, 0.72], size: [0.6, 0.12, 0.85], rotation: [0.35, 0.4, 0.5], color: '#dce9ff', material: { transmission: 0.45, thickness: 0.3, roughness: 0.3 } },
    { id: 'tension-small-pin', shape: 'block', surface: 'metal', position: [1.53, -0.2, 0], size: [0.08, 1.35, 0.1], rotation: [0, 0, -0.4], color: '#cbd5df' },
  ],
};
