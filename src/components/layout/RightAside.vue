<template>
  <el-aside :width="`var(--right-aside-width)`" class="right-aside hide-on-mobile" style="background: #fff; border-left: 1px solid var(--color-border); height: calc(100vh - 60px); overflow-y: auto;">
    <!-- 财经快讯模块（新增分类筛选+已读标记） -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">财经快讯</h3>
        <div class="header-actions">
          <el-select v-model="newsTag" size="mini" @change="filterNews" placeholder="全部">
            <el-option label="全部" value=""></el-option>
            <el-option label="央行" value="央行"></el-option>
            <el-option label="产业" value="产业"></el-option>
            <el-option label="资金" value="资金"></el-option>
            <el-option label="政策" value="政策"></el-option>
            <el-option label="宏观" value="宏观"></el-option>
            <el-option label="板块" value="板块"></el-option>
            <el-option label="汇率" value="汇率"></el-option>
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
import { getChangeClass } from '../../utils/format';
import { getCache, setCache } from '../../utils/tool';
export default {
  name: 'RightAside',
  data() {
    return {
      // 财经快讯数据（新增read状态）
      newsList: [
        { time: '09:23', content: '央行：保持流动性合理充裕，精准有力实施稳健的货币政策', tag: '央行', tagType: 'primary', read: false },
        { time: '09:45', content: '新能源汽车产业发展规划发布，行业迎来新机遇', tag: '产业', tagType: 'success', read: false },
        { time: '10:12', content: '今日北向资金净流入超50亿元，主要加仓消费板块', tag: '资金', tagType: 'warning', read: false },
        { time: '10:35', content: '工信部：加快推进人工智能产业创新发展', tag: '政策', tagType: 'info', read: false },
        { time: '11:08', content: '上半年GDP同比增长5.5%，经济运行总体回升向好', tag: '宏观', tagType: 'danger', read: false },
        { time: '13:45', content: '半导体板块异动拉升，国产替代进程加速', tag: '板块', tagType: 'success', read: false },
        { time: '14:20', content: '人民币兑美元汇率小幅升值，汇率保持基本稳定', tag: '汇率', tagType: 'info', read: false }
      ],
      newsTag: '', // 快讯筛选标签
      filteredNewsList: [], // 筛选后的快讯列表
      isLoadingNews: false, // 快讯加载中标记
      newsPage: 1, // 快讯分页（模拟滚动加载）
      // 热门股票类型
      hotStockType: 'rise',
      hotStockList: [],
      // 交易提醒相关（新增休市判断+倒计时）
      isHoliday: false,
      countdownText: ''
    };
  },
  mounted() {
    // 加载热门股票数据
    this.fetchHotStocks();
    // 初始化快讯筛选
    this.filteredNewsList = [...this.newsList];
    // 定时刷新快讯（5分钟一次）
    this.newsTimer = setInterval(() => {
      this.refreshNews();
    }, 300000);
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
    // 获取热门股票数据
    fetchHotStocks() {
      const mockData = {
        rise: [
          { code: '600519', name: '贵州茅台', price: '1890.00', change: '+2.56', change_rate: '+1.37' },
          { code: '000858', name: '五粮液', price: '178.50', change: '+2.12', change_rate: '+1.20' },
          { code: '601318', name: '中国平安', price: '45.80', change: '+0.85', change_rate: '+1.89' },
          { code: '002594', name: '比亚迪', price: '285.60', change: '+5.20', change_rate: '+1.85' },
          { code: '600036', name: '招商银行', price: '38.90', change: '+0.65', change_rate: '+1.70' }
        ],
        fall: [
          { code: '601689', name: '拓普集团', price: '56.80', change: '-1.85', change_rate: '-3.16' },
          { code: '002475', name: '立讯精密', price: '32.50', change: '-0.98', change_rate: '-2.94' },
          { code: '601899', name: '紫金矿业', price: '10.25', change: '-0.28', change_rate: '-2.67' },
          { code: '000333', name: '美的集团', price: '58.60', change: '-1.52', change_rate: '-2.53' },
          { code: '600887', name: '伊利股份', price: '28.30', change: '-0.70', change_rate: '-2.42' }
        ],
        turnover: [
          { code: '300750', name: '宁德时代', price: '189.50', change: '+1.25', change_rate: '+0.66', turnover: '8.5%' },
          { code: '000001', name: '平安银行', price: '12.80', change: '+0.15', change_rate: '+1.18', turnover: '7.8%' },
          { code: '600030', name: '中信证券', price: '21.50', change: '+0.32', change_rate: '+1.51', turnover: '7.2%' },
          { code: '002415', name: '海康威视', price: '35.80', change: '-0.45', change_rate: '-1.24', turnover: '6.9%' },
          { code: '601012', name: '隆基绿能', price: '18.60', change: '+0.25', change_rate: '+1.36', turnover: '6.5%' }
        ]
      };
      
      this.hotStockList = mockData[this.hotStockType];
      setCache(`hot_stocks_${this.hotStockType}`, this.hotStockList);
    },
    // 刷新快讯（新增已读状态保持）
    refreshNews() {
      const newNews = {
        time: new Date().toLocaleTimeString().slice(0, 5),
        content: `实时行情：${this.hotStockList[0].name}(${this.hotStockList[0].code})${this.hotStockList[0].change_rate}，领涨${this.hotStockType === 'rise' ? '两市' : '跌幅榜'}`,
        tag: '实时',
        tagType: 'warning',
        read: false
      };
      
      this.newsList.unshift(newNews);
      // 最多保留20条
      if (this.newsList.length > 20) {
        this.newsList.pop();
      }
      
      // 重新筛选
      this.filterNews();
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
</style>