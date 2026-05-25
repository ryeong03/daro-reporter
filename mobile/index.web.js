import { AppRegistry } from 'react-native';
import App from './App.web';

AppRegistry.registerComponent('HeroMobile', () => App);
AppRegistry.runApplication('HeroMobile', {
  rootTag: document.getElementById('root'),
});
