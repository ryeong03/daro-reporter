import { useState, useEffect, useCallback } from 'react';
import { subscribeHealthSnapshots } from '../services/healthMonitorEvents';
import { setStateChangeListener } from '../services/dataSync';
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

/**
 * Foreground Service에서 emit되는 스냅샷 + 서버 응답을 UI 상태로 반영합니다.
 * 수집/동기화 루프는 foregroundTask.ts에서 실행됩니다.
 */
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

  const applyServerState = useCallback(
    (detState: string, hr: number, steps: number) => {
      setState((prev) => ({
        ...prev,
        detectionState: detState as DetectionState,
        heartRate: hr,
        steps,
        lastSync: new Date().toLocaleTimeString('ko-KR'),
      }));
    },
    []
  );

  useEffect(() => {
    setStateChangeListener(applyServerState);

    const unsubscribe = subscribeHealthSnapshots((snapshot) => {
      setState((prev) => ({
        ...prev,
        heartRate: snapshot.heartRate ?? prev.heartRate,
        steps: snapshot.steps,
        watchConnected: snapshot.heartRate != null || snapshot.heartRateSamples.length > 0,
        gpsActive: snapshot.location != null,
        location: snapshot.location ?? prev.location,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [applyServerState]);

  return state;
}
