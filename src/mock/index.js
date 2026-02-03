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

// MockAI智能选股（修改：用正则匹配 /ai-api/ai/select 路径，适配VUE_APP_AI_API_BASE_URL）
Mock.mock(/\/ai-api\/ai\/select/, 'post', (options) => {
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

// Mock交易下单接口（新增）
Mock.mock('/api/trade/order', 'post', (options) => {
  // 解析POST请求的参数（兼容 buildRequestMsg 包装）
  let reqDataRaw;
  try {
    reqDataRaw = JSON.parse(options.body);
  } catch (e) {
    reqDataRaw = options.body || {};
  }
  // 如果请求使用 buildRequestMsg 包装，解析内部 data 字段
  let params = reqDataRaw;
  if (reqDataRaw && typeof reqDataRaw.data === 'string') {
    try {
      params = JSON.parse(reqDataRaw.data);
    } catch (e) {
      params = {};
    }
  }
  const direction = params.direction || params.type;
  // 模拟下单成功
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, {
      order_no: Mock.Random.string('number', 10),
      code: params.code,
      name: Mock.Random.cword(2, 4),
      price: params.price,
      amount: params.amount,
      direction,
      status: 'success',
      create_time: new Date().toLocaleString(), // 新增委托时间
      msg: '下单成功'
    })
  };
});
// 新增：Mock委托单列表接口（替换组件硬编码数据）
Mock.mock('/api/trade/order/list', 'get', () => {
  const orderList = Mock.mock({
    'list|2-5': [{
      'order_no|10': /[0-9]/,
      'code|6': /[0-9]/,
      'name': () => Mock.Random.cword(2, 4),
      'direction': () => Mock.Random.pick(['buy', 'sell']),
      'price|100-2000.2': 1,
      'amount|1-10': 100,
      'status': () => Mock.Random.pick(['success', 'pending', 'canceled']),
      'create_time': () => Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
    }]
  }).list;
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, orderList)
  };
});

// 新增：股票代码联想接口（买入表单搜索用）
Mock.mock(/\/api\/stock\/search/, 'get', (options) => {
  const url = new URL(options.url, window.location.origin);
  const keyword = url.searchParams.get('keyword') || '';
  // 模拟股票库（含真实代码和名称）
  const stockLib = [
    { code: '600519', name: '贵州茅台' },
    { code: '000858', name: '五粮液' },
    { code: '601318', name: '中国平安' },
    { code: '002594', name: '比亚迪' },
    { code: '600036', name: '招商银行' },
    { code: '000333', name: '美的集团' }
  ];
  // 模糊匹配（代码或名称包含关键词）
  const result = keyword 
    ? stockLib.filter(item => item.code.includes(keyword) || item.name.includes(keyword))
    : [];
  return {
    code: 200,
    data: buildRequestMsg(MsgType.MSG_OK, result)
  };
});
// Mock登录接口（新增）
Mock.mock('/api/user/login', 'post', (options) => {
  const reqData = JSON.parse(options.body);
  // 模拟账号密码正确（admin/123456）
  if (reqData.username === 'admin' && reqData.password === '123456') {
    return {
      code: 200,
      data: {
        token: Mock.Random.string('letter', 32), // 返回token
        userInfo: {
          username: 'admin',
          id: Mock.Random.integer(10000, 99999)
        }
      }
    };
  } else {
    return {
      code: 400,
      msg: '账号或密码错误'
    };
  }
});

// Mock注册接口（新增）
Mock.mock('/api/user/register', 'post', (options) => {
  try {
    const req = JSON.parse(options.body);
    const username = (req.username || '').trim();
    const password = req.password || '';
    if (!username || !password || password.length < 6) {
      return { code: 400, msg: '参数错误：用户名/密码不合法' };
    }
    // 简单模拟：如果用户名为 'exists' 则返回已存在
    if (username === 'exists') {
      return { code: 400, msg: '用户名已存在' };
    }
    return {
      code: 200,
      data: {
        token: Mock.Random.string('letter', 32),
        userInfo: {
          username,
          id: Mock.Random.integer(10000, 99999)
        }
      }
    };
  } catch (e) {
    return { code: 400, msg: '请求参数解析失败' };
  }
});

export default Mock;