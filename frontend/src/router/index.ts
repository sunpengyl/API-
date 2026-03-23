import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../views/Layout.vue';
import Login from '../views/Login.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { title: '登录', requiresAuth: false },
    },
    {
      path: '/',
      component: Layout,
      redirect: '/tasks',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'tasks',
          name: 'Tasks',
          component: () => import('../views/Tasks.vue'),
          meta: { title: '任务管理', requiresAuth: true },
        },
        {
          path: 'results',
          name: 'Results',
          component: () => import('../views/Results.vue'),
          meta: { title: '巡检记录', requiresAuth: true },
        },
        {
          path: 'alerts',
          name: 'Alerts',
          component: () => import('../views/Alerts.vue'),
          meta: { title: '告警记录', requiresAuth: true },
        },
        {
          path: 'health',
          name: 'Health',
          component: () => import('../views/Health.vue'),
          meta: { title: '健康度分析', requiresAuth: true },
        },
      ],
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth !== false);

  if (requiresAuth && !token) {
    next('/login');
    return;
  }

  if (to.path === '/login' && token) {
    next('/tasks');
    return;
  }

  next();
});

export default router;
