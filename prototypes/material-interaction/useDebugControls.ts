'use client';

import { useMemo, useRef } from 'react';
import { button, useControls } from 'leva';
import { MATERIAL_PROFILES, dampingRatio } from './materialProfiles';
import type { MaterialProfile, MaterialProfileSet } from './types';

/**
 * Debug GUI.
 *
 * Every knob writes over a field of the matching profile in
 * `materialProfiles.ts`. The defaults below are read from that file, so tuning
 * a value here and pasting it back (see the "log profiles" button) is the
 * intended workflow.
 */

const D = MATERIAL_PROFILES;

/** Folders start closed so the panel does not cover the bench. */
const COLLAPSED = { collapsed: true };

function softSchema(profile: MaterialProfile) {
  return {
    indentation: {
      value: profile.indentation,
      min: 0,
      max: 0.6,
      step: 0.005,
      label: 'indentation',
    },
    radius: { value: profile.radius, min: 0.1, max: 2.2, step: 0.01, label: 'radius' },
    stiffness: { value: profile.stiffness, min: 10, max: 900, step: 1, label: 'stiffness' },
    damping: { value: profile.damping, min: 1, max: 80, step: 0.5, label: 'damping' },
    wobble: { value: profile.wobble, min: 0, max: 1.5, step: 0.01, label: 'wobble' },
    wobbleFrequency: {
      value: profile.wobbleFrequency,
      min: 0.2,
      max: 10,
      step: 0.1,
      label: 'wobble Hz',
    },
    wobbleDecay: {
      value: profile.wobbleDecay,
      min: 0.04,
      max: 1.5,
      step: 0.01,
      label: 'wobble decay',
    },
    rebound: { value: profile.rebound, min: 0.2, max: 3, step: 0.05, label: 'rebound' },
    bulge: { value: profile.bulge, min: 0, max: 0.5, step: 0.005, label: 'bulge' },
    squash: { value: profile.squash, min: 0, max: 0.3, step: 0.005, label: 'global squash' },
    axisBlend: { value: profile.axisBlend, min: 0, max: 1, step: 0.01, label: 'press axis' },
    normalSharpness: {
      value: profile.normalSharpness,
      min: 0,
      max: 3,
      step: 0.05,
      label: 'normal tilt',
    },
    follow: { value: profile.follow, min: 0.02, max: 1, step: 0.01, label: 'drag follow' },
  };
}

export interface DebugState {
  profiles: MaterialProfileSet;
  scene: { wireframe: boolean; orbit: boolean; legend: boolean };
}

export function useMaterialDebugControls(): DebugState {
  const [balloon] = useControls('Balloon', () => softSchema(D.balloon), COLLAPSED);
  const [rubber] = useControls('Rubber', () => softSchema(D.rubber), COLLAPSED);
  const [foam] = useControls('Foam', () => softSchema(D.foam), COLLAPSED);

  const [hard] = useControls('Hard Object', () => ({
    translation: {
      value: D.hard.translation,
      min: 0,
      max: 0.3,
      step: 0.001,
      label: 'travel distance',
    },
    rotation: { value: D.hard.rotation, min: 0, max: 0.3, step: 0.001, label: 'tilt (rad)' },
    scaleSquash: {
      value: D.hard.scaleSquash,
      min: 0,
      max: 0.05,
      step: 0.001,
      label: 'scale squash',
    },
    stiffness: { value: D.hard.stiffness, min: 100, max: 4000, step: 10, label: 'stiffness' },
    damping: { value: D.hard.damping, min: 5, max: 200, step: 1, label: 'damping' },
    rebound: { value: D.hard.rebound, min: 0.2, max: 3, step: 0.05, label: 'rebound' },
  }), COLLAPSED);

  const [scene] = useControls('Scene', () => ({
    wireframe: { value: false as boolean, label: 'wireframe' },
    orbit: { value: true as boolean, label: 'orbit camera' },
    legend: { value: true as boolean, label: 'legend' },
  }));

  const profiles = useMemo<MaterialProfileSet>(
    () => ({
      balloon: { ...D.balloon, ...balloon },
      rubber: { ...D.rubber, ...rubber },
      foam: { ...D.foam, ...foam },
      hard: { ...D.hard, ...hard },
    }),
    [balloon, rubber, foam, hard],
  );

  // The button closure is created once, so it has to read through a ref.
  const latest = useRef(profiles);
  latest.current = profiles;

  useControls('Scene', {
    'log profiles': button(() => {
      const current = latest.current;
      const ratios = Object.values(current)
        .map((profile) => `${profile.type}: damping ratio ${dampingRatio(profile).toFixed(2)}`)
        .join('\n');
      // eslint-disable-next-line no-console
      console.log(`${JSON.stringify(current, null, 2)}\n\n${ratios}`);
      navigator.clipboard?.writeText(JSON.stringify(current, null, 2)).catch(() => {});
    }),
  });

  return { profiles, scene };
}
