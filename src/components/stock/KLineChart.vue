<template>
  <div class="kline-chart-container" :class="{ 'kline-fullscreen': isFullScreen }">
    <!-- K线图控制栏 -->
    <div class="chart-controls">
      <!-- 周期切换 -->
      <div class="period-group">
        <el-radio-group v-model="period" size="mini" @change="handlePeriodChange">
          <el-radio-button label="1day">日K</el-radio-button>
          <el-radio-button label="1week">周K</el-radio-button>
          <el-radio-button label="1month">月K</el-radio-button>
          <el-radio-button label="5min">5分</el-radio-button>
          <el-radio-button label="15min">15分</el-radio-button>
          <el-radio-button label="30min">30分</el-radio-button>
          <el-radio-button label="60min">60分</el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 指标切换 -->
      <div class="indicator-group">
        <el-radio-group v-model="indicator" size="mini" @change="handleIndicatorChange">
          <el-radio-button label="ma">MA</el-radio-button>
          <el-radio-button label="macd">MACD</el-radio-button>
          <el-radio-button label="kdj">KDJ</el-radio-button>
          <el-radio-button label="rsi">RSI</el-radio-button>
          <el-radio-button label="boll">BOLL</el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 操作按钮 -->
      <div class="chart-actions">
        <el-tooltip content="全屏" placement="top" :open-delay="500">
          <el-button type="text" size="mini" @click="toggleFullScreen">
            <i :class="isFullScreen ? 'el-icon-close' : 'el-icon-full-screen'"></i>
          </el-button>
        </el-tooltip>
        <el-tooltip content="刷新" placement="top" :open-delay="500">
          <el-button type="text" size="mini" @click="refreshChart" :loading="loading">
            <i class="el-icon-refresh"></i>
          </el-button>
        </el-tooltip>
        <el-tooltip content="导出PNG" placement="top" :open-delay="500">
          <el-button type="text" size="mini" @click="exportChart">
            <i class="el-icon-download"></i>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    
    <!-- 统一图表容器：K线 + 成交量 + 技术指标 -->
    <div v-loading="loading" element-loading-text="加载K线数据..." class="chart-body">
      <div ref="chartContainer" class="chart-main" :style="{ height: totalChartHeight + 'px' }"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import request from '../../utils/request';
import { MinuteScale } from '../../utils/constants';
import { debounce } from '../../utils/tool';

export default {
  name: 'KlineChart',
  props: {
    stockCode: { type: String, required: true, default: '600519' },
    initPeriod: { type: String, default: '1day' },
    height: { type: Number, default: 480 },
    showIndicator: { type: Boolean, default: true }
  },
  data() {
    return {
      period: this.initPeriod,
      indicator: 'ma',
      chartInstance: null,
      klineData: [],
      indicatorData: {},
      isFullScreen: false,
      loading: false,
      colorUp: '#e53935',
      colorDown: '#2f9b56'
    };
  },
  computed: {
    totalChartHeight() {
      if (this.isFullScreen) return window.innerHeight - 60;
      return this.height;
    }
  },
  watch: {
    stockCode: { immediate: true, handler() { this.fetchKlineData(); } },
    height() { this.$nextTick(() => this.resizeChart()); }
  },
  mounted() {
    this.initChart();
    this._resizeHandler = debounce(() => this.resizeChart(), 200);
    window.addEventListener('resize', this._resizeHandler);
  },
  beforeDestroy() {
    this.chartInstance?.dispose();
    window.removeEventListener('resize', this._resizeHandler);
  },
  methods: {
    initChart() {
      if (this.$refs.chartContainer) {
        this.chartInstance = echarts.init(this.$refs.chartContainer);
      }
    },
    async fetchKlineData() {
      this.loading = true;
      try {
        let rawData = [];
        if (this.period.includes('min')) {
          const scaleValue = MinuteScale[this.period] || this.period.replace('min', '');
          const res = await request.getMinuteHistory({ code: this.stockCode, scale: scaleValue, datalen: 200 });
          rawData = (res.data || []).map(item => ({
            date: item.day || '', open: String(item.open), close: String(item.close),
            high: String(item.hod), low: String(item.lod), volume: Number(item.vol) || 0
          }));
        } else {
          const res = await request.getMinuteHistory({ code: this.stockCode, scale: 60, datalen: 1970 });
          const rawList = res.data || [];
          const dayMap = {};
          rawList.forEach(item => {
            const dateStr = item.day ? item.day.split(' ')[0] : '';
            if (!dateStr) return;
            if (!dayMap[dateStr]) {
              dayMap[dateStr] = { date: dateStr, open: String(item.open), close: String(item.close),
                high: Number(item.hod), low: Number(item.lod), volume: Number(item.vol) || 0 };
            } else {
              const d = dayMap[dateStr];
              d.close = String(item.close);
              d.high = Math.max(d.high, Number(item.hod));
              d.low = Math.min(d.low, Number(item.lod));
              d.volume += Number(item.vol) || 0;
            }
          });
          let dayList = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
          if (this.period === '1week') dayList = this._aggregateByPeriod(dayList, 'week');
          else if (this.period === '1month') dayList = this._aggregateByPeriod(dayList, 'month');
          rawData = dayList.map(d => ({ date: d.date, open: String(d.open), close: String(d.close),
            high: String(d.high), low: String(d.low), volume: d.volume }));
        }
        this.klineData = rawData;
      } catch (err) {
        console.warn('KLineChart fetchKlineData error:', err);
        this.klineData = [];
      }
      this.loading = false;
      this.calculateIndicator();
      this.updateChart();
    },
    _aggregateByPeriod(dayList, type) {
      const groups = {};
      dayList.forEach(d => {
        let key;
        if (type === 'week') {
          const dt = new Date(d.date);
          const dayOfWeek = dt.getDay() || 7;
          const monday = new Date(dt);
          monday.setDate(dt.getDate() - dayOfWeek + 1);
          key = monday.toISOString().split('T')[0];
        } else {
          key = d.date.substring(0, 7);
        }
        if (!groups[key]) {
          groups[key] = { date: d.date, open: d.open, close: d.close, high: Number(d.high), low: Number(d.low), volume: d.volume };
        } else {
          const g = groups[key];
          g.close = d.close; g.high = Math.max(g.high, Number(d.high));
          g.low = Math.min(g.low, Number(d.low)); g.volume += d.volume;
        }
      });
      return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
    },
    calculateIndicator() {
      this.indicatorData = { ma: this.calculateMA(), macd: this.calculateMACD(), kdj: this.calculateKDJ(), rsi: this.calculateRSI(), boll: this.calculateBOLL() };
    },
    calculateMA() {
      const calcN = (n) => this.klineData.map((_, i) => {
        if (i < n - 1) return null;
        let sum = 0; for (let j = i - n + 1; j <= i; j++) sum += parseFloat(this.klineData[j].close);
        return +(sum / n).toFixed(2);
      });
      return { ma5: calcN(5), ma10: calcN(10), ma20: calcN(20), ma30: calcN(30) };
    },
    calculateMACD() {
      const ema12 = [], ema26 = [], dif = [], dea = [], macd = [];
      for (let i = 0; i < this.klineData.length; i++) {
        const close = parseFloat(this.klineData[i].close);
        ema12.push(i === 0 ? close : (2 * close + 10 * ema12[i-1]) / 12);
        ema26.push(i === 0 ? close : (2 * close + 24 * ema26[i-1]) / 26);
        dif.push(+(ema12[i] - ema26[i]).toFixed(4));
        dea.push(i === 0 ? dif[i] : +(2 * dif[i] + 8 * dea[i-1]).toFixed(4) / 10);
        if (i > 0) dea[i] = +((2 * dif[i] + 8 * dea[i-1]) / 10).toFixed(4);
        macd.push(+(2 * (dif[i] - dea[i])).toFixed(4));
      }
      return { dif, dea, macd };
    },
    calculateKDJ() {
      const k = [], d = [], j = [];
      for (let i = 0; i < this.klineData.length; i++) {
        if (i < 8) { k.push(null); d.push(null); j.push(null); continue; }
        let lows = [], highs = [];
        for (let x = i - 8; x <= i; x++) { lows.push(parseFloat(this.klineData[x].low)); highs.push(parseFloat(this.klineData[x].high)); }
        const lowMin = Math.min(...lows), highMax = Math.max(...highs);
        const rsv = ((parseFloat(this.klineData[i].close) - lowMin) / (highMax - lowMin || 1)) * 100;
        const kVal = i === 8 ? rsv : (2 * k[i-1] + rsv) / 3;
        k.push(+kVal.toFixed(2));
        const dVal = i === 8 ? kVal : (2 * d[i-1] + kVal) / 3;
        d.push(+dVal.toFixed(2));
        j.push(+(3 * kVal - 2 * dVal).toFixed(2));
      }
      return { k, d, j };
    },
    calculateRSI() {
      const calcRSI = (n) => this.klineData.map((_, i) => {
        if (i < n) return null;
        let up = 0, down = 0;
        for (let x = i - n; x < i; x++) {
          const c = parseFloat(this.klineData[x + 1].close) - parseFloat(this.klineData[x].close);
          c > 0 ? up += c : down += Math.abs(c);
        }
        return +(100 - 100 / (1 + up / (down || 0.0001))).toFixed(2);
      });
      return { rsi6: calcRSI(6), rsi12: calcRSI(12), rsi24: calcRSI(24) };
    },
    calculateBOLL() {
      const mid = [], up = [], down = [];
      for (let i = 0; i < this.klineData.length; i++) {
        if (i < 19) { mid.push(null); up.push(null); down.push(null); continue; }
        let sum = 0;
        for (let x = i - 19; x <= i; x++) sum += parseFloat(this.klineData[x].close);
        const m = sum / 20; let var2 = 0;
        for (let x = i - 19; x <= i; x++) var2 += Math.pow(parseFloat(this.klineData[x].close) - m, 2);
        const std = Math.sqrt(var2 / 20);
        mid.push(+m.toFixed(2)); up.push(+(m + 2 * std).toFixed(2)); down.push(+(m - 2 * std).toFixed(2));
      }
      return { mid, up, down };
    },

    // ========== 核心：构建统一图表 ==========
    updateChart() {
      if (!this.chartInstance || this.klineData.length === 0) return;

      const data = this.klineData;
      const dates = data.map(d => d.date);
      const ohlc = data.map(d => [+d.open, +d.close, +d.low, +d.high]);
      const vols = data.map(d => d.volume);
      const len = data.length;
      const startPct = len > 80 ? +((len - 80) / len * 100).toFixed(0) : 0;

      // ===== 构建 grid 布局 =====
      const grids = [
        { left: '8%', right: '3%', top: 50, height: '48%' },      // K线主图
        { left: '8%', right: '3%', top: '64%', height: '12%' }    // 成交量
      ];
      const xAxes = [
        { type: 'category', data: dates, boundaryGap: true, axisLine: { lineStyle: { color: '#ddd' } },
          axisLabel: { fontSize: 10, color: '#888', formatter: v => v.length > 10 ? v.split(' ')[1]?.substring(0,5) || v.substring(5) : v.substring(5) },
          splitLine: { show: false }, gridIndex: 0, axisPointer: { label: { show: true, formatter: p => p.value } } },
        { type: 'category', data: dates, boundaryGap: true, gridIndex: 1,
          axisLine: { lineStyle: { color: '#ddd' } }, axisLabel: { show: false }, splitLine: { show: false } }
      ];
      const yAxes = [
        { type: 'value', scale: true, gridIndex: 0, axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { fontSize: 10, color: '#888' }, splitLine: { lineStyle: { color: '#f5f5f5', type: 'dashed' } },
          splitNumber: 4 },
        { type: 'value', scale: true, gridIndex: 1, axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { show: false }, splitLine: { show: false }, splitNumber: 2 }
      ];

      // 指标副图
      let indicatorGridIdx = -1;
      if (this.showIndicator && ['macd', 'kdj', 'rsi'].includes(this.indicator)) {
        indicatorGridIdx = 2;
        grids.push({ left: '8%', right: '3%', top: '80%', height: '14%' });
        xAxes.push({ type: 'category', data: dates, boundaryGap: true, gridIndex: 2,
          axisLine: { lineStyle: { color: '#ddd' } }, axisLabel: { show: false }, splitLine: { show: false } });
        yAxes.push({ type: 'value', scale: true, gridIndex: 2, axisLine: { show: false },
          axisTick: { show: false }, axisLabel: { fontSize: 9, color: '#aaa', inside: true },
          splitLine: { lineStyle: { color: '#f5f5f5', type: 'dashed' } }, splitNumber: 2 });
      }

      // ===== 构建 series =====
      const series = [];

      // K线主图
      series.push({
        name: 'K线', type: 'candlestick', xAxisIndex: 0, yAxisIndex: 0, data: ohlc,
        itemStyle: { color: this.colorUp, color0: this.colorDown, borderColor: this.colorUp, borderColor0: this.colorDown, borderWidth: 1 },
        barMaxWidth: 16
      });

      // 主图叠加均线 / 布林带
      if (this.indicator === 'ma') {
        const colors = { MA5: '#1890ff', MA10: '#faad14', MA20: '#52c41a', MA30: '#eb2f96' };
        ['ma5', 'ma10', 'ma20', 'ma30'].forEach((k, i) => {
          series.push({ name: k.toUpperCase(), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
            data: this.indicatorData.ma[k], showSymbol: false,
            lineStyle: { width: 1.2 }, itemStyle: { color: Object.values(colors)[i] } });
        });
      } else if (this.indicator === 'boll') {
        series.push(
          { name: 'MID', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: this.indicatorData.boll.mid, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#1890ff' } },
          { name: 'UPPER', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: this.indicatorData.boll.up, showSymbol: false, lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#e53935' } },
          { name: 'LOWER', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: this.indicatorData.boll.down, showSymbol: false, lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#2f9b56' } }
        );
      }

      // 成交量柱状图
      series.push({
        name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: vols,
        barMaxWidth: 16,
        itemStyle: {
          color: (p) => {
            const i = p.dataIndex;
            if (i === 0) return this.colorUp;
            return +data[i].close >= +data[i - 1].close ? this.colorUp : this.colorDown;
          },
          opacity: 0.7
        }
      });

      // 指标副图 series
      if (indicatorGridIdx >= 0) {
        if (this.indicator === 'macd') {
          series.push(
            { name: 'DIF', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.macd.dif, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#1890ff' } },
            { name: 'DEA', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.macd.dea, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#faad14' } },
            { name: 'MACD柱', type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.macd.macd, barMaxWidth: 8,
              itemStyle: { color: p => (p.data >= 0 ? this.colorUp : this.colorDown) } }
          );
        } else if (this.indicator === 'kdj') {
          series.push(
            { name: 'K', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.kdj.k, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#1890ff' } },
            { name: 'D', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.kdj.d, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#faad14' } },
            { name: 'J', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.kdj.j, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#52c41a' } }
          );
        } else if (this.indicator === 'rsi') {
          series.push(
            { name: 'RSI6', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.rsi.rsi6, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#1890ff' } },
            { name: 'RSI12', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.rsi.rsi12, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#faad14' } },
            { name: 'RSI24', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: this.indicatorData.rsi.rsi24, showSymbol: false, lineStyle: { width: 1.2 }, itemStyle: { color: '#52c41a' } }
          );
        }
      }

      // ===== 构建 legend =====
      const legendNames = series.filter(s => s.name !== 'K线' && s.name !== '成交量').map(s => s.name);

      // ===== dataZoom 联动所有X轴 =====
      const allXIdx = xAxes.map((_, i) => i);

      const option = {
        animation: true,
        animationDuration: 400,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross', crossStyle: { color: '#aaa', width: 0.8 },
            lineStyle: { color: '#aaa', width: 0.8, type: 'dashed' },
            label: { backgroundColor: 'rgba(50,50,50,0.85)', fontSize: 10, padding: [4, 6] } },
          backgroundColor: 'rgba(30,30,30,0.92)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: [10, 14],
          textStyle: { color: '#eee', fontSize: 12 },
          formatter: (params) => this._tooltipFormatter(params)
        },
        legend: {
          data: legendNames, top: 8, right: 60, itemWidth: 16, itemHeight: 3,
          textStyle: { fontSize: 11, color: '#888' }, itemGap: 12
        },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        grid: grids,
        xAxis: xAxes,
        yAxis: yAxes,
        dataZoom: [
          { type: 'inside', xAxisIndex: allXIdx, start: startPct, end: 100 },
          { type: 'slider', xAxisIndex: allXIdx, bottom: 4, height: 20,
            borderColor: 'transparent', backgroundColor: '#fafafa',
            fillerColor: 'rgba(24,144,255,0.12)',
            handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
            handleSize: '90%',
            handleStyle: { color: '#1890ff', shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.15)' },
            textStyle: { fontSize: 10, color: '#aaa' },
            start: startPct, end: 100 }
        ],
        series
      };

      this.chartInstance.setOption(option, true);
      this.$nextTick(() => this.resizeChart());
    },

    // 丰富的 Tooltip 格式化
    _tooltipFormatter(params) {
      if (!params || !params.length) return '';
      const idx = params[0].dataIndex;
      const d = this.klineData[idx];
      if (!d) return '';

      const o = +d.open, c = +d.close, h = +d.high, l = +d.low;
      const change = (c - o).toFixed(2);
      const changePct = o !== 0 ? ((c - o) / o * 100).toFixed(2) : '0.00';
      const color = c >= o ? this.colorUp : this.colorDown;
      const volStr = d.volume >= 100000000 ? (d.volume / 100000000).toFixed(2) + '亿'
        : d.volume >= 10000 ? (d.volume / 10000).toFixed(1) + '万' : d.volume;

      let html = `<div style="font-size:13px;font-weight:600;margin-bottom:6px;color:#fff">${d.date}</div>`;
      html += `<table style="border-spacing:0;font-size:12px;line-height:1.8">`;
      html += `<tr><td style="color:#aaa">开盘</td><td style="padding-left:12px;text-align:right">${o.toFixed(2)}</td></tr>`;
      html += `<tr><td style="color:#aaa">收盘</td><td style="padding-left:12px;text-align:right;font-weight:600;color:${color}">${c.toFixed(2)}</td></tr>`;
      html += `<tr><td style="color:#aaa">最高</td><td style="padding-left:12px;text-align:right;color:${this.colorUp}">${h.toFixed(2)}</td></tr>`;
      html += `<tr><td style="color:#aaa">最低</td><td style="padding-left:12px;text-align:right;color:${this.colorDown}">${l.toFixed(2)}</td></tr>`;
      html += `<tr><td style="color:#aaa">涨跌</td><td style="padding-left:12px;text-align:right;color:${color}">${change > 0 ? '+' : ''}${change} (${changePct}%)</td></tr>`;
      html += `<tr><td style="color:#aaa">成交量</td><td style="padding-left:12px;text-align:right">${volStr}</td></tr>`;
      html += `</table>`;

      // 附加指标数值
      const indicators = params.filter(p => p.seriesType === 'line' && p.data != null);
      if (indicators.length) {
        html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.15)">`;
        indicators.forEach(p => {
          html += `<span style="margin-right:10px">${p.marker}<span style="color:#ccc">${p.seriesName}</span> <b>${typeof p.data === 'number' ? p.data.toFixed(2) : p.data}</b></span>`;
        });
        html += `</div>`;
      }
      return html;
    },

    handlePeriodChange() { this.fetchKlineData(); },
    handleIndicatorChange() { this.updateChart(); },
    refreshChart() { this.fetchKlineData(); },
    toggleFullScreen() {
      this.isFullScreen = !this.isFullScreen;
      this.$nextTick(() => this.resizeChart());
    },
    exportChart() {
      const url = this.chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `${this.stockCode}_${this.period}_${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      this.$message.success('K线图已导出');
    },
    resizeChart() { this.chartInstance?.resize(); }
  }
};
</script>

<style scoped>
.kline-chart-container {
  width: 100%;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}

.kline-fullscreen {
  position: fixed !important;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  border-radius: 0;
  box-shadow: none;
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
  gap: 8px;
  background: #fafbfc;
}

.period-group,
.indicator-group {
  flex-shrink: 0;
}

.chart-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

.chart-actions .el-button {
  font-size: 16px;
  padding: 4px 8px;
  color: #666;
}

.chart-actions .el-button:hover {
  color: #1890ff;
}

.chart-body {
  position: relative;
}

.chart-main {
  width: 100%;
  min-height: 320px;
}

/* ===== 响应式：平板 ===== */
@media screen and (max-width: 1199px) {
  .chart-controls {
    padding: 6px 10px;
    gap: 6px;
  }
}

/* ===== 响应式：手机 ===== */
@media screen and (max-width: 768px) {
  .chart-controls {
    flex-direction: column;
    align-items: stretch;
    padding: 6px 8px;
    gap: 6px;
  }
  .period-group {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .period-group .el-radio-group {
    white-space: nowrap;
  }
  .chart-actions {
    justify-content: flex-end;
  }
  .chart-main {
    min-height: 260px;
  }
}
</style>