/**
 * @format
 */
import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './src/app/App';
import { name as appName } from './app.json';

notifee.onBackgroundEvent(async () => {
  // Reservado para acciones de notificación (iniciar/posponer) futuras.
});

AppRegistry.registerComponent('habitLook', () => App);
