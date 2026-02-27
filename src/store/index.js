import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

// 辅助：获取当前用户的自选股 localStorage key
const getOptionalStocksKey = (username) => {
  return username ? `optional_stocks_${username}` : 'optional_stocks';
};

// 辅助：保存自选股到当前用户的 localStorage
const saveOptionalStocks = (state) => {
  const username = state.userInfo && state.userInfo.username;
  const key = getOptionalStocksKey(username);
  localStorage.setItem(key, JSON.stringify(state.optionalStocks));
};

// 辅助：从 localStorage 加载指定用户的自选股
const loadOptionalStocks = (username) => {
  const key = getOptionalStocksKey(username);
  return JSON.parse(localStorage.getItem(key) || '[]');
};

// 初始化时根据当前用户加载自选股
const savedUserInfo = JSON.parse(localStorage.getItem('user_info') || '{}');

export default new Vuex.Store({
  state: {
    // 登录状态：优先从localStorage读取，确保刷新后状态不丢失
    isLogin: !!localStorage.getItem('access_token'),
    // 用户信息：刷新后从localStorage恢复
    userInfo: savedUserInfo,
    // 当前选中的股票代码
    currentStockCode: '600519',
    // 行情刷新时间
    quoteRefreshTime: process.env.VUE_APP_QUOTE_REFRESH_TIME || 3000,
    // 自选股数组（按用户名隔离，从 localStorage 恢复）
    optionalStocks: loadOptionalStocks(savedUserInfo.username)
  },
  mutations: {
    // 设置登录状态
    setLoginStatus(state, status) {
      state.isLogin = status;
      if (!status) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiration');
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

    // 1. 添加自选股（去重+按用户持久化）
    ADD_OPTIONAL_STOCK(state, stock) {
      const isExist = state.optionalStocks.some(item => item.code === stock.code);
      if (!isExist) {
        state.optionalStocks.push(stock);
        saveOptionalStocks(state);
      }
    },
    // 2. 单个删除自选股
    DELETE_OPTIONAL_STOCK(state, code) {
      state.optionalStocks = state.optionalStocks.filter(stock => stock.code !== code);
      saveOptionalStocks(state);
    },
    // 3. 批量删除自选股
    BATCH_DELETE_OPTIONAL_STOCK(state, codes) {
      state.optionalStocks = state.optionalStocks.filter(stock => !codes.includes(stock.code));
      saveOptionalStocks(state);
    },
    // 4. 切换用户时加载该用户的自选股
    LOAD_USER_OPTIONAL_STOCKS(state, username) {
      state.optionalStocks = loadOptionalStocks(username);
    }
  },
  actions: {
    // 退出登录
    logout({ commit, state }) {
      // 只清除登录凭证，不清除用户的自选股数据（按用户名隔离存储，下次登回来还在）
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiration');
      localStorage.removeItem('user_info');
      commit('setLoginStatus', false);
      commit('setUserInfo', {});
      state.optionalStocks = [];
      Vue.prototype.$message.success('退出登录成功！');
      window.location.href = '/login';
    },
    // 初始化登录状态
    initLoginState({ commit }) {
      const token = localStorage.getItem('access_token');
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      if (token && userInfo.username) {
        commit('setLoginStatus', true);
        commit('setUserInfo', userInfo);
        // 加载该用户的自选股数据
        commit('LOAD_USER_OPTIONAL_STOCKS', userInfo.username);
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