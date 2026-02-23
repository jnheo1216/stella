'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import type { ProjectedLabel } from '@/types/sky';

type LabelsLayerProps = {
  labels: ProjectedLabel[];
  maxLabels: number;
};

export function LabelsLayer({ labels, maxLabels }: LabelsLayerProps): JSX.Element {
  const renderable = useMemo(() => {
    return labels.filter((label) => label.altDeg > -4).slice(0, maxLabels);
  }, [labels, maxLabels]);

  return (
    <>
      {renderable.map((label) => (
        <Html
          key={label.code}
          position={[label.x, label.y, label.z]}
          center
          transform
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <span className="constellation-label">{label.name}</span>
        </Html>
      ))}
    </>
  );
}
