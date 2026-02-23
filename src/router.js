import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

const router = new Router({
  routes: [
    {
      path: '/archives',
      name: 'archives',
      component: () => import(/* webpackChunkName: "archives" */ './views/Archives.vue'),
    },
    {
      path: '/private/archives',
      name: 'privateArchives',
      component: () => import(/* webpackChunkName: "privateArchives" */ './views/Archives.vue'),
    },
    {
      path: '/archives/:id',
      name: 'archiveDetails',
      component: () => import(/* webpackChunkName: "archiveDetails" */ './views/Details.vue'),
      meta: { title: '加载中...' },
    },
    {
      path: '/private/archives/:id',
      name: 'privateArchiveDetails',
      component: () => import(/* webpackChunkName: "archiveDetails" */ './views/Details.vue'),
      meta: { title: '私密加载中...' },
    },
    {
      path: '/labels',
      name: 'labels',
      component: () => import(/* webpackChunkName: "labels" */ './views/Labels.vue'),
    },
    {
      path: '/private/labels',
      name: 'privateLabels',
      component: () => import(/* webpackChunkName: "privateLabels" */ './views/Labels.vue'),
    },
    {
      path: '/search',
      name: 'search',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "search" */ './views/Search.vue'),
    },
    {
      path: '/private/search',
      name: 'privateSearch',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "search" */ './views/Search.vue'),
    },
    {
      path: '*',
      beforeEnter: (to, from, next) => {
        next('/archives'); 
      },
    },
  ],
});

router.afterEach((to) => {
  // 1. 定义一个基础后缀
  const siteName = 'LAO Blog';
  // 2. 根据路由名称映射一些中文标题（可选）
  const titleMap = {
    'archives': '博客',
    'labels': '标签',
    'search': '搜索'
  };
  let pageTitle = "";
  const mapTitle = titleMap[to.name] || '';
  if (to.meta.title) {
    pageTitle = mapTitle ? `${to.meta.title} - ${mapTitle}` : to.meta.title;
  } else {
    pageTitle = titleMap[to.name];
  }
  
  // 3. 合成最终标题
  document.title = "漾际资本（YoungJay Capital Ltd.）";
  if (window._hmt) {
    const path = to.fullPath;
    window._hmt.push(['_trackPageview', path]);
  }
});

export default router;
