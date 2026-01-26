import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    // 登录状态：优先从localStorage读取，确保刷新后状态不丢失
    isLogin: !!localStorage.getItem('stock_token'),
    // 用户信息：刷新后从localStorage恢复
    userInfo: JSON.parse(localStorage.getItem('user_info') || '{}'),
    // 当前选中的股票代码
    currentStockCode: '600519',
    // 行情刷新时间
    quoteRefreshTime: process.env.VUE_APP_QUOTE_REFRESH_TIME || 3000
  },
  mutations: {
    // 设置登录状态
    setLoginStatus(state, status) {
      state.isLogin = status;
      // 同步更新localStorage（新增：确保状态持久化）
      if (status) {
        localStorage.setItem('stock_token', localStorage.getItem('stock_token') || `fake_token_${Date.now()}`);
      } else {
        localStorage.removeItem('stock_token');
      }
    },
    // 设置用户信息
    setUserInfo(state, info) {
      state.userInfo = info;
      // 同步更新localStorage（新增：确保用户信息持久化）
      localStorage.setItem('user_info', JSON.stringify(info));
    },
    // 设置当前股票代码
    setCurrentStockCode(state, code) {
      state.currentStockCode = code;
    }
  },
  actions: {
    // 退出登录（修复：退出后强制跳转登录页）
    logout({ commit }) {
      // 清除本地存储
      localStorage.removeItem('stock_token');
      localStorage.removeItem('user_info');
      // 更新状态
      commit('setLoginStatus', false);
      commit('setUserInfo', {});
      // 提示退出成功
      Vue.prototype.$message.success('退出登录成功！');
      // 新增：强制跳转到登录页，防止手动访问需权限页面
      window.location.href = '/login';
    },
    // 新增：初始化登录状态（解决刷新后Vuex与localStorage同步问题）
    initLoginState({ commit }) {
      const token = localStorage.getItem('stock_token');
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      if (token && userInfo.username) {
        commit('setLoginStatus', true);
        commit('setUserInfo', userInfo);
      } else {
        commit('setLoginStatus', false);
        commit('setUserInfo', {});
      }
    }
  },
  getters: {
    // 获取用户名
    getUsername: state => state.userInfo.username || '未登录'
  }
});