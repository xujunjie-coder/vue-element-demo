<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <!-- 股票基本信息 -->
    <div class="card-container stock-header">
      <div class="stock-basic">
        <h2 class="stock-name">
          {{ stockDetail.name }} ({{ stockDetail.code }})
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
        <el-button type="primary" @click="addToOptional">加入自选</el-button>
        <el-button type="success" @click="toTrade">交易操作</el-button>
        <el-button type="text" @click="refreshDetail">刷新数据</el-button>
      </div>
    </div>

    <!-- K线图区域 -->
    <div class="card-container kline-chart">
      <div class="chart-tabs">
        <el-radio-group v-model="klineType" @change="changeKlineType">
          <el-radio label="5min">5分钟</el-radio>
          <el-radio label="15min">15分钟</el-radio>
          <el-radio label="30min">30分钟</el-radio>
          <el-radio label="60min">60分钟</el-radio>
          <el-radio label="day">日K</el-radio>
        </el-radio-group>
      </div>
      <div ref="klineChart" style="width: 100%; height: 400px;"></div>
    </div>

    <!-- AI预测模块 -->
    <AIPrediction
      :prediction="stockDetail.aiPrediction"
      :current-price="stockDetail.price"
    />

    <!-- 财务数据模块 -->
    <div class="card-container finance-data hide-on-mobile">
      <h3 class="module-title">财务核心数据</h3>
      <el-table :data="financeList" border style="width: 100%;">
        <el-table-column prop="name" label="指标名称" width="150" />
        <el-table-column prop="latest" label="最新值" width="120">
          <template slot-scope="scope">
            <span :class="scope.row.change > 0 ? 'text-up' : scope.row.change < 0 ? 'text-down' : ''">
              {{ scope.row.latest }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="change" label="变动" width="100">
          <template slot-scope="scope">
            <span :class="scope.row.change > 0 ? 'text-up' : scope.row.change < 0 ? 'text-down' : ''">
              {{ scope.row.change > 0 ? '+' : '' }}{{ scope.row.change }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="指标说明" />
      </el-table>
    </div>
  </el-main>
</template>

<script>
import { mapActions,mapState } from 'vuex';
import * as echarts from 'echarts';
import request from '../../utils/request';
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
        { name: '市盈率', latest: '28.5', change: 2.3, description: '当前股价相对每股收益的倍数' },
        { name: '市净率', latest: '5.2', change: -1.1, description: '当前股价相对每股净资产的倍数' },
        { name: '毛利率', latest: '91.3%', change: 0.5, description: '毛利润占营业收入的百分比' },
        { name: '净利润率', latest: '51.8%', change: 1.2, description: '净利润占营业收入的百分比' },
        { name: '营收增长率', latest: '15.7%', change: 3.1, description: '营业收入同比增长幅度' },
        { name: '净利润增长率', latest: '18.2%', change: 2.8, description: '净利润同比增长幅度' },
        { name: '资产负债率', latest: '15.3%', change: -0.8, description: '负债总额占资产总额的百分比' },
        { name: 'ROE', latest: '29.7%', change: 1.5, description: '净资产收益率' }
      ],
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
    // 初始化K线图
    this.initKlineChart();
  },
  watch: {
    // 监听路由参数变化，切换不同股票时重新加载
    '$route.params.code'() {
      this.fetchStockDetail();
    }
  },
  beforeDestroy() {
    // 销毁K线图实例，释放资源
    this.klineChartInstance?.dispose();
    // 移除resize事件监听，避免内存泄漏
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    ...mapActions(['addOptionalStock']),
    getChangeClass,

    // 处理窗口resize事件（单独定义便于销毁）
    handleResize() {
      this.klineChartInstance?.resize();
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

        // 2. 获取K线数据（天级）
        await this.fetchKlineData();
      } catch (err) {
        this.$message.error('股票详情加载失败');
        console.error('fetchStockDetail error:', err);
      } finally {
        this.loading = false;
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
      this.klineChartInstance = echarts.init(this.$refs.klineChart);
    },

    // 更新K线图数据和样式
    updateKlineChart(data) {
      if (!this.klineChartInstance || !data || data.length === 0) return;
      
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
          textStyle: { fontSize: 11 },
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
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: { fontSize: 10, rotate: 30, color: '#666',
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
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: { show: false },
            splitLine: { show: false }
          }
        ],
        yAxis: [
          {
            type: 'value', scale: true,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 10, color: '#666' },
            splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
          },
          {
            type: 'value', gridIndex: 1, scale: true,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
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

    // 加入自选股
    addToOptional() {
      this.addOptionalStock({
        code: this.stockDetail.code,
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
          code: this.stockDetail.code, 
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
  color: #666;
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
}
.module-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
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
}
</style>