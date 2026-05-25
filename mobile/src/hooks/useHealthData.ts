import { useState, useEffect, useRef, useCallback } from 'react';
import { initHealthConnect, getLatestHeartRate, readSteps } from '../services/healthConnect';
import { startDataSync, stopDataSync, setStateChangeListener } from '../services/dataSync';
import { startLocationTracking, stopLocationTracking } from '../services/locationService';
import { startForegroundService, stopForegroundService } from '../services/backgroundService';
import type { DetectionState, LocationData } from '../api/types';

interface HealthState {
  heartRate: number;
  steps: number;
  detectionState: DetectionState;
  watchConnected: boolean;
  gpsActive: boolean;
  lastSync: string | null;
  location: LocationData | null;
}

export function useHealthData() {
  const [state, setState] = useState<HealthState>({
    heartRate: 0,
    steps: 0,
    detectionState: 'normal',
    watchConnected: false,
    gpsActive: false,
    lastSync: null,
    location: null,
  });

  const heartRateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollHeartRate = useCallback(async () => {
    const bpm = await getLatestHeartRate();
    if (bpm !== null) {
      setState((prev) => ({ ...prev, heartRate: bpm, watchConnected: true }));
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    const hcReady = await initHealthConnect();
    setState((prev) => ({ ...prev, watchConnected: hcReady }));

    if (hcReady) {
      await pollHeartRate();
      heartRateTimer.current = setInterval(pollHeartRate, 10_000);
    }

    setStateChangeListener((detState, hr, steps) => {
      setState((prev) => ({
        ...prev,
        detectionState: detState as DetectionState,
        heartRate: hr,
        steps,
        lastSync: new Date().toLocaleTimeString('ko-KR'),
      }));
    });

    startLocationTracking((loc) => {
      setState((prev) => ({ ...prev, location: loc, gpsActive: true }));
    });

    await startForegroundService();
    await startDataSync();
  }, [pollHeartRate]);

  const stopMonitoring = useCallback(async () => {
    if (heartRateTimer.current) {
      clearInterval(heartRateTimer.current);
      heartRateTimer.current = null;
    }
    stopDataSync();
    stopLocationTracking();
    await stopForegroundService();
  }, []);

  useEffect(() => {
    startMonitoring();
    return () => {
      if (heartRateTimer.current) {
        clearInterval(heartRateTimer.current);
        heartRateTimer.current = null;
      }
      stopDataSync();
      stopLocationTracking();
      stopForegroundService();
    };
  }, [startMonitoring]);

  return state;
}
