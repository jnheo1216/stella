import {
  clamp,
  degToRad,
  radToDeg,
  wrapDeg180,
  wrapDeg360
} from '@/lib/coords';
import type {
  ConstellationLabel,
  ConstellationSegment,
  HorizontalPoint,
  Observer,
  ProjectedLabel,
  ProjectedSegment,
  ProjectedStar,
  Star
} from '@/types/sky';

export const STAR_RENDER_RADIUS = 120;

export function toJulianDate(epochMs: number): number {
  return epochMs / 86400000 + 2440587.5;
}

export function gmstDeg(epochMs: number): number {
  const jd = toJulianDate(epochMs);
  const t = (jd - 2451545.0) / 36525;
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  return wrapDeg360(gmst);
}

export function localSiderealTimeDeg(observer: Observer, epochMs: number): number {
  return wrapDeg360(gmstDeg(epochMs) + observer.lonDeg);
}

export function raDecToHorizontal(
  raDeg: number,
  decDeg: number,
  observer: Observer,
  epochMs: number
): HorizontalPoint {
  const lstDeg = localSiderealTimeDeg(observer, epochMs);
  const hourAngleDeg = wrapDeg180(lstDeg - raDeg);

  const latRad = degToRad(observer.latDeg);
  const decRad = degToRad(decDeg);
  const haRad = degToRad(hourAngleDeg);

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altRad = Math.asin(clamp(sinAlt, -1, 1));

  const cosAlt = Math.max(1e-9, Math.cos(altRad));
  const cosAz =
    (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
    (cosAlt * Math.cos(latRad));
  let azRad = Math.acos(clamp(cosAz, -1, 1));

  // Resolve azimuth quadrant using the hour angle sign.
  if (Math.sin(haRad) > 0) {
    azRad = Math.PI * 2 - azRad;
  }

  const altDeg = radToDeg(altRad);
  const azDeg = wrapDeg360(radToDeg(azRad));
  const cart = horizontalToCartesian(altDeg, azDeg, STAR_RENDER_RADIUS);

  return {
    altDeg,
    azDeg,
    x: cart.x,
    y: cart.y,
    z: cart.z,
    visible: altDeg > -2
  };
}

export function horizontalToCartesian(
  altDeg: number,
  azDeg: number,
  radius = STAR_RENDER_RADIUS
): { x: number; y: number; z: number } {
  const alt = degToRad(altDeg);
  const az = degToRad(azDeg);

  const cosAlt = Math.cos(alt);

  // Camera looks down negative Z. Azimuth 0°(north) should appear forward.
  return {
    x: radius * cosAlt * Math.sin(az),
    y: radius * Math.sin(alt),
    z: -radius * cosAlt * Math.cos(az)
  };
}

export function projectStars(
  stars: Star[],
  observer: Observer,
  epochMs: number
): ProjectedStar[] {
  return stars.map((star) => {
    const point = raDecToHorizontal(star.raDeg, star.decDeg, observer, epochMs);
    return {
      id: star.id,
      mag: star.mag,
      name: star.name,
      ...point
    };
  });
}

export function projectSegments(
  segments: ConstellationSegment[],
  pointsByStarId: Map<number, HorizontalPoint>
): ProjectedSegment[] {
  const result: ProjectedSegment[] = [];

  for (const segment of segments) {
    const from = pointsByStarId.get(segment.fromStarId);
    const to = pointsByStarId.get(segment.toStarId);
    if (!from || !to) {
      continue;
    }

    const lineVisible = from.altDeg > -12 || to.altDeg > -12;
    if (!lineVisible) {
      continue;
    }

    result.push({
      code: segment.code,
      from,
      to
    });
  }

  return result;
}

export function projectLabels(
  labels: ConstellationLabel[],
  observer: Observer,
  epochMs: number
): ProjectedLabel[] {
  return labels
    .map((label) => {
      const point = raDecToHorizontal(label.raDeg, label.decDeg, observer, epochMs);
      return {
        code: label.code,
        name: label.name,
        nameKo: label.nameKo,
        rank: label.rank,
        ...point
      };
    })
    .filter((label) => label.altDeg > -8)
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return b.altDeg - a.altDeg;
    });
}
