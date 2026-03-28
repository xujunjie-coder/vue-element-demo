<template>
  <el-aside :width="`var(--right-aside-width)`" class="right-aside hide-on-mobile">
    <!-- 财经快讯模块（新增分类筛选+已读标记） -->
    <div class="aside-module">
      <div class="module-header">
        <div style="display: flex; align-items: center;">
          <h3 class="module-title no-break" style="flex-shrink:0; margin-right:8px; max-width:72px; font-size:16px;">财经快讯</h3>
          <div class="header-actions" style="flex:1; min-width:0; display:flex; align-items:center;">
              <el-select v-model="newsTag" size="mini" @change="filterNews" placeholder="全部" style="width:100%; min-width:0; flex:1 1 0;">
                <el-option label="全部" value=""></el-option>
                <el-option label="资金" value="资金"></el-option>
                <el-option label="宏观" value="宏观"></el-option>
                <el-option label="板块" value="板块"></el-option>
                <el-option label="实时" value="实时"></el-option>
              </el-select>
            <el-button type="text" icon="el-icon-refresh" @click="refreshNews" style="margin-left:2px;"></el-button>
          </div>
        </div>
      </div>
      <div class="news-list" @scroll="handleNewsScroll">
        <div 
          v-for="(news, index) in filteredNewsList" 
          :key="index" 
          class="news-item"
          :class="{ 'read': news.read }"
          @click="goNewsDetail(news)"
        >
          <span class="news-time">{{ news.time }}</span>
          <a
            class="news-content news-link"
            :href="getNewsTarget(news)"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop.prevent="goNewsDetail(news)"
          >{{ news.content }}</a>
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
        <!-- 底部状态提示 -->
        <div class="loading" v-if="isLoadingNews">加载中...</div>
        <div class="loading" v-else-if="!hasMoreNews && filteredNewsList.length > 0">已显示全部</div>
      </div>
    </div>
    <!-- 热门股票模块 -->
    <div class="aside-module">
      <div class="module-header">
        <div style="display: flex; align-items: center;">
          <h3 class="module-title no-break" style="flex-shrink:0; margin-right:8px; max-width:72px; font-size:16px;">热门个股</h3>
          <div style="flex:1; min-width:0; display:flex; align-items:center;">
            <el-select v-model="hotStockType" size="mini" @change="fetchHotStocks" style="width:100%; min-width:0; flex:1 1 0;">
              <el-option label="涨幅榜" value="rise"></el-option>
              <el-option label="跌幅榜" value="fall"></el-option>
              <el-option label="换手率" value="turnover"></el-option>
            </el-select>
          </div>
        </div>
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
    const fixedNewsPool = [
      {
        time: '21:44',
        content: '北向资金尾盘净流入超30亿元，权重板块获资金回流',
        tag: '资金',
        tagType: 'warning',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:43',
        content: '上证50震荡回升，银行与高股息板块盘中走强',
        tag: '板块',
        tagType: 'success',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:42',
        content: '*ST岩石(600696)异动拉升，现价1.65元，涨跌幅5.10%，成交量7781300手',
        tag: '实时',
        tagType: 'success',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:41',
        content: '*ST精伦(600355)异动拉升，现价0.78元，涨跌幅5.41%，成交量65158834手',
        tag: '实时',
        tagType: 'success',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:40',
        content: '*ST春天(600381)异动拉升，现价3.33元，涨跌幅5.05%，成交量2216300手',
        tag: '实时',
        tagType: 'success',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:39',
        content: '成交额榜首：*ST松发(603268)成交6.69亿元，涨跌幅-2.81%',
        tag: '资金',
        tagType: 'info',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:38',
        content: '换手率活跃：科创板多股成交放量，短线交易情绪回升',
        tag: '资金',
        tagType: 'primary',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:37',
        content: '医药与消费方向轮动加快，机构建议关注业绩确定性标的',
        tag: '板块',
        tagType: 'danger',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:36',
        content: '人民币汇率保持平稳，外资风险偏好边际改善',
        tag: '宏观',
        tagType: 'danger',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:35',
        content: '沪深两市超百股涨停，题材扩散速度较前日提升',
        tag: '板块',
        tagType: 'success',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:34',
        content: '新能源链条分化，储能方向承接较强，光伏端出现修复',
        tag: '板块',
        tagType: 'warning',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:33',
        content: '融资余额连续两日回升，市场杠杆情绪温和抬升',
        tag: '资金',
        tagType: 'info',
        read: false,
        link: 'https://www.eastmoney.com/'
      },
      {
        time: '21:32',
        content: '沪市A股上涨1194只，下跌1028只，平盘78只，市场分化延续',
        tag: '宏观',
        tagType: 'danger',
        read: false,
        link: 'https://www.eastmoney.com/'
      }
    ];
    const fixedNewsList = fixedNewsPool.slice(0, 12);

    return {
      // 财经快讯数据（固定展示）
      fixedNewsPool,
      newsList: fixedNewsList,
      newsTag: '', // 快讯筛选标签
      filteredNewsList: fixedNewsList, // 筛选后的快讯列表
      isLoadingNews: false, // 快讯加载中标记
      newsPage: 1, // 快讯分页
      hasMoreNews: false, // 当前版本不做后端快讯分页
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
    // 统一加载：热门股票
    this.fetchAllSpotData();
    // 初始化快讯时间，避免一直显示同一批静态时间
    this.newsList = this.relabelNewsTimes(this.newsList);
    this.filterNews();
    // 定时刷新（3分钟一次，共享请求）
    this.newsTimer = setInterval(() => {
      this.fetchAllSpotData();
      this.rotateFixedNews(2);
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
    relabelNewsTimes(list) {
      const now = new Date();
      return (list || []).map((item, idx) => {
        const ts = new Date(now.getTime() - idx * 60000);
        const time = `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`;
        return { ...item, time };
      });
    },
    pickRandomNewsItems(count, excludeContents = []) {
      const pool = (this.fixedNewsPool || []).filter(item => !excludeContents.includes(item.content));
      const source = pool.length >= count ? pool : (this.fixedNewsPool || []);
      const shuffled = [...source].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map(item => ({ ...item, read: false }));
    },
    rotateFixedNews(replaceCount = 2) {
      if (!this.newsList || !this.newsList.length) return;
      const total = this.newsList.length;
      const safeReplace = Math.min(Math.max(replaceCount, 1), total);
      const keepCount = total - safeReplace;
      const keep = this.newsList.slice(0, keepCount).map(item => ({ ...item }));
      const excludes = keep.map(item => item.content);
      const incoming = this.pickRandomNewsItems(safeReplace, excludes);
      this.newsList = this.relabelNewsTimes([...incoming, ...keep]).slice(0, total);
      this.filterNews();
    },
    /**
     * 统一获取 spot 数据，一次请求同时更新热门股票和财经快讯
     * 避免之前 fetchHotStocks + generateRealTimeNews 各自调一次 getSpot
     */
    async fetchAllSpotData() {
      this.hotStockLoading = true;

      // 优先使用缓存快速渲染热门股票
      const cacheKey = `hot_stocks_${this.hotStockType}`;
      const cached = getCache(cacheKey);
      if (cached && cached.length) {
        this.hotStockList = cached;
        this.hotStockLoading = false;
      }

      try {
        // 只发一次请求（getSpot 内部有去重+短缓存），使用全市场A股
        const res = await request.getSpot('ZhA');
        const rawList = res.data || [];

        // 更新热门股票
        this._updateHotStocks(rawList);
      } catch (err) {
        console.warn('fetchAllSpotData error:', err);
      } finally {
        this.hotStockLoading = false;
        this.hasMoreNews = false;
      }
    },
    formatNewsTime(baseDate, minusMinutes) {
      const ts = new Date(baseDate.getTime() - minusMinutes * 60000);
      return `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`;
    },
    // 从已获取的 rawList 更新热门股票
    _updateHotStocks(rawList) {
      const seen = new Set();
      const deduped = [];
      for (const item of rawList || []) {
        const normCode = String(item && item.code ? item.code : '').replace(/^(sh|sz|bj)/i, '').trim();
        if (!normCode || seen.has(normCode)) continue;
        seen.add(normCode);
        deduped.push({ ...item, code: normCode });
      }

      const mapped = deduped.map(item => ({
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
        sorted = mapped.filter(item => item._zd > 0).sort((a, b) => b._zd - a._zd);
      } else if (this.hotStockType === 'fall') {
        sorted = mapped.filter(item => item._zd < 0).sort((a, b) => a._zd - b._zd);
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
        const res = await request.getSpot('ZhA');
        this._updateHotStocks(res.data || []);
      } catch (err) {
        console.warn('fetchHotStocks error:', err);
      } finally {
        this.hotStockLoading = false;
      }
    },
    // 财经快讯使用固定数据
    _generateNewsFromData() {
      this.filterNews();
    },
    // 手动刷新快讯
    refreshNews() {
      this.rotateFixedNews(3);
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
    // 当前版本不做后端分页，滚动到底仅显示状态
    handleNewsScroll(e) {
      void e;
    },
    isGenericHomeUrl(rawUrl) {
      try {
        const u = new URL(String(rawUrl || ''));
        const host = (u.hostname || '').toLowerCase();
        const path = (u.pathname || '/').replace(/\/+$/, '') || '/';
        const isEastmoney = host.includes('eastmoney.com');
        // 仅域名首页/频道根路径不算“对应新闻页”
        const isGenericRoot = path === '/' || path === '/web' || path === '/web/';
        return isEastmoney && isGenericRoot;
      } catch (e) {
        return false;
      }
    },
    // 解析新闻跳转地址：后端若返回 url/link 则优先使用，否则跳东方财富关键词搜索
    getNewsTarget(news) {
      const directUrl = news && (news.url || news.link);
      if (directUrl && !this.isGenericHomeUrl(directUrl)) {
        return directUrl;
      }
      return this.buildEastmoneySearchUrl((news && news.content) || '');
    },
    buildEastmoneySearchUrl(content) {
      const keyword = this.extractNewsKeyword(content);
      return `https://so.eastmoney.com/web/s?keyword=${encodeURIComponent(keyword)}`;
    },
    extractNewsKeyword(content) {
      const text = String(content || '').replace(/\s+/g, ' ').trim();
      const noPrefix = text.replace(/^【[^】]+】/, '').trim();
      return noPrefix.slice(0, 24) || 'A股 快讯';
    },
    // 跳转到新闻详情（标记已读）
    goNewsDetail(news) {
      // 标记已读
      if (!news.read) {
        this.$set(this.newsList, this.newsList.findIndex(item => item.time === news.time && item.content === news.content), {
          ...news,
          read: true
        });
        
        this.filterNews(); // 重新筛选以更新样式
      }

      window.open(this.getNewsTarget(news), '_blank', 'noopener');
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
  background: var(--color-sidebar-bg, #fff);
  border-left: 1px solid var(--color-border);
  height: calc(100vh - 60px);
  overflow-y: auto;
  transition: background 0.3s, border-color 0.3s;
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
  color: var(--color-text, #333);
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
  border-bottom: 1px solid var(--color-border, #f5f5f5);
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}
.news-item:hover {
  background-color: var(--color-menu-hover, #f9f9f9);
}
.news-item.read .news-content {
  color: var(--color-text-secondary, #999);

}
.news-time {
  font-size: 12px;
  color: var(--color-text-secondary, #999);
  min-width: 50px;
  flex-shrink: 0;
}
.news-content {
  font-size: 13px;
  color: var(--color-text, #333);
  flex: 1;
  margin: 0 8px;
  line-height: 1.4;
  word-break: break-all;
  white-space: normal;
  display: block;
  overflow-wrap: anywhere;
}
.news-link {
  text-decoration: none;
}
.news-link:hover {
  color: #409eff;
  text-decoration: underline;
  text-underline-offset: 2px;
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
  color: var(--color-text-secondary, #999);
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
  border-bottom: 1px solid var(--color-border, #f5f5f5);
  cursor: pointer;
  transition: background-color 0.2s;
}
.hot-stock-item:hover {
  background-color: var(--color-menu-hover, #f9f9f9);
}
.rank {
  font-size: 14px;
  font-weight: bold;
  color: var(--color-text-secondary, #999);
  min-width: 25px;
  text-align: center;
}
.hot-stock-item .stock-info {
  flex: 1;
  margin: 0 8px;
  display: flex;
  flex-direction: column;
  word-break: break-all;
  white-space: normal;
  overflow-wrap: anywhere;
}
.hot-stock-item .stock-code {
  font-size: 13px;
  color: var(--color-text, #333);
}
.hot-stock-item .stock-name {
  font-size: 12px;
  color: var(--color-text-secondary, #666);
  word-break: break-all;
  white-space: normal;
  display: block;
  overflow-wrap: anywhere;
}
.hot-stock-item .stock-price {
  text-align: right;
  min-width: 100px;
}
.hot-stock-item .price {
  font-size: 13px;
  color: var(--color-text, #333);
  display: block;
}
/* 交易提醒样式（新增休市提示+倒计时） */
.trade-reminder {
  padding: 10px;
  background-color: var(--color-card-bg, #f8f9fa);
  border-radius: 4px;
}
.holiday-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px 0;
  color: #e53935;
  border-bottom: 1px solid var(--color-border, #e9ecef);
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
  color: var(--color-text-secondary, #666);
}
.time-value {
  font-size: 13px;
  font-weight: bold;
  color: var(--color-text, #333);
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