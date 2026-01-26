import Mock from 'mockjs';
import { MsgType } from '../utils/constants';
import { buildRequestMsg } from '../utils/request';

// Mock行情列表（修复：GET请求从URL解析参数，而非body）
Mock.mock(/\/api\/stock\/quote/, 'get', (options) => {
  // 修复1：GET请求参数从URL提取（body为空，无法解析）
  const url = new URL(options.url, window.location.origin);
  const params = {
    page: url.searchParams.get('page') || 1,
    size: url.searchParams.get('size') || 20,
    market: url.searchParams.get('market') || '',
    sort: url.searchParams.get('sort') || '',
    keyword: url.searchParams.get('keyword') || ''
  };

  const list = Mock.mock({
    'list|10-20': [{
      'code|6': /[0-9]/,
      'name': () => Mock.Random.cword(2, 4),
      'price|100-2000.2': 1,
      'change|-.0-20.2': 1,
      'change_rate|-.0-2.2': 1,
      'volume|10000-1000000': 1,
      'high|100-2000.2': 1,
      'low|100-2000.2': 1
    }]
  }).list;

  // 修复2：按request.js的解析规则返回（data为buildRequestMsg结果）
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, {
      list,
      total: 100,
      page: parseInt(params.page),
      size: parseInt(params.size)
    })
  };
});

// Mock个股详情（保持不变，URL参数解析正确）
Mock.mock(/\/api\/stock\/detail\/.*/, 'get', (options) => {
  const code = options.url.split('/').pop();
  const klineData = Mock.mock({
    'list|30': [{
      'date': () => Mock.Random.date('yyyy-MM-dd'),
      'open|100-2000.2': 1,
      'close|100-2000.2': 1,
      'high|100-2000.2': 1,
      'low|100-2000.2': 1,
      'volume|10000-1000000': 1
    }]
  }).list;
  const aiPrediction = {
    trend: Mock.Random.pick(['up', 'down']),
    probability: Mock.Random.integer(50, 95),
    target_price: Mock.Random.float(100, 2000, 2, 2),
    reason: Mock.Random.cparagraph(1, 2)
  };
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, {
      code,
      name: Mock.Random.cword(2, 4),
      price: Mock.Random.float(100, 2000, 2, 2),
      change: Mock.Random.float(-20, 20, 2, 2),
      change_rate: Mock.Random.float(-2, 2, 2, 2),
      open: Mock.Random.float(100, 2000, 2, 2),
      high: Mock.Random.float(100, 2000, 2, 2),
      low: Mock.Random.float(100, 2000, 2, 2),
      volume: Mock.Random.integer(10000, 1000000),
      klineData,
      aiPrediction
    })
  };
});

// MockK线数据（修复：GET请求参数解析）
Mock.mock('/api/stock/kline', 'get', (options) => {
  // 修复：从URL提取参数
  const url = new URL(options.url, window.location.origin);
  const params = {
    code: url.searchParams.get('code') || '',
    type: url.searchParams.get('type') || 'day'
  };

  const klineData = Mock.mock({
    'list|30': [{
      'date': () => Mock.Random.date('yyyy-MM-dd'),
      'open|100-2000.2': 1,
      'close|100-2000.2': 1,
      'high|100-2000.2': 1,
      'low|100-2000.2': 1,
      'volume|10000-1000000': 1
    }]
  }).list;
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, klineData)
  };
});

// MockAI智能选股（保持不变，POST请求解析正确）
Mock.mock('/ai-api/ai/select', 'post', (options) => {
  const res = Mock.mock({
    'list|5-10': [{
      'code|6': /[0-9]/,
      'name': () => Mock.Random.cword(2, 4),
      'score|5-10.1': 1,
      'reason': () => Mock.Random.cparagraph(1, 2)
    }]
  });
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, res)
  };
});

// Mock持仓列表（保持不变）
Mock.mock('/api/trade/hold', 'get', () => {
  const list = Mock.mock({
    'list|0-5': [{
      'code|6': /[0-9]/,
      'name': () => Mock.Random.cword(2, 4),
      'hold|1-10': 100,
      'cost|100-2000.2': 1,
      'price|100-2000.2': 1,
      'profit|-.0-10000.2': 1,
      'profit_rate|-.0-5.2': 1
    }]
  }).list;
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, {
      list,
      balance: 100000.00
    })
  };
});

// Mock用户信息（保持不变）
Mock.mock('/api/user/info', 'get', () => {
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, {
      username: '张三',
      balance: 100000.00,
      today_profit: Mock.Random.float(0, 5000, 2, 2),
      collect: Mock.mock({ 'array|3-6': ['@string("number",6)'] }).array
    })
  };
});

export default Mock;