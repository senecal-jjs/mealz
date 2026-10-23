import { cancelTimerAlert, scheduleTimerAlert } from '@/features/cook/notifications';
import { useTimers } from '@/features/cook/timers';

jest.mock('@/features/cook/notifications', () => ({
  scheduleTimerAlert: jest.fn(async () => 'alert-1'),
  cancelTimerAlert: jest.fn(async () => {}),
}));

describe('cook timers', () => {
  beforeEach(() => {
    useTimers.setState({ timers: {} });
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  });

  it('starts a timer that ends after the given minutes and schedules an alert', async () => {
    await useTimers.getState().start('shakshuka:2', 'Step 3 · Shakshuka', 10);
    expect(useTimers.getState().timers['shakshuka:2']).toEqual({
      id: 'shakshuka:2',
      label: 'Step 3 · Shakshuka',
      endsAt: 1_000_000 + 600_000,
      alertId: 'alert-1',
    });
    expect(scheduleTimerAlert).toHaveBeenCalledWith('Timer done', 'Step 3 · Shakshuka', 600);
  });

  it('cancels a timer and its alert', async () => {
    await useTimers.getState().start('a', 'A', 5);
    await useTimers.getState().cancel('a');
    expect(useTimers.getState().timers).toEqual({});
    expect(cancelTimerAlert).toHaveBeenCalledWith('alert-1');
  });

  it('restarting a timer replaces the old one', async () => {
    await useTimers.getState().start('a', 'A', 5);
    await useTimers.getState().start('a', 'A', 8);
    expect(cancelTimerAlert).toHaveBeenCalledTimes(1);
    expect(useTimers.getState().timers.a.endsAt).toBe(1_000_000 + 480_000);
  });

  it('still runs on screen when notifications are off', async () => {
    jest.mocked(scheduleTimerAlert).mockResolvedValueOnce(null);
    await useTimers.getState().start('a', 'A', 5);
    expect(useTimers.getState().timers.a.alertId).toBeNull();
  });

  it("stops one recipe's timers when it's finished", async () => {
    await useTimers.getState().start('tacos:0', 'A', 5);
    await useTimers.getState().start('tacos:3', 'B', 5);
    await useTimers.getState().start('curry:1', 'C', 5);
    await useTimers.getState().cancelRecipe('tacos');
    expect(Object.keys(useTimers.getState().timers)).toEqual(['curry:1']);
  });
});
