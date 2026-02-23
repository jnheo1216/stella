'use client';

import { useMemo } from 'react';
import { clamp } from '@/lib/coords';
import type { SensorPermission } from '@/types/sky';
import { useSkyStore } from '@/store/skyStore';

type ControlPanelProps = {
  sensorPermission: SensorPermission;
  onRequestSensorPermission: () => void | Promise<void>;
  onUseCurrentLocation: () => void | Promise<void>;
  locationStatus: 'idle' | 'loading' | 'error';
  locationErrorMessage: string | null;
};

function toDateTimeLocalValue(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (value: number): string => String(value).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ControlPanel({
  sensorPermission,
  onRequestSensorPermission,
  onUseCurrentLocation,
  locationStatus,
  locationErrorMessage
}: ControlPanelProps): JSX.Element {
  const observer = useSkyStore((state) => state.observer);
  const timeState = useSkyStore((state) => state.timeState);
  const cameraMode = useSkyStore((state) => state.cameraMode);
  const isMobile = useSkyStore((state) => state.isMobile);
  const fovDeg = useSkyStore((state) => state.fovDeg);

  const setObserver = useSkyStore((state) => state.setObserver);
  const setTimeMode = useSkyStore((state) => state.setTimeMode);
  const setManualEpoch = useSkyStore((state) => state.setManualEpoch);
  const relockToSensor = useSkyStore((state) => state.relockToSensor);
  const resetManualLook = useSkyStore((state) => state.resetManualLook);
  const setCameraMode = useSkyStore((state) => state.setCameraMode);
  const adjustFov = useSkyStore((state) => state.adjustFov);

  const now = Date.now();
  const manualOffsetMinutes = clamp(
    Math.round((timeState.epochMs - now) / 60000),
    -720,
    720
  );

  const modeText = useMemo(() => {
    if (!isMobile) {
      return '수동 탐색';
    }

    if (cameraMode === 'sensor') {
      return '센서 추적';
    }

    return '수동 탐색';
  }, [cameraMode, isMobile]);

  return (
    <aside className="control-panel" aria-label="Control panel">
      <h2>Stella Controls</h2>

      <div className="control-group">
        <label htmlFor="lat-input">위도</label>
        <input
          id="lat-input"
          type="number"
          step="0.0001"
          value={observer.latDeg}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) {
              setObserver({ latDeg: clamp(value, -90, 90) });
            }
          }}
        />

        <label htmlFor="lon-input">경도</label>
        <input
          id="lon-input"
          type="number"
          step="0.0001"
          value={observer.lonDeg}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) {
              setObserver({ lonDeg: clamp(value, -180, 180) });
            }
          }}
        />

        <label htmlFor="tz-input">시간대</label>
        <input
          id="tz-input"
          type="text"
          value={observer.timezone}
          onChange={(event) => setObserver({ timezone: event.target.value.trim() || 'UTC' })}
        />

        <button
          type="button"
          className="btn-secondary"
          onClick={() => void onUseCurrentLocation()}
          disabled={locationStatus === 'loading'}
        >
          {locationStatus === 'loading' ? '위치 확인 중...' : '현재 위치 사용'}
        </button>

        {locationStatus === 'error' && locationErrorMessage && (
          <p className="error-text">위치 획득 실패: {locationErrorMessage}</p>
        )}
      </div>

      <div className="control-group">
        <p>
          현재 모드: <strong>{modeText}</strong>
        </p>

        {isMobile && (
          <>
            <p>센서 권한: {sensorPermission}</p>
            {sensorPermission !== 'granted' && sensorPermission !== 'unsupported' && (
              <button type="button" className="btn-secondary" onClick={() => void onRequestSensorPermission()}>
                센서 권한 요청
              </button>
            )}
            {sensorPermission === 'granted' && cameraMode === 'manual' && (
              <button type="button" className="btn-primary" onClick={relockToSensor}>
                센서 재고정
              </button>
            )}
            {cameraMode === 'sensor' && (
              <button type="button" className="btn-secondary" onClick={() => setCameraMode('manual')}>
                수동 탐색으로 전환
              </button>
            )}
          </>
        )}

        <button type="button" className="btn-secondary" onClick={resetManualLook}>
          시야 리셋
        </button>
      </div>

      <div className="control-group">
        <label className="inline-checkbox" htmlFor="realtime-toggle">
          <input
            id="realtime-toggle"
            type="checkbox"
            checked={timeState.mode === 'realtime'}
            onChange={(event) => setTimeMode(event.target.checked ? 'realtime' : 'manual')}
          />
          실시간 시각
        </label>

        {timeState.mode === 'manual' && (
          <>
            <label htmlFor="time-slider">시간 이동 (±12시간)</label>
            <input
              id="time-slider"
              type="range"
              min={-720}
              max={720}
              value={manualOffsetMinutes}
              onChange={(event) => {
                const offsetMinutes = Number(event.target.value);
                if (Number.isFinite(offsetMinutes)) {
                  setManualEpoch(Date.now() + offsetMinutes * 60_000);
                }
              }}
            />

            <label htmlFor="manual-time">직접 시각 입력</label>
            <input
              id="manual-time"
              type="datetime-local"
              value={toDateTimeLocalValue(timeState.epochMs)}
              onChange={(event) => {
                const epoch = Date.parse(event.target.value);
                if (!Number.isNaN(epoch)) {
                  setManualEpoch(epoch);
                }
              }}
            />
          </>
        )}
      </div>

      <div className="control-group">
        <label htmlFor="fov-range">시야각(FOV): {Math.round(fovDeg)}°</label>
        <input
          id="fov-range"
          type="range"
          min={35}
          max={100}
          value={Math.round(fovDeg)}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) {
              adjustFov(value - fovDeg);
            }
          }}
        />
      </div>
    </aside>
  );
}
