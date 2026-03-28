
/**
 * 全局请求工具 request.js
 * 封装 axios，统一处理 Loading、异常提示、token 刷新等
 * 调用建议：所有 API 调用建议 async/await + try-catch，避免异常漏掉
 */
import axios from 'axios';
import { Message } from 'element-ui';

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

// AI 接口实例（统一迁移至 /api）
const aiService = axios.create({
  baseURL: process.env.VUE_APP_AI_API_BASE_URL || '/api',
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
/**
 * 关闭 request 层全局 Loading，统一由页面组件自行控制局部 loading。
 */
const showLoadingIfNeeded = () => {};
const hideLoadingIfNeeded = () => {};

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
/**
 * 注册请求拦截器：自动加 token，处理 Loading
 */
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
      showErrorMsg('请求发送失败，请检查网络');
      return Promise.reject(error);
    }
  );
};

// ========== 响应拦截器 ==========
/**
 * 后端统一返回格式：{ status: "ok"/"error", data: ... }
 * HTTP 状态码同样有意义：401=需要认证/刷新
 */

/**
 * 统一错误提示，防止重复弹窗
 */
let lastErrorMsg = '';
let lastErrorTime = 0;
function showErrorMsg(msg) {
  const now = Date.now();
  if (msg && (msg !== lastErrorMsg || now - lastErrorTime > 1500)) {
    Message.error(msg);
    lastErrorMsg = msg;
    lastErrorTime = now;
  }
}

/**
 * 注册响应拦截器：统一处理业务错误、HTTP错误、token刷新
 */
const addResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => {
      hideLoadingIfNeeded();
      const res = response.data;
      // 检查业务级错误（后端通过 status 字段标识）
      if (res && res.status === 'error') {
        const errMsg = res.data || res.msg || '接口请求失败';
        if (!response.config._silent) {
          showErrorMsg(typeof errMsg === 'string' ? errMsg : '接口请求失败');
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
      const originalRequest = error.config;

      // 401 → 处理 Token 失效或未登录
      if (status === 401) {
        // 场景 A：登录/注册接口本身报 401（通常是密码错误或用户不存在）
        // 这种情况下，不执行刷新逻辑，直接抛出错误由业务组件处理
        if (originalRequest.url && (originalRequest.url.includes('/user/login') || originalRequest.url.includes('/user/register'))) {
          const msg = (response.data && (response.data.data || response.data.msg)) || '用户名或密码错误';
          showErrorMsg(msg);
          return Promise.reject(error);
        }

        // 场景 B：刷新接口本身报 401（Refresh Token 也过期了）
        if (originalRequest.url && originalRequest.url.includes('/user/refresh')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token_expiration');
          showErrorMsg('登录失效，请重新登录');
          window.location.href = '/#/login';
          return Promise.reject(error);
        }

        // 场景 C：普通业务接口报 401 → 尝试无感刷新
        return new Promise((resolve, reject) => {
          // 将当前请求挂起，等待刷新完成
          subscribeTokenRefresh((token) => {
            // 刷新成功后，更新 Authorization 头（如果需要）并重发请求
            if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });

          // 如果没有正在进行的刷新，则发起刷新请求
          if (!isRefreshing) {
            isRefreshing = true;
            refreshToken()
              .then((newToken) => {
                isRefreshing = false;
                onRefreshed(newToken); // 广播新 token，触发所有挂起的请求重试
              })
              .catch((err) => {
                isRefreshing = false;
                refreshSubscribers = [];
                // 刷新失败（Refresh Token 也过期了），清除所有凭证并跳转登录
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('token_expiration');
                showErrorMsg('登录失效，请重新登录');
                window.location.href = '/#/login';
                reject(err);
              });
          }
        });
      }

      // 其他 HTTP 错误
      if (status === 400) {
        const msg = (response.data && (response.data.data || response.data.msg)) || '请求参数错误';
        // 屏蔽“缺少Cookie验证信息”等底层逻辑提示
        if (typeof msg === 'string' && msg.includes('Cookie')) {
          console.warn('底层的认证校验错误 (Silenced):', msg);
          
          // 尝试自动刷新 Token
          return new Promise((resolve, reject) => {
            if (!isRefreshing) {
              isRefreshing = true;
              refreshToken()
                .then((newToken) => {
                  isRefreshing = false;
                  onRefreshed(newToken);
                  if (newToken) originalRequest.headers.Authorization = `Bearer ${newToken}`;
                  resolve(instance(originalRequest));
                })
                .catch((err) => {
                  isRefreshing = false;
                  refreshSubscribers = [];
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('token_expiration');
                  showErrorMsg('登录失效，请重新登录');
                  window.location.href = '/#/login';
                  reject(err);
                });
            } else {
              subscribeTokenRefresh((token) => {
                if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(instance(originalRequest));
              });
            }
          });
        }
        if (!error.config._silent) showErrorMsg(typeof msg === 'string' ? msg : '请求参数错误');
      } else if (status === 403) {
        showErrorMsg('无操作权限');
      } else if (status === 404) {
        showErrorMsg('请求资源不存在');
      } else if (status === 409) {
        const msg = (response.data && (response.data.data || response.data.msg)) || '冲突';
        if (!error.config._silent) showErrorMsg(typeof msg === 'string' ? msg : '操作冲突');
      } else if (status >= 500) {
        showErrorMsg('服务繁忙，请稍后重试');
      } else if (error.code === 'ECONNABORTED') {
        // 静默处理超时，不再弹出提示
        console.warn('请求超时 (Silenced)');
      } else {
        // 静默处理底层网络异常，不再弹出提示
        console.warn('网络异常或连接已断开 (Silenced)');
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

/**
 * 内部去重 + 短缓存：调用 /spot/sina（新浪数据源，替代已废弃的 /spot）
 * 返回格式与旧 /spot 保持兼容：{ status: "ok", data: [...] }
 */
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
  // 3. 发起新请求（/spot/sina 最大 size=100）
  const p = service.get('/spot/sina', { params: { stock_type: stockType, size: 100 }, timeout: 30000 })
    .then(res => {
      // /spot/sina 返回 { status, data: { list, pages, total } }
      // 转换为旧格式 { status, data: [...] } 以兼容现有调用方
      const adapted = {
        status: res.status,
        data: (res.data && res.data.list) ? res.data.list : (Array.isArray(res.data) ? res.data : [])
      };
      _spotCache[stockType] = { data: adapted, ts: Date.now() };
      delete _spotPending[stockType];
      return adapted;
    })
    .catch(err => {
      delete _spotPending[stockType];
      throw err;
    });
  _spotPending[stockType] = p;
  return p;
};

// ========== 接口方法封装 ==========
/**
 * 导出 API 方法，建议 async/await + try-catch 调用
 */
export default {
  // ---------- 认证系统 ----------
  /**
   * 登录：POST /user/login  (application/x-www-form-urlencoded)
   * 根据最新 Apifox 文档，登录必须使用表单格式
   */
  login: (data) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);
    return service.post('/user/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },

  /**
   * 注册：POST /user/register  (application/x-www-form-urlencoded)
   * 根据最新 Apifox 文档，注册路径为 /user/register
   */
  register: (data) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);
    return service.post('/user/register', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },

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
   * 注意：后端返回 data 为数组 [{...}]，此处自动提取第一个元素
   * 建议：async/await + try-catch 调用
   */
  getStockLast: (code, options = {}) => service.get('/stock_last', { params: { code: addStockPrefix(code) }, ...options })
    .then(res => {
      if (res && Array.isArray(res.data)) {
        return { ...res, data: res.data[0] || {} };
      }
      return res;
    }),

  /**
   * 获取实时行情列表：GET /spot/sina?stock_type=ZhA
   * @param {string} stockType - 市场类型: ZhA/ShA/SzA/BjA/NewA/CyA/KcASpot
   * 返回：{ status, data: [{ id, code, name, last, zd, ud, vol, amount, hod, lod, open, close, ... }] }
   * 建议：async/await + try-catch 调用
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
  getDayHistory: (params, options = {}) =>
    service.get('/history/day', {
      params: {
        code: addStockPrefix(params.code),
        period: params.period || 'daily',
        start_date: params.start_date,
        end_date: params.end_date,
        adjust: params.adjust || 'qfq'
      },
      ...options
    }),

  // ---------- AI 功能 ----------
  /**
   * AI 股票分析：GET /api/ai?code=xxx
   * @param {string} code - 股票代码（支持带/不带前缀）
   * 返回：后端 AI 分析结果
   */
  getAIAnalysis: (code) => service.get('/ai', {
    params: { code: addStockPrefix(code) },
    timeout: 30000  // AI 推理可能较慢
  }),

  // AI 选股
  aiSelectStock: (data, options = {}) => service.post('/ai/select', data, options),
  aiPredict: (params) => service.get('/ai/predict', { params }),

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
        service.get('/stock_last', {
          params: { code: addStockPrefix(code) },
          _silent: true   // 批量请求：个别失败不弹 Message，由调用方兜底
        })
          .then(res => {
            // 后端返回 { data: [{...}] }，提取第一个元素
            const d = res.data;
            return Array.isArray(d) ? (d[0] || {}) : (d || {});
          })
          .catch(() => null)
      )
    );
  },

  /**
   * 分页行情数据（新浪数据源）：GET /spot/sina
   * 替代已废弃的 /spot 和 /spot/list
   * @param {Object} params - { stock_type, page, size(max 100), sort(amp/zd/ud/vol/amount/last/name), order(asc/desc) }
   * 返回原始分页响应：{ status, data: { list: [...], pages, total } }
   */
  getSpotSina: (params = {}) => {
    // 全局排序字段迁移：后端已统一使用 amp，前端历史传 zd 时在此统一转换。
    const normalizedSort = params.sort === 'zd' ? 'amp' : params.sort;
    const reqParams = {
      stock_type: params.stock_type || 'ShA',
      page: params.page || 1,
      size: Math.min(params.size || 50, 100),
      ...(normalizedSort ? { sort: normalizedSort } : {}),
      ...(params.order ? { order: params.order } : {})
    };

    return service.get('/spot/sina', {
      params: reqParams,
      timeout: 30000,
      _silent: !!params._silent
    }).catch((err) => {
      const status = err && err.response && err.response.status;
      // 兼容策略：优先 amp，后端不支持时回退 zd
      if (status === 400 && reqParams.sort === 'amp') {
        return service.get('/spot/sina', {
          params: { ...reqParams, sort: 'zd' },
          timeout: 30000,
          _silent: true
        });
      }
      return Promise.reject(err);
    });
  },

  /**
   * 股票搜索：GET /spot/search
   * @param {string} keyword - 搜索关键字（代码或名称）
   * @param {number} limit - 返回条数限制
   * 返回：{ status, data: [{ code, name, type }] }
   */
  searchStock: (keyword, limit) => service.get('/spot/search', { params: { keyword, limit: limit || 10 } })
};