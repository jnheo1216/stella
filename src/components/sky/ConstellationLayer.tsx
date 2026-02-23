'use client';

import { useMemo } from 'react';
import { BufferAttribute } from 'three';
import type { ProjectedSegment } from '@/types/sky';

type ConstellationLayerProps = {
  segments: ProjectedSegment[];
};

export function ConstellationLayer({ segments }: ConstellationLayerProps): JSX.Element {
  const positionAttr = useMemo(() => {
    const renderable = segments.filter((segment) => segment.from.altDeg > -12 || segment.to.altDeg > -12);
    const positions = new Float32Array(renderable.length * 6);

    for (let i = 0; i < renderable.length; i += 1) {
      const segment = renderable[i];
      const base = i * 6;

      positions[base] = segment.from.x;
      positions[base + 1] = segment.from.y;
      positions[base + 2] = segment.from.z;
      positions[base + 3] = segment.to.x;
      positions[base + 4] = segment.to.y;
      positions[base + 5] = segment.to.z;
    }

    return new BufferAttribute(positions, 3);
  }, [segments]);

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <primitive attach="attributes-position" object={positionAttr} />
      </bufferGeometry>
      <lineBasicMaterial color="#87b8ff" transparent opacity={0.42} />
    </lineSegments>
  );
}
