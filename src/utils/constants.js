// 消息类型枚举（与文档MsgType完全一致）
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

// 市场类型枚举
export const MarketType = {
  CN_A: 'cn_a', // 沪深A股
  CHUANGYE: 'cn_chuangye', // 创业板
  KECHUANG: 'cn_kechuang' // 科创板
};