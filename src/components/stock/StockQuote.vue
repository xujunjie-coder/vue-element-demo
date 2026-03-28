<template>
  <el-main class="stock-quote-main">
    <!-- 1. 顶部看板区域 (行情统计内容) -->
    <div class="stats-container">
      <div class="page-header">
        <h2 class="page-title">市场行情大盘 <span class="tag">📊 实时智能看板</span></h2>
        <p class="page-desc">聚合全市场核心指标、指数趋势及实时涨跌分布</p>
        <div class="stats-mode-switch">
          <span class="mode-label">统计口径</span>
          <el-radio-group v-model="statsCalcMode" size="mini">
            <el-radio-button label="page">当前页统计</el-radio-button>
            <el-radio-button label="market">全市场估算</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 7x24小时实时资讯滚动播报 -->
      <div class="news-ticker-container card-container">
        <div class="ticker-label"><i class="el-icon-bell"></i><span class="ticker-label-text"> 7x24 实时快讯：</span></div>
        <div class="ticker-wrapper">
          <ul class="ticker-list" :style="{ transform: `translateY(-${tickerIndex * 30}px)` }">
            <li v-for="(news, index) in newsList" :key="index" class="ticker-item">
              <span class="news-time">{{ formatTickerTime(news) }}</span>
              <a
                class="news-content news-link"
                :class="{ 'news-highlight': news.important }"
                :href="getNewsTarget(news)"
                target="_blank"
                rel="noopener noreferrer"
              >{{ news.content }}</a>
            </li>
          </ul>
        </div>
      </div>

      <!-- 核心统计卡片 -->
      <el-row :gutter="15" class="stats-cards" type="flex" align="stretch">
        <!-- 新增：市场情绪温度计 -->
        <el-col :span="4" class="emotion-col">
          <div class="statistic-item emotion-card">
            <div class="stat-inner">
              <div class="stat-label">市场情绪温度计</div>
              <div class="emotion-meter">
                <el-progress 
                  type="dashboard" 
                  :percentage="marketEmotion" 
                  :color="emotionColors"
                  :width="80"
                  :stroke-width="8">
                  <template #default="{ percentage }">
                    <span class="emotion-value">{{ percentage }}°</span>
                  </template>
                </el-progress>
                <div class="emotion-desc" :style="{ color: currentEmotionColor }">{{ emotionDesc }}</div>
              </div>
            </div>
          </div>
        </el-col>
        
        <!-- 原有统计项稍微调整占宽 -->
        <el-col :span="20" class="overview-wrap-col">
          <el-row :gutter="15" class="overview-row" style="height: 100%;">
            <el-col :span="4" class="overview-item-col" v-for="item in marketOverview" :key="item.label" style="height: 100%;">
              <div class="statistic-item" style="height: 100%; display: flex; align-items: center; justify-content: center;">
                <div class="stat-inner">
                  <div class="stat-value" :class="item.class">{{ item.value }}</div>
                  <div class="stat-label">{{ item.label }}</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-col>
      </el-row>

      <!-- 图表区域 -->
      <el-row :gutter="15" class="chart-row" type="flex">
        <!-- 左侧：三大指数实时走势 -->
        <el-col :span="10" class="chart-col chart-col-index">
          <div class="card-container quote-chart" style="height: 380px;">
            <div class="chart-header">
              <h3 class="chart-title">三大指数实时走势</h3>
              <el-button type="text" icon="el-icon-refresh" @click="fetchIndexData">刷新指数</el-button>
            </div>
            <div ref="quoteChart" style="width: 100%; height: 100%;"></div>
          </div>
        </el-col>
        <!-- 中间：涨跌分布饼图 -->
        <el-col :span="6" class="chart-col chart-col-distribution">
          <div class="card-container distribution-chart" style="height: 380px; padding: 15px; display: flex; flex-direction: column;">
            <h3 class="chart-title">涨跌家数占比</h3>
            <div ref="distributionChart" style="width: 100%; flex: 1;"></div>
          </div>
        </el-col>
        <!-- 右侧：资金流向柱状图 (新增) -->
        <el-col :span="8" class="chart-col chart-col-funds">
          <div class="card-container funds-chart" style="height: 380px; padding: 15px; display: flex; flex-direction: column;">
            <h3 class="chart-title">行业资金热度 (实时估算)</h3>
            <div ref="fundsChart" style="width: 100%; flex: 1;"></div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 2. 行情列表区域 (整合到看板下方) -->
    <div class="quote-list-container">
      <div class="card-container filter-bar">
        <el-row :gutter="10" class="filter-row" type="flex" align="middle">
          <el-col :span="4">
            <h3 class="chart-title" style="margin-bottom: 0;">实时行情列表</h3>
          </el-col>
          <el-col :span="4">
            <el-select v-model="marketType" placeholder="市场类型" size="mini" style="width: 100%;" @change="handleMarketChange">
              <el-option
                v-for="(val, key) in MarketType"
                :key="key"
                :label="MarketTypeLabel[key] || key"
                :value="val"
              ></el-option>
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="sortType" placeholder="排序方式" size="mini" style="width: 100%;" clearable @change="handleSortChange">
              <el-option label="涨跌幅 ↑" value="zd_desc"></el-option>
              <el-option label="涨跌幅 ↓" value="zd_asc"></el-option>
              <el-option label="价格 ↑" value="last_desc"></el-option>
              <el-option label="价格 ↓" value="last_asc"></el-option>
              <el-option label="成交量 ↑" value="vol_desc"></el-option>
              <el-option label="成交量 ↓" value="vol_asc"></el-option>
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索代码/名称"
              prefix-icon="el-icon-search"
              @keyup.enter.native="searchStock"
              size="mini"
            ></el-input>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="searchStock" size="mini" style="width: 100%;" class="search-btn ripple-btn">
              <i class="el-icon-search"></i><span class="search-btn-text">搜索行情</span>
            </el-button>
          </el-col>
        </el-row>
      </div>

      <div class="card-container quote-table">
        <el-table
          :data="quoteList"
          border
          size="mini"
          style="width: 100%; font-size: 12px;"
          v-loading="loading"
          element-loading-text="正在加载行情数据..."
          row-class-name="quote-row-animate"
          :row-key="row => row.code"
        >
          <el-table-column type="index" label="序号" width="56" align="center" header-align="center" />
          <el-table-column prop="code" label="代码" min-width="75" />
          <el-table-column prop="name" label="名称" min-width="60" class-name="name-column">
            <template slot-scope="scope">
              <span class="stock-link" @click="goStockDetail(scope.row)">{{ scope.row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="最新价" min-width="65">
            <template slot-scope="scope">
              <span class="data-text only-price-num">{{ scope.row.price }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="change" label="涨跌额" min-width="65">
            <template slot-scope="scope">
              <span :class="getChangeClass(scope.row.change)">{{ scope.row.change }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="change_rate" label="涨跌幅" min-width="65">
            <template slot-scope="scope">
              <span :class="getChangeClass(scope.row.change)">
                {{ scope.row.change_rate }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="volume" label="成交量" min-width="70" />
          <el-table-column v-if="!hideHighLowColumns" prop="high" label="最高" min-width="58" />
          <el-table-column v-if="!hideHighLowColumns" prop="low" label="最低" min-width="58" />
          <el-table-column label="操作" min-width="115" class-name="operate-column" label-class-name="operate-column">
            <template slot-scope="scope">
              <div class="operate-btns">
                <el-button type="text" @click.stop="goStockDetail(scope.row)" class="operate-btn ripple-btn" size="mini">详情</el-button>
                <el-button type="text" @click.stop="addToOptional(scope.row)" class="operate-btn text-up ripple-btn" size="mini">自选</el-button>
                <el-button type="text" @click.stop="tradeStock(scope.row)" class="operate-btn text-down ripple-btn" size="mini">交易</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页控件：默认 50 条 -->
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="page"
          :page-sizes="[20, 50, 100]"
          :page-size="size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :pager-count="pagerCount"
          size="mini"
          class="stock-pagination"
          style="margin-top: 10px; text-align: right; font-size: 12px;"
        />
      </div>
    </div>
  </el-main>
</template>

<script>
import { mapActions } from 'vuex';
import * as echarts from 'echarts';
import request from '../../utils/request';
import { stripStockPrefix } from '../../utils/request';
import { MarketType, MarketTypeLabel } from '../../utils/constants';
import { getChangeClass, formatPrice, formatChangeRate, formatVolume } from '../../utils/format';
import { throttle } from '../../utils/tool';

export default {
  name: 'StockQuote',
  data() {
    return {
      MarketType,
      MarketTypeLabel,
      // 筛选条件
      marketType: 'ZhA', // 默认沪深京A股
      sortType: '',
      searchKeyword: '',
      // 分页参数（服务端分页，/spot/sina 支持 page/size）
      page: 1,
      size: 50, // 默认 50 条每页
      total: 0,
      totalPages: 0,
      // 行情数据（服务端分页，仅保留当前页数据）
      quoteList: [],    // 当前页展示数据
      _searchAllData: [], // 搜索/板块筛选时缓存全量映射数据，用于客户端分页
      loading: false,
      // 图表实例
      chartInstance: null,
      // 自动刷新定时器
      refreshTimer: null,
      chartRefreshTimer: null,
      // 窗口宽度（用于响应式分页）
      windowWidth: window.innerWidth,
      // 涨跌分布图表实例
      distChartInstance: null,
      // 资金流向图表实例
      fundsChartInstance: null,
      fundsChartData: [],
      // 全市场统计数据（独立于分页列表）
      marketStats: {
        up: 0,
        down: 0,
        flat: 0,
        amount: 0,
        limitUp: 0,
        limitDown: 0
      },
      // 行情统计口径：page=当前页统计，market=全市场估算
      statsCalcMode: 'market',
      // 资讯滚动播报数据
      tickerIndex: 0,
      tickerInterval: null,
      newsList: [
        { minutesAgo: 2, content: '【盘中异动】半导体板块震荡走强，多股涨超5%', important: true },
        { minutesAgo: 6, content: '北向资金净流入超30亿元', important: false },
        { minutesAgo: 11, content: '央行开展2000亿元逆回购操作', important: false },
        { minutesAgo: 19, content: '新能源汽车板块开盘活跃', important: false },
        { minutesAgo: 27, content: '三大指数集体高开，沪指涨0.23%', important: true }
      ],
      // 市场情绪仪表盘颜色配置
      emotionColors: [
        {color: '#67c23a', percentage: 20}, // 冰点 (绿)
        {color: '#e6a23c', percentage: 40}, // 恐慌 (橙)
        {color: '#f56c6c', percentage: 60}, // 震荡 (红)
        {color: '#f01818', percentage: 80}, // 活跃 (深红)
        {color: '#b30000', percentage: 100} // 贪婪 (暗红)
      ]
    };
  },
  computed: {
    /** 判断是否为统计模式 */
    isStatsMode() {
      // 首页现在统一展示统计内容，保留此逻辑用于其他可能的扩展
      return true;
    },
    /** 图表文字颜色（自适应主题） */
    chartTextColor() {
      return this.$store.state.theme === 'light' ? '#666666' : '#ffffff';
    },
    /** 图表引导线颜色（自适应主题） */
    chartLineColor() {
      return this.$store.state.theme === 'light' ? '#999999' : '#e0e0e0';
    },
    /** 计算市场情绪值 (基于涨跌比和涨停数) */
    marketEmotion() {
      const { up, down, flat, limitUp } = this.marketStats;
      const total = up + down + flat;
      if (total === 0) return 50; // 默认中性
      
      // 基础情绪分：上涨比例 (占比 70%)
      const upRatioScore = (up / total) * 100 * 0.7;
      
      // 活跃度加分：涨停家数 (占比 30%，假设100家涨停算满分30)
      const limitScore = Math.min(limitUp / 100 * 30, 30);
      
      return Math.min(Math.round(upRatioScore + limitScore), 100);
    },
    /** 市场情绪文字描述 */
    emotionDesc() {
      const val = this.marketEmotion;
      if (val <= 20) return '市场冰点';
      if (val <= 40) return '恐慌观望';
      if (val <= 60) return '震荡分化';
      if (val <= 80) return '交投活跃';
      return '极度贪婪';
    },
    /** 当前情绪主色调 */
    currentEmotionColor() {
      const val = this.marketEmotion;
      if (val <= 20) return '#67c23a';
      if (val <= 40) return '#e6a23c';
      if (val <= 60) return '#f56c6c';
      if (val <= 80) return '#f01818';
      return '#b30000';
    },
    /** 市场概览汇总数据 */
    marketOverview() {
      // 优先使用全量统计数据
      const { up, down, flat, limitUp, limitDown } = this.marketStats;
      const total = up + down + flat;
      const limitRatio = total > 0 ? ((limitUp + limitDown) / total * 100).toFixed(1) : '0.0';
      
      return [
        { label: '上涨家数', value: up, class: 'text-up', sub: '家' },
        { label: '下跌家数', value: down, class: 'text-down', sub: '家' },
        { label: '平盘家数', value: flat, class: 'text-neutral', sub: '家' },
        { label: '涨停家数', value: limitUp, class: 'text-up bold', sub: '家' },
        { label: '跌停家数', value: limitDown, class: 'text-down bold', sub: '家' },
        { label: '涨跌停比例', value: limitRatio + '%', class: 'text-primary', sub: '比例' }
      ];
    },
    /** 根据屏幕宽度动态调整显示的页码数量，避免分页溢出 */
    pagerCount() {
      // Element UI 要求 pager-count 最小为 5，且通常使用奇数。
      if (this.windowWidth < 500) return 5;
      if (this.windowWidth < 700) return 5;
      return 7;
    },
    hideHighLowColumns() {
      return this.windowWidth <= 887;
    }
  },
  mounted() {
    window.addEventListener('resize', this._handlePagerResize = () => {
      this.windowWidth = window.innerWidth;
    });
    const q = this.$route && this.$route.query ? this.$route.query : {};
    const hasRouteFilter = !!(q.market || q.sector || q.concept || q.name);

    if (hasRouteFilter) {
      // 有路由筛选参数时，由 applyRouteFilter 统一处理，避免双重请求
      this.applyRouteFilter();
    } else {
      // 无筛选参数时，直接加载第一页数据
      this.fetchQuoteList({ useCacheFallback: false });
    }

    // 初始化图表（延迟加载，优先表格数据）
    this.$nextTick(() => {
      this.initQuoteChart();
      if (this.isStatsMode) {
        this.initDistributionChart();
        this.initFundsChart();
      }
      // 获取全量统计数据（优先）
      this.fetchMarketOverview();
      // 获取指数真实数据
      setTimeout(() => { this.fetchIndexData(); }, 500);
    });
    // 设置自动刷新
    this.refreshTimer = setInterval(throttle(() => {
      this.fetchQuoteList({ useCacheFallback: true, silent: true });
      this.fetchMarketOverview(); // 同步刷新全量统计
      this.fetchFundsFlowData();
    }), 120000);
    // 指数图表每2分钟刷新
    this.chartRefreshTimer = setInterval(() => { this.fetchIndexData(); }, 120000);
    // 启动资讯滚动
    this.startTicker();
  },
  beforeDestroy() {
    clearInterval(this.refreshTimer);
    clearInterval(this.chartRefreshTimer);
    clearInterval(this.tickerInterval);
    window.removeEventListener('resize', this._chartResizeHandler);
    if (this.chartInstance && !this.chartInstance.isDisposed()) {
      this.chartInstance.dispose();
    }
    if (this.distChartInstance && !this.distChartInstance.isDisposed()) {
      this.distChartInstance.dispose();
    }
    if (this.fundsChartInstance && !this.fundsChartInstance.isDisposed()) {
      this.fundsChartInstance.dispose();
    }
    this.chartInstance = null;
    this.distChartInstance = null;
    this.fundsChartInstance = null;
    window.removeEventListener('resize', this._handlePagerResize);
  },
  watch: {
    '$store.state.theme': function() {
      // 主题切换时重新渲染图表以更新颜色
      this.$nextTick(() => {
        this.initQuoteChart();
        this.initDistributionChart();
        this.updateDistributionData();
        this.initFundsChart();
        this.fetchFundsFlowData();
        this.fetchIndexData();
      });
    },
    '$route.query': {
      handler() {
        this.applyRouteFilter();
      },
      deep: true
    },
    statsCalcMode(val) {
      if (val === 'page') {
        this.updateMarketStatsFromQuoteList();
      } else {
        this.fetchMarketOverview();
      }
    }
  },
  methods: {
    ...mapActions(['addOptionalStock']),
    getChangeClass,

    isChartAlive(instance) {
      return !!(instance && !(typeof instance.isDisposed === 'function' && instance.isDisposed()));
    },

    /**
     * 后端字段 → 前端字段映射
     * 后端 /spot/sina 返回: { code, name, last, zd, ud, vol, amount, hod, lod, open, close, hsr, per, pbr, tmc, ffmcap, symbol, ... }
     * 前端显示需要: code, name, price, change, change_rate, volume, high, low
     */
    mapSpotItem(item) {
      return {
        ...item,
        code: item.code || '',
        name: item.name || '',
        price: formatPrice(item.last),
        change: formatPrice(item.ud),
        change_rate: formatChangeRate(item.zd),
        volume: formatVolume(item.vol),
        high: formatPrice(item.hod),
        low: formatPrice(item.lod),
        _last: Number(item.last) || 0,
        _ud: Number(item.ud) || 0,
        _zd: Number(item.zd) || 0,
        _vol: Number(item.vol) || 0
      };
    },

    normalizeZdPercent(raw) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return 0;
      // 有的后端返回小数(0.0239)，有的返回百分比(2.39)
      return Math.abs(n) <= 1 ? n * 100 : n;
    },

    calcMarketStatsByList(list = [], ratio = 1) {
      let up = 0;
      let down = 0;
      let flat = 0;
      let amount = 0;
      let limitUp = 0;
      let limitDown = 0;

      list.forEach((item) => {
        const zdRaw = item && (item._zd != null ? item._zd : item.zd);
        const zd = this.normalizeZdPercent(zdRaw);
        const amt = Number(item && item.amount) || 0;
        amount += amt;

        if (zd > 0) {
          up++;
          if (zd >= 9.9) limitUp++;
        } else if (zd < 0) {
          down++;
          if (zd <= -9.9) limitDown++;
        } else {
          flat++;
        }
      });

      return {
        up: Math.round(up * ratio),
        down: Math.round(down * ratio),
        flat: Math.round(flat * ratio),
        amount: amount * ratio,
        limitUp: Math.round(limitUp * ratio),
        limitDown: Math.round(limitDown * ratio)
      };
    },

    updateMarketStatsFromQuoteList() {
      const list = Array.isArray(this.quoteList) ? this.quoteList : [];
      this.marketStats = this.calcMarketStatsByList(list, 1);
      this.updateDistributionData();
    },

    // 初始化涨跌分布图表
    initDistributionChart() {
      if (!this.$refs.distributionChart) return;
      this.distChartInstance = echarts.init(this.$refs.distributionChart);
      this.distChartInstance.setOption(this.getDistributionChartOption());
    },

    getDistributionSeriesData() {
      const { up, down, flat, limitUp, limitDown } = this.marketStats;
      return [
        { value: limitUp, name: '涨停', itemStyle: { color: '#f56c6c' } },
        { value: up, name: '上涨', itemStyle: { color: '#f7b267' } },
        { value: flat, name: '平盘', itemStyle: { color: '#909399' } },
        { value: down, name: '下跌', itemStyle: { color: '#7cc6fe' } },
        { value: limitDown, name: '跌停', itemStyle: { color: '#409eff' } }
      ];
    },

    getDistributionChartOption() {
      const chartWidth = this.$refs.distributionChart ? this.$refs.distributionChart.clientWidth : 320;
      const compactMode = chartWidth < 360;
      const data = this.getDistributionSeriesData();
      const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
      const upDownRatioBase = this.marketStats.down > 0
        ? (this.marketStats.up / this.marketStats.down).toFixed(2)
        : (this.marketStats.up > 0 ? '∞' : '0.00');
      const upDownRatio = `${upDownRatioBase}:1`;

      return {
        animationDuration: 500,
        tooltip: {
          trigger: 'item',
          formatter: ({ name, value, percent }) => `${name}<br/>${value}家，占比 ${percent}%`
        },
        legend: {
          bottom: 0,
          left: 'center',
          itemWidth: 10,
          itemHeight: 10,
          itemGap: compactMode ? 10 : 14,
          textStyle: {
            color: this.chartTextColor,
            fontSize: compactMode ? 10 : 11
          },
          selectedMode: false,
          formatter: (name) => {
            const item = data.find(entry => entry.name === name);
            return `${name} ${item ? item.value : 0}家`;
          },
          data: data.map(item => item.name)
        },
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: compactMode ? '34%' : '33%',
            style: {
              text: '涨跌比',
              textAlign: 'center',
              fill: this.chartTextColor,
              fontSize: compactMode ? 11 : 12,
              fontWeight: 500,
              opacity: 0.72
            }
          },
          {
            type: 'text',
            left: 'center',
            top: compactMode ? '42%' : '41%',
            style: {
              text: upDownRatio,
              textAlign: 'center',
              fill: this.chartTextColor,
              fontSize: compactMode ? 18 : 24,
              fontWeight: 700
            }
          },
          {
            type: 'text',
            left: 'center',
            top: compactMode ? '52%' : '51%',
            style: {
              text: `总计 ${total} 家`,
              textAlign: 'center',
              fill: this.chartTextColor,
              fontSize: compactMode ? 10 : 11,
              opacity: 0.68
            }
          }
        ],
        series: [{
          name: '涨跌分布',
          type: 'pie',
          radius: compactMode ? ['48%', '67%'] : ['50%', '70%'],
          center: ['50%', compactMode ? '38%' : '40%'],
          avoidLabelOverlap: true,
          minAngle: total > 0 ? 2 : 0,
          itemStyle: {
            borderRadius: 10,
            borderColor: this.$store.state.theme === 'light' ? '#ffffff' : '#35558a',
            borderWidth: 2
          },
          emphasis: {
            scale: true,
            scaleSize: 6
          },
          label: {
            show: false
          },
          labelLine: {
            show: false
          },
          data
        }]
      };
    },

    /**
     * 更新涨跌分布数据 (改用全量统计数据)
     */
    updateDistributionData() {
      if (!this.isChartAlive(this.distChartInstance)) return;
      this.distChartInstance.setOption(this.getDistributionChartOption(), true);
    },
    // 初始化资金热度柱状图
    initFundsChart() {
      if (!this.$refs.fundsChart) return;
      const existing = echarts.getInstanceByDom(this.$refs.fundsChart);
      if (existing) existing.dispose();
      this.fundsChartInstance = echarts.init(this.$refs.fundsChart);
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: function (params) {
            const tar = params[0];
            return `${tar.name}<br/>资金热度: ${tar.value > 0 ? '+' : ''}${tar.value} 亿元`;
          }
        },
        grid: {
          left: '3%',
          right: '8%',
          bottom: '3%',
          top: '5%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          position: 'top',
          splitLine: {
            lineStyle: { type: 'dashed', color: this.chartLineColor, opacity: 0.3 }
          },
          axisLabel: { color: this.chartTextColor, fontSize: 10 }
        },
        yAxis: {
          type: 'category',
          axisLine: { show: false },
          axisLabel: { color: this.chartTextColor, fontSize: 11 },
          axisTick: { show: false },
          splitLine: { show: false },
          data: []
        },
        series: [
          {
            name: '资金热度',
            type: 'bar',
            data: [],
            label: {
              show: true,
              position: 'right',
              formatter: '{c}',
              fontSize: 10,
              color: this.chartTextColor
            },
            barWidth: '50%'
          }
        ]
      };
      
      this.fundsChartInstance.setOption(option);
      this.fetchFundsFlowData();
    },

    async fetchFundsFlowData() {
      if (!this.isChartAlive(this.fundsChartInstance)) return;
      if (this._fundsFetching) return;
      this._fundsFetching = true;

      const sectorConfigs = [
        { name: '半导体', keywords: ['半导体', '芯片', '集成电路'] },
        { name: '软件开发', keywords: ['软件', '信息', 'IT服务'] },
        { name: '医疗器械', keywords: ['医疗', '医药', '生物'] },
        { name: '白酒', keywords: ['白酒', '酒'] },
        { name: '房地产', keywords: ['地产', '房地产'] },
        { name: '银行', keywords: ['银行'] }
      ];

      try {
        // 使用有限分页扩大样本，同时保持请求量可控，避免代理超时
        let spotList = [];
        try {
          const pageRes = await Promise.all([
            request.getSpotSina({ stock_type: 'ZhA', page: 1, size: 100, sort: 'amount', order: 'desc' }),
            request.getSpotSina({ stock_type: 'ZhA', page: 2, size: 100, sort: 'amount', order: 'desc' }),
            request.getSpotSina({ stock_type: 'ZhA', page: 3, size: 100, sort: 'amount', order: 'desc' })
          ]);
          const merged = pageRes.flatMap(res => (res && res.data && Array.isArray(res.data.list)) ? res.data.list : []);
          const seen = new Set();
          spotList = merged.filter(item => {
            const code = String(item.code || '');
            if (!code || seen.has(code)) return false;
            seen.add(code);
            return true;
          });
        } catch (e) {
          const fallbackRes = await request.getSpot('ZhA').catch(() => request.getSpot('ShA'));
          spotList = Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
        }

        const results = sectorConfigs.map((sector) => {
          const samples = spotList.filter(item => {
            const n = String(item.name || '');
            return sector.keywords.some(keyword => n.includes(keyword));
          });

          const heatValue = samples.reduce((sum, item) => {
            const amount = Number(item.amount) || 0;
            const zd = Number(item.zd) || 0;
            const direction = zd >= 0 ? 1 : -1;
            return sum + (amount * direction);
          }, 0);

          return {
            name: sector.name,
            value: Number((heatValue / 100000000).toFixed(2))
          };
        });

        const sorted = results.sort((a, b) => a.value - b.value);
        if (!this.isChartAlive(this.fundsChartInstance)) return;
        this.fundsChartData = sorted;
        this.fundsChartInstance.setOption({
          yAxis: {
            data: sorted.map(item => item.name)
          },
          series: [{
            data: sorted.map(item => ({
              value: item.value,
              itemStyle: {
                color: item.value >= 0 ? '#f56c6c' : '#67c23a',
                borderRadius: item.value >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]
              }
            }))
          }]
        });
      } catch (err) {
        console.warn('fetchFundsFlowData error:', err);
      } finally {
        this._fundsFetching = false;
      }
    },
    /**
     * 独立获取全市场概览数据（不依赖分页列表）
     * 复用 RightAside.vue 的逻辑，请求大样本数据进行统计
     */
    async fetchMarketOverview() {
      try {
        if (this.statsCalcMode === 'page') {
          this.updateMarketStatsFromQuoteList();
          return;
        }

        // 与列表统一口径：使用当前市场 marketType 的 /spot/sina 数据计算。
        const stockType = this.marketType || 'ZhA';
        const pageSize = 100;
        const samplePages = 8;
        const pageReqs = [];
        for (let p = 1; p <= samplePages; p++) {
          pageReqs.push(
            request.getSpotSina({
              stock_type: stockType,
              page: p,
              size: pageSize,
              // 部分后端环境不支持 code 排序，使用更稳妥的 amount 排序避免全量失败为 0。
              sort: 'amount',
              order: 'desc',
              _silent: true
            }).catch(() => null)
          );
        }

        const results = await Promise.all(pageReqs);
        const merged = [];
        let apiTotal = 0;
        results.forEach((res) => {
          if (!res || !res.data) return;
          const d = res.data;
          const list = Array.isArray(d.list) ? d.list : [];
          if (Number(d.total) > 0) apiTotal = Number(d.total);
          merged.push(...list);
        });

        const seen = new Set();
        let list = merged.filter((item, idx) => {
          const code = String(item && item.code ? item.code : '').trim();
          const key = code || `__no_code_${idx}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // 分页样本异常时兜底，避免统计区全部显示 0。
        if (!list.length) {
          const fallbackRes = await request.getSpot(stockType).catch(() => ({ data: [] }));
          const fallbackList = Array.isArray(fallbackRes && fallbackRes.data) ? fallbackRes.data : [];
          const fallbackSeen = new Set();
          list = fallbackList.filter((item, idx) => {
            const code = String(item && item.code ? item.code : '').trim();
            const key = code || `__fallback_no_code_${idx}`;
            if (fallbackSeen.has(key)) return false;
            fallbackSeen.add(key);
            return true;
          });
        }

        const sampleCount = Math.max(list.length, 1);
        const total = Math.max(apiTotal || sampleCount, sampleCount);
        const ratio = total / sampleCount;

        this.marketStats = this.calcMarketStatsByList(list, ratio);
        this.$store.commit('SET_MARKET_OVERVIEW_STATS', {
          ...this.marketStats,
          source: 'market'
        });
        
        // 更新分布图表
        this.updateDistributionData();
      } catch (err) {
        console.warn('fetchMarketOverview error (Silenced):', err);
      }
    },
    /**
     * 获取行情列表（调用后端 /spot/sina 分页接口）
     */
    async fetchQuoteList(options = { useCacheFallback: false, silent: false }) {
      if (this._fetching) return;
      this._fetching = true;

      if (!options.silent) {
        this.loading = true;
      }

      try {
        let rawList = [];
        let total = 0;
        let totalPages = 0;

        // 如果有搜索关键词，使用 /spot/search 搜索接口
        if (this.searchKeyword) {
          // ... 原有搜索逻辑 ...
          if (!this._searchAllData || this._searchAllData.length === 0 || this._lastSearchKeyword !== this.searchKeyword) {
            this._lastSearchKeyword = this.searchKeyword;
            const searchRes = await request.searchStock(this.searchKeyword, 50);
            let searchList = searchRes.data || [];
            
            // 搜索结果去重：根据股票代码去重，保留第一个
            const uniqueMap = new Map();
            searchList.forEach(item => {
              const code = String(item.code);
              if (!uniqueMap.has(code)) {
                uniqueMap.set(code, item);
              }
            });
            searchList = Array.from(uniqueMap.values());

            if (searchList.length > 0) {
              const batchData = await request.getStockLastBatch(searchList.map(s => s.code));
              rawList = searchList.map((s, i) => {
                const detail = batchData[i] || {};
                const last = Number(detail.last) || 0;
                const close = Number(detail.close) || 0;
                const ud = last - close;
                const zd = close > 0 ? (ud / close * 100) : 0;
                return {
                  code: s.code,
                  name: s.name || detail.name || '',
                  last: last,
                  ud: ud,
                  zd: zd,
                  vol: detail.vol || 0,
                  amount: detail.amount || 0,
                  hod: detail.hod || 0,
                  lod: detail.lod || 0,
                  open: detail.open || 0,
                  close: close
                };
              });
              this._searchAllData = rawList.map(item => this.mapSpotItem(item));
            } else {
              this._searchAllData = [];
            }
          }
          total = this._searchAllData.length;
          totalPages = Math.ceil(total / this.size);
          const start = (this.page - 1) * this.size;
          let slicedData = this._searchAllData;
          if (this.sortType) {
            const sortMap = {
              zd_desc: (a, b) => b._zd - a._zd,
              zd_asc: (a, b) => a._zd - b._zd,
              last_desc: (a, b) => b._last - a._last,
              last_asc: (a, b) => a._last - b._last,
              vol_desc: (a, b) => b._vol - a._vol,
              vol_asc: (a, b) => a._vol - b._vol,
              amount_desc: (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
              amount_asc: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0)
            };
            if (sortMap[this.sortType]) {
              slicedData = [...this._searchAllData].sort(sortMap[this.sortType]);
            }
          }
          this.quoteList = slicedData.slice(start, start + this.size);
          this.total = total;
          this.totalPages = totalPages;
          if (this.statsCalcMode === 'page') {
            this.updateMarketStatsFromQuoteList();
          }
          this.loading = false;
          this._fetching = false;
          if (this.isStatsMode) this.updateDistributionData();
          return;
        } else {
          this._searchAllData = [];
          // 正常分页查询：使用 /spot/sina 接口
          const baseParams = {
            stock_type: this.marketType,
            size: this.size
          };

          // 将前端 sortType（如 "zd_desc"）拆分为后端 sort + order 参数

          if (this.sortType) {
            const parts = this.sortType.split('_');
            const dir = parts.pop();
            const field = parts.join('_');
            baseParams.sort = field;
            baseParams.order = dir;
          }

          // 后端在高并发或源站异常时可能返回较多重复 code。
          // 仅本页去重会导致“50条/页实际只显示几条”，因此向后补页以尽量填满当前页。
          const uniqueMap = new Map();
          const pulledList = [];
          let pageCursor = this.page;
          let pullCount = 0;
          // ShA 在部分时段会出现重复 code 较多，适当增加补页上限以尽量凑满当前页。
          const maxPullPages = Math.min(30, Math.max(10, Math.ceil(this.size / 10) * 6));

          while (pullCount < maxPullPages && uniqueMap.size < this.size) {
            const res = await request.getSpotSina({
              ...baseParams,
              page: pageCursor
            });
            const resData = res.data || {};
            const pageList = Array.isArray(resData.list) ? resData.list : [];
            pulledList.push(...pageList);

            total = Number(resData.total) || total;
            totalPages = Number(resData.pages) || totalPages;

            pageList.forEach((item, idx) => {
              const code = String(item && item.code ? item.code : '').trim();
              // 无 code 的异常项也保留，避免被直接丢弃造成页内条目过少
              const key = code || `__no_code_${pageCursor}_${idx}`;
              if (!uniqueMap.has(key)) uniqueMap.set(key, item);
            });

            if (!pageList.length) break;
            if (!totalPages || pageCursor >= totalPages) break;

            pageCursor += 1;
            pullCount += 1;
          }

          rawList = Array.from(uniqueMap.values()).slice(0, this.size);

          // 若去重后仍不足 size，则回填原始拉取数据，优先保证“每页展示条数”体验。
          if (rawList.length < this.size && pulledList.length > rawList.length) {
            const need = this.size - rawList.length;
            rawList = rawList.concat(pulledList.slice(0, need));
          }
        }

        // 常规场景做一次去重；若已经不足一页，则保留回填数据，不再继续去重避免条数再次下降。
        if (rawList.length >= this.size) {
          const seenCodes = new Set();
          rawList = rawList.filter((item) => {
            const code = String(item && item.code ? item.code : '').trim();
            if (!code) return true;
            if (seenCodes.has(code)) return false;
            seenCodes.add(code);
            return true;
          });
        }

        let mapped = rawList.map(item => this.mapSpotItem(item));
        if (this.sortType) {
          const sortMap = {
            zd_desc: (a, b) => b._zd - a._zd,
            zd_asc: (a, b) => a._zd - b._zd,
            last_desc: (a, b) => b._last - a._last,
            last_asc: (a, b) => a._last - b._last,
            vol_desc: (a, b) => b._vol - a._vol,
            vol_asc: (a, b) => a._vol - b._vol,
            amount_desc: (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
            amount_asc: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0)
          };
          if (sortMap[this.sortType]) mapped.sort(sortMap[this.sortType]);
        }

        this.quoteList = mapped;
        this.total = total;
        this.totalPages = totalPages;
        if (this.statsCalcMode === 'page') {
          this.updateMarketStatsFromQuoteList();
        }
        if (this.isStatsMode) this.updateDistributionData();
      } catch (err) {
        console.warn('fetchQuoteList error (Silenced):', err);
      } finally {
        this.loading = false;
        this._fetching = false;
      }
    },
    // 初始化行情图表
    initQuoteChart() {
      if (!this.$refs.quoteChart) return;
      const existing = echarts.getInstanceByDom(this.$refs.quoteChart);
      if (existing) existing.dispose();
      this.chartInstance = echarts.init(this.$refs.quoteChart);

      const option = {
        animation: true,
        animationDuration: 600,
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(30,30,30,0.92)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: [10, 14],
          textStyle: { color: '#eee', fontSize: 12 },
          axisPointer: {
            type: 'cross',
            crossStyle: { color: '#aaa' },
            lineStyle: { color: '#aaa', type: 'dashed' },
            label: { backgroundColor: 'rgba(50,50,50,0.85)', fontSize: 10 }
          },
          formatter: (params) => {
            if (!params || !params.length) return '';
            let html = `<div style="font-weight:600;margin-bottom:6px;color:#fff">${params[0].axisValue}</div>`;
            params.forEach(p => {
              const val = Number(p.data);
              if (isNaN(val)) return;
              html += `<div style="line-height:1.8">${p.marker} <span style="color:#ccc">${p.seriesName}</span> <b style="float:right;margin-left:16px">${val.toFixed(2)}</b></div>`;
            });
            return html;
          }
        },
        legend: {
          data: ['上证指数', '深证成指', '创业板指'],
          top: 2, left: 'center',
          textStyle: { fontSize: 11, color: this.chartTextColor },
          itemWidth: 16, itemHeight: 3, itemGap: 20
        },
        grid: {
          left: '1%', right: '1%', top: 32, bottom: 30,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: [],
          axisLine: { lineStyle: { color: this.chartLineColor } },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 10, color: this.chartTextColor,
            formatter: (val) => {
              if (val && val.includes(' ')) return val.split(' ')[1].substring(0, 5);
              return val;
            }
          },
          splitLine: { show: false }
        },
        yAxis: [
          {
            type: 'value', position: 'left', scale: true,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { fontSize: 10, color: this.chartTextColor },
            splitLine: { lineStyle: { color: this.chartLineColor, type: 'dashed', opacity: 0.3 } },
            splitNumber: 4
          },
          {
            type: 'value', position: 'right', scale: true,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { fontSize: 10, color: this.chartTextColor },
            splitLine: { show: false },
            splitNumber: 4
          }
        ],
        series: [
          {
            name: '上证指数', type: 'line', yAxisIndex: 0, data: [], symbol: 'none', smooth: true,
            lineStyle: { width: 2, color: '#e53935' },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(229,57,53,0.25)' }, { offset: 1, color: 'rgba(229,57,53,0.02)' }
            ]) },
            itemStyle: { color: '#e53935' }
          },
          {
            name: '深证成指', type: 'line', yAxisIndex: 1, data: [], symbol: 'none', smooth: true,
            lineStyle: { width: 2, color: '#1565c0' },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(21,101,192,0.20)' }, { offset: 1, color: 'rgba(21,101,192,0.02)' }
            ]) },
            itemStyle: { color: '#1565c0' }
          },
          {
            name: '创业板指', type: 'line', yAxisIndex: 1, data: [], symbol: 'none', smooth: true,
            lineStyle: { width: 2, color: '#ff9800' },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255,152,0,0.18)' }, { offset: 1, color: 'rgba(255,152,0,0.02)' }
            ]) },
            itemStyle: { color: '#ff9800' }
          }
        ]
      };

      this.chartInstance.setOption(option);
      window.removeEventListener('resize', this._chartResizeHandler);
      this._chartResizeHandler = () => {
        if (this.isChartAlive(this.chartInstance)) this.chartInstance.resize();
        if (this.isChartAlive(this.distChartInstance)) this.distChartInstance.resize();
        if (this.isChartAlive(this.fundsChartInstance)) this.fundsChartInstance.resize();
        if (this.isChartAlive(this.distChartInstance)) {
          this.updateDistributionData();
        }
      };
      window.addEventListener('resize', this._chartResizeHandler);
    },
    /**
     * 获取三大指数的真实分钟级数据并更新图表
     * 上证指数 sh000001 / 深证成指 sz399001 / 创业板指 sz399006
     */
    async fetchIndexData() {
      if (!this.isChartAlive(this.chartInstance)) return;

      const indexes = [
        { code: 'sh000001', name: '上证指数' },
        { code: 'sz399001', name: '深证成指' },
        { code: 'sz399006', name: '创业板指' }
      ];

      try {
        // 并行请求三大指数的分钟数据
        const results = await Promise.all(
          indexes.map(idx =>
            request.getMinuteHistory({ code: idx.code, scale: 60, datalen: 48 })
              .then(res => ({ name: idx.name, data: res.data || [] }))
              .catch(() => ({ name: idx.name, data: [] }))
          )
        );

        // 取最长的时间轴
        let dates = [];
        results.forEach(r => {
          if (r.data.length > dates.length) {
            dates = r.data.map(item => item.day || '');
          }
        });

        const seriesData = {};
        results.forEach(r => {
          seriesData[r.name] = r.data.map(item => Number(item.close) || null);
        });

        if (!this.isChartAlive(this.chartInstance)) return;
        this.chartInstance.setOption({
          xAxis: { data: dates },
          series: indexes.map(idx => ({
            name: idx.name,
            data: seriesData[idx.name] || []
          }))
        });
      } catch (err) {
        console.warn('fetchIndexData error:', err);
      }
    },
    // 搜索股票（调用后端 /spot/search 接口）
    searchStock() {
      this.page = 1;
      this._searchAllData = []; // 清空缓存，强制重新搜索
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
    },
    // 切换市场类型
    handleMarketChange() {
      this.page = 1;
      this.searchKeyword = '';
      this._searchAllData = [];
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
      this.fetchMarketOverview();
    },
    // 切换排序方式
    handleSortChange() {
      this.page = 1;
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
    },
    // 根据路由 query 应用筛选条件并刷新列表
    applyRouteFilter() {
      const q = this.$route && this.$route.query ? this.$route.query : {};
      // 没有任何筛选参数时不做额外操作
      if (!q.market && !q.sector && !q.concept && !q.name && !q.type) return;

      // 1. 市场类型筛选（上证/深证/创业板/科创板等）
      if (q.market) {
        this.marketType = q.market;
        this.searchKeyword = '';
        this.page = 1;
        this.fetchQuoteList({ useCacheFallback: false, silent: false });
        if (q.name) this.$message.info(`已切换到：${q.name}`);
        return;
      }

      // 2. 板块分类筛选（使用搜索关键词）
      if (q.sector) {
        const sectorKeywords = {
          finance: '银行',
          technology: '科技',
          consumption: '食品',
          new_energy: '新能源'
        };
        this.searchKeyword = sectorKeywords[q.sector] || '';
        this.marketType = 'ZhA';
        this.page = 1;
        this.fetchQuoteList({ useCacheFallback: false, silent: false });
        if (q.name) this.$message.info(`已筛选：${q.name}`);
        return;
      }

      // 3. 概念分类筛选（使用搜索关键词）
      if (q.concept) {
        const conceptKeywords = {
          ai: '智能',
          digital_economy: '数字',
          carbon_neutral: '环保',
          biomed: '医药'
        };
        this.searchKeyword = conceptKeywords[q.concept] || '';
        this.marketType = 'ZhA';
        this.page = 1;
        this.fetchQuoteList({ useCacheFallback: false, silent: false });
        if (q.name) this.$message.info(`已筛选：${q.name}`);
        return;
      }

      // 4. 纯名称搜索
      if (q.name) {
        this.searchKeyword = q.name;
        this.page = 1;
        this.fetchQuoteList({ useCacheFallback: false, silent: false });
        this.$message.info(`已按【${q.name}】筛选`);
      }
    },
    // 刷新行情
    refreshQuote() {
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
      this.$message.success('行情数据已刷新');
    },
    // 跳转到个股详情
    goStockDetail(row) {
      this.$router.push(`/detail/${row.code}`);
    },
    // 添加到自选股
    addToOptional(row) {
      // 判断是否已存在于自选股
      const exists = this.$store.state.optionalStocks.some(s => s.code === row.code);
      if (exists) {
        this.$message.warning(`${row.name} 已在自选股中`);
        // 触发侧边栏闪光动画
        this.$root.$emit('flash-optional-stock', row.code);
        return;
      }
      this.addOptionalStock({
        code: row.code,
        name: row.name,
        price: row.price,
        change: row.change
      });
      this.$message.success(`已将 ${row.name} 添加到自选股`);
    },
    // 跳转到交易页面
    tradeStock(row) {
      this.$router.push({
        path: '/trade',
        query: { code: stripStockPrefix(row.code), name: row.name, price: row.price }
      });
    },
    // 分页大小改变
    handleSizeChange(val) {
      this.size = val;
      this.page = 1;
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
      if (this.statsCalcMode === 'market') this.fetchMarketOverview();
    },
    // 当前页改变
    handleCurrentChange(val) {
      this.page = val;
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
      if (this.statsCalcMode === 'market') this.fetchMarketOverview();
    },
    // 启动资讯滚动动画
    startTicker() {
      this.tickerInterval = setInterval(() => {
        this.tickerIndex++;
        if (this.tickerIndex >= this.newsList.length) {
          // 无缝回到第一个
          setTimeout(() => {
            this.tickerIndex = 0;
            // 可以通过 ref 临时关闭 transition 来实现无缝，这里简化处理
          }, 500);
        }
      }, 3000); // 每3秒滚动一次
    },
    getNewsTarget(news) {
      if (news && news.url) return news.url;
      if (news && news.link) return news.link;
      return this.buildEastmoneySearchUrl((news && news.content) || '');
    },
    buildEastmoneySearchUrl(content) {
      const keyword = this.extractNewsKeyword(content);
      return `https://so.eastmoney.com/web/s?keyword=${encodeURIComponent(keyword)}`;
    },
    formatTickerTime(news) {
      const n = Number(news && news.minutesAgo);
      if (!isNaN(n) && n >= 0) {
        if (n === 0) return '刚刚';
        if (n < 60) return `${n}分钟前`;
        return `${Math.floor(n / 60)}小时前`;
      }
      return (news && news.time) || '刚刚';
    },
    extractNewsKeyword(content) {
      const text = String(content || '').replace(/\s+/g, ' ').trim();
      const noPrefix = text.replace(/^【[^】]+】/, '').trim();
      return noPrefix.slice(0, 24) || 'A股 快讯';
    }
  }
};
</script>

<style scoped>
/* 主容器样式 */
.stock-quote-main {
  padding: var(--spacing-xs, 8px);
  background: transparent;
}

.filter-bar {
  margin-bottom: 10px;
  padding: 8px 10px;
}
.quote-table {
  margin-bottom: 10px;
  overflow-x: auto;
}
/* 表格单元格默认不换行，名称列除外 */
::v-deep .el-table .cell {
  white-space: nowrap;
  overflow: visible;
}
::v-deep .el-table .name-column .cell {
  white-space: normal;
}
/* 表格最小宽度，防止列被压缩 */
::v-deep .el-table {
  min-width: 700px;
}
.operate-btns {
  display: flex;
  flex-wrap: nowrap;
  gap: 2px;
  white-space: nowrap;
}
.operate-btn {
  padding: 0 3px;
  font-size: 11px;
  flex-shrink: 0;
}
.stock-link {
  color: #409EFF;
  cursor: pointer;
  transition: color 0.2s;
}
.stock-link:hover {
  text-decoration: underline;
  color: #1890ff;
}
.quote-chart {
  padding: 15px;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #333);
  margin-bottom: 0;
  padding-left: 4px;
  border-left: 3px solid #1890ff;
}

.search-btn-text {
  margin-left: 4px;
}
/* 全局缩小文本 */
::v-deep .el-table {
  --el-table-text-color: var(--color-text, #333);
  color: var(--el-table-text-color);
  font-size: 12px;
}
::v-deep .el-pagination {
  font-size: 12px;
  color: var(--color-text, #333);
}

/* 分页响应式：窄屏隐藏次要元素 */
@media screen and (max-width: 900px) {
  ::v-deep .stock-pagination .el-pagination__jump {
    display: none !important;
  }
}
@media screen and (max-width: 887px) {
  .search-btn-text {
    display: none;
  }
  .quote-table {
    position: relative;
  }
  ::v-deep .el-table th.operate-column,
  ::v-deep .el-table td.operate-column {
    position: sticky;
    right: -1px;
    z-index: 3;
    background: var(--color-card-bg, #fff);
    border-left: 1px solid var(--color-border, #ebeef5);
  }
  ::v-deep .el-table th.operate-column {
    z-index: 4;
  }
  ::v-deep .el-table td.operate-column {
    box-shadow: -6px 0 10px rgba(0, 0, 0, 0.06);
  }
}
@media screen and (max-width: 700px) {
  ::v-deep .stock-pagination .el-pagination__sizes {
    display: none !important;
  }
}
@media screen and (max-width: 500px) {
  ::v-deep .stock-pagination .el-pagination__total {
    display: none !important;
  }
}

@media screen and (max-width: 530px) {
  .news-ticker-container .ticker-label-text {
    display: none;
  }
}
::v-deep .only-price-num {
  font-size: 12px !important;
  line-height: 1;
}

/* 响应式：小屏筛选栏 */
@media screen and (max-width: 767px) {
  .filter-bar {
    padding: 6px 8px;
  }
  .filter-bar .el-row {
    display: flex;
    flex-wrap: wrap;
  }
  .filter-bar .el-row > .el-col {
    margin-bottom: 8px;
  }
  .filter-bar .el-select,
  .filter-bar .el-input {
    width: 100% !important;
  }
  /* 小屏下搜索按钮只显示图标 */
  .search-btn .search-text {
    display: none;
  }
  .chart-title {
    font-size: 13px;
  }
  .operate-btns {
    gap: 1px;
  }
  .operate-btn {
    font-size: 10px;
    padding: 0 2px;
  }
}

/* 响应式：平板 */
@media screen and (min-width: 768px) and (max-width: 1199px) {
  .filter-bar {
    padding: 8px;
  }
}
/* 行情表格行高亮过渡动画 */
.quote-row-animate {
  transition: background-color 0.5s;
}
.el-table__body tr.quote-row-animate:hover {
  background-color: #e3f2fd !important;
}
/* 行情表格行高亮过渡动画 */
.quote-row-animate {
  transition: background-color 0.5s;
}
.el-table__body tr.quote-row-animate:hover {
  background-color: #e3f2fd !important;
}

/* 统计模式样式 */
.stats-container {
  padding: 0 5px;
}
.page-header {
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.page-title .tag {
  font-size: 14px;
  background: linear-gradient(90deg, #409EFF, #36cfc9);
  color: #fff;
  padding: 2px 10px;
  border-radius: 4px;
  margin-left: 12px;
  font-weight: normal;
  vertical-align: middle;
}
.page-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  opacity: 0.8;
}
.stats-mode-switch {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.mode-label {
  font-size: 12px;
  color: var(--color-text-secondary, #999);
}
.stats-cards {
  margin-bottom: 24px;
}

@media screen and (max-width: 720px) {
  .stats-cards {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .stats-cards > .emotion-col {
    width: 25%;
    max-width: 25%;
    flex: 0 0 25%;
  }
  .stats-cards > .overview-wrap-col {
    width: 75%;
    max-width: 75%;
    flex: 0 0 75%;
  }
  .overview-row {
    display: flex;
    flex-wrap: wrap;
  }
  .overview-row > .overview-item-col {
    width: 33.3333%;
    max-width: 33.3333%;
    flex: 0 0 33.3333%;
    margin-bottom: 10px;
  }
}

/* 复制 Sidebar.vue 的统计卡片样式，保持一致 */
.statistic-item {
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #f0f0f0);
  border-radius: 8px;
  padding: 8px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 添加阴影，与侧边栏保持一致的视觉层级 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: transform 0.2s, box-shadow 0.2s;
}
.statistic-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.stat-inner {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary, #666);
  margin-top: 6px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

/* 保持涨跌色彩 */
.text-up { color: var(--color-up, #e53935); }
.text-down { color: var(--color-down, #43a047); }
.text-neutral { color: #999; }
.text-primary { color: #409EFF; }

.chart-row {
  margin-bottom: 20px;
}

/* 约 950px 起将右侧两块图表下移到第二行，避免卡片内容被压缩 */
@media screen and (max-width: 950px) {
  .chart-row {
    display: flex;
    flex-wrap: wrap;
  }
  .chart-row > .chart-col-index {
    width: 100%;
    max-width: 100%;
    flex: 0 0 100%;
    margin-bottom: 15px;
  }
  .chart-row > .chart-col-distribution,
  .chart-row > .chart-col-funds {
    width: 50%;
    max-width: 50%;
    flex: 0 0 50%;
  }
}

@media screen and (max-width: 700px) {
  .chart-row > .chart-col-distribution,
  .chart-row > .chart-col-funds {
    width: 100%;
    max-width: 100%;
    flex: 0 0 100%;
  }
}

.chart-header, .table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.distribution-chart {
  background: var(--color-card-bg, #fff);
  border-radius: 4px;
  padding: 15px;
  height: 380px;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}
.distribution-chart .chart-title {
  margin-bottom: 0;
}
.quote-chart > div:last-child {
  flex: 1;
}
.distribution-chart > div {
  flex: 1;
}

/* 按钮点击波纹动效 */
.ripple-btn {
  position: relative;
  overflow: hidden !important;
}
.ripple-btn:active::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120%;
  height: 120%;
  background: rgba(33, 150, 243, 0.18);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0.7);
  animation: ripple-anim 0.5s cubic-bezier(0.4,0,0.2,1);
  pointer-events: none;
  z-index: 2;
}
@keyframes ripple-anim {
  0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.7); }
  80% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
}

/* 资讯滚动播报 */
.news-ticker-container {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 15px;
  margin-bottom: 15px;
  background: var(--color-card-bg);
  border-radius: 4px;
  overflow: hidden;
}
.ticker-label {
  font-weight: bold;
  color: #e6a23c;
  margin-right: 15px;
  white-space: nowrap;
}
.ticker-wrapper {
  flex: 1;
  height: 30px;
  overflow: hidden;
  position: relative;
}
.ticker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  transition: transform 0.5s ease-in-out;
}
.ticker-item {
  height: 30px;
  line-height: 30px;
  display: flex;
  align-items: center;
  font-size: 13px;
}
.news-time {
  color: #909399;
  margin-right: 10px;
}
.news-content {
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.news-link {
  text-decoration: none;
}
.news-link:hover {
  color: #409eff;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.news-highlight {
  color: #f56c6c;
  font-weight: bold;
}

/* 市场情绪仪表盘 */
.emotion-card {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.emotion-meter {
  position: relative;
  text-align: center;
  margin-top: 10px;
}
.emotion-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-text);
}
.emotion-desc {
  font-size: 12px;
  margin-top: -15px;
  font-weight: bold;
}
</style>
