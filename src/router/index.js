import Vue from 'vue';
import Router from 'vue-router';
import store from '../store';

// 导入登录组件
import Login from '@/views/login/index.vue';

// 布局组件
import Header from '../components/layout/Header.vue';
import Sidebar from '../components/layout/Sidebar.vue';
import RightAside from '../components/layout/RightAside.vue';
import Footer from '../components/layout/Footer.vue';

// 业务组件
import StockQuote from '../components/stock/StockQuote.vue';
import StockDetail from '../components/stock/StockDetail.vue';
import AISelectStock from '../components/ai/AISelectStock.vue';
import TradePanel from '../components/trade/TradePanel.vue';
import Mine from '../components/mine/Mine.vue';
import Register from '@/views/register/index.vue';

Vue.use(Router);

// 兼容：避免重复导航抛出未捕获异常（补丁）
const originalPush = Router.prototype.push;
Router.prototype.push = function push(location, onResolve, onReject) {
  if (onResolve || onReject) return originalPush.call(this, location, onResolve, onReject);
  return originalPush.call(this, location).catch((err) => {
    // 静默处理重复导航错误
    if (err && (err.name === 'NavigationDuplicated' || /Avoided redundant navigation/.test(err.message))) {
      return err;
    }
    return Promise.reject(err);
  });
};

/**
 * 路由守卫：验证登录状态
 */
const routerGuard = (to, from, next) => {
  const isLogin = store.state.isLogin || localStorage.getItem('stock_token');
  
  // 需要登录但未登录时，跳转到登录页（携带跳转前的路径）
  if (to.meta.requiresAuth && !isLogin) {
    next({ 
      path: '/login', 
      query: { redirect: to.fullPath } // 记录需要返回的页面
    });
    if (Vue.prototype.$message) {
      Vue.prototype.$message.warning('请先登录后再操作');
    }
  } else {
    // 处理重复导航报错
    if (to.path === from.path) {
      next(false);
    } else {
      next();
    }
  }
};

// 全局路由钩子：设置页面标题
Router.prototype.afterEach = (to) => {
  if (to.meta.title) {
    document.title = to.meta.title + ' - 同花顺多端行情分析系统';
  }
};

export default new Router({
  mode: 'history',
  suppressTransitionError: true, // 关闭重定向提示
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    // 登录路由（独立页面，无布局）
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { title: '系统登录' }
    },
    {
      path: '/register',
      name: 'Register',
      component: Register,
      meta: { title: '用户注册' }
    },
    {
      path: '/quote',
      name: 'StockQuote',
      components: {
        header: Header,
        sidebar: Sidebar,
        rightAside: RightAside,
        default: StockQuote,
        footer: Footer
      },
      meta: { title: '沪深A股实时行情' },
      beforeEnter: routerGuard
    },
    {
      path: '/detail/:code',
      name: 'StockDetail',
      components: {
        header: Header,
        sidebar: Sidebar,
        rightAside: RightAside,
        default: StockDetail,
        footer: Footer
      },
      meta: { title: '个股详情' },
      beforeEnter: routerGuard
    },
    {
      path: '/ai/select',
      name: 'AISelectStock',
      components: {
        header: Header,
        sidebar: Sidebar,
        rightAside: RightAside,
        default: AISelectStock,
        footer: Footer
      },
      meta: { title: 'AI智能选股' },
      beforeEnter: routerGuard
    },
    {
      path: '/trade',
      name: 'TradePanel',
      components: {
        header: Header,
        sidebar: Sidebar,
        rightAside: RightAside,
        default: TradePanel,
        footer: Footer
      },
      meta: { title: '交易模拟', requiresAuth: true },
      beforeEnter: routerGuard
    },
    {
      path: '/mine',
      name: 'Mine',
      components: {
        header: Header,
        sidebar: Sidebar,
        rightAside: RightAside,
        default: Mine,
        footer: Footer
      },
      meta: { title: '个人中心', requiresAuth: true },
      beforeEnter: routerGuard
    },
    // 404路由
    {
      path: '*',
      redirect: '/quote'
    }
  ]
});