'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import type { LabelDisplayMode, ProjectedLabel } from '@/types/sky';

type LabelsLayerProps = {
  labels: ProjectedLabel[];
  displayMode: LabelDisplayMode;
};

function formatLabelText(label: ProjectedLabel, mode: LabelDisplayMode): string {
  if (mode === 'ko') {
    return label.nameKo ?? label.name;
  }

  if (mode === 'both') {
    if (label.nameKo) {
      return `${label.nameKo} · ${label.name}`;
    }
    return label.name;
  }

  return label.name;
}

export function LabelsLayer({ labels, displayMode }: LabelsLayerProps): JSX.Element {
  const renderable = useMemo(() => {
    return labels.filter((label) => label.altDeg > -8);
  }, [labels]);

  return (
    <>
      {renderable.map((label) => (
        <Html
          key={label.code}
          position={[label.x, label.y, label.z]}
          center
          transform
          sprite
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="constellation-label"
            style={{
              opacity: Math.max(0.22, Math.min(0.62, 0.34 + label.altDeg / 120 - (label.rank - 1) * 0.06))
            }}
          >
            {formatLabelText(label, displayMode)}
          </span>
        </Html>
      ))}
    </>
  );
}
