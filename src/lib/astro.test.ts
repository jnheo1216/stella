import { describe, expect, it } from 'vitest';
import {
  horizontalToCartesian,
  localSiderealTimeDeg,
  raDecToHorizontal,
  toJulianDate
} from '@/lib/astro';
import type { Observer } from '@/types/sky';

describe('astro calculations', () => {
  it('converts Unix epoch milliseconds to Julian date', () => {
    const j2000Epoch = Date.UTC(2000, 0, 1, 12, 0, 0, 0);
    expect(toJulianDate(j2000Epoch)).toBeCloseTo(2451545.0, 8);
  });

  it('places a star near zenith when dec equals latitude at meridian transit', () => {
    const observer: Observer = {
      latDeg: 37.5665,
      lonDeg: 126.978,
      timezone: 'Asia/Seoul'
    };

    const epoch = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
    const raAtTransit = localSiderealTimeDeg(observer, epoch);
    const point = raDecToHorizontal(raAtTransit, observer.latDeg, observer, epoch);

    expect(point.altDeg).toBeGreaterThan(89);
    expect(point.visible).toBe(true);
  });

  it('maps azimuth north to forward (-z) on horizon', () => {
    const point = horizontalToCartesian(0, 0, 100);
    expect(point.x).toBeCloseTo(0, 8);
    expect(point.y).toBeCloseTo(0, 8);
    expect(point.z).toBeCloseTo(-100, 8);
  });
});
