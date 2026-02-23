<template>
  <el-aside :width="`var(--right-aside-width)`" class="right-aside hide-on-mobile" style="background: #fff; border-left: 1px solid var(--color-border); height: calc(100vh - 60px); overflow-y: auto;">
    <!-- 财经快讯模块（新增分类筛选+已读标记） -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">财经快讯</h3>
        <div class="header-actions">
          <el-select v-model="newsTag" size="mini" @change="filterNews" placeholder="全部">
            <el-option label="全部" value=""></el-option>
            <el-option label="资金" value="资金"></el-option>
            <el-option label="宏观" value="宏观"></el-option>
            <el-option label="板块" value="板块"></el-option>
            <el-option label="实时" value="实时"></el-option>
          </el-select>
          <el-button type="text" icon="el-icon-refresh" @click="refreshNews"></el-button>
        </div>
      </div>
      <div class="news-list" @scroll="handleNewsScroll">
        <div 
          v-for="(news, index) in filteredNewsList" 
          :key="index" 
          class="news-item"
          :class="{ 'read': news.read }"
          @click="goNewsDetail(news, index)"
        >
          <span class="news-time">{{ news.time }}</span>
          <span class="news-content">{{ news.content }}</span>
          <el-tag 
            v-if="news.tag" 
            size="mini" 
            :type="news.tagType || 'info'"
            class="news-tag"
          >
            {{ news.tag }}
          </el-tag>
          <el-icon v-if="!news.read" class="unread-dot" :class="news.tagType || 'info'">el-icon-caret-right</el-icon>
        </div>
        <!-- 加载中提示 -->
        <div class="loading" v-if="isLoadingNews">加载中...</div>
      </div>
    </div>
    <!-- 热门股票模块 -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">热门个股</h3>
        <el-select v-model="hotStockType" size="mini" @change="fetchHotStocks">
          <el-option label="涨幅榜" value="rise"></el-option>
          <el-option label="跌幅榜" value="fall"></el-option>
          <el-option label="换手率" value="turnover"></el-option>
        </el-select>
      </div>
      <div class="hot-stock-list">
        <!-- 加载骨架屏 -->
        <template v-if="hotStockLoading && hotStockList.length === 0">
          <div v-for="n in 6" :key="'skeleton-' + n" class="hot-stock-item skeleton-item">
            <span class="rank skeleton-block skeleton-rank"></span>
            <div class="stock-info">
              <span class="skeleton-block skeleton-code"></span>
              <span class="skeleton-block skeleton-name"></span>
            </div>
            <div class="stock-price">
              <span class="skeleton-block skeleton-price"></span>
              <span class="skeleton-block skeleton-change"></span>
            </div>
          </div>
        </template>
        <!-- 实际数据 -->
        <template v-else>
          <div 
            v-for="(stock, index) in hotStockList" 
            :key="stock.code" 
            class="hot-stock-item"
            @click="goStockDetail(stock)"
          >
            <span class="rank">{{ index + 1 }}</span>
            <div class="stock-info">
              <span class="stock-code">{{ stock.code }}</span>
              <span class="stock-name">{{ stock.name }}</span>
            </div>
            <div class="stock-price">
              <span class="price">{{ stock.price }}</span>
              <span :class="getChangeClass(stock.change)">{{ stock.change_rate }}%</span>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- 交易提醒模块（新增休市提示+倒计时） -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">交易提醒</h3>
      </div>
      <div class="trade-reminder">
        <!-- 休市日提示 -->
        <div class="holiday-tip" v-if="isHoliday">
          <el-icon class="holiday-icon">el-icon-calendar</el-icon>
          <span>今日为休市日，无交易安排</span>
        </div>
        <div class="time-item" v-else>
          <span class="time-label">集合竞价</span>
          <span class="time-value">09:15 - 09:25</span>
        </div>
        <div class="time-item" >
          <span class="time-label">早盘交易</span>
          <span class="time-value">09:30 - 11:30</span>
        </div>
        <div class="time-item" >
          <span class="time-label">午间休市</span>
          <span class="time-value">11:30 - 13:00</span>
        </div>
        <div class="time-item" >
          <span class="time-label">尾盘交易</span>
          <span class="time-value">13:00 - 15:00</span>
        </div>
        <div class="time-item">
          <span class="time-label">当前状态</span>
          <span class="time-value" :class="getMarketStatusClass()">{{ getMarketStatusText() }}</span>
        </div>
        <!-- 倒计时 -->
        <div class="countdown-item" v-if="countdownText">
          <span class="time-label">倒计时</span>
          <span class="time-value countdown">{{ countdownText }}</span>
        </div>
      </div>
    </div>
  </el-aside>
</template>
<script>
import { getChangeClass, formatPrice, formatChangeRate } from '../../utils/format';
import { getCache, setCache } from '../../utils/tool';
import request from '../../utils/request';
export default {
  name: 'RightAside',
  data() {
    return {
      // 财经快讯数据（实时生成）
      newsList: [],
      newsTag: '', // 快讯筛选标签
      filteredNewsList: [], // 筛选后的快讯列表
      isLoadingNews: false, // 快讯加载中标记
      newsPage: 1, // 快讯分页
      // 热门股票类型
      hotStockType: 'rise',
      hotStockList: [],
      hotStockLoading: false,
      // 交易提醒相关（新增休市判断+倒计时）
      isHoliday: false,
      countdownText: ''
    };
  },
  mounted() {
    // 统一加载：热门股票 + 财经快讯共享同一次 getSpot 请求
    this.fetchAllSpotData();
    // 定时刷新（3分钟一次，共享请求）
    this.newsTimer = setInterval(() => {
      this.fetchAllSpotData();
    }, 180000);
    // 初始化市场状态（判断是否休市+倒计时）
    this.initMarketStatus();
    // 每秒更新倒计时
    this.countdownTimer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  },
  beforeDestroy() {
    clearInterval(this.newsTimer);
    clearInterval(this.countdownTimer);
  },
  watch: {
    // 监听快讯筛选标签变化
    newsTag() {
      this.filterNews();
    }
  },
  computed: {},
  methods: {
    getChangeClass,
    /**
     * 统一获取 spot 数据，一次请求同时更新热门股票和财经快讯
     * 避免之前 fetchHotStocks + generateRealTimeNews 各自调一次 getSpot
     */
    async fetchAllSpotData() {
      this.hotStockLoading = true;
      this.isLoadingNews = true;

      // 优先使用缓存快速渲染热门股票
      const cacheKey = `hot_stocks_${this.hotStockType}`;
      const cached = getCache(cacheKey);
      if (cached && cached.length) {
        this.hotStockList = cached;
        this.hotStockLoading = false;
      }

      try {
        // 只发一次请求（getSpot 内部有去重+短缓存）
        const res = await request.getSpot('ShA');
        const rawList = res.data || [];

        // 同时更新热门股票和快讯
        this._updateHotStocks(rawList);
        this._generateNewsFromData(rawList);
      } catch (err) {
        console.warn('fetchAllSpotData error:', err);
      } finally {
        this.hotStockLoading = false;
        this.isLoadingNews = false;
      }
    },
    // 从已获取的 rawList 更新热门股票
    _updateHotStocks(rawList) {
      const mapped = rawList.map(item => ({
        code: item.code || '',
        name: item.name || '',
        price: formatPrice(item.last),
        change: formatPrice(item.ud),
        change_rate: formatChangeRate(item.zd),
        _zd: Number(item.zd) || 0,
        _hsr: Number(item.hsr) || 0
      }));

      let sorted = [];
      if (this.hotStockType === 'rise') {
        sorted = [...mapped].sort((a, b) => b._zd - a._zd);
      } else if (this.hotStockType === 'fall') {
        sorted = [...mapped].sort((a, b) => a._zd - b._zd);
      } else {
        sorted = [...mapped].sort((a, b) => b._hsr - a._hsr);
      }

      this.hotStockList = sorted.slice(0, 10);
      const cacheKey = `hot_stocks_${this.hotStockType}`;
      setCache(cacheKey, this.hotStockList, 60);
    },
    // 获取热门股票数据（切换类型时调用）
    async fetchHotStocks() {
      this.hotStockList = [];
      this.hotStockLoading = true;

      const cacheKey = `hot_stocks_${this.hotStockType}`;
      const cached = getCache(cacheKey);
      if (cached && cached.length) {
        this.hotStockList = cached;
        this.hotStockLoading = false;
        return; // 切换类型时优先用缓存，不再重新请求
      }
      try {
        const res = await request.getSpot('ShA');
        this._updateHotStocks(res.data || []);
      } catch (err) {
        console.warn('fetchHotStocks error:', err);
      } finally {
        this.hotStockLoading = false;
      }
    },
    // 从实时行情数据生成财经快讯（从已有数据生成，不再重新请求）
    _generateNewsFromData(rawList) {
        if (!rawList.length) return;

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // 按涨跌幅排序
        const sorted = [...rawList].sort((a, b) => (Number(b.zd) || 0) - (Number(a.zd) || 0));
        const topGainers = sorted.slice(0, 5);
        const topLosers = sorted.slice(-5).reverse();

        // 按换手率排序
        const byTurnover = [...rawList].sort((a, b) => (Number(b.hsr) || 0) - (Number(a.hsr) || 0));
        const hotTurnover = byTurnover.slice(0, 3);

        // 涨跌统计
        let upCount = 0, downCount = 0, flatCount = 0;
        rawList.forEach(item => {
          const zd = Number(item.zd) || 0;
          if (zd > 0) upCount++;
          else if (zd < 0) downCount++;
          else flatCount++;
        });

        const generated = [];

        // 1. 市场总览
        generated.push({
          time: timeStr,
          content: `沪市A股共${rawList.length}只，上涨${upCount}只，下跌${downCount}只，平盘${flatCount}只`,
          tag: '宏观', tagType: 'danger', read: false
        });

        // 2. 涨幅榜前3
        if (topGainers.length >= 3) {
          generated.push({
            time: timeStr,
            content: `涨幅榜领涨：${topGainers[0].name}(${topGainers[0].code}) +${formatChangeRate(topGainers[0].zd)}%，${topGainers[1].name} +${formatChangeRate(topGainers[1].zd)}%，${topGainers[2].name} +${formatChangeRate(topGainers[2].zd)}%`,
            tag: '板块', tagType: 'success', read: false
          });
        }

        // 3. 跌幅榜
        if (topLosers.length >= 3) {
          generated.push({
            time: timeStr,
            content: `跌幅榜领跌：${topLosers[0].name}(${topLosers[0].code}) ${formatChangeRate(topLosers[0].zd)}%，${topLosers[1].name} ${formatChangeRate(topLosers[1].zd)}%`,
            tag: '板块', tagType: 'warning', read: false
          });
        }

        // 4. 换手率活跃股
        if (hotTurnover.length >= 2) {
          generated.push({
            time: timeStr,
            content: `换手率活跃：${hotTurnover[0].name} 换手${Number(hotTurnover[0].hsr).toFixed(2)}%，${hotTurnover[1].name} 换手${Number(hotTurnover[1].hsr).toFixed(2)}%`,
            tag: '资金', tagType: 'warning', read: false
          });
        }

        // 5. 成交额最大的股票
        const byAmount = [...rawList].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
        if (byAmount.length >= 2) {
          const a1 = byAmount[0];
          const amountYi = (Number(a1.amount) / 100000000).toFixed(2);
          generated.push({
            time: timeStr,
            content: `成交额榜首：${a1.name}(${a1.code}) 成交${amountYi}亿元，涨跌幅${formatChangeRate(a1.zd)}%`,
            tag: '资金', tagType: 'primary', read: false
          });
        }

        // 6. 涨停股统计
        const limitUp = rawList.filter(item => Number(item.zd) >= 9.9);
        const limitDown = rawList.filter(item => Number(item.zd) <= -9.9);
        if (limitUp.length > 0 || limitDown.length > 0) {
          generated.push({
            time: timeStr,
            content: `涨跌停统计：涨停${limitUp.length}只，跌停${limitDown.length}只${limitUp.length > 0 ? '，涨停股：' + limitUp.slice(0, 3).map(s => s.name).join('、') : ''}`,
            tag: '板块', tagType: 'danger', read: false
          });
        }

        // 7. 异动个股提醒
        const bigMoves = sorted.filter(s => Math.abs(Number(s.zd) || 0) >= 5).slice(0, 10);
        for (let i = 0; i < Math.min(3, bigMoves.length); i++) {
          const idx = Math.floor(Math.random() * bigMoves.length);
          const s = bigMoves[idx];
          if (!s) continue;
          const zd = Number(s.zd) || 0;
          generated.push({
            time: timeStr,
            content: `${s.name}(${s.code})异动${zd > 0 ? '拉升' : '下跌'}，现价${formatPrice(s.last)}元，涨跌幅${formatChangeRate(s.zd)}%，成交量${s.vol}手`,
            tag: '实时', tagType: zd > 0 ? 'success' : 'info', read: false
          });
        }

        // 合并新快讯到列表顶部，保留旧的最多10条
        this.newsList = [...generated, ...this.newsList.slice(0, 10)].slice(0, 20);
        this.filterNews();
    },
    // 手动刷新快讯
    refreshNews() {
      this.fetchAllSpotData();
      this.$message.success('快讯已更新');
    },
    // 筛选快讯
    filterNews() {
      if (!this.newsTag) {
        this.filteredNewsList = [...this.newsList];
        return;
      }
      this.filteredNewsList = this.newsList.filter(news => news.tag === this.newsTag);
    },
    // 快讯滚动加载（模拟）
    handleNewsScroll(e) {
      const scrollTop = e.target.scrollTop;
      const scrollHeight = e.target.scrollHeight;
      const clientHeight = e.target.clientHeight;
      if (scrollTop + clientHeight >= scrollHeight - 50 && !this.isLoadingNews) {
        this.isLoadingNews = true;
        // 模拟加载延迟
        setTimeout(() => {
          this.newsPage++;
          this.isLoadingNews = false;
          // 实际项目中此处应请求下一页数据并追加到newsList
        }, 1000);
      }
    },
    // 跳转到新闻详情（标记已读）
    goNewsDetail(news, index) {
      // 标记已读
      if (!news.read) {
        this.$set(this.newsList, this.newsList.findIndex(item => item.time === news.time && item.content === news.content), {
          ...news,
          read: true
        });
        this.filterNews(); // 重新筛选以更新样式
      }
      
      this.$message.info(`查看${news.content.substring(0, 10)}...详情`);
      // 实际项目中跳转到新闻详情页
      // this.$router.push(`/news/${news.id}`);
    },
    // 跳转到股票详情
    goStockDetail(stock) {
      this.$router.push(`/detail/${stock.code}`);
    },
    // 初始化市场状态（判断是否休市）
    initMarketStatus() {
      const now = new Date();
      const day = now.getDay();
      // 周末视为休市
      this.isHoliday = day === 0 || day === 6;
      // 非周末时更新倒计时
      if (!this.isHoliday) {
        this.updateCountdown();
      }
    },
    // 更新倒计时
    updateCountdown() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      let countdown = '';
      
      if (hours < 9 || (hours === 9 && minutes < 15)) {
        // 未开盘：距离集合竞价还有多久
        const openTime = new Date(now);
        openTime.setHours(9, 15, 0, 0);
        const diff = openTime - now;
        const diffMinutes = Math.floor(diff / 60000);
        const diffSeconds = Math.floor((diff % 60000) / 1000);
        countdown = `距离开盘${diffMinutes}分${diffSeconds}秒`;
      } else if ((hours === 11 && minutes > 30) || (hours >= 12 && hours < 13)) {
        // 午间休市：距离下午开盘还有多久
        const afternoonOpenTime = new Date(now);
        afternoonOpenTime.setHours(13, 0, 0, 0);
        const diff = afternoonOpenTime - now;
        const diffMinutes = Math.floor(diff / 60000);
        const diffSeconds = Math.floor((diff % 60000) / 1000);
        countdown = `距离下午开盘${diffMinutes}分${diffSeconds}秒`;
      } else if (hours >= 15) {
        // 已收盘：距离明日开盘还有多久（简化计算）
        countdown = '今日交易已结束';
      } else {
        // 交易中：距离收盘还有多久
        const closeTime = new Date(now);
        closeTime.setHours(15, 0, 0, 0);
        const diff = closeTime - now;
        const diffHours = Math.floor(diff / 3600000);
        const diffMinutes = Math.floor((diff % 3600000) / 60000);
        const diffSeconds = Math.floor((diff % 60000) / 1000);
        countdown = `距离收盘${diffHours}时${diffMinutes}分${diffSeconds}秒`;
      }
      
      this.countdownText = countdown;
    },
    // 获取市场状态文本
    getMarketStatusText() {
      if (this.isHoliday) {
        return '休市';
      }
      
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      if (hours < 9 || (hours === 9 && minutes < 15)) {
        return '未开盘';
      } else if ((hours >= 9 && hours < 11) || (hours === 11 && minutes <= 30) || (hours >= 13 && hours < 15)) {
        return '交易中';
      } else if ((hours === 11 && minutes > 30) || (hours >= 12 && hours < 13)) {
        return '午间休市';
      } else if (hours >= 15) {
        return '已收盘';
      }
      
      return '未开盘';
    },
    // 获取市场状态样式类（交易中添加闪烁效果）
    getMarketStatusClass() {
      const status = this.getMarketStatusText();
      return {
        'text-up': status === '交易中',
        'text-neutral': status === '午间休市',
        'text-down': status === '未开盘' || status === '已收盘' || status === '休市',
        'blink': status === '交易中'
      };
    }
  }
};
</script>
<style scoped>
.right-aside {
  --right-aside-width: 300px;
}
.aside-module {
  padding: 15px;
  border-bottom: 1px solid var(--color-border);
}
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.module-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
/* 财经快讯样式（新增已读/未读标记+滚动加载） */
.news-list {
  max-height: 300px;
  overflow-y: auto;
}
.news-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}
.news-item:hover {
  background-color: #f9f9f9;
}
.news-item.read .news-content {
  color: #999;

}
.news-time {
  font-size: 12px;
  color: #999;
  min-width: 50px;
  flex-shrink: 0;
}
.news-content {
  font-size: 13px;
  color: #333;
  flex: 1;
  margin: 0 8px;
  line-height: 1.4;
}
.news-tag {
  flex-shrink: 0;
}
.unread-dot {
  position: absolute;
  right: 0;
  top: 10px;
  font-size: 8px;
}
.loading {
  text-align: center;
  padding: 8px 0;
  color: #999;
  font-size: 12px;
}
/* 热门股票样式 */
.hot-stock-list {
  max-height: 300px;
  overflow-y: auto;
}
.hot-stock-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}
.hot-stock-item:hover {
  background-color: #f9f9f9;
}
.rank {
  font-size: 14px;
  font-weight: bold;
  color: #999;
  min-width: 25px;
  text-align: center;
}
.hot-stock-item .stock-info {
  flex: 1;
  margin: 0 8px;
}
.hot-stock-item .stock-code {
  font-size: 13px;
  color: #333;
}
.hot-stock-item .stock-name {
  font-size: 12px;
  color: #666;
}
.hot-stock-item .stock-price {
  text-align: right;
  min-width: 100px;
}
.hot-stock-item .price {
  font-size: 13px;
  color: #333;
  display: block;
}
/* 交易提醒样式（新增休市提示+倒计时） */
.trade-reminder {
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}
.holiday-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px 0;
  color: #e53935;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 10px;
}
.holiday-icon {
  margin-right: 8px;
}
.time-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #e9ecef;
}
.time-item:last-child {
  border-bottom: none;
}
.time-label {
  font-size: 13px;
  color: #666;
}
.time-value {
  font-size: 13px;
  font-weight: bold;
  color: #333;
}
.countdown-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  margin-top: 8px;
  border-top: 1px solid #e9ecef;
}
.countdown {
  color: var(--color-up);
  animation: blink 1s infinite;
}
/* 闪烁动画 */
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
.blink {
  animation: blink 1s infinite;
}
/* 骨架屏加载动画 */
.skeleton-item {
  pointer-events: none;
}
.skeleton-block {
  display: inline-block;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton-rank {
  width: 20px;
  height: 16px;
}
.skeleton-code {
  width: 60px;
  height: 14px;
  margin-bottom: 4px;
}
.skeleton-name {
  width: 45px;
  height: 12px;
}
.skeleton-price {
  width: 50px;
  height: 14px;
  margin-bottom: 4px;
  margin-left: auto;
}
.skeleton-change {
  width: 40px;
  height: 12px;
  margin-left: auto;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>