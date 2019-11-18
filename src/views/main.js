// Import Vue
import Vue from 'vue';
import VueRouter from 'vue-router';
import { remote, ipcRenderer } from 'electron';

// Import Vue App, routes, store
import App from './app';
import routes from './routes';

Vue.use(VueRouter);

// Configure router
const router = new VueRouter({
    routes,
    linkActiveClass: 'active',
    mode: 'history'
});

'use strict';

new Vue({
    el: '#app',
    render: h => h(App),
    router
});

document.addEventListener("keyup", function (e) {
    if (e.which === 123) {
        remote.getCurrentWindow().toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
}, true);

ipcRenderer.on('file-update', (event, message) => {
    window.alert(message);
});

// window._logIn = window._logIn || {};
// window._$accessToken = window._$accessToken || new Subject();
// process.once('loaded', () => {
//     window._$accessToken = new Subject();

//     ipcRenderer.on('tokenReceived', (event, token) => {
//         window._$accessToken.next(token);
//     });

//     window._logIn = () => {
//         ipcRenderer.send('logIn');
//     };
// });