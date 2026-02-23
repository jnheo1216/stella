import { beforeEach, describe, expect, it } from 'vitest';
import { resetSkyStoreForTests, useSkyStore } from '@/store/skyStore';

describe('skyStore', () => {
  beforeEach(() => {
    resetSkyStoreForTests();
  });

  it('switches to sensor mode for mobile and supports drag unlock + relock', () => {
    const store = useSkyStore.getState();

    store.setIsMobile(true);
    expect(useSkyStore.getState().cameraMode).toBe('sensor');

    useSkyStore.getState().unlockToManualForDrag();
    expect(useSkyStore.getState().cameraMode).toBe('manual');

    useSkyStore.getState().relockToSensor();
    expect(useSkyStore.getState().cameraMode).toBe('sensor');
  });

  it('updates realtime clock only in realtime mode', () => {
    const initialEpoch = useSkyStore.getState().timeState.epochMs;

    useSkyStore.getState().tickRealtime(initialEpoch + 5000);
    expect(useSkyStore.getState().timeState.epochMs).toBe(initialEpoch + 5000);

    useSkyStore.getState().setTimeMode('manual');
    const manualEpoch = useSkyStore.getState().timeState.epochMs;
    useSkyStore.getState().tickRealtime(manualEpoch + 9999);

    expect(useSkyStore.getState().timeState.mode).toBe('manual');
    expect(useSkyStore.getState().timeState.epochMs).toBe(manualEpoch);
  });

  it('applies drag look with pitch clamping', () => {
    useSkyStore.getState().dragLook(-1234, 2000);

    const state = useSkyStore.getState();
    expect(state.manualYawDeg).not.toBe(0);
    expect(state.manualPitchDeg).toBeGreaterThanOrEqual(-85);
    expect(state.manualPitchDeg).toBeLessThanOrEqual(85);
  });
});
