import { NativeModules } from 'react-native';

type TodayWidgetNative = {
  update(data: { activity: string; time: string }): void;
};

export function updateTodayWidget(activity: string, time: string) {
  const widget = NativeModules.TodayWidget as TodayWidgetNative | undefined;
  widget?.update({ activity, time });
}
