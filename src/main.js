// 核心修复：导入完整版Vue（包含模板编译器）
import Vue from 'vue/dist/vue.esm.js';

import App from './App.vue';
import router from './router';
import store from './store';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import './assets/css/global.css';
import './assets/css/media.css';
// 引入Mock数据
import './mock/index';
// 引入请求工具
import request from './utils/request';

// 注册ElementUI
Vue.use(ElementUI);

// 全局挂载请求工具
Vue.prototype.$request = request;

// 生产环境提示关闭
Vue.config.productionTip = false;

// 路由全局守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title + ' - 同花顺多端行情分析系统';
  } else {
    document.title = '同花顺多端行情分析系统';
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