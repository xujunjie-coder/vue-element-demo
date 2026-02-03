import axios from 'axios';
import { Message, Loading } from 'element-ui';
import { MsgType } from './constants';
import { getCache, setCache } from './tool';

// 业务接口实例
const service = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
  timeout: Number(process.env.VUE_APP_QUOTE_REFRESH_TIME) || 2000, // 更短超时，避免长时间阻塞
  headers: { 'Content-Type': 'application/json' }
});

// AI接口实例（AI接口容错稍大，但也不宜过长）
const aiService = axios.create({
  baseURL: process.env.VUE_APP_AI_API_BASE_URL,
  timeout: Number(process.env.VUE_APP_QUOTE_REFRESH_TIME) ? Number(process.env.VUE_APP_QUOTE_REFRESH_TIME) : 3000,
  headers: { 'Content-Type': 'application/json' }
});

// 构造请求消息（符合文档消息结构体规则）
export const buildRequestMsg = (msgType, data) => {
  const dataStr = JSON.stringify(data);
  const msgSize = new TextEncoder().encode(dataStr).length;
  return {
    type: msgType,
    size: msgSize,
    data: dataStr
  };
};

// 解析响应消息（新增：关键修复，解析buildRequestMsg生成的格式）
export const parseResponseMsg = (responseData) => {
  if (responseData.type !== MsgType.MSG_OK) {
    throw new Error(`接口响应失败，消息类型：${responseData.type}`);
  }
  // 校验消息长度（可选，避免数据不完整）
  const actualSize = new TextEncoder().encode(responseData.data).length;
  if (responseData.size !== actualSize) {
    console.warn('消息长度不匹配，可能数据不完整');
  }
  // 解析JSON字符串为对象
  return JSON.parse(responseData.data);
};

// 请求拦截器（仅在需要时展示阻塞 Loading，使用计数避免并发关闭问题）
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

const addRequestInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      // 控制 Loading 展示
      try {
        showLoadingIfNeeded(config);
      } catch (e) {
        console.warn('showLoadingIfNeeded failed', e);
      }
      // 添加Token
      const token = localStorage.getItem('stock_token');
      if (token) {
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

// 响应拦截器（修复：添加parseResponseMsg解析）
const addResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => {
      hideLoadingIfNeeded();
      const res = response.data;
      // 按文档错误码处理
      if (res.code !== 200) {
        switch (res.code) {
          case 401:
            Message.error('登录失效，请重新登录');
            localStorage.removeItem('stock_token');
            window.location.href = '/login'; // 修复：history模式无需#
            break;
          case 403:
            Message.error('无操作权限');
            break;
          case 404:
            Message.error('请求资源不存在');
            break;
          case 400:
            Message.error('参数错误，请检查输入');
            break;
          case 500:
            Message.error('服务繁忙，请稍后重试');
            break;
          default:
            Message.error(res.msg || '接口请求失败');
        }
        return Promise.reject(res);
      }
      // 修复：解析Mock返回的消息格式（关键步骤）
      try {
        return parseResponseMsg(res.data);
      } catch (e) {
        console.warn('接口数据格式不符合规范，直接返回原始数据', e);
        return res.data; // 兼容非buildRequestMsg格式的接口
      }
    },
    (error) => {
      hideLoadingIfNeeded();
      console.error('HTTP response error:', error);
      if (error.code === 'ECONNABORTED') {
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

// 接口方法封装（保持不变，与文档核心接口清单一致）
export default {
  // 行情数据接口
  getQuoteList: (params) => service.get('/stock/quote', { params }),
  getStockDetail: (code) => service.get(`/stock/detail/${code}`),
  getKLineData: (params) => service.get('/stock/kline', { params }),
  // AI功能接口
  aiSelectStock: (data) => aiService.post('/ai/select', buildRequestMsg(MsgType.MSG_AI_SELECT, data)),
  aiPredict: (params) => aiService.get('/ai/predict', { params }),
  // 交易模拟接口
  submitTradeOrder: (data) => service.post('/trade/order', buildRequestMsg(MsgType.MSG_TRADE_ORDER, data)),
  getHoldList: () => service.get('/trade/hold'),
  getOrderList: () => service.get('/trade/order/list'), // 新增：获取委托单列表
  searchStock: (keyword) => service.get('/stock/search', { params: { keyword } }),// 新增：股票代码联想搜索
  // 用户中心接口
  getUserInfo: () => service.get('/user/info'),
  login: (data) => service.post('/user/login', data),
  // 注册接口
  register: (data) => service.post('/user/register', data)
};