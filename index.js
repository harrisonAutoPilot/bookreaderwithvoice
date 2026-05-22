/**
 * @format
 */

import 'react-native-gesture-handler';

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolversPolyfill() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {promise, resolve, reject};
  };
}

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
