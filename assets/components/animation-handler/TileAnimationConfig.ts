import { TweenEasing } from 'cc';

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: TweenEasing;

  glowDuration?: number;
  settleDuration?: number;
  scaleMultiplier?: number;
  bounceMultiplier?: number;
}

export const CONFIG: Record<string, AnimationConfig> = {
  SELECTION_CONFIG: {
    duration: 0.3,
    glowDuration: 0.18,
    settleDuration: 0.12,
    easing: 'sineOut',
  },

  DRAG_CONFIG: {
    duration: 0.2,
    easing: 'backOut',
    scaleMultiplier: 1.3,
  },

  DESTRUCTION_CONFIG: {
    duration: 0.35,
    easing: 'backIn',
    bounceMultiplier: 1.4,
  },

  SPAWN_CONFIG: {
    duration: 0.5,
    easing: 'backOut',
    scaleMultiplier: 1.0,
  },

  BOUNCE_CONFIG: {
    duration: 0.08,
    easing: 'quadOut',
    scaleMultiplier: 1.25,
  },

  MOVEMENT_CONFIG: {
    duration: 0.25,
    easing: 'quadOut',
  },

  PULSE_CONFIG: {
    duration: 0.15,
    easing: 'sineInOut',
    scaleMultiplier: 1.08,
  },

  DESELECTION_CONFIG: {
    duration: 0.2,
    easing: 'sineIn',
  },
} as const;

export const COLOR_PRESETS = {
  SELECTION_GLOW: { r: 255, g: 255, b: 150, a: 255 },
  SELECTION_ACTIVE: { r: 255, g: 255, b: 200, a: 255 },
  DRAG_TINT: { r: 180, g: 180, b: 255, a: 160 },
  ORIGINAL: { r: 255, g: 255, b: 255, a: 255 },
  TRANSPARENT: { r: 255, g: 255, b: 255, a: 0 },
} as const;
