// 消息类型枚举（保留兼容，后端新接口不再使用此格式）
export const MsgType = {
  MSG_NONE: 0,
  MSG_QUOTE_LIST: 1,
  MSG_STOCK_DETAIL: 2,
  MSG_KLINE_DATA: 3,
  MSG_AI_SELECT: 4,
  MSG_AI_PREDICT: 5,
  MSG_TRADE_ORDER: 6,
  MSG_HOLD_LIST: 7,
  MSG_USER_INFO: 8,
  MSG_OK: 200,
  MSG_ERROR: 500
};

// 选股策略枚举
export const SelectStrategy = {
  VALUE_GROWTH: 'value_growth', // 低估值高成长
  MA_UP: 'ma_up', // 均线多头排列
  VOLUME_PRICE: 'volume_price' // 量价齐升
};

// 市场类型枚举（与后端 /spot 接口 stock_type 参数一致）
export const MarketType = {
  ZhA: 'ZhA',       // 沪深京A股
  ShA: 'ShA',       // 沪A股
  SzA: 'SzA',       // 深A股
  BjA: 'BjA',       // 京A股
  NewA: 'NewA',     // 新股
  CyA: 'CyA',       // 创业板
  KcASpot: 'KcASpot' // 科创板
};

// 市场类型标签映射（用于下拉选择的显示文本）
export const MarketTypeLabel = {
  ZhA: '沪深京A股',
  ShA: '沪A股',
  SzA: '深A股',
  BjA: '京A股',
  NewA: '新股',
  CyA: '创业板',
  KcASpot: '科创板'
};

// K线周期映射（后端接口参数）
export const KLinePeriod = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly'
};

// 分钟K线scale映射
export const MinuteScale = {
  '5min': '5',
  '15min': '15',
  '30min': '30',
  '60min': '60'
};