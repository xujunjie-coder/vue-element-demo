import axios from 'axios';
import { Message, Loading } from 'element-ui';

// ========== 辅助：股票代码加前缀 ==========
// 后端要求格式：sh600000 / sz000001
export const addStockPrefix = (code) => {
  if (!code) return '';
  code = String(code).replace(/^(sh|sz|bj)/i, ''); // 去除已有前缀
  if (/^6/.test(code)) return 'sh' + code;  // 沪市
  if (/^[03]/.test(code)) return 'sz' + code; // 深市
  if (/^[48]/.test(code)) return 'bj' + code; // 北交所
  return code; // 兜底
};

// 去除前缀，拿到纯6位代码
export const stripStockPrefix = (code) => {
  if (!code) return '';
  return String(code).replace(/^(sh|sz|bj)/i, '');
};

// ========== axios 实例 ==========
// 业务接口实例（代理到后端，cookie 自动携带）
const service = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true, // 自动携带 cookie（set-cookie 无感刷新）
  headers: { 'Content-Type': 'application/json' }
});

// AI 接口实例
const aiService = axios.create({
  baseURL: process.env.VUE_APP_AI_API_BASE_URL || '/ai-api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// 用于 refresh token 的短连接实例
const refreshInstance = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '/api',
  timeout: 5000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// ========== Loading 控制 ==========
let loadingInstance;
let loadingCount = 0;
const showLoadingIfNeeded = (config) => {
  const wantLoading = config.headers && (config.headers['X-Show-Loading'] || config.headers['x-show-loading']);
  const defaultLoading = (config.url.includes('/ai/') || config.url.includes('/trade/')) && config.method !== 'get';
  if (wantLoading || defaultLoading) {
    loadingCount += 1;
    if (!loadingInstance) {
      loadingInstance = Loading.service({
        text: config.url.includes('/ai/') ? 'AI分析中...' : '处理中...',
        lock: true
      });
    }
  }
};
const hideLoadingIfNeeded = () => {
  if (loadingCount > 0) loadingCount -= 1;
  if (loadingCount === 0 && loadingInstance) {
    loadingInstance.close();
    loadingInstance = null;
  }
};

// ========== 刷新 token 控制 ==========
let isRefreshing = false;
let refreshSubscribers = [];
const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};
const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * 刷新 access_token
 * 后端 POST /user/refresh 通过 cookie 自动获取 username + refresh_token
 */
const refreshToken = async () => {
  try {
    const resp = await refreshInstance.post('/user/refresh', {});
    const data = resp.data || {};
    if (data.status === 'ok' && data.access_token) {
      // 保存到 localStorage 用于前端状态管理
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      if (data.expiration) localStorage.setItem('token_expiration', data.expiration);
      return data.access_token;
    }
    return Promise.reject(new Error('refresh failed'));
  } catch (e) {
    return Promise.reject(e);
  }
};

// ========== 请求拦截器 ==========
const addRequestInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      try { showLoadingIfNeeded(config); } catch (e) { /* ignore */ }
      // 手动附加 Authorization header 作为备用（cookie 是主要机制）
      const token = localStorage.getItem('access_token');
      if (token && !(config.headers && config.headers['Skip-Auth'])) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      hideLoadingIfNeeded();
      Message.error('请求发送失败，请检查网络');
      return Promise.reject(error);
    }
  );
};

// ========== 响应拦截器 ==========
/**
 * 后端统一返回格式：{ status: "ok"/"error", data: ... }
 * HTTP 状态码同样有意义：401=需要认证/刷新
 */
const addResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => {
      hideLoadingIfNeeded();
      const res = response.data;

      // 检查业务级错误（后端通过 status 字段标识）
      if (res && res.status === 'error') {
        const errMsg = res.data || res.msg || '接口请求失败';
        // 不弹 Message 的场景由调用方自行处理
        if (!response.config._silent) {
          Message.error(typeof errMsg === 'string' ? errMsg : '接口请求失败');
        }
        return Promise.reject(res);
      }

      // 返回完整响应体（包括 status / data 等字段），由调用方按需取值
      return res;
    },
    (error) => {
      hideLoadingIfNeeded();
      const response = error.response || {};
      const status = response.status;

      // 401 → 尝试刷新 token 并重试
      if (status === 401) {
        const originalRequest = error.config;
        // 防止刷新接口自身 401 导致死循环
        if (originalRequest.url && originalRequest.url.includes('/user/refresh')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token_expiration');
          Message.error('登录失效，请重新登录');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });
          if (!isRefreshing) {
            isRefreshing = true;
            refreshToken()
              .then((newToken) => {
                isRefreshing = false;
                onRefreshed(newToken);
              })
              .catch((err) => {
                isRefreshing = false;
                refreshSubscribers = [];
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('token_expiration');
                Message.error('登录失效，请重新登录');
                window.location.href = '/login';
                reject(err);
              });
          }
        });
      }

      // 其他 HTTP 错误
      if (status === 400) {
        const msg = (response.data && (response.data.data || response.data.msg)) || '参数错误';
        if (!error.config._silent) Message.error(typeof msg === 'string' ? msg : '参数错误');
      } else if (status === 403) {
        Message.error('无操作权限');
      } else if (status === 404) {
        Message.error('请求资源不存在');
      } else if (status === 409) {
        const msg = (response.data && (response.data.data || response.data.msg)) || '冲突';
        if (!error.config._silent) Message.error(typeof msg === 'string' ? msg : '操作冲突');
      } else if (status >= 500) {
        Message.error('服务繁忙，请稍后重试');
      } else if (error.code === 'ECONNABORTED') {
        Message.error('请求超时');
      } else {
        Message.error('网络异常，请检查连接');
      }
      return Promise.reject(error);
    }
  );
};

// 注册拦截器
addRequestInterceptor(service);
addResponseInterceptor(service);
addRequestInterceptor(aiService);
addResponseInterceptor(aiService);

// ========== getSpot 请求去重 & 短缓存 ==========
const _spotPending = {};   // 正在进行的请求 promise
const _spotCache = {};     // { data, ts }
const SPOT_CACHE_TTL = 10000; // 10 秒缓存

const _getSpotDedup = (stockType) => {
  // 1. 有短缓存直接返回
  const c = _spotCache[stockType];
  if (c && Date.now() - c.ts < SPOT_CACHE_TTL) {
    return Promise.resolve(c.data);
  }
  // 2. 有正在进行的请求，复用同一 promise
  if (_spotPending[stockType]) {
    return _spotPending[stockType];
  }
  // 3. 发起新请求
  const p = service.get('/spot', { params: { stock_type: stockType }, timeout: 120000 })
    .then(res => {
      _spotCache[stockType] = { data: res, ts: Date.now() };
      delete _spotPending[stockType];
      return res;
    })
    .catch(err => {
      delete _spotPending[stockType];
      throw err;
    });
  _spotPending[stockType] = p;
  return p;
};

// ========== 接口方法封装 ==========
export default {
  // ---------- 认证系统 ----------
  // 登录：POST /user/login  { username, password }
  // 返回：{ status, access_token, refresh_token, token_type, expiration }
  login: (data) => service.post('/user/login', data),

  // 注册：POST /user/register  { username, password }
  // 返回：{ status: "ok", msg: "注册成功" } 或 { status: "error", data: "用户名已被使用" }
  register: (data) => service.post('/user/register', data),

  // 刷新 token：POST /user/refresh（cookie 自动携带）
  refreshToken: () => service.post('/user/refresh', {}),

  // 获取过期时间：GET /user/expiration
  // 返回：{ status: "ok", data: 1771762647 }
  getExpiration: () => service.get('/user/expiration'),

  // ---------- 行情数据 ----------
  /**
   * 获取单股实时数据：GET /stock_last?code=sh600000
   * @param {string} code - 股票代码（可带或不带前缀，函数自动补全）
   * 返回：{ status, data: { amount, ask, bid, close, code, date, hod, last, lod, name, open, time, vol } }
   */
  getStockLast: (code, options = {}) => service.get('/stock_last', { params: { code: addStockPrefix(code) }, ...options }),

  /**
   * 获取实时行情列表：GET /spot?stock_type=ZhA
   * @param {string} stockType - 市场类型: ZhA/ShA/SzA/BjA/NewA/CyA/KcASpot
   * 返回：{ status, data: [{ id, code, name, last, zd, ud, vol, amount, hod, lod, open, close, ... }] }
   */
  getSpot: (stockType) => _getSpotDedup(stockType),

  /**
   * 获取分钟级K线：GET /history/minute?code=sh600000&scale=5&datalen=100
   * @param {Object} params - { code, scale(5/15/30/60), datalen(最大1970) }
   * 返回：{ status, data: [{ amount, close, day, hod, lod, open, vol }] }
   */
  getMinuteHistory: (params) =>
    service.get('/history/minute', {
      params: {
        code: addStockPrefix(params.code),
        scale: params.scale,
        datalen: params.datalen || 100
      }
    }),

  /**
   * 获取天级K线：GET /history/day?code=...&period=daily&start_date=20250901&end_date=20260201&adjust=qfq
   * @param {Object} params - { code, period(daily/weekly/monthly), start_date, end_date, adjust(qfq/hfq) }
   * 返回：{ status, data: [{ amount, close, code, date, hod, hsr, lod, open, ud, vol, zd, zf }] }
   */
  getDayHistory: (params) =>
    service.get('/history/day', {
      params: {
        code: addStockPrefix(params.code),
        period: params.period || 'daily',
        start_date: params.start_date,
        end_date: params.end_date,
        adjust: params.adjust || 'qfq'
      }
    }),

  // ---------- AI 功能（待后端实现） ----------
  aiSelectStock: (data) => aiService.post('/ai/select', data),
  aiPredict: (params) => aiService.get('/ai/predict', { params }),

  // ---------- 交易模拟（待后端实现） ----------
  submitTradeOrder: (data) => service.post('/trade/order', data),
  getHoldList: () => service.get('/trade/hold'),
  getOrderList: () => service.get('/trade/order/list'),

  // ---------- 用户中心（待后端实现） ----------
  getUserInfo: () => service.get('/user/info'),

  /**
   * 批量获取多只股票实时数据（并行请求，比逐只串行快很多）
   * @param {string[]} codes - 股票代码数组
   * @returns {Promise<Object[]>} - 各股票数据数组
   */
  getStockLastBatch: (codes) => {
    if (!codes || !codes.length) return Promise.resolve([]);
    return Promise.all(
      codes.map(code =>
        service.get('/stock_last', { params: { code: addStockPrefix(code) } })
          .then(res => res.data || {})
          .catch(() => null)
      )
    );
  },

  // ---------- 搜索（前端可用 spot 数据过滤替代） ----------
  searchStock: (keyword) => service.get('/stock/search', { params: { keyword } })
};