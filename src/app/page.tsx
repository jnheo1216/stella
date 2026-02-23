'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentPosition,
  isDeviceOrientationSupported,
  isLikelyMobileDevice,
  requestDeviceOrientationPermission,
  subscribeDeviceOrientation
} from '@/lib/sensor';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { loadViewerState, saveViewerState, useSkyStore } from '@/store/skyStore';

const DynamicSkyCanvas = dynamic(
  async () => {
    const module = await import('@/components/sky/SkyCanvas');
    return module.SkyCanvas;
  },
  {
    ssr: false,
    loading: () => (
      <section className="sky-canvas-shell" aria-label="Night sky view">
        캔버스 로딩 중...
      </section>
    )
  }
);

export default function HomePage(): JSX.Element {
  const observer = useSkyStore((state) => state.observer);
  const timeState = useSkyStore((state) => state.timeState);
  const sensorState = useSkyStore((state) => state.sensorState);
  const isMobile = useSkyStore((state) => state.isMobile);
  const fovDeg = useSkyStore((state) => state.fovDeg);

  const setObserver = useSkyStore((state) => state.setObserver);
  const setIsMobile = useSkyStore((state) => state.setIsMobile);
  const setTimeMode = useSkyStore((state) => state.setTimeMode);
  const setManualEpoch = useSkyStore((state) => state.setManualEpoch);
  const setSensorPermission = useSkyStore((state) => state.setSensorPermission);
  const setSensorAvailability = useSkyStore((state) => state.setSensorAvailability);
  const setSensorQuaternion = useSkyStore((state) => state.setSensorQuaternion);
  const setCameraMode = useSkyStore((state) => state.setCameraMode);
  const tickRealtime = useSkyStore((state) => state.tickRealtime);

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      tickRealtime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [tickRealtime]);

  useEffect(() => {
    const mobile = isLikelyMobileDevice();
    setIsMobile(mobile);

    if (!mobile) {
      setSensorPermission('unsupported');
      setCameraMode('manual');
      return;
    }

    if (!isDeviceOrientationSupported()) {
      setSensorPermission('unsupported');
      setCameraMode('manual');
    }
  }, [setCameraMode, setIsMobile, setSensorPermission]);

  const syncTimezone = useCallback(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && timezone !== observer.timezone) {
      setObserver({ timezone });
    }
  }, [observer.timezone, setObserver]);

  useEffect(() => {
    syncTimezone();
  }, [syncTimezone]);

  useEffect(() => {
    const persisted = loadViewerState();
    if (!persisted) {
      return;
    }

    setObserver(persisted.observer);
    if (persisted.timeState.mode === 'manual') {
      setManualEpoch(persisted.timeState.epochMs);
    } else {
      setTimeMode('realtime');
    }
  }, [setManualEpoch, setObserver, setTimeMode]);

  useEffect(() => {
    saveViewerState({
      observer,
      timeState,
      fovDeg
    });
  }, [observer, timeState, fovDeg]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const unsubscribe = subscribeDeviceOrientation((quaternion) => {
      setSensorQuaternion(quaternion);
    });

    return () => {
      unsubscribe();
    };
  }, [isMobile, setSensorQuaternion]);

  const requestSensorPermission = useCallback(async () => {
    const permission = await requestDeviceOrientationPermission();
    setSensorPermission(permission);

    if (permission === 'granted') {
      setSensorAvailability(true);
      setCameraMode('sensor');
    }
  }, [setCameraMode, setSensorAvailability, setSensorPermission]);

  const useCurrentLocation = useCallback(async () => {
    try {
      setLocationStatus('loading');
      setLocationErrorMessage(null);

      const position = await getCurrentPosition();
      setObserver({
        latDeg: Number(position.coords.latitude.toFixed(5)),
        lonDeg: Number(position.coords.longitude.toFixed(5))
      });

      setLocationStatus('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown geolocation error';
      setLocationStatus('error');
      setLocationErrorMessage(message);
    }
  }, [setObserver]);

  useEffect(() => {
    void useCurrentLocation();
  }, [useCurrentLocation]);

  const subtitle = useMemo(() => {
    if (isMobile) {
      return '모바일: 센서 추적 + 드래그 언락 / 데스크톱: 드래그 탐색';
    }
    return '데스크톱 드래그로 별자리 지도를 탐색하세요.';
  }, [isMobile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setPanelOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <main className="viewer-shell">
      <DynamicSkyCanvas />

      <div className="hero-overlay">
        <header className="hero">
          <p className="hero-kicker">Realtime Night Sky</p>
          <h1>Stella</h1>
          <p>{subtitle}</p>
        </header>
      </div>

      <div className="permission-overlay">
        <PermissionGate
          isMobile={isMobile}
          permission={sensorState.permission}
          sensorAvailable={sensorState.isAvailable}
          onRequestPermission={requestSensorPermission}
        />
      </div>

      <button
        type="button"
        className="panel-toggle"
        aria-controls="control-panel-drawer"
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen((current) => !current)}
      >
        {panelOpen ? '패널 닫기' : '패널 열기'}
      </button>

      {panelOpen && (
        <button
          type="button"
          className="panel-backdrop panel-backdrop-visible"
          aria-label="패널 닫기"
          onClick={() => setPanelOpen(false)}
        />
      )}

      <aside
        id="control-panel-drawer"
        className={`panel-drawer ${panelOpen ? 'panel-drawer-open' : ''}`}
        aria-hidden={!panelOpen}
      >
        <div className="panel-header">
          <p>탐색 설정</p>
          <button type="button" className="btn-secondary" onClick={() => setPanelOpen(false)}>
            닫기
          </button>
        </div>

        <ControlPanel
          sensorPermission={sensorState.permission}
          onRequestSensorPermission={requestSensorPermission}
          onUseCurrentLocation={useCurrentLocation}
          locationStatus={locationStatus}
          locationErrorMessage={locationErrorMessage}
        />
      </aside>
    </main>
  );
}
