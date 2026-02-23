export type Observer = { latDeg: number; lonDeg: number; timezone: string };
export type TimeState = { mode: 'realtime' | 'manual'; epochMs: number };
export type CameraMode = 'sensor' | 'manual';

export type SensorPermission = 'unknown' | 'granted' | 'denied' | 'unsupported';
export type SensorState = {
  permission: SensorPermission;
  isAvailable: boolean;
  quaternion: [number, number, number, number] | null;
  lastUpdatedMs: number | null;
};

export type Star = {
  id: number;
  raDeg: number;
  decDeg: number;
  mag: number;
  name?: string;
};

export type ConstellationSegment = {
  fromStarId: number;
  toStarId: number;
  code: string;
};

export type HorizontalPoint = {
  altDeg: number;
  azDeg: number;
  x: number;
  y: number;
  z: number;
  visible: boolean;
};

export type ConstellationLabel = {
  code: string;
  name: string;
  raDeg: number;
  decDeg: number;
  rank: number;
};

export type ProjectedStar = HorizontalPoint & {
  id: number;
  mag: number;
  name?: string;
};

export type ProjectedLabel = HorizontalPoint & {
  code: string;
  name: string;
  rank: number;
};

export type ProjectedSegment = {
  code: string;
  from: HorizontalPoint;
  to: HorizontalPoint;
};
