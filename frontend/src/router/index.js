import Vue from 'vue';
import VueRouter from 'vue-router';
import { authState, isAnalyst, isAdmin } from '../stores/auth';
import AppLayout from '../layouts/AppLayout.vue';
import LoginView from '../views/LoginView.vue';
import SearchView from '../views/SearchView.vue';
import FavoritesView from '../views/FavoritesView.vue';
import HeatmapView from '../views/HeatmapView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';
import AdminUsersView from '../views/AdminUsersView.vue';
import IngestionView from '../views/IngestionView.vue';

Vue.use(VueRouter);

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: 'search' },
      { path: 'search', name: 'search', component: SearchView, meta: { title: '站点搜索' } },
      { path: 'favorites', name: 'favorites', component: FavoritesView, meta: { title: '我的收藏' } },
      {
        path: 'heatmap',
        name: 'heatmap',
        component: HeatmapView,
        meta: { title: '密度热力图', guard: isAnalyst }
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: AnalyticsView,
        meta: { title: '访问统计', guard: isAnalyst }
      },
      {
        path: 'admin',
        name: 'admin',
        component: AdminUsersView,
        meta: { title: '用户管理', guard: isAdmin }
      },
      {
        path: 'ingestion',
        name: 'ingestion',
        component: IngestionView,
        meta: { title: '导入记录', guard: isAnalyst }
      }
    ]
  },
  { path: '*', redirect: 'search' }
];

const router = new VueRouter({
  mode: 'hash',
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    if (authState.user) next({ name: 'search' });
    else next();
    return;
  }

  if (!authState.token) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.guard && !to.meta.guard()) {
    next({ name: 'search' });
    return;
  }

  next();
});

export default router;
