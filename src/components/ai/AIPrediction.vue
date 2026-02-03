<template>
  <div class="ai-prediction card-container">
    <div class="prediction-header">
      <h3 class="prediction-title">AI行情预测</h3>
      <el-button
        type="text"
        class="toggle-btn"
        @click="toggleDetail"
      >
        {{ showDetail ? '收起详情' : '查看完整报告' }}
        <i class="el-icon-arrow-down" :class="{ 'rotate': showDetail }"></i>
      </el-button>
    </div>

    <!-- 预测核心数据 -->
    <div class="prediction-core">
      <el-row :gutter="30" class="core-row">
        <el-col :span="8" :xs="12">
          <div class="core-item">
            <div class="item-label">涨跌趋势</div>
            <div class="item-value" :class="prediction.trend === 'up' ? 'text-up' : 'text-down'">
              {{ prediction.trend === 'up' ? '上涨' : '下跌' }}
            </div>
          </div>
        </el-col>
        <el-col :span="8" :xs="12">
          <div class="core-item">
            <div class="item-label">预测概率</div>
            <div class="item-value text-up">
              {{ prediction.probability }}%
            </div>
          </div>
        </el-col>
        <el-col :span="8" :xs="24">
          <div class="core-item">
            <div class="item-label">目标价格</div>
            <div class="item-value data-text">
              {{ prediction.target_price }} 元
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 完整报告（展开显示） -->
    <div class="prediction-detail" v-if="showDetail">

      <div class="detail-item">
        <div class="detail-label">支撑位：</div>
        <div class="detail-content">{{ supportPrice }} 元</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">压力位：</div>
        <div class="detail-content">{{ pressurePrice }} 元</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">操作建议：</div>
        <div class="detail-content">
          <span class="suggest-tag" :class="prediction.trend === 'up' ? 'tag-up' : 'tag-down'">
            {{ prediction.trend === 'up' ? '看多' : '看空' }}
          </span>
          {{ prediction.trend === 'up' ? '建议逢低买入，持仓待涨' : '建议逢高卖出，谨慎持仓' }}
        </div>
      </div>

      <!-- 预测趋势图 -->
      <div class="trend-chart">
        <h4 class="chart-title">价格趋势预测（未来5个交易日）</h4>
        <div ref="trendChart" style="width: 100%; height: 200px;"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
// 若项目中无formatPrice工具函数，可取消注释下方自定义函数
// const formatPrice = (price) => Number(price).toFixed(2);

export default {
  name: 'AIPrediction',
  props: {
    prediction: {
      type: Object,
      required: true,
      default: () => ({
        trend: 'up',
        probability: 85,
        target_price: 1800,
        })
    },
    currentPrice: {
      type: String,
      required: true,
      default: '1750.00'
    }
  },
  data() {
    return {
      showDetail: false,
      chartInstance: null,
      resizeHandler: null // 存储resize事件句柄
    };
  },
  computed: {
    // 计算支撑位（目标价*0.95）
    supportPrice() {
      // 兼容无formatPrice的情况
      try {
        return formatPrice(this.prediction.target_price * 0.95);
      } catch (e) {
        return Number(this.prediction.target_price * 0.95).toFixed(2);
      }
    },
    // 计算压力位（目标价*1.05）
    pressurePrice() {
      // 兼容无formatPrice的情况
      try {
        return formatPrice(this.prediction.target_price * 1.05);
      } catch (e) {
        return Number(this.prediction.target_price * 1.05).toFixed(2);
      }
    }
  },
  watch: {
    showDetail: {
      handler(newVal) {
        if (newVal) {
          this.$nextTick(() => {
            this.renderTrendChart();
          });
        } else {
          // 收起时销毁图表，释放资源
          this.chartInstance?.dispose();
          this.chartInstance = null;
          // 移除resize事件
          if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
          }
        }
      },
      immediate: false
    }
  },
  beforeDestroy() {
    // 组件销毁时清理所有资源
    this.chartInstance?.dispose();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  },
  methods: {
    // 展开/收起详情
    toggleDetail() {
      this.showDetail = !this.showDetail;
    },
    // 渲染趋势预测图（修复所有报错）
    renderTrendChart() {
      if (!this.$refs.trendChart) return;
      
      // 销毁旧实例，避免重复创建
      if (this.chartInstance) {
        this.chartInstance.dispose();
      }
      this.chartInstance = echarts.init(this.$refs.trendChart);

      // 生成未来5个交易日日期
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i + 1);
        dates.push(`${date.getMonth() + 1}-${date.getDate()}`);
      }

      // 生成预测价格（围绕目标价波动）
      const predictPrices = [];
      const basePrice = Number(this.prediction.target_price);
      dates.forEach((_, index) => {
        const fluctuation = (Math.random() - 0.5) * 20; // 波动幅度±10元
        predictPrices.push(basePrice + fluctuation);
      });

      // 获取上涨颜色（兼容CSS变量）
      let colorUp = '#e53935';
      try {
        colorUp = getComputedStyle(document.documentElement).getPropertyValue('--color-up').trim() || colorUp;
      } catch (e) {
        console.warn('获取CSS变量失败，使用默认上涨色', e);
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          textStyle: { fontSize: 12 },
          formatter: (params) => {
            return `${params[0].axisValue}<br/>${params[0].seriesName}：${params[0].data.toFixed(2)} 元`;
          }
        },
        legend: {
          data: ['实际价格', '预测价格'],
          top: 0,
          textStyle: { fontSize: 12 }
        },
        grid: {
          left: '10%',
          right: '5%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            rotate: 30,
            fontSize: 11
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (val) => `${val.toFixed(2)} 元`,
            fontSize: 11
          },
          min: (value) => value.min - 50,
          max: (value) => value.max + 50
        },
        series: [
          {
            name: '实际价格',
            type: 'line',
            data: [Number(this.currentPrice), null, null, null, null],
            itemStyle: { color: colorUp },
            lineStyle: { width: 2 },
            symbol: 'circle',
            symbolSize: 6,
            showSymbol: (value) => value.dataIndex === 0
          },
          {
            name: '预测价格',
            type: 'line',
            data: predictPrices,
            itemStyle: { color: '#54a0ff' },
            lineStyle: { width: 2, type: 'dashed' },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      };

      this.chartInstance.setOption(option);
      
      // 统一管理resize事件
      this.resizeHandler = () => {
        this.chartInstance?.resize();
      };
      window.removeEventListener('resize', this.resizeHandler);
      window.addEventListener('resize', this.resizeHandler);
    }
  }
};
</script>

<style scoped>
.ai-prediction {
  margin-bottom: 20px;
}
.prediction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.prediction-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
}
.toggle-btn {
  color: #e53935;
  padding: 0;
}
.rotate {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
.prediction-core {
  margin-bottom: 20px;
}
.core-row {
  margin-bottom: 10px;
}
.core-item {
  text-align: center;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
}
.item-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}
.item-value {
  font-size: 18px;
  font-weight: bold;
}
.text-up {
  color: #e53935;
}
.text-down {
  color: #108ee9;
}
.data-text {
  color: #333;
}
.prediction-detail {
  padding-top: 20px;
  border-top: 1px solid #f5f5f5;
}
.detail-item {
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
}
.detail-label {
  font-weight: bold;
  color: #333;
  min-width: 80px;
  margin-right: 10px;
  font-size: 14px;
}
.detail-content {
  flex: 1;
  color: #666;
  line-height: 1.5;
  font-size: 14px;
}
.suggest-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  margin-right: 8px;
}
.tag-up {
  background-color: #e53935;
}
.tag-down {
  background-color: #108ee9;
}
.trend-chart {
  margin-top: 20px;
}
.chart-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  margin-top: 0;
}
</style>