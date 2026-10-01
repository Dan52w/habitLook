declare module '@notifee/react-native' {
  export const AndroidImportance: { HIGH: number };
  export const TriggerType: { TIMESTAMP: number };
  export const RepeatFrequency: { WEEKLY: number };
  export type TimestampTrigger = { type: number; timestamp: number; repeatFrequency?: number; alarmManager?: { allowWhileIdle?: boolean } };
  const notifee: {
    createChannel(input: { id: string; name: string; importance: number }): Promise<string>;
    createTriggerNotification(notification: unknown, trigger: TimestampTrigger): Promise<string>;
    getTriggerNotificationIds(): Promise<string[]>;
    cancelTriggerNotification(id: string): Promise<void>;
    requestPermission(): Promise<{ authorizationStatus: number }>;
  };
  export default notifee;
}
