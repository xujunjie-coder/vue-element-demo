import * as XLSX from 'xlsx';

/**
 * 节流函数
 * @param {Function} fn - 执行函数
 * @param {number} delay - 延迟时间
 * @returns {Function} 节流后函数
 */
export const throttle = (fn, delay = 3000) => {
  let timer = null;
  return function (...args) {
    if (!timer) {
      fn.apply(this, args);
      timer = setTimeout(() => {
        clearTimeout(timer);
        timer = null;
      }, delay);
    }
  };
};

/**
 * 防抖函数
 * @param {Function} fn - 执行函数
 * @param {number} delay - 延迟时间
 * @returns {Function} 防抖后函数
 */
export const debounce = (fn, delay = 500) => {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 本地缓存 - 存储数据
 * @param {string} key - 缓存键
 * @param {any} data - 缓存数据
 * @param {number} expire - 过期时间（秒），默认3600秒
 */
export const setCache = (key, data, expire = 3600) => {
  const cacheData = {
    data,
    expire: Date.now() + expire * 1000
  };
  localStorage.setItem(key, JSON.stringify(cacheData));
};

/**
 * 本地缓存 - 获取数据
 * @param {string} key - 缓存键
 * @returns {any} 缓存数据（过期返回null）
 */
export const getCache = (key) => {
  const cacheStr = localStorage.getItem(key);
  if (!cacheStr) return null;
  const cacheData = JSON.parse(cacheStr);
  if (Date.now() > cacheData.expire) {
    localStorage.removeItem(key);
    return null;
  }
  return cacheData.data;
};

/**
 * 生成星级评分
 * @param {number} score - 分数（0-10）
 * @returns {string} 星级HTML
 */
export const generateStar = (score) => {
  const fullStar = Math.floor(score);
  const emptyStar = 10 - fullStar;
  return '<span style="color: var(--color-up);">' + '★'.repeat(fullStar) + '</span>' +
         '<span style="color: #e6e6e6;">' + '★'.repeat(emptyStar) + '</span>';
};

/**
 * 导出 Excel 文件（简单实现）
 * @param {Array<Object>} data - 导出数据（对象数组）
 * @param {string} filename - 文件名（带后缀，例如 'data.xlsx'）
 */
export const exportExcel = (data = [], filename = 'export.xlsx') => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('exportExcel: empty data');
    }
    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('exportExcel error', e);
  }
};