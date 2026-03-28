// 核心修复：导入完整版Vue（包含模板编译器）
import Vue from 'vue/dist/vue.esm.js';

import App from './App.vue';
import router from './router';
import store from './store';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import './assets/css/global.css';
import './assets/css/media.css';
// Mock 数据（对接真实后端时注释掉下面这行）
// import './mock/index';
// 引入请求工具
import request from './utils/request';

// 注册ElementUI
Vue.use(ElementUI);

// 全局挂载请求工具
Vue.prototype.$request = request;

// 生产环境提示关闭
Vue.config.productionTip = false;

// 一次性清理历史全局遗留 key（避免跨账号继承旧模拟交易数据）
const cleanupLegacyGlobalTradingKeysOnce = () => {
  const markerKey = '__legacy_sim_global_keys_cleaned_v1__';
  if (localStorage.getItem(markerKey)) return;

  const legacyKeys = ['sim_balance', 'sim_hold_list', 'sim_order_list'];
  const removedKeys = [];

  legacyKeys.forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removedKeys.push(key);
    }
  });

  localStorage.setItem(markerKey, String(Date.now()));
  if (removedKeys.length) {
    console.info('[cleanup] removed legacy global keys:', removedKeys.join(', '));
  }
};

cleanupLegacyGlobalTradingKeysOnce();

// 路由全局守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title + ' - Financiai 同花顺行情';
  } else {
    document.title = 'Financiai - 基于同花顺的智能行情分析系统';
  }
  next();
});
console.log('API_BASE_URL:', process.env.VUE_APP_API_BASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');