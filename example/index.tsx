import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * Use this instead of NonConcurrentModeApp to see a ReactFire demo with Suspense/Concurrent mode enabled
 *
 * You'll need to use an experimental build of React to use Concurrent mode
 * https://reactjs.org/docs/concurrent-mode-adoption.html#installation
 */
// import {} from 'react/experimental'  // make TS aware of experimental features
// import {} from 'react-dom/experimental' // make TS aware of experimental features
// import { App as ConcurrentModeApp } from './withSuspense/App';
import { App as NonConcurrentModeApp } from './withoutSuspense/App';
import './index.css';
import { FirebaseAppProvider } from 'reactfire';

const firebaseConfig = {
  apiKey: 'AIzaSyBg3u1sJlyJwQCE95oSDH_mtLABS-is8ZM',
  authDomain: 'testing-929ad.firebaseapp.com',
  databaseURL: 'https://testing-929ad.firebaseio.com',
  projectId: 'testing-929ad',
  storageBucket: 'testing-929ad.appspot.com',
  messagingSenderId: '844180061847',
  appId: '1:844180061847:web:400f7142e2d1aaeb',
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element');
}

ReactDOM.render(
  <FirebaseAppProvider firebaseConfig={firebaseConfig}>
    <NonConcurrentModeApp />
  </FirebaseAppProvider>,
  rootElement
);

/**
 * FOR CONCURRENT MODE
 */
// ReactDOM.createRoot(rootElement).render(
//   <FirebaseAppProvider firebaseConfig={firebaseConfig} suspense={true}>
//     <ConcurrentModeApp />
//   </FirebaseAppProvider>
// );
