'use client';

import { useMemo } from 'react';
import { BufferAttribute } from 'three';
import { clamp } from '@/lib/coords';
import type { ProjectedStar } from '@/types/sky';

type StarsLayerProps = {
  stars: ProjectedStar[];
};

type StarBucket = {
  id: string;
  maxMag: number;
  size: number;
  opacity: number;
};

const STAR_BUCKETS: StarBucket[] = [
  { id: 'very-bright', maxMag: 1.2, size: 2.6, opacity: 0.98 },
  { id: 'bright', maxMag: 2.8, size: 1.95, opacity: 0.94 },
  { id: 'mid', maxMag: 4.2, size: 1.45, opacity: 0.9 },
  { id: 'faint', maxMag: 6.6, size: 1.05, opacity: 0.82 }
];

function getBucketIndex(mag: number): number {
  for (let i = 0; i < STAR_BUCKETS.length; i += 1) {
    if (mag <= STAR_BUCKETS[i].maxMag) {
      return i;
    }
  }
  return STAR_BUCKETS.length - 1;
}

export function StarsLayer({ stars }: StarsLayerProps): JSX.Element {
  const bucketRenderData = useMemo(() => {
    const renderable = stars.filter((star) => star.altDeg > -6);

    const buckets = STAR_BUCKETS.map((bucket) => ({
      ...bucket,
      positions: [] as number[],
      colors: [] as number[]
    }));

    for (const star of renderable) {
      const bucketIndex = getBucketIndex(star.mag);
      const bucket = buckets[bucketIndex];
      bucket.positions.push(star.x, star.y, star.z);

      const flux = Math.pow(10, -0.4 * (star.mag - 1.2));
      const brightness = clamp(0.16 + flux * 0.84, 0.15, 1);
      const horizonFade = star.altDeg < 0 ? clamp(1 + star.altDeg / 10, 0.18, 1) : 1;
      const intensity = brightness * horizonFade;
      const coolBoost = clamp((6.5 - star.mag) / 18, 0, 0.25);

      bucket.colors.push(
        clamp(intensity * (0.9 + coolBoost * 0.45), 0, 1),
        clamp(intensity * (0.92 + coolBoost * 0.3), 0, 1),
        clamp(intensity * (0.98 + coolBoost), 0, 1)
      );
    }

    return buckets.map((bucket) => ({
      ...bucket,
      positionAttr: new BufferAttribute(new Float32Array(bucket.positions), 3),
      colorAttr: new BufferAttribute(new Float32Array(bucket.colors), 3)
    }));
  }, [stars]);

  return (
    <>
      {bucketRenderData.map((bucket) => (
        <points key={bucket.id} frustumCulled={false}>
          <bufferGeometry>
            <primitive attach="attributes-position" object={bucket.positionAttr} />
            <primitive attach="attributes-color" object={bucket.colorAttr} />
          </bufferGeometry>
          <pointsMaterial
            size={bucket.size}
            sizeAttenuation
            transparent
            opacity={bucket.opacity}
            vertexColors
            depthWrite={false}
          />
        </points>
      ))}
    </>
  );
}
