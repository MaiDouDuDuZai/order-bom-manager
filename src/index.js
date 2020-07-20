import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import './index.css';
import App from './containers/App';
import appReducer from './reducers/index'
import registerServiceWorker from './registerServiceWorker';
import { ConfigProvider } from 'antd';

const store = createStore(appReducer)
//这两行解决部署时URL scheme "file" is not supported.问题
const webFrame = window.require('electron').webFrame;
webFrame.registerURLSchemeAsPrivileged('file');

ReactDOM.render(
  <Provider store={store}>
    <ConfigProvider {...{autoInsertSpaceInButton: false}}>
      <App />
    </ConfigProvider>
  </Provider>,
document.getElementById('root')
);

registerServiceWorker();
