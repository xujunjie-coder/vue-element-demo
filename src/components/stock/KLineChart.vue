<template>
  <div class="kline-chart-container">
    <!-- K线图控制栏 -->
    <div class="chart-controls">
      <!-- 周期切换 -->
      <el-radio-group v-model="period" @change="handlePeriodChange">
        <el-radio label="1day">日K</el-radio>
        <el-radio label="1week">周K</el-radio>
        <el-radio label="1month">月K</el-radio>
        <el-radio label="5min">5分钟</el-radio>
        <el-radio label="15min">15分钟</el-radio>
        <el-radio label="30min">30分钟</el-radio>
        <el-radio label="60min">60分钟</el-radio>
      </el-radio-group>
      
      <!-- 指标切换 -->
      <el-select v-model="indicator" size="mini" @change="handleIndicatorChange">
        <el-option label="MA" value="ma">均线</el-option>
        <el-option label="MACD" value="macd">MACD</el-option>
        <el-option label="KDJ" value="kdj">KDJ</el-option>
        <el-option label="RSI" value="rsi">RSI</el-option>
        <el-option label="BOLL" value="boll">布林带</el-option>
      </el-select>
      
      <!-- 操作按钮 -->
      <div class="chart-actions">
        <el-button type="text" size="mini" @click="toggleFullScreen">
          <i class="el-icon-full-screen"></i>
        </el-button>
        <el-button type="text" size="mini" @click="refreshChart">
          <i class="el-icon-refresh"></i>
        </el-button>
        <el-button type="text" size="mini" @click="exportChart">
          <i class="el-icon-download"></i> 导出
        </el-button>
      </div>
    </div>
    
    <!-- K线图主体 -->
    <div ref="chartContainer" class="chart-main" :style="{ height: chartHeight + 'px' }"></div>
    
    <!-- 技术指标副图 -->
    <div ref="indicatorContainer" class="chart-indicator" v-if="showIndicator"></div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import { debounce } from '../../utils/tool';

export default {
  name: 'KlineChart',
  props: {
    // 股票代码
    stockCode: {
      type: String,
      required: true,
      default: '600519'
    },
    // 初始周期
    initPeriod: {
      type: String,
      default: '1day'
    },
    // 图表高度
    height: {
      type: Number,
      default: 400
    },
    // 是否显示技术指标副图
    showIndicator: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      // 当前周期
      period: this.initPeriod,
      // 当前技术指标
      indicator: 'ma',
      // 图表实例
      chartInstance: null,
      // 指标图实例
      indicatorInstance: null,
      // 图表高度
      chartHeight: this.height,
      // K线数据
      klineData: [],
      // 指标数据
      indicatorData: {},
      // 是否全屏
      isFullScreen: false,
      // 涨跌色（匹配规范）
      colorUp: '#e53935',
      colorDown: '#2f9b56',
      // 中性色（补充规范）
      colorBg: '#f8f8f8',
      colorBorder: '#e6e6e6',
      colorTextMain: '#333',
      colorTextSecondary: '#666',
      colorTextHint: '#999'
    };
  },
  watch: {
    stockCode: {
      immediate: true,
      handler() {
        this.fetchKlineData();
      }
    },
    height(newVal) {
      this.chartHeight = newVal;
      this.resizeChart();
    }
  },
  mounted() {
    // 初始化图表
    this.initChart();
    
    // 窗口大小变化时调整图表
    window.addEventListener('resize', debounce(() => {
      this.resizeChart();
    }, 200));
  },
  beforeDestroy() {
    // 销毁图表实例
    this.chartInstance?.dispose();
    this.indicatorInstance?.dispose();
    
    // 移除事件监听
    window.removeEventListener('resize', this.resizeChart);
  },
  methods: {
    // 初始化K线图
    initChart() {
      // 主图初始化
      if (this.$refs.chartContainer) {
        this.chartInstance = echarts.init(this.$refs.chartContainer);
      }
      
      // 指标图初始化
      if (this.showIndicator && this.$refs.indicatorContainer) {
        this.indicatorInstance = echarts.init(this.$refs.indicatorContainer);
      }
      
      // 设置默认配置
      this.setChartOption();
    },
    // 获取K线数据
    fetchKlineData() {
      // 模拟接口请求，实际项目中替换为真实接口
      // 生成模拟K线数据
      const dataCount = this.period.includes('min') ? 96 : (this.period === '1day' ? 60 : (this.period === '1week' ? 52 : 12));
      const basePrice = 1800 + Math.random() * 200;
      
      this.klineData = [];
      const now = new Date();
      
      for (let i = dataCount; i >= 0; i--) {
        const date = new Date(now);
        if (this.period === '1day') {
          date.setDate(date.getDate() - i);
        } else if (this.period === '1week') {
          date.setDate(date.getDate() - i * 7);
        } else if (this.period === '1month') {
          date.setMonth(date.getMonth() - i);
        } else {
          date.setMinutes(date.getMinutes() - i * parseInt(this.period));
        }
        
        // 生成随机价格
        const open = basePrice + Math.random() * 100 - 50;
        const close = open + Math.random() * 50 - 25;
        const high = Math.max(open, close) + Math.random() * 20;
        const low = Math.min(open, close) - Math.random() * 20;
        const volume = Math.floor(Math.random() * 1000000);
        
        this.klineData.push({
          date: date.toLocaleDateString().replace(/\//g, '-'),
          open: open.toFixed(2),
          close: close.toFixed(2),
          high: high.toFixed(2),
          low: low.toFixed(2),
          volume: volume
        });
      }
      
      // 计算技术指标
      this.calculateIndicator();
      
      // 更新图表
      this.updateChart();
    },
    // 计算技术指标
    calculateIndicator() {
      this.indicatorData = {
        ma: this.calculateMA(),
        macd: this.calculateMACD(),
        kdj: this.calculateKDJ(),
        rsi: this.calculateRSI(),
        boll: this.calculateBOLL()
      };
    },
    // 计算均线
    calculateMA() {
      const ma5 = [];
      const ma10 = [];
      const ma20 = [];
      const ma30 = [];
      
      for (let i = 0; i < this.klineData.length; i++) {
        if (i < 4) {
          ma5.push('-');
        } else {
          let sum = 0;
          for (let j = i - 4; j <= i; j++) {
            sum += parseFloat(this.klineData[j].close);
          }
          ma5.push((sum / 5).toFixed(2));
        }
        
        if (i < 9) {
          ma10.push('-');
        } else {
          let sum = 0;
          for (let j = i - 9; j <= i; j++) {
            sum += parseFloat(this.klineData[j].close);
          }
          ma10.push((sum / 10).toFixed(2));
        }
        
        if (i < 19) {
          ma20.push('-');
        } else {
          let sum = 0;
          for (let j = i - 19; j <= i; j++) {
            sum += parseFloat(this.klineData[j].close);
          }
          ma20.push((sum / 20).toFixed(2));
        }
        
        if (i < 29) {
          ma30.push('-');
        } else {
          let sum = 0;
          for (let j = i - 29; j <= i; j++) {
            sum += parseFloat(this.klineData[j].close);
          }
          ma30.push((sum / 30).toFixed(2));
        }
      }
      
      return { ma5, ma10, ma20, ma30 };
    },
    // 计算MACD
    calculateMACD() {
      const ema12 = [];
      const ema26 = [];
      const dif = [];
      const dea = [];
      const macd = [];
      
      for (let i = 0; i < this.klineData.length; i++) {
        const close = parseFloat(this.klineData[i].close);
        
        // EMA12
        if (i === 0) {
          ema12.push(close.toFixed(2));
        } else {
          const ema = (2 * close + 10 * parseFloat(ema12[i - 1])) / 12;
          ema12.push(ema.toFixed(2));
        }
        
        // EMA26
        if (i === 0) {
          ema26.push(close.toFixed(2));
        } else {
          const ema = (2 * close + 24 * parseFloat(ema26[i - 1])) / 26;
          ema26.push(ema.toFixed(2));
        }
        
        // DIF = EMA12 - EMA26
        dif.push((parseFloat(ema12[i]) - parseFloat(ema26[i])).toFixed(4));
        
        // DEA
        if (i === 0) {
          dea.push(dif[i]);
        } else {
          const deaVal = (2 * parseFloat(dif[i]) + 8 * parseFloat(dea[i - 1])) / 10;
          dea.push(deaVal.toFixed(4));
        }
        
        // MACD = 2 * (DIF - DEA)
        macd.push((2 * (parseFloat(dif[i]) - parseFloat(dea[i]))).toFixed(4));
      }
      
      return { dif, dea, macd };
    },
    // 计算KDJ
    calculateKDJ() {
      const k = [];
      const d = [];
      const j = [];
      
      for (let i = 0; i < this.klineData.length; i++) {
        if (i < 8) {
          k.push('-');
          d.push('-');
          j.push('-');
        } else {
          // 计算未成熟随机值RSV
          let lowArr = [];
          let highArr = [];
          
          for (let j = i - 8; j <= i; j++) {
            lowArr.push(parseFloat(this.klineData[j].low));
            highArr.push(parseFloat(this.klineData[j].high));
          }
          
          const lowMin = Math.min(...lowArr);
          const highMax = Math.max(...highArr);
          const close = parseFloat(this.klineData[i].close);
          
          const rsv = ((close - lowMin) / (highMax - lowMin)) * 100;
          
          // 计算K
          if (i === 8) {
            k.push((rsv).toFixed(2));
          } else {
            const kVal = (2 * parseFloat(k[i - 1]) + rsv) / 3;
            k.push(kVal.toFixed(2));
          }
          
          // 计算D
          if (i === 8) {
            d.push(parseFloat(k[i]).toFixed(2));
          } else {
            const dVal = (2 * parseFloat(d[i - 1]) + parseFloat(k[i])) / 3;
            d.push(dVal.toFixed(2));
          }
          
          // 计算J
          const jVal = 3 * parseFloat(k[i]) - 2 * parseFloat(d[i]);
          j.push(jVal.toFixed(2));
        }
      }
      
      return { k, d, j };
    },
    // 计算RSI
    calculateRSI() {
      const rsi6 = [];
      const rsi12 = [];
      const rsi24 = [];
      
      for (let i = 0; i < this.klineData.length; i++) {
        if (i < 5) {
          rsi6.push('-');
        } else {
          let upSum = 0;
          let downSum = 0;
          
          for (let j = i - 5; j < i; j++) {
            const change = parseFloat(this.klineData[j + 1].close) - parseFloat(this.klineData[j].close);
            if (change > 0) {
              upSum += change;
            } else {
              downSum += Math.abs(change);
            }
          }
          
          const rs = upSum / (downSum || 0.0001);
          const rsi = 100 - (100 / (1 + rs));
          rsi6.push(rsi.toFixed(2));
        }
        
        if (i < 11) {
          rsi12.push('-');
        } else {
          let upSum = 0;
          let downSum = 0;
          
          for (let j = i - 11; j < i; j++) {
            const change = parseFloat(this.klineData[j + 1].close) - parseFloat(this.klineData[j].close);
            if (change > 0) {
              upSum += change;
            } else {
              downSum += Math.abs(change);
            }
          }
          
          const rs = upSum / (downSum || 0.0001);
          const rsi = 100 - (100 / (1 + rs));
          rsi12.push(rsi.toFixed(2));
        }
        
        if (i < 23) {
          rsi24.push('-');
        } else {
          let upSum = 0;
          let downSum = 0;
          
          for (let j = i - 23; j < i; j++) {
            const change = parseFloat(this.klineData[j + 1].close) - parseFloat(this.klineData[j].close);
            if (change > 0) {
              upSum += change;
            } else {
              downSum += Math.abs(change);
            }
          }
          
          const rs = upSum / (downSum || 0.0001);
          const rsi = 100 - (100 / (1 + rs));
          rsi24.push(rsi.toFixed(2));
        }
      }
      
      return { rsi6, rsi12, rsi24 };
    },
    // 计算布林带
    calculateBOLL() {
      const mid = [];
      const up = [];
      const down = [];
      
      for (let i = 0; i < this.klineData.length; i++) {
        if (i < 19) {
          mid.push('-');
          up.push('-');
          down.push('-');
        } else {
          // 中轨 = 20日均线
          let sum = 0;
          for (let j = i - 19; j <= i; j++) {
            sum += parseFloat(this.klineData[j].close);
          }
          const midVal = sum / 20;
          mid.push(midVal.toFixed(2));
          
          // 计算标准差
          let variance = 0;
          for (let j = i - 19; j <= i; j++) {
            variance += Math.pow(parseFloat(this.klineData[j].close) - midVal, 2);
          }
          const std = Math.sqrt(variance / 20);
          
          // 上轨 = 中轨 + 2*标准差
          up.push((midVal + 2 * std).toFixed(2));
          
          // 下轨 = 中轨 - 2*标准差
          down.push((midVal - 2 * std).toFixed(2));
        }
      }
      
      return { mid, up, down };
    },
    // 设置图表配置
    setChartOption() {
      // 主图配置
      const mainOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#333'
            }
          },
          formatter: params => {
            let res = params[0].axisValue;
            params.forEach(param => {
              if (param.seriesType === 'candlestick') {
                res += `<br/>${param.seriesName}: 
                        开: ${param.data[0]}, 
                        高: ${param.data[3]}, 
                        低: ${param.data[2]}, 
                        收: ${param.data[1]}`;
              } else if (param.seriesType === 'line') {
                res += `<br/>${param.seriesName}: ${param.data[1]}`;
              }
            });
            return res;
          }
        },
        legend: {
          data: ['K线', 'MA5', 'MA10', 'MA20', 'MA30', '布林中轨', '布林上轨', '布林下轨'],
          bottom: 0
        },
        grid: {
          left: '10%',
          right: '8%',
          top: '10%',
          bottom: this.showIndicator ? '20%' : '10%'
        },
        xAxis: {
          type: 'category',
          data: this.klineData.map(item => item.date),
          axisLine: { lineStyle: { color: '#888' } },
          axisLabel: {
            rotate: 30,
            fontSize: 12
          }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLine: { lineStyle: { color: '#888' } },
          splitLine: { lineStyle: { color: '#eee' } }
        },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            start: 0,
            end: 100
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            bottom: this.showIndicator ? '25%' : '15%',
            start: 0,
            end: 100
          }
        ],
        series: []
      };
      
      // 指标图配置
      const indicatorOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        grid: {
          left: '10%',
          right: '8%',
          height: '100%'
        },
        xAxis: {
          type: 'category',
          data: this.klineData.map(item => item.date),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#eee' } }
        },
        series: []
      };
      
      this.chartInstance?.setOption(mainOption);
      this.indicatorInstance?.setOption(indicatorOption);
    },
    // 更新图表数据
    updateChart() {
      if (!this.chartInstance) return;
      
      // 处理K线数据
      const klineSeries = {
        name: 'K线',
        type: 'candlestick',
        data: this.klineData.map(item => [
          parseFloat(item.open),
          parseFloat(item.close),
          parseFloat(item.low),
          parseFloat(item.high)
        ]),
        // 修复：替换CSS变量为定义的颜色常量
        itemStyle: {
          color: this.colorUp,
          color0: this.colorDown,
          borderColor: this.colorUp,
          borderColor0: this.colorDown
        }
      };
      
      // 准备均线数据
      const seriesList = [klineSeries];
      
      // 根据选择的指标添加对应线条
      if (this.indicator === 'ma' || this.indicator === 'boll') {
        if (this.indicator === 'ma') {
          // 添加均线
          seriesList.push(
            {
              name: 'MA5',
              type: 'line',
              data: this.indicatorData.ma.ma5.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1 },
              itemStyle: { color: '#1f77b4' },
              showSymbol: false
            },
            {
              name: 'MA10',
              type: 'line',
              data: this.indicatorData.ma.ma10.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1 },
              itemStyle: { color: '#ff7f0e' },
              showSymbol: false
            },
            {
              name: 'MA20',
              type: 'line',
              data: this.indicatorData.ma.ma20.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1 },
              itemStyle: { color: '#2ca02c' },
              showSymbol: false
            },
            {
              name: 'MA30',
              type: 'line',
              data: this.indicatorData.ma.ma30.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1 },
              itemStyle: { color: '#d62728' },
              showSymbol: false
            }
          );
        } else if (this.indicator === 'boll') {
          // 添加布林带
          seriesList.push(
            {
              name: '布林中轨',
              type: 'line',
              data: this.indicatorData.boll.mid.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1 },
              itemStyle: { color: '#1f77b4' },
              showSymbol: false
            },
            {
              name: '布林上轨',
              type: 'line',
              data: this.indicatorData.boll.up.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1, type: 'dashed' },
              itemStyle: { color: '#d62728' },
              showSymbol: false
            },
            {
              name: '布林下轨',
              type: 'line',
              data: this.indicatorData.boll.down.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              lineStyle: { width: 1, type: 'dashed' },
              itemStyle: { color: '#2ca02c' },
              showSymbol: false
            }
          );
        }
      }
      
      // 更新主图
      this.chartInstance.setOption({
        xAxis: {
          data: this.klineData.map(item => item.date)
        },
        series: seriesList
      });
      
      // 更新指标图
      if (this.showIndicator && this.indicatorInstance) {
        let indicatorSeries = [];
        
        if (this.indicator === 'macd') {
          // MACD指标
          indicatorSeries = [
            {
              name: 'DIF',
              type: 'line',
              data: this.indicatorData.macd.dif.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#1f77b4' },
              showSymbol: false
            },
            {
              name: 'DEA',
              type: 'line',
              data: this.indicatorData.macd.dea.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#ff7f0e' },
              showSymbol: false
            },
            {
              name: 'MACD',
              type: 'bar',
              data: this.indicatorData.macd.macd.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              // 修复：替换CSS变量为定义的颜色常量
              itemStyle: {
                color: params => {
                  const val = params.data[1];
                  return val >= 0 ? this.colorUp : this.colorDown;
                }
              }
            }
          ];
        } else if (this.indicator === 'kdj') {
          // KDJ指标
          indicatorSeries = [
            {
              name: 'K',
              type: 'line',
              data: this.indicatorData.kdj.k.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#1f77b4' },
              showSymbol: false
            },
            {
              name: 'D',
              type: 'line',
              data: this.indicatorData.kdj.d.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#ff7f0e' },
              showSymbol: false
            },
            {
              name: 'J',
              type: 'line',
              data: this.indicatorData.kdj.j.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#2ca02c' },
              showSymbol: false
            }
          ];
        } else if (this.indicator === 'rsi') {
          // RSI指标
          indicatorSeries = [
            {
              name: 'RSI6',
              type: 'line',
              data: this.indicatorData.rsi.rsi6.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#1f77b4' },
              showSymbol: false
            },
            {
              name: 'RSI12',
              type: 'line',
              data: this.indicatorData.rsi.rsi12.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#ff7f0e' },
              showSymbol: false
            },
            {
              name: 'RSI24',
              type: 'line',
              data: this.indicatorData.rsi.rsi24.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#2ca02c' },
              showSymbol: false
            }
          ];
        } else {
          // 默认显示MACD
          indicatorSeries = [
            {
              name: 'DIF',
              type: 'line',
              data: this.indicatorData.macd.dif.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#1f77b4' },
              showSymbol: false
            },
            {
              name: 'DEA',
              type: 'line',
              data: this.indicatorData.macd.dea.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              itemStyle: { color: '#ff7f0e' },
              showSymbol: false
            },
            {
              name: 'MACD',
              type: 'bar',
              data: this.indicatorData.macd.macd.map((val, idx) => 
                val === '-' ? null : [this.klineData[idx].date, val]
              ),
              // 修复：替换CSS变量为定义的颜色常量
              itemStyle: {
                color: params => {
                  const val = params.data[1];
                  return val >= 0 ? this.colorUp : this.colorDown;
                }
              }
            }
          ];
        }
        
        this.indicatorInstance.setOption({
          xAxis: {
            data: this.klineData.map(item => item.date)
          },
          series: indicatorSeries
        });
      }
    },
    // 处理周期切换
    handlePeriodChange() {
      this.fetchKlineData();
    },
    // 处理指标切换
    handleIndicatorChange() {
      this.updateChart();
    },
    // 刷新图表
    refreshChart() {
      this.fetchKlineData();
      this.$message.success('K线图已刷新');
    },
    // 切换全屏
    toggleFullScreen() {
      this.isFullScreen = !this.isFullScreen;
      
      if (this.isFullScreen) {
        // 进入全屏
        this.$el.style.position = 'fixed';
        this.$el.style.top = '0';
        this.$el.style.left = '0';
        this.$el.style.width = '100%';
        this.$el.style.height = '100%';
        this.$el.style.zIndex = '9999';
        this.$el.style.backgroundColor = '#fff';
        this.chartHeight = window.innerHeight - 80;
      } else {
        // 退出全屏
        this.$el.style.position = '';
        this.$el.style.top = '';
        this.$el.style.left = '';
        this.$el.style.width = '';
        this.$el.style.height = '';
        this.$el.style.zIndex = '';
        this.$el.style.backgroundColor = '';
        this.chartHeight = this.height;
      }
      
      this.resizeChart();
    },
    // 导出图表
    exportChart() {
      // 获取图表base64数据
      const chartDataUrl = this.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      
      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${this.stockCode}_${this.period}_${new Date().getTime()}.png`;
      link.href = chartDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.$message.success('K线图已导出');
    },
    // 调整图表大小
    resizeChart() {
      this.chartInstance?.resize();
      this.indicatorInstance?.resize();
    }
  }
};
</script>

<style scoped>
.kline-chart-container {
  width: 100%;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-actions {
  display: flex;
  gap: 5px;
}

.chart-main {
  width: 100%;
  min-height: 300px;
}

.chart-indicator {
  width: 100%;
  height: 150px;
  border-top: 1px solid #eee;
}

/* 响应式适配 */
@media screen and (max-width: 768px) {
  .chart-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .chart-actions {
    align-self: flex-end;
  }
}
</style>