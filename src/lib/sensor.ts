import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { SensorPermission } from '@/types/sky';

const ee = new Euler();
const q0 = new Quaternion();
const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const zee = new Vector3(0, 0, 1);

function getScreenOrientationDeg(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const screenOrientation = window.screen?.orientation;
  if (screenOrientation && typeof screenOrientation.angle === 'number') {
    return screenOrientation.angle;
  }

  const legacyOrientation = (window as Window & { orientation?: number }).orientation;
  return typeof legacyOrientation === 'number' ? legacyOrientation : 0;
}

function setObjectQuaternion(
  quaternion: Quaternion,
  alpha: number,
  beta: number,
  gamma: number,
  orient: number
): Quaternion {
  ee.set(beta, alpha, -gamma, 'YXZ');
  quaternion.setFromEuler(ee);
  quaternion.multiply(q1);
  quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
  return quaternion;
}

export function isLikelyMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa = /android|iphone|ipad|ipod|mobile/.test(ua);
  return coarse || mobileUa;
}

export function isDeviceOrientationSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

export async function requestDeviceOrientationPermission(): Promise<SensorPermission> {
  if (!isDeviceOrientationSupported()) {
    return 'unsupported';
  }

  const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof DeviceOrientation.requestPermission === 'function') {
    try {
      const result = await DeviceOrientation.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  return 'granted';
}

export function subscribeDeviceOrientation(
  callback: (quaternion: [number, number, number, number], event: DeviceOrientationEvent) => void
): () => void {
  if (!isDeviceOrientationSupported()) {
    return () => {
      // no-op
    };
  }

  const onOrientation = (event: DeviceOrientationEvent): void => {
    if (
      typeof event.alpha !== 'number' ||
      typeof event.beta !== 'number' ||
      typeof event.gamma !== 'number'
    ) {
      return;
    }

    const alpha = MathUtils.degToRad(event.alpha);
    const beta = MathUtils.degToRad(event.beta);
    const gamma = MathUtils.degToRad(event.gamma);
    const orient = MathUtils.degToRad(getScreenOrientationDeg());

    const q = setObjectQuaternion(new Quaternion(), alpha, beta, gamma, orient);
    callback([q.x, q.y, q.z, q.w], event);
  };

  window.addEventListener('deviceorientation', onOrientation, true);
  return () => {
    window.removeEventListener('deviceorientation', onOrientation, true);
  };
}

export async function getCurrentPosition(): Promise<GeolocationPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation API is not supported in this browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    });
  });
}
