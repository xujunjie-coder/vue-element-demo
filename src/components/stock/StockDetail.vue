<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <!-- 股票基本信息 -->
    <div class="card-container stock-header">
      <div class="stock-basic">
        <h2 class="stock-name">
          {{ stockDetail.name }} ({{ stripPrefix(stockDetail.code) }})
          <el-tag size="mini" :class="getChangeClass(stockDetail.change)">{{ stockDetail.change_rate }}%</el-tag>
        </h2>
        <div class="stock-price">
          <span class="current-price data-text" :class="getChangeClass(stockDetail.change)">
            {{ stockDetail.price }}
          </span>
          <span class="price-change" :class="getChangeClass(stockDetail.change)">
            {{ stockDetail.change > 0 ? '+' : '' }}{{ stockDetail.change }}
          </span>
        </div>
        <div class="stock-other">
          <span class="other-item">开盘价：{{ stockDetail.open }}</span>
          <span class="other-item">最高价：{{ stockDetail.high }}</span>
          <span class="other-item">最低价：{{ stockDetail.low }}</span>
          <span class="other-item">成交量：{{ stockDetail.volume }}手</span>
        </div>
      </div>
      <div class="stock-actions">
        <el-button type="primary" size="small" @click="addToOptional">加入自选</el-button>
        <el-button type="success" size="small" @click="toTrade">交易操作</el-button>
        <el-button type="warning" size="small" icon="el-icon-refresh" @click="refreshDetail" class="refresh-btn"><span class="refresh-text">刷新数据</span></el-button>
      </div>
    </div>

    <!-- K线图与盘口区域 -->
    <el-row :gutter="16" class="chart-board-row" type="flex" align="stretch">
      <!-- 左侧：K线图 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="18">
        <div class="card-container kline-chart" style="height: 100%; display: flex; flex-direction: column;">
          <div class="chart-tabs">
            <el-radio-group v-model="klineType" @change="changeKlineType">
              <el-radio label="5min">5分钟</el-radio>
              <el-radio label="15min">15分钟</el-radio>
              <el-radio label="30min">30分钟</el-radio>
              <el-radio label="60min">60分钟</el-radio>
              <el-radio label="day">日K</el-radio>
            </el-radio-group>
          </div>
          <div ref="klineChart" style="width: 100%; flex: 1; min-height: 450px;"></div>
        </div>
      </el-col>
      
      <!-- 右侧：五档盘口与筹码分析 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="6">
        <div class="card-container order-book-panel">
          <div class="panel-tabs">
            <div 
              class="tab-item" 
              :class="{ active: rightTab === 'order' }" 
              @click="rightTab = 'order'">五档盘口</div>
            <div 
              class="tab-item" 
              :class="{ active: rightTab === 'chip' }" 
              @click="rightTab = 'chip'">筹码分布</div>
          </div>
          
          <div class="panel-content">
            <!-- 五档盘口 -->
            <div v-show="rightTab === 'order'" class="view-container order-view">
              <div class="order-list sell-list">
                <div class="order-item" v-for="(item, index) in mockSellList" :key="'sell'+index">
                  <span class="order-label">卖{{ 5 - index }}</span>
                  <span class="order-price" :class="getPriceColor(item.price, stockDetail.close)">{{ item.price }}</span>
                  <span class="order-vol">{{ item.vol }}</span>
                  <div class="vol-bar bg-sell" :style="{ width: item.percent + '%' }"></div>
                </div>
              </div>
              
              <div class="current-price-divider">
                <div class="cp-left">最新</div>
                <div class="cp-center" :class="getChangeClass(stockDetail.change)">{{ stockDetail.price }}</div>
                <div class="cp-right">
                  <span :class="getChangeClass(stockDetail.change)">{{ stockDetail.change_rate }}%</span>
                </div>
              </div>

              <div class="order-list buy-list">
                <div class="order-item" v-for="(item, index) in mockBuyList" :key="'buy'+index">
                  <span class="order-label">买{{ index + 1 }}</span>
                  <span class="order-price" :class="getPriceColor(item.price, stockDetail.close)">{{ item.price }}</span>
                  <span class="order-vol">{{ item.vol }}</span>
                  <div class="vol-bar bg-buy" :style="{ width: item.percent + '%' }"></div>
                </div>
              </div>
            </div>

            <!-- 筹码分布图 -->
            <div v-show="rightTab === 'chip'" class="view-container chip-view">
              <div ref="chipChart" class="chip-chart"></div>
            </div>
          </div>

          <!-- 底部筹码数据统计（常驻） -->
          <div class="panel-footer">
            <div class="chip-stat-box">
              <div class="stat-row">
                <span class="label">获利比例:</span>
                <span class="value text-up">{{ chipStats.profit }}%</span>
              </div>
              <div class="stat-row">
                <span class="label">平均成本:</span>
                <span class="value">{{ chipStats.avgCost }}</span>
              </div>
              <div class="stat-row">
                <span class="label">90%筹码集中度:</span>
                <span class="value">{{ chipStats.concentration }}%</span>
              </div>
              <div class="stat-row" style="margin-top:4px;border-top:1px dashed rgba(0,0,0,0.1);padding-top:4px;">
                <span class="label">底仓锁定:</span>
                <span class="value" style="color:#E6A23C">{{ chipStats.lockRatio }}%</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- AI预测模块 -->
    <AIPrediction
      :prediction="stockDetail.aiPrediction"
      :current-price="stockDetail.price"
    />

    <!-- 财务数据模块 -->
    <div class="card-container finance-data hide-on-mobile">
      <h3 class="module-title">财务核心数据</h3>
      <el-table :data="financeList" border style="width: 100%;" class="finance-table">
        <el-table-column prop="name" label="指标名称" min-width="100" />
        <el-table-column prop="latest" label="最新值" min-width="80">
          <template slot-scope="scope">
            <span :class="scope.row.change > 0 ? 'text-up' : scope.row.change < 0 ? 'text-down' : ''">
              {{ scope.row.latest }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="指标说明" min-width="150" />
      </el-table>
    </div>
  </el-main>
</template>

<script>
import { mapActions,mapState } from 'vuex';
import * as echarts from 'echarts';
import request from '../../utils/request';
import { stripStockPrefix } from '../../utils/request';
import AIPrediction from '../ai/AIPrediction.vue';
import { getChangeClass, formatPrice, formatVolume } from '../../utils/format';

export default {
  name: 'StockDetail',
  components: { AIPrediction },
  data() {
    return {
      // 股票详情数据
      stockDetail: {
        code: '',
        name: '',
        price: '0.00',
        change: '0.00',
        change_rate: '0.00',
        open: '0.00',
        high: '0.00',
        low: '0.00',
        volume: '0',
        aiPrediction: {},
        klineData: []
      },
      // K线类型
      klineType: '60min',
      // K线图表实例
      klineChartInstance: null,
      // 财务数据
      financeList: [
        { name: '市盈率(PE)', latest: '--', change: 0, description: '当前股价相对每股收益的倍数' },
        { name: '市净率(PB)', latest: '--', change: 0, description: '当前股价相对每股净资产的倍数' },
        { name: '总市值', latest: '--', change: 0, description: '股价 × 总股本，单位：万元' },
        { name: '流通市值', latest: '--', change: 0, description: '股价 × 流通股本，单位：万元' },
        { name: '换手率', latest: '--', change: 0, description: '成交量占流通股本的百分比' }
      ],
      // 右侧面板 Tab
      rightTab: 'order', // order: 盘口, chip: 筹码
      // 盘口数据（由真实行情推导）
      mockSellList: [],
      mockBuyList: [],
      // 筹码图表实例
      chipChartInstance: null,
      chipStats: { profit: 0, avgCost: 0, concentration: 0, lockRatio: 0, peakPrice: 0 },
      chipPrices: [],
      chipVolumes: [],
      loading: false,
      // 色彩常量（严格遵循PDF设计规范）
      colorUp: '#e53935',    // 上涨色（主色调）
      colorDown: '#2f9b56',  // 下跌色（辅助色）
      colorNeutral: '#666'   // 中性色（平盘）
    };
  },
  computed: {
    // 获取当前股票代码
    currentCode() {
      return this.$route.params.code || '600519';
    },
    // 从Vuex获取当前选中的自选股数据
    ...mapState({
      currentOptionalStock: state => state.optionalStocks.find(stock => stock.code === state.currentStockCode) || {}
    })
  },
  mounted() {
    // 加载股票详情
    this.fetchStockDetail();
    // 初始化图表
    this.initKlineChart();
    // 监听 Tab 切换，按需初始化图表
    this.$watch('rightTab', (val) => {
      if (val === 'chip') {
        this.$nextTick(() => {
          if (!this.chipChartInstance) {
            this.initChipChart();
          } else {
            if (this.isChartAlive(this.chipChartInstance)) {
              this.chipChartInstance.resize();
            }
          }
        });
      }
    });
  },
  watch: {
    // 监听路由参数变化，切换不同股票时重新加载
    '$route.params.code'() {
      this.fetchStockDetail();
    },
    '$store.state.theme': function() {
      this.$nextTick(() => {
        this.initKlineChart();
        if (this.chipChartInstance) this.initChipChart();
      });
    }
  },
  beforeDestroy() {
    // 销毁图表实例，释放资源
    // 移除resize事件监听，避免内存泄漏
    window.removeEventListener('resize', this.handleResize);
    if (this.klineChartInstance && !this.klineChartInstance.isDisposed()) {
      this.klineChartInstance.dispose();
    }
    if (this.chipChartInstance && !this.chipChartInstance.isDisposed()) {
      this.chipChartInstance.dispose();
    }
    this.klineChartInstance = null;
    this.chipChartInstance = null;
  },
  methods: {
    // 获取涨跌颜色
    getPriceColor(price, close) {
      if (!price || !close) return '';
      const p = Number(price);
      const c = Number(close);
      if (p > c) return 'text-up';
      if (p < c) return 'text-down';
      return '';
    },
    ...mapActions(['addOptionalStock']),
    getChangeClass,
    stripPrefix: stripStockPrefix,

    isChartAlive(instance) {
      return !!(instance && !(typeof instance.isDisposed === 'function' && instance.isDisposed()));
    },

    // 处理窗口resize事件（单独定义便于销毁）
    handleResize() {
      if (this.isChartAlive(this.klineChartInstance)) this.klineChartInstance.resize();
      if (this.isChartAlive(this.chipChartInstance)) this.chipChartInstance.resize();
    },

    // 获取股票详情数据（使用新后端 API）
    async fetchStockDetail() {
      this.loading = true;
      try {
        // 1. 获取实时行情：GET /stock_last?code=sh600000
        const stockRes = await request.getStockLast(this.currentCode);
        const d = stockRes.data || {};

        // 映射后端字段到前端字段
        this.stockDetail = {
          code: d.code || this.currentCode,
          name: d.name || '',
          price: formatPrice(d.last),
          change: formatPrice(Number(d.last) - Number(d.close)), // 涨跌额 = 当前价 - 昨收
          change_rate: d.close && Number(d.close) > 0
            ? formatPrice(((Number(d.last) - Number(d.close)) / Number(d.close) * 100))
            : '0.00',
          open: formatPrice(d.open),
          high: formatPrice(d.hod),
          low: formatPrice(d.lod),
          volume: formatVolume(d.vol),
          bid: formatPrice(d.bid),
          ask: formatPrice(d.ask),
          amount: d.amount,
          date: d.date,
          time: d.time,
          aiPrediction: {},
          klineData: []
        };

        // 使用真实行情与历史数据生成盘口和筹码分布
        await this.refreshOrderBookAndChip(d);

        // 2. 获取K线数据和财务指标（并行，互不阻塞）
        this.fetchFinanceData(d);
        this.fetchAIPrediction();  // 获取AI预测数据
        await this.fetchKlineData();
      } catch (err) {
        this.$message.error('股票详情加载失败');
        console.error('fetchStockDetail error:', err);
      } finally {
        this.loading = false;
      }
    },

    // 异步获取财务指标（不阻塞主流程）
    async fetchFinanceData(stockData) {
      try {
        const fullCode = String(stockData.code || this.currentCode);
        const pureCode = stripStockPrefix(fullCode);
        const normalizeCode = (code) => stripStockPrefix(String(code || ''));

        // 重置为默认展示，避免切换股票时残留上一只的数据
        this.financeList = this.financeList.map(item => ({ ...item, latest: '--' }));

        // 按板块优先级搜索，避免创业板/科创板在错误市场里查不到
        const stockTypes = [];
        if (/^688/.test(pureCode)) stockTypes.push('KcASpot', 'ShA');
        else if (/^(300|301)/.test(pureCode)) stockTypes.push('CyA', 'SzA');
        else if (/^6/.test(pureCode)) stockTypes.push('ShA');
        else if (/^[03]/.test(pureCode)) stockTypes.push('SzA');
        else if (/^[48]/.test(pureCode)) stockTypes.push('BjA');
        stockTypes.push('ZhA');

        let spotItem = null;

        for (const stockType of [...new Set(stockTypes)]) {
          const firstRes = await request.getSpotSina({ stock_type: stockType, page: 1, size: 100 });
          const firstData = firstRes.data || {};
          const totalPages = firstData.pages || 1;

          spotItem = (Array.isArray(firstData.list) ? firstData.list : []).find(
            s => normalizeCode(s.code) === pureCode
          );

          if (spotItem) break;

          if (totalPages > 1) {
            const batchSize = 5;
            for (let i = 2; i <= totalPages; i += batchSize) {
              const promises = [];
              for (let p = i; p < i + batchSize && p <= totalPages; p++) {
                promises.push(
                  request.getSpotSina({ stock_type: stockType, page: p, size: 100 })
                    .then(r => (r && r.data && r.data.list) || [])
                    .catch(() => [])
                );
              }
              const results = await Promise.all(promises);
              for (const list of results) {
                if (Array.isArray(list)) {
                  spotItem = list.find(s => normalizeCode(s.code) === pureCode);
                  if (spotItem) break;
                }
              }
              if (spotItem) break;
            }
          }

          if (spotItem) break;
        }

        if (spotItem) {
          const per = Number(spotItem.per);
          const pbr = Number(spotItem.pbr);
          const tmc = Number(spotItem.tmc);
          const ffmcap = Number(spotItem.ffmcap);
          const hsr = Number(spotItem.hsr);
          if (!isNaN(per)) this.$set(this.financeList, 0, { ...this.financeList[0], latest: per.toFixed(2) });
          if (!isNaN(pbr)) this.$set(this.financeList, 1, { ...this.financeList[1], latest: pbr.toFixed(2) });
          if (!isNaN(tmc)) this.$set(this.financeList, 2, { ...this.financeList[2], latest: (tmc / 10000).toFixed(2) + '万' });
          if (!isNaN(ffmcap)) this.$set(this.financeList, 3, { ...this.financeList[3], latest: (ffmcap / 10000).toFixed(2) + '万' });
          if (!isNaN(hsr)) this.$set(this.financeList, 4, { ...this.financeList[4], latest: hsr.toFixed(2) + '%' });
        }
      } catch (e) {
        console.warn('获取财务指标失败:', e.message);
      }
    },

    /**
     * 获取AI预测数据 — 使用 /api/ai 接口
     * 后端返回 AI 分析结果，前端适配展示
     */
    async fetchAIPrediction() {
      try {
        const res = await request.getAIAnalysis(this.currentCode);
        const data = res.data || res;
        
        // 适配后端 AI 接口返回格式：{ prob, vol, amp, zd }
        const prob = data.prob || 0.5;  // 概率 0-1
        // 后端已将 zd 改为 amp（小数），保留 zd 兜底兼容
        const ampVal = data.amp != null ? data.amp : (data.zd || 0); 
        const trend = ampVal >= 0 ? 'up' : 'down';
        const currentPrice = Number(this.stockDetail.price) || 100;
        
        this.stockDetail.aiPrediction = {
          trend: trend,
          probability: Math.round(prob * 100),  // 转为百分比
          target_price: (currentPrice * (1 + ampVal * 5)).toFixed(2),  // 根据幅度预估目标价
          reason: `AI模型预测${trend === 'up' ? '上涨' : '下跌'}概率 ${Math.round(prob * 100)}%`
        };
        
        console.log('AI预测数据:', this.stockDetail.aiPrediction);
      } catch (e) {
        console.warn('获取AI预测失败:', e.message);
        // 失败时使用默认预测（可选）
        this.stockDetail.aiPrediction = {
          trend: 'up',
          probability: 60,
          target_price: (Number(this.stockDetail.price) * 1.03).toFixed(2),
          reason: 'AI分析暂不可用'
        };
      }
    },

    /**
     * 获取K线数据 — 使用 /history/minute 接口
     * 分钟K：scale=5/15/30/60, datalen 控制数据量
     * 日K：使用 60min 数据按日期聚合
     */
    async fetchKlineData() {
      try {
        let klineData = [];

        if (this.klineType === 'day') {
          // 日K：取60分钟数据后按日期聚合
          const res = await request.getMinuteHistory({
            code: this.currentCode,
            scale: 60,
            datalen: 1970
          });
          const rawList = res.data || [];
          // 按日期分组聚合为日K
          const dayMap = {};
          rawList.forEach(item => {
            const dateStr = item.day ? item.day.split(' ')[0] : '';
            if (!dateStr) return;
            if (!dayMap[dateStr]) {
              dayMap[dateStr] = {
                date: dateStr,
                open: Number(item.open),
                close: Number(item.close),
                high: Number(item.hod),
                low: Number(item.lod),
                volume: Number(item.vol) || 0
              };
            } else {
              const d = dayMap[dateStr];
              d.close = Number(item.close); // 最后一条的收盘价
              d.high = Math.max(d.high, Number(item.hod));
              d.low = Math.min(d.low, Number(item.lod));
              d.volume += Number(item.vol) || 0;
            }
          });
          klineData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
        } else {
          // 分钟K：直接调用
          const scaleMap = { '5min': 5, '15min': 15, '30min': 30, '60min': 60 };
          const scale = scaleMap[this.klineType] || 60;
          const datalenMap = { '5min': 200, '15min': 300, '30min': 400, '60min': 500 };
          const datalen = datalenMap[this.klineType] || 200;

          const res = await request.getMinuteHistory({
            code: this.currentCode,
            scale,
            datalen
          });
          klineData = (res.data || []).map(item => ({
            date: item.day || '',
            open: Number(item.open),
            close: Number(item.close),
            high: Number(item.hod),
            low: Number(item.lod),
            volume: Number(item.vol) || 0
          }));
        }

        this.stockDetail.klineData = klineData;
        this.updateKlineChart(klineData);
      } catch (err) {
        console.warn('fetchKlineData error:', err);
      }
    },

    // 初始化K线图
    initKlineChart() {
      if (!this.$refs.klineChart) return;
      const existing = echarts.getInstanceByDom(this.$refs.klineChart);
      if (existing) existing.dispose();
      this.klineChartInstance = echarts.init(this.$refs.klineChart);
    },

    // 由真实行情+历史数据构建盘口与筹码（真实优先，必要时推导/模拟兜底）
    async refreshOrderBookAndChip(quote) {
      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const pickPrice = (obj, keys) => {
        for (const k of keys) {
          const n = toNum(obj && obj[k]);
          if (n != null && n > 0) return n;
        }
        return null;
      };
      const pickVol = (obj, keys) => {
        for (const k of keys) {
          const n = toNum(obj && obj[k]);
          if (n != null && n >= 0) return n;
        }
        return null;
      };

      // 1) 优先使用后端真实五档字段。
      // 先按需求临时注释：不读取 ask1~ask5 / bid1~bid5 及对应量字段。
      // let sellLevels = [];
      // for (let level = 5; level >= 1; level--) {
      //   const price = pickPrice(quote, [`ask${level}`, `ask_${level}`, `ask${level}p`, `ask${level}price`]);
      //   const vol = pickVol(quote, [`ask${level}_vol`, `ask${level}vol`, `ask${level}v`, `ask${level}amount`]);
      //   sellLevels.push({
      //     price: price != null ? price.toFixed(2) : '--',
      //     vol: vol != null ? Math.round(vol) : '--',
      //     percent: 0
      //   });
      // }
      //
      // let buyLevels = [];
      // for (let level = 1; level <= 5; level++) {
      //   const price = pickPrice(quote, [`bid${level}`, `bid_${level}`, `bid${level}p`, `bid${level}price`]);
      //   const vol = pickVol(quote, [`bid${level}_vol`, `bid${level}vol`, `bid${level}v`, `bid${level}amount`]);
      //   buyLevels.push({
      //     price: price != null ? price.toFixed(2) : '--',
      //     vol: vol != null ? Math.round(vol) : '--',
      //     percent: 0
      //   });
      // }
      let sellLevels = [];
      let buyLevels = [];

      const hasRealOrderBook =
        sellLevels.some(v => v.price !== '--' && v.vol !== '--') ||
        buyLevels.some(v => v.price !== '--' && v.vol !== '--');

      // 2) 无真实五档时，基于现有字段（bid/ask/last/close/vol）推导五档。
      if (!hasRealOrderBook) {
        const last = toNum(quote && quote.last);
        const close = toNum(quote && quote.close);
        const bid = toNum(quote && quote.bid);
        const ask = toNum(quote && quote.ask);
        const high = toNum(quote && quote.hod);
        const low = toNum(quote && quote.lod);
        const vol = toNum(quote && quote.vol);

        const mid = (last != null && last > 0)
          ? last
          : ((close != null && close > 0)
            ? close
            : ((bid != null && ask != null && bid > 0 && ask > 0) ? (bid + ask) / 2 : null));

        if (mid != null && mid > 0) {
          const rangeStep = (high != null && low != null && high > low)
            ? (high - low) / 40
            : 0;
          const minStep = Math.max(mid * 0.001, 0.01);
          const step = Number(Math.max(rangeStep, minStep).toFixed(2));
          const bid1 = bid != null && bid > 0 ? bid : Number((mid - step).toFixed(2));
          const ask1 = ask != null && ask > 0 ? ask : Number((mid + step).toFixed(2));
          const baseVol = Math.max(100, Math.floor((vol != null && vol > 0 ? vol : 50000) / 500));

          sellLevels = [];
          for (let level = 5; level >= 1; level--) {
            const price = Number((ask1 + step * (level - 1)).toFixed(2));
            const levelVol = Math.max(100, Math.round(baseVol * (0.7 + (6 - level) * 0.1)));
            sellLevels.push({ price: price.toFixed(2), vol: levelVol, percent: 0 });
          }

          buyLevels = [];
          for (let level = 1; level <= 5; level++) {
            const price = Number((bid1 - step * (level - 1)).toFixed(2));
            const levelVol = Math.max(100, Math.round(baseVol * (1.1 - (level - 1) * 0.1)));
            buyLevels.push({ price: price.toFixed(2), vol: levelVol, percent: 0 });
          }
        }
      }

      // 3) 仍无可用数据时，使用模拟盘口兜底（仅用于展示连续性）。
      const hasUsableOrderBook =
        sellLevels.some(v => v.price !== '--') ||
        buyLevels.some(v => v.price !== '--');
      if (!hasUsableOrderBook) {
        const base = (toNum(quote && quote.last) || toNum(quote && quote.close) || 10);
        const step = Math.max(Number((base * 0.001).toFixed(2)), 0.01);

        sellLevels = [];
        for (let level = 5; level >= 1; level--) {
          const price = Number((base + step * level).toFixed(2));
          const levelVol = Math.floor(2000 + Math.random() * 6000);
          sellLevels.push({ price: price.toFixed(2), vol: levelVol, percent: 0 });
        }

        buyLevels = [];
        for (let level = 1; level <= 5; level++) {
          const price = Number((base - step * level).toFixed(2));
          const levelVol = Math.floor(2000 + Math.random() * 6000);
          buyLevels.push({ price: price.toFixed(2), vol: levelVol, percent: 0 });
        }
      }

      const sellVols = sellLevels.map(v => (typeof v.vol === 'number' ? v.vol : 0));
      const buyVols = buyLevels.map(v => (typeof v.vol === 'number' ? v.vol : 0));
      const sellMax = Math.max(...sellVols, 0);
      const buyMax = Math.max(...buyVols, 0);
      this.mockSellList = sellLevels.map(v => ({
        ...v,
        percent: sellMax > 0 && typeof v.vol === 'number' ? Math.round((v.vol / sellMax) * 100) : 0
      }));
      this.mockBuyList = buyLevels.map(v => ({
        ...v,
        percent: buyMax > 0 && typeof v.vol === 'number' ? Math.round((v.vol / buyMax) * 100) : 0
      }));

      // 优先使用日线数据构建筹码分布；失败时降级到分钟数据
      let histList = [];
      try {
        const now = new Date();
        const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const start = new Date(now);
        start.setDate(start.getDate() - 180);
        const startDate = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}`;
        const dayRes = await request.getDayHistory({
          code: this.currentCode,
          period: 'daily',
          start_date: startDate,
          end_date: endDate,
          adjust: 'qfq'
        }, {
          _silent: true
        });
        histList = Array.isArray(dayRes && dayRes.data) ? dayRes.data.slice(-160) : [];
      } catch (e) {
        histList = [];
      }

      if (!histList.length) {
        try {
          const minuteRes = await request.getMinuteHistory({ code: this.currentCode, scale: 60, datalen: 500 });
          histList = Array.isArray(minuteRes && minuteRes.data)
            ? minuteRes.data.map(i => ({ close: i.close, vol: i.vol })).slice(-200)
            : [];
        } catch (e) {
          histList = [];
        }
      }

      const prices = histList
        .map(i => Number(i.close))
        .filter(v => Number.isFinite(v) && v > 0);
      const vols = histList
        .map(i => Number(i.vol))
        .filter(v => Number.isFinite(v) && v >= 0);

      const currentPrice = Number(quote.last) || Number(quote.close) || 0;
      const fallbackPrice = currentPrice > 0 ? currentPrice : 10;
      if (!prices.length || !vols.length || prices.length !== vols.length) {
        this.chipPrices = [];
        this.chipVolumes = [];
        this.chipStats = {
          profit: '0.0',
          avgCost: fallbackPrice.toFixed(2),
          concentration: '0.0',
          peakPrice: '--',
          lockRatio: '0.0'
        };
        return;
      }

      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const start = Math.min(minP, fallbackPrice * 0.9);
      const end = Math.max(maxP, fallbackPrice * 1.1);
      const bins = 60;
      const binSize = (end - start) / bins || 0.01;
      const bucket = new Array(bins).fill(0);

      for (let i = 0; i < prices.length; i++) {
        const idx = Math.max(0, Math.min(bins - 1, Math.floor((prices[i] - start) / binSize)));
        bucket[idx] += vols[i];
      }

      this.chipPrices = bucket.map((_, i) => (start + i * binSize).toFixed(2));
      this.chipVolumes = bucket.map(v => Number(v.toFixed(2)));

      const totalVol = this.chipVolumes.reduce((s, v) => s + v, 0) || 1;
      const weighted = this.chipVolumes.reduce((s, v, i) => s + v * Number(this.chipPrices[i]), 0);
      const avgCost = weighted / totalVol;
      const profitVol = this.chipVolumes.reduce((s, v, i) => s + (Number(this.chipPrices[i]) < fallbackPrice ? v : 0), 0);

      const peakIdx = this.chipVolumes.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);
      const peakPrice = Number(this.chipPrices[peakIdx]);

      // 计算覆盖 90% 成交量区间，再反推集中度
      let left = 0;
      let right = bins - 1;
      let covered = totalVol;
      const target = totalVol * 0.9;
      while (covered > target && left < right) {
        if (this.chipVolumes[left] < this.chipVolumes[right]) {
          covered -= this.chipVolumes[left++];
        } else {
          covered -= this.chipVolumes[right--];
        }
      }
      const widthPct = avgCost > 0
        ? ((Number(this.chipPrices[right]) - Number(this.chipPrices[left])) / avgCost) * 100
        : 100;
      const concentration = Math.max(0, Math.min(100, 100 - widthPct));

      const lockBand = avgCost * 0.03;
      const lockVol = this.chipVolumes.reduce((s, v, i) => {
        const p = Number(this.chipPrices[i]);
        return s + (Math.abs(p - avgCost) <= lockBand ? v : 0);
      }, 0);

      this.chipStats = {
        profit: ((profitVol / totalVol) * 100).toFixed(1),
        avgCost: avgCost.toFixed(2),
        concentration: concentration.toFixed(1),
        peakPrice: peakPrice.toFixed(2),
        lockRatio: ((lockVol / totalVol) * 100).toFixed(1)
      };
    },

    // 初始化筹码分布图
    initChipChart() {
      if (!this.$refs.chipChart) return;
      const existing = echarts.getInstanceByDom(this.$refs.chipChart);
      if (existing) existing.dispose();
      this.chipChartInstance = echarts.init(this.$refs.chipChart);
      
      const currentPrice = Number(this.stockDetail.price) || 10;
      const avgCost = Number(this.chipStats.avgCost) || currentPrice;
      const prices = this.chipPrices;
      const data = this.chipVolumes;
      const labelInterval = Math.max(0, Math.floor((prices.length || 1) / 8));
      
      const isLight = this.$store.state.theme === 'light';
      
      const option = {
        animation: true,
        animationDuration: 1000,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            const p = params[0];
            const price = p.name;
            const vol = p.value;
            const status = Number(price) < currentPrice ? '获利盘' : '套牢盘';
            const color = Number(price) < currentPrice ? '#f56c6c' : '#67c23a';
            return `<div style="font-size:12px;">
                      <div>价格: <b>${price}</b></div>
                      <div>状态: <span style="color:${color}">${status}</span></div>
                      <div>筹码: ${vol}</div>
                    </div>`;
          }
        },
        grid: { left: '10%', right: '15%', bottom: '5%', top: '10%', containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: {
          type: 'category',
          data: prices,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { 
            color: isLight ? '#999' : '#ccc', // 黑夜模式下使用更浅的颜色
            fontSize: 10,
            interval: labelInterval, // 减少标签密度
            margin: 8
          } 
        },
        series: [{
          name: '筹码',
          type: 'bar',
          barWidth: '70%',
          data: data.map((val, idx) => {
            const p = Number(prices[idx]);
            // 渐变色处理
            const isProfit = p < currentPrice;
            return {
              value: val.toFixed(2),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: isProfit ? 'rgba(245, 108, 108, 0.4)' : 'rgba(103, 194, 58, 0.4)' },
                  { offset: 1, color: isProfit ? 'rgba(245, 108, 108, 0.9)' : 'rgba(103, 194, 58, 0.9)' }
                ]),
                borderRadius: [0, 4, 4, 0]
              }
            };
          }),
          markLine: {
            symbol: 'none',
            silent: true,
            data: [
              { 
                yAxis: currentPrice.toFixed(2),
                lineStyle: { color: '#409EFF', type: 'dashed', width: 1 },
                label: { 
                  position: 'insideEndTop', 
                  formatter: '现价', 
                  color: '#409EFF', 
                  fontSize: 10,
                  padding: [0, 0, 2, 0]
                }
              },
              { 
                yAxis: avgCost.toFixed(2),
                lineStyle: { color: '#E6A23C', type: 'dotted', width: 1 },
                label: { 
                  position: 'insideEndBottom', 
                  formatter: '成本', 
                  color: '#E6A23C', 
                  fontSize: 10,
                  padding: [2, 0, 0, 0]
                }
              }
            ]
          }
        }]
      };
      
      if (!this.isChartAlive(this.chipChartInstance)) return;
      this.chipChartInstance.setOption(option);
    },

    // 更新K线图数据和样式
    updateKlineChart(data) {
      if (!this.isChartAlive(this.klineChartInstance) || !data || data.length === 0) return;
      
      const isLight = this.$store.state.theme === 'light';
      const axisLabelColor = isLight ? '#666' : '#ccc';
      const splitLineColor = isLight ? '#f0f0f0' : '#333';

      // 处理K线数据格式
      const categories = data.map(item => item.date);
      const values = data.map(item => [
        parseFloat(item.open),
        parseFloat(item.close),
        parseFloat(item.low),
        parseFloat(item.high)
      ]);
      const volumes = data.map(item => item.volume || 0);

      // 计算 MA5 / MA10 / MA20
      const calcMA = (n) => data.map((_, i) => {
        if (i < n - 1) return null;
        let sum = 0;
        for (let j = i - n + 1; j <= i; j++) sum += parseFloat(data[j].close);
        return (sum / n).toFixed(2);
      });
      const ma5 = calcMA(5);
      const ma10 = calcMA(10);
      const ma20 = calcMA(20);

      // 默认只显示最后60根K线
      const startPercent = data.length > 60 ? ((data.length - 60) / data.length * 100).toFixed(0) : 0;
      
      const option = {
        animation: true,
        animationDuration: 500,
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: { color: '#999' },
            label: { backgroundColor: '#555', fontSize: 11 }
          },
          backgroundColor: 'rgba(50,50,50,0.9)',
          borderColor: '#333',
          textStyle: { color: '#fff', fontSize: 12 },
          formatter: (params) => {
            if (!params || !params.length) return '';
            let html = `<div style="font-weight:bold;margin-bottom:4px">${params[0].axisValue}</div>`;
            params.forEach(p => {
              if (p.seriesType === 'candlestick' && p.data) {
                const d = p.data;
                const change = (d[1] - d[0]).toFixed(2);
                const changeRate = d[0] !== 0 ? ((d[1] - d[0]) / d[0] * 100).toFixed(2) : '0.00';
                const color = d[1] >= d[0] ? this.colorUp : this.colorDown;
                html += `<div>开盘：<b>${d[0]}</b></div>`;
                html += `<div>收盘：<b style="color:${color}">${d[1]}</b></div>`;
                html += `<div>最低：${d[2]} / 最高：${d[3]}</div>`;
                html += `<div>涨跌：<span style="color:${color}">${change > 0 ? '+' : ''}${change} (${changeRate}%)</span></div>`;
              } else if (p.seriesType === 'line' && p.data != null) {
                html += `<div>${p.marker} ${p.seriesName}：${p.data}</div>`;
              } else if (p.seriesType === 'bar' && p.data != null) {
                const vol = p.data >= 10000 ? (p.data / 10000).toFixed(1) + '万' : p.data;
                html += `<div>${p.marker} 成交量：${vol}</div>`;
              }
            });
            return html;
          }
        },
        legend: {
          data: ['MA5', 'MA10', 'MA20'],
          top: 5, right: 10,
          textStyle: { fontSize: 11, color: axisLabelColor },
          itemWidth: 14, itemHeight: 2
        },
        axisPointer: {
          link: [{ xAxisIndex: 'all' }],
          label: { backgroundColor: '#777' }
        },
        grid: [
          { left: '8%', right: '4%', top: '8%', height: '58%' },
          { left: '8%', right: '4%', top: '72%', height: '18%' }
        ],
        xAxis: [
          {
            type: 'category',
            data: categories,
            boundaryGap: true,
            axisLine: { lineStyle: { color: isLight ? '#ccc' : '#555' } },
            axisLabel: { fontSize: 10, rotate: 30, color: axisLabelColor,
              formatter: (val) => {
                if (val && val.includes(' ')) return val.split(' ')[1].substring(0, 5);
                if (val && val.length > 5) return val.substring(5);
                return val;
              }
            },
            splitLine: { show: false },
            axisPointer: { z: 100 }
          },
          {
            type: 'category',
            gridIndex: 1,
            data: categories,
            boundaryGap: true,
            axisLine: { lineStyle: { color: isLight ? '#ccc' : '#555' } },
            axisLabel: { show: false },
            splitLine: { show: false }
          }
        ],
        yAxis: [
          {
            type: 'value', scale: true,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 10, color: axisLabelColor },
            splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
          },
          {
            type: 'value', gridIndex: 1, scale: true,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
          }
        ],
        dataZoom: [
          { type: 'inside', xAxisIndex: [0, 1], start: Number(startPercent), end: 100 },
          { type: 'slider', xAxisIndex: [0, 1], bottom: '2%', height: 18,
            borderColor: '#ddd', fillerColor: 'rgba(64,158,255,0.15)',
            handleStyle: { color: '#409EFF' },
            textStyle: { fontSize: 10 },
            start: Number(startPercent), end: 100
          }
        ],
        series: [
          {
            name: 'K线',
            type: 'candlestick',
            xAxisIndex: 0, yAxisIndex: 0,
            data: values,
            itemStyle: {
              color: this.colorUp, color0: this.colorDown,
              borderColor: this.colorUp, borderColor0: this.colorDown
            }
          },
          {
            name: 'MA5', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
            data: ma5, showSymbol: false,
            lineStyle: { width: 1 }, itemStyle: { color: '#1f77b4' }
          },
          {
            name: 'MA10', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
            data: ma10, showSymbol: false,
            lineStyle: { width: 1 }, itemStyle: { color: '#ff7f0e' }
          },
          {
            name: 'MA20', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
            data: ma20, showSymbol: false,
            lineStyle: { width: 1 }, itemStyle: { color: '#2ca02c' }
          },
          {
            name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
            data: volumes,
            itemStyle: {
              color: (params) => {
                const idx = params.dataIndex;
                if (idx > 0) {
                  return parseFloat(data[idx].close) >= parseFloat(data[idx - 1].close) ? this.colorUp : this.colorDown;
                }
                return this.colorUp;
              }
            }
          }
        ]
      };
      
      if (!this.isChartAlive(this.klineChartInstance)) return;
      this.klineChartInstance.setOption(option, true);
      window.removeEventListener('resize', this.handleResize);
      window.addEventListener('resize', this.handleResize);
    },

    // 切换K线类型（日/周/月）
    changeKlineType() {
      this.fetchKlineData();
    },

    // 刷新股票详情数据
    refreshDetail() {
      this.fetchStockDetail();
      this.$message.success('数据已刷新');
    },

    // 加入自选股（去重判断 + 闪光提示）
    addToOptional() {
      const code = this.stockDetail.code;
      const existing = this.$store.state.optionalStocks.find(s => s.code === code);
      if (existing) {
        this.$message.warning(`${this.stockDetail.name} 已在自选股中`);
        // 触发侧边栏闪光动画
        this.$root.$emit('flash-optional-stock', code);
        return;
      }
      this.addOptionalStock({
        code: code,
        name: this.stockDetail.name,
        price: this.stockDetail.price,
        change: this.stockDetail.change
      });
      this.$message.success(`已将 ${this.stockDetail.name} 加入自选股`);
    },

    // 跳转到交易页面
    toTrade() {
      this.$router.push({
        path: '/trade',
        query: { 
          code: this.stripPrefix(this.stockDetail.code), 
          name: this.stockDetail.name,
          price: this.stockDetail.price
        }
      });
    }
  }
};
</script>

<style scoped>
/* 股票头部样式 */
.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fafbfc, #fff);
  border-radius: 8px;
}
.stock-basic {
  flex: 1;
  min-width: 0;
}
.stock-name {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}
.stock-name .stock-code-tag {
  font-size: 13px;
  color: #999;
  font-weight: 400;
  margin-left: 8px;
}
.stock-price {
  margin-bottom: 8px;
}
.current-price {
  font-size: 30px;
  font-weight: 700;
  margin-right: 10px;
  letter-spacing: -0.5px;
}
.price-change {
  font-size: 18px;
  font-weight: 500;
}
.stock-other {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.other-item {
  font-size: 13px;
  color: #999;
}
.other-item .label {
  color: #999;
  margin-right: 4px;
}
.stock-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-shrink: 0;
}
.stock-actions .el-button {
  min-width: 100px;
}

/* K线图样式 */
.kline-chart {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}
.chart-tabs {
  margin-bottom: 12px;
}

/* 财务数据样式 */
.finance-data {
  margin-top: 16px;
  --finance-scale: 1;
}
.module-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.finance-table :deep(.el-table__header th),
.finance-table :deep(.el-table__body td) {
  font-size: calc(13px * var(--finance-scale));
  padding-top: calc(8px * var(--finance-scale));
  padding-bottom: calc(8px * var(--finance-scale));
}

.finance-table :deep(.el-table__header th:nth-child(1)),
.finance-table :deep(.el-table__body td:nth-child(1)) {
  width: calc(110px * var(--finance-scale)) !important;
  min-width: calc(110px * var(--finance-scale)) !important;
  white-space: nowrap;
}

.finance-table :deep(.el-table__header th:nth-child(2)),
.finance-table :deep(.el-table__body td:nth-child(2)) {
  width: calc(90px * var(--finance-scale)) !important;
  min-width: calc(90px * var(--finance-scale)) !important;
  white-space: nowrap;
}

.finance-table :deep(.el-table__header th:nth-child(3)),
.finance-table :deep(.el-table__body td:nth-child(3)) {
  white-space: nowrap;
}

/* ===== 响应式：移动端 ===== */
@media screen and (max-width: 767px) {
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    gap: 8px;
  }
  .stock-name {
    font-size: 18px;
  }
  .current-price {
    font-size: 22px;
  }
  .price-change {
    font-size: 15px;
  }
  .stock-other {
    gap: 10px;
  }
  .other-item {
    font-size: 12px;
  }
  .stock-actions {
    width: 100%;
  }
  .stock-actions .el-button {
    flex: 1;
  }
  .kline-chart {
    margin-bottom: 12px;
  }
  .module-title {
    font-size: 14px;
  }
}

/* ===== 响应式：平板 ===== */
@media screen and (min-width: 768px) and (max-width: 1199px) {
  .stock-header {
    padding: 14px 16px;
  }
  .current-price {
    font-size: 26px;
  }
  .price-change {
    font-size: 16px;
  }
  .finance-data {
    --finance-scale: 0.92;
  }
}

/* ===== 响应式：约1000px改为上下布局 ===== */
@media screen and (max-width: 1024px) {
  .chart-board-row {
    flex-wrap: wrap;
  }
  .chart-board-row > .el-col-md-16,
  .chart-board-row > .el-col-md-8 {
    width: 100%;
    max-width: 100%;
    flex: 0 0 100%;
  }
  .chart-board-row > .el-col-md-8 {
    margin-top: 12px;
  }
  .order-book-panel {
    height: auto;
    min-height: 520px;
  }
  .panel-content {
    min-height: 320px;
  }
  .chip-view,
  .chip-chart {
    min-height: 320px;
  }
  .finance-data {
    --finance-scale: 0.84;
  }
}

/* ===== 响应式：超小屏 ===== */
@media screen and (max-width: 420px) {
  .stock-actions .refresh-btn .refresh-text {
    display: none;
  }
  .stock-actions .refresh-btn {
    min-width: auto;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #409eff;
    box-shadow: none;
    font-size: 20px;
  }
  .stock-actions .refresh-btn i {
    font-size: 20px;
  }
  .stock-actions .refresh-btn:hover,
  .stock-actions .refresh-btn:focus {
    background: transparent;
    color: #66b1ff;
  }
  .finance-data {
    --finance-scale: 0.68;
  }
}

/* ===== 响应式：财务表格中小屏 ===== */
@media screen and (max-width: 600px) {
  .finance-data {
    --finance-scale: 0.76;
  }
}

/* 盘口与筹码分析区域样式 */
.chart-board-row {
  margin-bottom: 16px;
}
.order-book-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg);
  overflow: hidden;
}
.panel-tabs {
  display: flex;
  background: rgba(0,0,0,0.02);
  border-bottom: 1px solid var(--color-border);
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all 0.3s;
}
.tab-item:hover {
  color: #409EFF;
}
.tab-item.active {
  color: #409EFF;
  font-weight: 600;
  background: var(--color-card-bg);
  border-bottom: 2px solid #409EFF;
}

.panel-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.view-container {
  height: 100%;
  overflow-y: auto;
}

/* 五档盘口样式优化 */
.order-view {
  padding: 10px 0;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 12px;
}
.order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  height: 24px;
  position: relative;
}
.order-label {
  color: var(--color-text-secondary);
  width: 36px;
}
.order-price {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  width: 70px;
  text-align: right;
}
.order-vol {
  flex: 1;
  text-align: right;
  color: var(--color-text);
  z-index: 1;
}
.vol-bar {
  position: absolute;
  right: 0;
  top: 4px;
  bottom: 4px;
  opacity: 0.15;
  transition: width 0.3s;
  border-radius: 2px;
}
.bg-sell { background-color: var(--color-down); }
.bg-buy { background-color: var(--color-up); }

/* 最新价分割线 */
.current-price-divider {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 12px;
  padding: 8px 0;
  border-top: 1px dashed var(--color-border);
  border-bottom: 1px dashed var(--color-border);
}
.cp-left { font-size: 13px; color: var(--color-text-secondary); }
.cp-center { font-size: 18px; font-weight: bold; font-family: 'Roboto Mono', monospace; }
.cp-right { font-size: 13px; font-weight: 500; }

/* 筹码分布图 */
.chip-chart {
  width: 100%;
  height: 100%;
}

/* 底部筹码数据统计 */
.panel-footer {
  padding: 12px;
  background: rgba(0,0,0,0.02);
  border-top: 1px solid var(--color-border);
}
.chip-stat-box {
  background: rgba(64, 158, 255, 0.08);
  border-radius: 6px;
  padding: 10px 12px;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}
.stat-row:last-child { margin-bottom: 0; }
.stat-row .label { color: var(--color-text-secondary); }
.stat-row .value { font-weight: 600; color: var(--color-text); }

/* 深色模式适配 */
[data-theme="dark"] .panel-tabs { background: rgba(255,255,255,0.02); }
[data-theme="dark"] .chip-stat-box { background: rgba(255,255,255,0.05); }
</style>