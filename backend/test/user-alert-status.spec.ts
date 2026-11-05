import { describe, expect, it } from 'vitest';
import {
  isActiveIncident,
  isHighHeartRate,
  resolveStatusLabel,
  resolveUserDisplayStatus,
} from '../src/alert/user-alert-status';

describe('isHighHeartRate', () => {
  it('flags bpm at or above 1.5x baseline', () => {
    expect(isHighHeartRate(105, 70)).toBe(true);
    expect(isHighHeartRate(104, 70)).toBe(false);
  });

  it('treats missing or invalid readings as not high', () => {
    expect(isHighHeartRate(null, 70)).toBe(false);
    expect(isHighHeartRate(undefined, 70)).toBe(false);
    expect(isHighHeartRate(Number.NaN, 70)).toBe(false);
  });

  it('uses 75 bpm when the stored baseline is missing or zero', () => {
    expect(isHighHeartRate(113, 0)).toBe(true);
    expect(isHighHeartRate(112, 0)).toBe(false);
  });
});

describe('resolveUserDisplayStatus', () => {
  const alert = (status: string) => ({ id: 1, event_type: 'heatstroke', status });

  it('maps alert lifecycle to dashboard status', () => {
    expect(resolveUserDisplayStatus(alert('triggered'))).toBe('emergency');
    expect(resolveUserDisplayStatus(alert('calling'))).toBe('emergency');
    expect(resolveUserDisplayStatus(alert('emergency'))).toBe('rescue');
    expect(resolveUserDisplayStatus(alert('closed_emergency'))).toBe('resolved');
  });

  it('shows warning for high heart rate without an alert', () => {
    expect(resolveUserDisplayStatus(null, 120, 70)).toBe('warning');
    expect(resolveUserDisplayStatus(null, 80, 70)).toBe('normal');
  });

  it('an active alert takes priority over heart rate', () => {
    expect(resolveUserDisplayStatus(alert('emergency'), 60, 70)).toBe('rescue');
  });

  it('labels each status in Korean for the guardian dashboard', () => {
    expect(resolveStatusLabel(alert('calling'), 'emergency')).toBe('응급');
    expect(resolveStatusLabel(alert('emergency'), 'rescue')).toBe('구조 필요');
    expect(resolveStatusLabel(null, 'warning')).toBe('휴식');
    expect(resolveStatusLabel(null, 'normal')).toBe('정상');
  });
});

describe('isActiveIncident', () => {
  it('only treats triggered/calling/emergency as active', () => {
    expect(isActiveIncident({ id: 1, event_type: 'fall', status: 'calling' })).toBe(true);
    expect(isActiveIncident({ id: 1, event_type: 'fall', status: 'false_alarm' })).toBe(false);
    expect(isActiveIncident(null)).toBe(false);
  });
});
