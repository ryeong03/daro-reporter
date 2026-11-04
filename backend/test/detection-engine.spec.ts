import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DetectionEngineService, HealthInput } from '../src/detection/engine.service';
import { StateMachineService } from '../src/state/state-machine.service';

const USER = 'user-1';
const MIN = 60 * 1000;

function setup(user: { baseline_bpm: number; baseline_sigma: number } | null = { baseline_bpm: 70, baseline_sigma: 5 }) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const single = vi.fn().mockResolvedValue({ data: user });
  const db = {
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ single }) }),
      insert,
    })),
  };
  const stateMachine = new StateMachineService();
  const trigger = { triggerAICall: vi.fn() };
  const weather = { applyWeatherWeight: vi.fn().mockResolvedValue(false) };
  const engine = new DetectionEngineService(
    { db } as never,
    stateMachine,
    trigger as never,
    weather as never,
  );
  const send = (avgBpm: number, steps = 0) =>
    engine.processHealthData(USER, { avgBpm, steps, lat: 37.5, lng: 127, timestamp: new Date().toISOString() } as HealthInput);
  return { engine, stateMachine, trigger, insert, send };
}

describe('DetectionEngineService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns unknown and never alerts for an unregistered user', async () => {
    const { send, trigger } = setup(null);
    expect(await send(200)).toEqual({ state: 'unknown', triggered: false });
    expect(trigger.triggerAICall).not.toHaveBeenCalled();
  });

  it('stays normal for heart rate inside the baseline band', async () => {
    const { send } = setup();
    expect((await send(80)).state).toBe('normal');
  });

  it('escalates a sustained high heart rate with inactivity to an AI call (heatstroke)', async () => {
    const { send, trigger, insert } = setup();

    expect((await send(110)).state).toBe('stage1_hr_high'); // 110 >= 70 * 1.5
    vi.advanceTimersByTime(5 * MIN);
    expect((await send(110, 0)).state).toBe('observing');
    vi.advanceTimersByTime(2 * MIN);

    const result = await send(110, 0);
    expect(result).toEqual({ state: 'alert', triggered: true, eventType: 'heatstroke' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: USER, event_type: 'heatstroke', status: 'triggered' }));
    expect(trigger.triggerAICall).toHaveBeenCalledWith(USER, 'heatstroke');
  });

  it('waits for inactivity when the user is still moving after 5 minutes of high heart rate', async () => {
    const { send, trigger } = setup();
    await send(110);
    vi.advanceTimersByTime(5 * MIN);
    expect((await send(110, 30)).state).toBe('stage2_waiting_inactive');
    expect((await send(110, 0)).state).toBe('observing');
    expect(trigger.triggerAICall).not.toHaveBeenCalled();
  });

  it('cancels escalation when heart rate drops back before 5 minutes', async () => {
    const { send, trigger } = setup();
    await send(110);
    vi.advanceTimersByTime(2 * MIN);
    expect((await send(75)).state).toBe('normal');
    expect(trigger.triggerAICall).not.toHaveBeenCalled();
  });

  it('alerts for a low heart rate (syncope) after the observation window', async () => {
    const { send, trigger } = setup();
    expect((await send(45)).state).toBe('observing'); // 45 <= 70 * 0.7
    vi.advanceTimersByTime(2 * MIN);
    expect(await send(45)).toEqual({ state: 'alert', triggered: true, eventType: 'syncope' });
    expect(trigger.triggerAICall).toHaveBeenCalledWith(USER, 'syncope');
  });

  it('returns to normal without alerting if heart rate recovers while observing', async () => {
    const { send, trigger } = setup();
    await send(45);
    vi.advanceTimersByTime(1 * MIN);
    expect((await send(72)).state).toBe('normal');
    expect(trigger.triggerAICall).not.toHaveBeenCalled();
  });

  it('uses a 1-minute window when the observation is shortened (e.g. heat warning)', async () => {
    const { send, stateMachine, trigger } = setup();
    await send(45);
    stateMachine.applyShortenedWindow(USER);
    vi.advanceTimersByTime(1 * MIN);
    expect((await send(45)).triggered).toBe(true);
    expect(trigger.triggerAICall).toHaveBeenCalledTimes(1);
  });

  it('does not fire a second AI call while already in alert', async () => {
    const { send, trigger } = setup();
    await send(45);
    vi.advanceTimersByTime(2 * MIN);
    await send(45);
    await send(45);
    expect(trigger.triggerAICall).toHaveBeenCalledTimes(1);
  });
});
