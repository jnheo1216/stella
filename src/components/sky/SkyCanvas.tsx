'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Euler, Group, PerspectiveCamera, Quaternion } from 'three';
import { projectLabels, projectSegments, projectStars } from '@/lib/astro';
import { degToRad } from '@/lib/coords';
import { useSkyStore } from '@/store/skyStore';
import type {
  ConstellationLabel,
  ConstellationSegment,
  HorizontalPoint,
  ProjectedLabel,
  ProjectedSegment,
  ProjectedStar,
  Star
} from '@/types/sky';
import { ConstellationLayer } from './ConstellationLayer';
import { LabelsLayer } from './LabelsLayer';
import { StarsLayer } from './StarsLayer';

type SkyData = {
  stars: Star[];
  segments: ConstellationSegment[];
  labels: ConstellationLabel[];
};

function CameraFovSync({ fovDeg }: { fovDeg: number }): null {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    perspective.fov = fovDeg;
    perspective.updateProjectionMatrix();
  }, [camera, fovDeg]);

  return null;
}

type SkySceneProps = {
  stars: ProjectedStar[];
  segments: ProjectedSegment[];
  labels: ProjectedLabel[];
  cameraMode: 'sensor' | 'manual';
  manualYawDeg: number;
  manualPitchDeg: number;
  sensorQuaternion: [number, number, number, number] | null;
  maxLabels: number;
};

function SkyScene({
  stars,
  segments,
  labels,
  cameraMode,
  manualYawDeg,
  manualPitchDeg,
  sensorQuaternion,
  maxLabels
}: SkySceneProps): JSX.Element {
  const groupRef = useRef<Group>(null);
  const targetQuaternionRef = useRef(new Quaternion());
  const sourceQuaternionRef = useRef(new Quaternion());

  const manualQuaternion = useMemo(() => {
    const q = new Quaternion();
    const euler = new Euler(degToRad(manualPitchDeg), degToRad(manualYawDeg), 0, 'YXZ');
    q.setFromEuler(euler);
    return q;
  }, [manualYawDeg, manualPitchDeg]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (cameraMode === 'sensor' && sensorQuaternion) {
      sourceQuaternionRef.current.set(
        sensorQuaternion[0],
        sensorQuaternion[1],
        sensorQuaternion[2],
        sensorQuaternion[3]
      );
    } else {
      sourceQuaternionRef.current.copy(manualQuaternion);
    }

    targetQuaternionRef.current.copy(sourceQuaternionRef.current).invert();
    group.quaternion.slerp(targetQuaternionRef.current, 0.22);
  });

  return (
    <group ref={groupRef}>
      <StarsLayer stars={stars} />
      <ConstellationLayer segments={segments} />
      <LabelsLayer labels={labels} maxLabels={maxLabels} />
    </group>
  );
}

export function SkyCanvas(): JSX.Element {
  const observer = useSkyStore((state) => state.observer);
  const timeState = useSkyStore((state) => state.timeState);
  const cameraMode = useSkyStore((state) => state.cameraMode);
  const sensorQuaternion = useSkyStore((state) => state.sensorState.quaternion);
  const manualYawDeg = useSkyStore((state) => state.manualYawDeg);
  const manualPitchDeg = useSkyStore((state) => state.manualPitchDeg);
  const fovDeg = useSkyStore((state) => state.fovDeg);
  const isMobile = useSkyStore((state) => state.isMobile);

  const unlockToManualForDrag = useSkyStore((state) => state.unlockToManualForDrag);
  const dragLook = useSkyStore((state) => state.dragLook);
  const adjustFov = useSkyStore((state) => state.adjustFov);

  const [data, setData] = useState<SkyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  const draggingRef = useRef<{
    active: boolean;
    pointerId: number | null;
    x: number;
    y: number;
  }>({ active: false, pointerId: null, x: 0, y: 0 });

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const supportsWebgl = Boolean(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    setWebglSupported(supportsWebgl);
  }, []);

  useEffect(() => {
    if (webglSupported === false) {
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [starsRes, segmentsRes, labelsRes] = await Promise.all([
          fetch('/data/stars.min.json'),
          fetch('/data/constellations.min.json'),
          fetch('/data/constellation-labels.json')
        ]);

        if (!starsRes.ok || !segmentsRes.ok || !labelsRes.ok) {
          throw new Error('Sky data request failed.');
        }

        const [stars, segments, labels] = await Promise.all([
          starsRes.json() as Promise<Star[]>,
          segmentsRes.json() as Promise<ConstellationSegment[]>,
          labelsRes.json() as Promise<ConstellationLabel[]>
        ]);

        if (!cancelled) {
          setData({ stars, segments, labels });
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : 'Unknown data loading error';
          setError(message);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [webglSupported]);

  const projectedStars = useMemo(() => {
    if (!data) {
      return [];
    }
    return projectStars(data.stars, observer, timeState.epochMs);
  }, [data, observer, timeState.epochMs]);

  const projectedPointsById = useMemo(() => {
    const map = new Map<number, HorizontalPoint>();
    for (const star of projectedStars) {
      map.set(star.id, star);
    }
    return map;
  }, [projectedStars]);

  const projectedSegments = useMemo(() => {
    if (!data) {
      return [];
    }
    return projectSegments(data.segments, projectedPointsById);
  }, [data, projectedPointsById]);

  const projectedLabels = useMemo(() => {
    if (!data) {
      return [];
    }
    return projectLabels(data.labels, observer, timeState.epochMs);
  }, [data, observer, timeState.epochMs]);

  const maxLabels = useMemo(() => {
    const budget = Math.round((108 - fovDeg) * 1.25);
    return Math.max(8, Math.min(88, budget));
  }, [fovDeg]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isMobile && cameraMode === 'sensor') {
        unlockToManualForDrag();
      }

      draggingRef.current.active = true;
      draggingRef.current.pointerId = event.pointerId;
      draggingRef.current.x = event.clientX;
      draggingRef.current.y = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [cameraMode, isMobile, unlockToManualForDrag]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current.active) {
        return;
      }

      const deltaX = event.clientX - draggingRef.current.x;
      const deltaY = event.clientY - draggingRef.current.y;

      draggingRef.current.x = event.clientX;
      draggingRef.current.y = event.clientY;
      dragLook(deltaX, deltaY);
    },
    [dragLook]
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current.pointerId !== event.pointerId) {
      return;
    }

    draggingRef.current.active = false;
    draggingRef.current.pointerId = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      adjustFov(event.deltaY * 0.02);
    },
    [adjustFov]
  );

  if (webglSupported === false) {
    return (
      <section className="sky-canvas-shell" aria-label="Night sky view">
        <div className="sky-overlay sky-overlay-error">
          이 환경에서는 WebGL을 사용할 수 없어 3D 뷰를 표시할 수 없습니다.
        </div>
      </section>
    );
  }

  if (webglSupported === null) {
    return (
      <section className="sky-canvas-shell" aria-label="Night sky view">
        <div className="sky-overlay">그래픽 환경을 확인하는 중...</div>
      </section>
    );
  }

  return (
    <section className="sky-canvas-shell" aria-label="Night sky view">
      <Canvas
        camera={{ position: [0, 0, 0], fov: fovDeg, near: 0.1, far: 300 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#020512']} />
        <fog attach="fog" args={['#020512', 130, 260]} />
        <CameraFovSync fovDeg={fovDeg} />
        <SkyScene
          stars={projectedStars}
          segments={projectedSegments}
          labels={projectedLabels}
          cameraMode={cameraMode}
          manualYawDeg={manualYawDeg}
          manualPitchDeg={manualPitchDeg}
          sensorQuaternion={sensorQuaternion}
          maxLabels={maxLabels}
        />
      </Canvas>

      <div
        className="gesture-layer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />

      {!data && !error && <div className="sky-overlay">별자리 데이터를 불러오는 중...</div>}
      {error && <div className="sky-overlay sky-overlay-error">데이터 로딩 실패: {error}</div>}
    </section>
  );
}
