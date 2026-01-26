<template>
  <el-aside :width="`var(--right-aside-width)`" class="right-aside hide-on-mobile" style="background: #fff; border-left: 1px solid var(--color-border); height: calc(100vh - 60px); overflow-y: auto;">
    <!-- 实时快讯模块 -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">财经快讯</h3>
        <el-button type="text" icon="el-icon-refresh" @click="refreshNews"></el-button>
      </div>
      <div class="news-list">
        <div 
          v-for="(news, index) in newsList" 
          :key="index" 
          class="news-item"
          @click="goNewsDetail(news)"
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
        </div>
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

    <!-- 交易提醒模块 -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">交易提醒</h3>
      </div>
      <div class="trade-reminder">
        <div class="time-item">
          <span class="time-label">集合竞价</span>
          <span class="time-value">09:15 - 09:25</span>
        </div>
        <div class="time-item">
          <span class="time-label">早盘交易</span>
          <span class="time-value">09:30 - 11:30</span>
        </div>
        <div class="time-item">
          <span class="time-label">午间休市</span>
          <span class="time-value">11:30 - 13:00</span>
        </div>
        <div class="time-item">
          <span class="time-label">尾盘交易</span>
          <span class="time-value">13:00 - 15:00</span>
        </div>
        <div class="time-item">
          <span class="time-label">当前状态</span>
          <span class="time-value" :class="getMarketStatusClass()">{{ getMarketStatusText() }}</span>
        </div>
      </div>
    </div>

    <!-- 工具导航模块 -->
    <div class="aside-module">
      <div class="module-header">
        <h3 class="module-title">实用工具</h3>
      </div>
      <el-card class="tool-card" shadow="hover" v-for="tool in toolList" :key="tool.id">
        <div class="tool-item" @click="openTool(tool)">
          <el-icon :class="tool.iconClass" style="font-size: 20px;"></el-icon>
          <span class="tool-name">{{ tool.name }}</span>
        </div>
      </el-card>
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
      // 财经快讯数据
      newsList: [
        { time: '09:23', content: '央行：保持流动性合理充裕，精准有力实施稳健的货币政策', tag: '央行', tagType: 'primary' },
        { time: '09:45', content: '新能源汽车产业发展规划发布，行业迎来新机遇', tag: '产业', tagType: 'success' },
        { time: '10:12', content: '今日北向资金净流入超50亿元，主要加仓消费板块', tag: '资金', tagType: 'warning' },
        { time: '10:35', content: '工信部：加快推进人工智能产业创新发展', tag: '政策', tagType: 'info' },
        { time: '11:08', content: '上半年GDP同比增长5.5%，经济运行总体回升向好', tag: '宏观', tagType: 'danger' },
        { time: '13:45', content: '半导体板块异动拉升，国产替代进程加速', tag: '板块', tagType: 'success' },
        { time: '14:20', content: '人民币兑美元汇率小幅升值，汇率保持基本稳定', tag: '汇率', tagType: 'info' }
      ],
      // 热门股票类型
      hotStockType: 'rise',
      // 热门股票列表
      hotStockList: [],
      // 实用工具列表
      toolList: [
        { id: 1, name: '市盈率计算器', iconClass: 'el-icon-calculator' },
        { id: 2, name: '交易税费计算', iconClass: 'el-icon-money' },
        { id: 3, name: '均线分析工具', iconClass: 'el-icon-pie-chart' },
        { id: 4, name: '财报对比分析', iconClass: 'el-icon-s-data' },
        { id: 5, name: '风险测评工具', iconClass: 'el-icon-shield' },
        { id: 6, name: '投资组合管理', iconClass: 'el-icon-menu' }
      ]
    };
  },
  mounted() {
    // 加载热门股票数据
    this.fetchHotStocks();
    // 定时刷新快讯（5分钟一次）
    this.newsTimer = setInterval(() => {
      this.refreshNews();
    }, 300000);
  },
  beforeDestroy() {
    clearInterval(this.newsTimer);
  },
  methods: {
    getChangeClass,
    // 获取热门股票数据
    fetchHotStocks() {
      // 模拟接口请求，实际项目中替换为真实接口
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
      
      // 缓存热门股票数据
      setCache(`hot_stocks_${this.hotStockType}`, this.hotStockList);
    },
    // 刷新快讯
    refreshNews() {
      // 模拟新增一条快讯
      const newNews = {
        time: new Date().toLocaleTimeString().slice(0, 5),
        content: `实时行情：${this.hotStockList[0].name}(${this.hotStockList[0].code})${this.hotStockList[0].change_rate}，领涨${this.hotStockType === 'rise' ? '两市' : '跌幅榜'}`,
        tag: '实时',
        tagType: 'warning'
      };
      
      this.newsList.unshift(newNews);
      // 最多保留10条
      if (this.newsList.length > 10) {
        this.newsList.pop();
      }
      
      this.$message.success('快讯已更新');
    },
    // 跳转到新闻详情
    goNewsDetail(news) {
      this.$message.info(`查看${news.content.substring(0, 10)}...详情`);
      // 实际项目中跳转到新闻详情页
      // this.$router.push(`/news/${news.id}`);
    },
    // 跳转到股票详情
    goStockDetail(stock) {
      this.$router.push(`/detail/${stock.code}`);
    },
    // 获取市场状态文本
    getMarketStatusText() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 判断当前时间段
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
    // 获取市场状态样式类
    getMarketStatusClass() {
      const status = this.getMarketStatusText();
      return {
        'text-up': status === '交易中',
        'text-neutral': status === '午间休市',
        'text-down': status === '未开盘' || status === '已收盘'
      };
    },
    // 打开工具
    openTool(tool) {
      this.$message.info(`打开${tool.name}工具`);
      // 实际项目中跳转到对应工具页面
      // this.$router.push(`/tools/${tool.id}`);
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

/* 财经快讯样式 */
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
}

.news-item:hover {
  background-color: #f9f9f9;
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

/* 交易提醒样式 */
.trade-reminder {
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
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

/* 工具导航样式 */
.tool-card {
  margin-bottom: 10px;
  border: none;
}

.tool-item {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  gap: 10px;
}

.tool-name {
  font-size: 14px;
  color: #333;
}
</style>