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
    quoteRefreshTime: process.env.VUE_APP_QUOTE_REFRESH_TIME || 3000,
    // 自选股数组（存储所有自选股数据，localStorage持久化）
    optionalStocks: JSON.parse(localStorage.getItem('optional_stocks') || '[]')
  },
  mutations: {
    // 设置登录状态
    setLoginStatus(state, status) {
      state.isLogin = status;
      if (status) {
        localStorage.setItem('stock_token', localStorage.getItem('stock_token') || `fake_token_${Date.now()}`);
      } else {
        localStorage.removeItem('stock_token');
      }
    },
    // 设置用户信息
    setUserInfo(state, info) {
      state.userInfo = info;
      localStorage.setItem('user_info', JSON.stringify(info));
    },
    // 设置当前股票代码
    setCurrentStockCode(state, code) {
      state.currentStockCode = code;
    },

    // 1. 添加自选股（去重+持久化）
    ADD_OPTIONAL_STOCK(state, stock) {
      const isExist = state.optionalStocks.some(item => item.code === stock.code);
      if (!isExist) {
        state.optionalStocks.push(stock);
        localStorage.setItem('optional_stocks', JSON.stringify(state.optionalStocks));
      }
    },
    // 2. 单个删除自选股（补全缺失的mutation）
    DELETE_OPTIONAL_STOCK(state, code) {
      state.optionalStocks = state.optionalStocks.filter(stock => stock.code !== code);
      localStorage.setItem('optional_stocks', JSON.stringify(state.optionalStocks));
    },
    // 3. 批量删除自选股（补全缺失的mutation）
    BATCH_DELETE_OPTIONAL_STOCK(state, codes) {
      state.optionalStocks = state.optionalStocks.filter(stock => !codes.includes(stock.code));
      localStorage.setItem('optional_stocks', JSON.stringify(state.optionalStocks));
    }
  },
  actions: {
    // 退出登录
    logout({ commit }) {
      localStorage.removeItem('stock_token');
      localStorage.removeItem('user_info');
      commit('setLoginStatus', false);
      commit('setUserInfo', {});
      commit('BATCH_DELETE_OPTIONAL_STOCK', []); // 退出时清空自选股（可选，可删除）
      Vue.prototype.$message.success('退出登录成功！');
      window.location.href = '/login';
    },
    // 初始化登录状态
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
    },

    // 4. 添加自选股action（已正确绑定）
    addOptionalStock({ commit }, stock) {
      commit('ADD_OPTIONAL_STOCK', stock);
    },
    // 5. 单个删除自选股action（已绑定，需确保mutation存在）
    deleteOptionalStock({ commit }, code) {
      commit('DELETE_OPTIONAL_STOCK', code);
    },
    // 6. 批量删除自选股action（已绑定，需确保mutation存在）
    batchDeleteOptionalStock({ commit }, codes) {
      commit('BATCH_DELETE_OPTIONAL_STOCK', codes);
    },
    // 7. 切换当前股票action（已正确绑定）
    changeStock({ commit }, stock) {
      commit('setCurrentStockCode', stock.code);
    }
  },
  getters: {
    // 获取用户名
    getUsername: state => state.userInfo.username || '未登录',
    // 获取自选股数量
    optionalStockCount: state => state.optionalStocks.length
  }
});