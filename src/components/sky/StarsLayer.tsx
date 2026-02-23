'use client';

import { useMemo } from 'react';
import { BufferAttribute } from 'three';
import { clamp } from '@/lib/coords';
import type { ProjectedStar } from '@/types/sky';

type StarsLayerProps = {
  stars: ProjectedStar[];
};

export function StarsLayer({ stars }: StarsLayerProps): JSX.Element {
  const { positionAttr, colorAttr } = useMemo(() => {
    const renderable = stars.filter((star) => star.altDeg > -6);

    const positions = new Float32Array(renderable.length * 3);
    const colors = new Float32Array(renderable.length * 3);

    for (let i = 0; i < renderable.length; i += 1) {
      const star = renderable[i];
      const base = i * 3;

      positions[base] = star.x;
      positions[base + 1] = star.y;
      positions[base + 2] = star.z;

      const brightness = clamp(1.22 - star.mag / 7.2, 0.2, 1);
      const horizonFade = star.altDeg < 0 ? clamp(1 + star.altDeg / 10, 0.18, 1) : 1;
      const b = brightness * horizonFade;

      colors[base] = b;
      colors[base + 1] = b;
      colors[base + 2] = b + (1 - b) * 0.1;
    }

    return {
      positionAttr: new BufferAttribute(positions, 3),
      colorAttr: new BufferAttribute(colors, 3)
    };
  }, [stars]);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <primitive attach="attributes-position" object={positionAttr} />
        <primitive attach="attributes-color" object={colorAttr} />
      </bufferGeometry>
      <pointsMaterial
        size={1.35}
        sizeAttenuation
        transparent
        opacity={0.95}
        vertexColors
        depthWrite={false}
      />
    </points>
  );
}
