/**
 * 格式化股票价格（保留2位小数）
 * @param {number/string} val - 原始价格
 * @returns {string} 格式化后价格
 */
export const formatPrice = (val) => {
  if (!val || isNaN(Number(val))) return '0.00';
  return Number(val).toFixed(2);
};

/**
 * 格式化涨跌幅（保留2位小数+%）
 * @param {number/string} val - 原始涨跌幅
 * @returns {string} 格式化后涨跌幅
 */
export const formatChangeRate = (val) => {
  if (!val || isNaN(Number(val))) return '0.00';
  return Number(val).toFixed(2);
};

/**
 * 格式化成交量（股转手）
 * @param {number/string} val - 原始成交量（股）
 * @returns {string} 格式化后成交量（手）
 */
export const formatVolume = (val) => {
  if (!val || isNaN(Number(val))) return '0';
  return Math.floor(Number(val) / 100).toString();
};

/**
 * 获取涨跌样式类名
 * @param {number/string} change - 涨跌额
 * @returns {string} 样式类名
 */
export const getChangeClass = (change) => {
  const num = Number(change);
  if (num > 0) return 'text-up';
  if (num < 0) return 'text-down';
  return 'text-neutral';
};

/**
 * 格式化日期
 * @param {string} dateStr - 原始日期
 * @returns {string} 格式化日期
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
};