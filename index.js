/**
 * @format
 */
import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import { handleNotificationAction } from './src/services/notifications';
import App from './src/app/App';
import { name as appName } from './app.json';

notifee.onBackgroundEvent(handleNotificationAction);

AppRegistry.registerComponent('habitLook', () => App);
