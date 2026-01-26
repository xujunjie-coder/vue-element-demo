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
          <el-radio label="day">日K</el-radio>
          <el-radio label="week">周K</el-radio>
          <el-radio label="month">月K</el-radio>
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
import { mapActions } from 'vuex';
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
      klineType: 'day',
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
    }
  },
  mounted() {
    // 加载股票详情
    this.fetchStockDetail();
    // 初始化K线图
    this.initKlineChart();
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

    // 获取股票详情数据
    async fetchStockDetail() {
      this.loading = true;
      try {
        const res = await request.getStockDetail(this.currentCode);
        this.stockDetail = {
          ...res,
          price: formatPrice(res.price),
          change: formatPrice(res.change),
          change_rate: formatPrice(res.change_rate),
          open: formatPrice(res.open),
          high: formatPrice(res.high),
          low: formatPrice(res.low),
          volume: formatVolume(res.volume)
        };
        // 更新K线图数据
        this.updateKlineChart(res.klineData);
      } catch (err) {
        this.$message.error('股票详情加载失败');
      } finally {
        this.loading = false;
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
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: function(params) {
            const data = params[0].data;
            return `
              <div>日期：${params[0].axisValue}</div>
              <div>开盘：${data[0]}</div>
              <div>收盘：${data[1]}</div>
              <div>最低：${data[2]}</div>
              <div>最高：${data[3]}</div>
            `;
          }
        },
        grid: {
          left: '10%',
          right: '5%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: { rotate: 30 }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: 'K线数据',
            type: 'candlestick',
            data: values,
            itemStyle: {
              // 替换CSS变量为定义的色彩常量，解决报错
              color: this.colorUp,
              color0: this.colorDown,
              borderColor: this.colorUp,
              borderColor0: this.colorDown
            }
          }
        ]
      };
      
      this.klineChartInstance.setOption(option);
      // 绑定resize事件（先移除再绑定，避免重复）
      window.removeEventListener('resize', this.handleResize);
      window.addEventListener('resize', this.handleResize);
    },

    // 切换K线类型（日/周/月）
    changeKlineType() {
      this.fetchStockDetail();
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
  padding: 20px;
  margin-bottom: 20px;
}
.stock-basic {
  flex: 1;
}
.stock-name {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}
.stock-price {
  margin-bottom: 10px;
}
.current-price {
  font-size: 32px;
  font-weight: bold;
  margin-right: 10px;
}
.price-change {
  font-size: 20px;
}
.stock-other {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.other-item {
  font-size: 14px;
  color: #666;
}
.stock-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* K线图样式 */
.kline-chart {
  margin-bottom: 20px;
}
.chart-tabs {
  margin-bottom: 15px;
}

/* 财务数据样式 */
.finance-data {
  margin-top: 20px;
}
.module-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

/* 移动端适配 */
@media screen and (max-width: 767px) {
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .stock-actions {
    width: 100%;
    justify-content: space-between;
  }
  .current-price {
    font-size: 24px;
  }
}
</style>