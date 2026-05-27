import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerForegroundServiceRunner } from './src/services/foregroundTask';

// Notifee Foreground Service 헤드리스 러너 (앱이 백그라운드여도 주기 수집)
registerForegroundServiceRunner();

AppRegistry.registerComponent(appName, () => App);
