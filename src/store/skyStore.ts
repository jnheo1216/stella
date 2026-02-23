'use client';

import { create } from 'zustand';
import { clamp, wrapDeg180 } from '@/lib/coords';
import type { CameraMode, Observer, SensorPermission, SensorState, TimeState } from '@/types/sky';

type SkyState = {
  observer: Observer;
  timeState: TimeState;
  cameraMode: CameraMode;
  sensorState: SensorState;
  isMobile: boolean;
  manualYawDeg: number;
  manualPitchDeg: number;
  fovDeg: number;
};

type SkyActions = {
  setObserver: (observer: Partial<Observer>) => void;
  setIsMobile: (isMobile: boolean) => void;
  setTimeMode: (mode: TimeState['mode']) => void;
  setManualEpoch: (epochMs: number) => void;
  tickRealtime: (epochMs: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  unlockToManualForDrag: () => void;
  relockToSensor: () => void;
  dragLook: (deltaX: number, deltaY: number) => void;
  resetManualLook: () => void;
  adjustFov: (deltaDeg: number) => void;
  setSensorPermission: (permission: SensorPermission) => void;
  setSensorAvailability: (isAvailable: boolean) => void;
  setSensorQuaternion: (quaternion: [number, number, number, number]) => void;
};

type SkyStore = SkyState & SkyActions;

export const DEFAULT_OBSERVER: Observer = {
  latDeg: 37.5665,
  lonDeg: 126.978,
  timezone: 'Asia/Seoul'
};

function getDefaultTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_OBSERVER.timezone;
}

function buildInitialState(): SkyState {
  return {
    observer: {
      ...DEFAULT_OBSERVER,
      timezone: getDefaultTimezone()
    },
    timeState: {
      mode: 'realtime',
      epochMs: Date.now()
    },
    cameraMode: 'manual',
    sensorState: {
      permission: 'unknown',
      isAvailable: false,
      quaternion: null,
      lastUpdatedMs: null
    },
    isMobile: false,
    manualYawDeg: 0,
    manualPitchDeg: 0,
    fovDeg: 72
  };
}

const DRAG_SENSITIVITY = 0.18;

export const useSkyStore = create<SkyStore>((set) => ({
  ...buildInitialState(),

  setObserver: (observer) => {
    set((state) => ({
      observer: {
        ...state.observer,
        ...observer
      }
    }));
  },

  setIsMobile: (isMobile) => {
    set((state) => {
      const cameraMode: CameraMode = isMobile ? 'sensor' : 'manual';
      return {
        isMobile,
        cameraMode,
        fovDeg: isMobile ? 78 : state.fovDeg
      };
    });
  },

  setTimeMode: (mode) => {
    set((state) => ({
      timeState: {
        mode,
        epochMs: mode === 'realtime' ? Date.now() : state.timeState.epochMs
      }
    }));
  },

  setManualEpoch: (epochMs) => {
    set((state) => ({
      timeState: {
        mode: 'manual',
        epochMs
      }
    }));
  },

  tickRealtime: (epochMs) => {
    set((state) => {
      if (state.timeState.mode !== 'realtime') {
        return state;
      }
      return {
        timeState: {
          mode: 'realtime',
          epochMs
        }
      };
    });
  },

  setCameraMode: (mode) => {
    set({ cameraMode: mode });
  },

  unlockToManualForDrag: () => {
    set((state) => {
      if (state.cameraMode === 'manual') {
        return state;
      }
      return {
        cameraMode: 'manual'
      };
    });
  },

  relockToSensor: () => {
    set((state) => {
      if (!state.isMobile) {
        return state;
      }
      return {
        cameraMode: 'sensor'
      };
    });
  },

  dragLook: (deltaX, deltaY) => {
    set((state) => {
      const yaw = wrapDeg180(state.manualYawDeg - deltaX * DRAG_SENSITIVITY);
      const pitch = clamp(state.manualPitchDeg - deltaY * DRAG_SENSITIVITY, -85, 85);
      return {
        manualYawDeg: yaw,
        manualPitchDeg: pitch
      };
    });
  },

  resetManualLook: () => {
    set({
      manualYawDeg: 0,
      manualPitchDeg: 0
    });
  },

  adjustFov: (deltaDeg) => {
    set((state) => ({
      fovDeg: clamp(state.fovDeg + deltaDeg, 35, 100)
    }));
  },

  setSensorPermission: (permission) => {
    set((state) => ({
      sensorState: {
        ...state.sensorState,
        permission
      }
    }));
  },

  setSensorAvailability: (isAvailable) => {
    set((state) => ({
      sensorState: {
        ...state.sensorState,
        isAvailable
      }
    }));
  },

  setSensorQuaternion: (quaternion) => {
    set((state) => ({
      sensorState: {
        ...state.sensorState,
        quaternion,
        lastUpdatedMs: Date.now(),
        isAvailable: true,
        permission: state.sensorState.permission === 'unsupported' ? 'unsupported' : 'granted'
      }
    }));
  }
}));

export const PERSIST_KEY = 'stella.viewer-state.v1';

export type PersistedState = {
  observer: Observer;
  timeState: TimeState;
  fovDeg: number;
};

export function saveViewerState(state: PersistedState): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
}

export function loadViewerState(): PersistedState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(PERSIST_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (
      typeof parsed?.observer?.latDeg === 'number' &&
      typeof parsed?.observer?.lonDeg === 'number' &&
      typeof parsed?.observer?.timezone === 'string' &&
      typeof parsed?.timeState?.epochMs === 'number' &&
      (parsed?.timeState?.mode === 'manual' || parsed?.timeState?.mode === 'realtime') &&
      typeof parsed?.fovDeg === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function resetSkyStoreForTests(): void {
  useSkyStore.setState(buildInitialState());
}
