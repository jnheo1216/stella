export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function degToRad(deg: number): number {
  return deg * DEG2RAD;
}

export function radToDeg(rad: number): number {
  return rad * RAD2DEG;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wrapDeg360(deg: number): number {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function wrapDeg180(deg: number): number {
  const wrapped = wrapDeg360(deg);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
