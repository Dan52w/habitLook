import notifee from '@notifee/react-native';
import {
  cancelGoalReminder,
  cancelNoteReminder,
  rescheduleGoalAndNoteReminders,
  scheduleGoalReminder,
  scheduleNoteReminder,
} from '../src/services/notifications';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    createTriggerNotification: jest.fn(),
    cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    getNotificationSettings: jest.fn().mockResolvedValue({ android: {} }),
    cancelNotification: jest.fn(),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationSetting: { ENABLED: 1 },
  AuthorizationStatus: { AUTHORIZED: 1 },
  EventType: { ACTION_PRESS: 'action_press' },
  RepeatFrequency: { DAILY: 0, WEEKLY: 2 },
  TriggerType: { TIMESTAMP: 0 },
}));

jest.mock('../src/db/client', () => ({
  getDb: jest.fn(),
}));

jest.mock('../src/db/repositories/goals', () => ({
  listGoalsWithReminders: jest.fn(),
}));

jest.mock('../src/db/repositories/notes', () => ({
  getNoteReminderNotes: jest.fn(),
}));

const mockedNotifee = notifee as unknown as {
  createTriggerNotification: jest.Mock;
  cancelTriggerNotification: jest.Mock;
  getTriggerNotificationIds: jest.Mock;
};

const mockedGoals = jest.requireMock(
  '../src/db/repositories/goals',
).listGoalsWithReminders as jest.Mock;
const mockedNotes = jest.requireMock(
  '../src/db/repositories/notes',
).getNoteReminderNotes as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedNotifee.getTriggerNotificationIds.mockResolvedValue([]);
});

describe('scheduleGoalReminder', () => {
  it('programa un aviso diario con la acción "Ya lo hice"', async () => {
    await scheduleGoalReminder({
      id: 'g1',
      title: 'Leer',
      target_type: 'count',
      target_value: 1,
      reminder_time: '20:00',
    });
    const [notification, trigger] =
      mockedNotifee.createTriggerNotification.mock.calls[0];
    expect(notification.id).toBe('goal-reminder-g1');
    expect(notification.title).toContain('Leer');
    expect(notification.android.actions[0].pressAction.id).toBe('goal-done');
    expect(trigger.repeatFrequency).toBe(0); // DAILY
    expect(trigger.timestamp).toBeGreaterThan(Date.now());
  });

  it('no programa nada sin hora', async () => {
    await scheduleGoalReminder({
      id: 'g1',
      title: 'Leer',
      target_type: 'count',
      target_value: 1,
      reminder_time: null,
    });
    expect(mockedNotifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('usa incremento de 5 minutos para metas de duración', async () => {
    await scheduleGoalReminder({
      id: 'g1',
      title: 'Correr',
      target_type: 'duration',
      target_value: 30,
      reminder_time: '07:00',
    });
    const [notification] =
      mockedNotifee.createTriggerNotification.mock.calls[0];
    expect(notification.data.goalIncrement).toBe(5);
  });
});

describe('scheduleNoteReminder', () => {
  it('programa un aviso puntual en el futuro', async () => {
    const future = new Date(Date.now() + 3_600_000);
    const p = (n: number) => String(n).padStart(2, '0');
    const iso = `${future.getFullYear()}-${p(future.getMonth() + 1)}-${p(
      future.getDate(),
    )}T${p(future.getHours())}:${p(future.getMinutes())}`;
    await scheduleNoteReminder({
      id: 'n1',
      text: 'Llevar agua',
      reminder_at: iso,
    });
    const [notification, trigger] =
      mockedNotifee.createTriggerNotification.mock.calls[0];
    expect(notification.id).toBe('note-reminder-n1');
    expect(notification.body).toContain('Llevar agua');
    expect(trigger.timestamp).toBeGreaterThan(Date.now());
    expect(trigger.repeatFrequency).toBeUndefined();
  });

  it('ignora fechas pasadas', async () => {
    await scheduleNoteReminder({
      id: 'n1',
      text: 'Vieja',
      reminder_at: '2020-01-01T08:00',
    });
    expect(mockedNotifee.createTriggerNotification).not.toHaveBeenCalled();
  });
});

describe('cancelaciones', () => {
  it('cancelGoalReminder usa el id con prefijo', async () => {
    await cancelGoalReminder('g1');
    expect(mockedNotifee.cancelTriggerNotification).toHaveBeenCalledWith(
      'goal-reminder-g1',
    );
  });

  it('cancelNoteReminder usa el id con prefijo', async () => {
    await cancelNoteReminder('n1');
    expect(mockedNotifee.cancelTriggerNotification).toHaveBeenCalledWith(
      'note-reminder-n1',
    );
  });
});

describe('rescheduleGoalAndNoteReminders', () => {
  it('cancela los viejos y programa los vigentes', async () => {
    mockedNotifee.getTriggerNotificationIds.mockResolvedValue([
      'goal-reminder-old',
      'activity-xyz',
    ]);
    mockedGoals.mockResolvedValue([
      {
        id: 'g1',
        title: 'Leer',
        target_type: 'count',
        target_value: 1,
        reminder_time: '20:00',
      },
    ]);
    mockedNotes.mockResolvedValue([]);

    await rescheduleGoalAndNoteReminders();

    expect(mockedNotifee.cancelTriggerNotification).toHaveBeenCalledWith(
      'goal-reminder-old',
    );
    // Los de actividades no se tocan aquí.
    expect(mockedNotifee.cancelTriggerNotification).not.toHaveBeenCalledWith(
      'activity-xyz',
    );
    expect(mockedNotifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });
});
