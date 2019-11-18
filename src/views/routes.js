'use strict';

import AppHome from '@/components/app-home/app-home.vue';
import AppMedium from '@/components/app-medium/app-medium';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: AppHome
    },
    {
        path: '/medium',
        name: 'Medium',
        component: AppMedium
    }
];

export default routes;