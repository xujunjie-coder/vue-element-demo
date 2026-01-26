<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <!-- 行情筛选栏 -->
    <div class="card-container filter-bar">
      <el-row :gutter="20">
        <el-col :span="6" :xs="24">
          <el-select v-model="marketType" placeholder="请选择市场类型">
            <el-option
              v-for="(val, key) in MarketType"
              :key="key"
              :label="key === 'CN_A' ? '沪深A股' : key === 'CHUANGYE' ? '创业板' : '科创板'"
              :value="val"
            ></el-option>
          </el-select>
        </el-col>
        <el-col :span="6" :xs="24">
          <el-select v-model="sortType" placeholder="请选择排序方式">
            <el-option label="涨跌幅↑" value="change_rate_desc"></el-option>
            <el-option label="涨跌幅↓" value="change_rate_asc"></el-option>
            <el-option label="价格↑" value="price_desc"></el-option>
            <el-option label="价格↓" value="price_asc"></el-option>
            <el-option label="成交量↑" value="volume_desc"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8" :xs="24">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入股票代码/名称"
            prefix-icon="el-icon-search"
            @keyup.enter="searchStock"
          ></el-input>
        </el-col>
        <el-col :span="4" :xs="24">
          <el-button type="primary" @click="refreshQuote">
            <i class="el-icon-refresh"></i> 刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 行情数据表格 -->
    <div class="card-container quote-table">
      <el-table
        :data="quoteList"
        border
        style="width: 100%;"
        @row-click="goStockDetail"
        v-loading="loading"
        element-loading-text="行情数据加载中..."
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="code" label="代码" width="100" />
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="price" label="最新价" width="100">
          <template slot-scope="scope">
            <span class="data-text">{{ scope.row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="change" label="涨跌额" width="100">
          <template slot-scope="scope">
            <span :class="getChangeClass(scope.row.change)">{{ scope.row.change }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="change_rate" label="涨跌幅(%)" width="120">
          <template slot-scope="scope">
            <span :class="getChangeClass(scope.row.change)">
              {{ scope.row.change_rate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="volume" label="成交量(手)" width="120" />
        <el-table-column prop="high" label="最高价" width="100" />
        <el-table-column prop="low" label="最低价" width="100" />
        <el-table-column label="操作" width="180">
          <template slot-scope="scope">
            <el-button
              type="text"
              @click.stop="goStockDetail(scope.row)"
              class="operate-btn"
            >
              详情
            </el-button>
            <el-button
              type="text"
              @click.stop="addToOptional(scope.row)"
              class="operate-btn text-up"
            >
              加自选
            </el-button>
            <el-button
              type="text"
              @click.stop="tradeStock(scope.row)"
              class="operate-btn text-down"
            >
              交易
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页控件 -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="size"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        style="margin-top: 20px; text-align: right;"
      >
      </el-pagination>
    </div>

    <!-- 行情概览图表 -->
    <div class="card-container quote-chart hide-on-mobile">
      <h3 class="chart-title">市场行情概览</h3>
      <div ref="quoteChart" style="width: 100%; height: 400px;"></div>
    </div>
  </el-main>
</template>

<script>
import { mapActions } from 'vuex';
import * as echarts from 'echarts';
import request from '../../utils/request';
import { MarketType } from '../../utils/constants';
import { getChangeClass, formatPrice, formatChangeRate, formatVolume } from '../../utils/format';
import { throttle } from '../../utils/tool';

export default {
  name: 'StockQuote',
  data() {
    return {
      MarketType,
      // 筛选条件
      marketType: '',
      sortType: '',
      searchKeyword: '',
      // 分页参数
      page: 1,
      size: 20,
      total: 0,
      // 行情数据
      quoteList: [],
      loading: false,
      // 图表实例
      chartInstance: null,
      // 自动刷新定时器
      refreshTimer: null
    };
  },
  mounted() {
    // 加载行情数据
    this.fetchQuoteList();
    // 初始化图表
    this.initQuoteChart();
    // 设置自动刷新（修复：节流函数绑定this，避免this指向错误）
    this.refreshTimer = setInterval(throttle(this.fetchQuoteList.bind(this)), 3000);
  },
  beforeDestroy() {
    // 清除定时器
    clearInterval(this.refreshTimer);
    // 销毁图表实例
    this.chartInstance?.dispose();
  },
  methods: {
    ...mapActions(['addOptionalStock']),
    getChangeClass,
    // 获取行情列表（无需修改，request.js已处理解析）
    async fetchQuoteList() {
      this.loading = true;
      try {
        const params = {
          page: this.page,
          size: this.size,
          market: this.marketType,
          sort: this.sortType,
          keyword: this.searchKeyword
        };
        const res = await request.getQuoteList(params);
        // 此时res已被request.js解析为{ list: [], total: 100 }
        this.quoteList = res.list.map(item => ({
          ...item,
          price: formatPrice(item.price),
          change: formatPrice(item.change),
          change_rate: formatChangeRate(item.change_rate),
          volume: formatVolume(item.volume),
          high: formatPrice(item.high),
          low: formatPrice(item.low)
        }));
        this.total = res.total;
        // 更新图表数据
        this.updateQuoteChart();
      } catch (err) {
        this.$message.error('行情数据加载失败，请稍后重试');
      } finally {
        this.loading = false;
      }
    },
    // 初始化行情图表（保持不变）
    initQuoteChart() {
      if (!this.$refs.quoteChart) return;
      this.chartInstance = echarts.init(this.$refs.quoteChart);
      
      const option = {
        tooltip: {
          trigger: 'axis',
          textStyle: { fontSize: 12 }
        },
        legend: {
          data: ['上证指数', '深证成指', '创业板指'],
          top: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: []
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value}'
          }
        },
        series: [
          {
            name: '上证指数',
            type: 'line',
            data: []
          },
          {
            name: '深证成指',
            type: 'line',
            data: []
          },
          {
            name: '创业板指',
            type: 'line',
            data: []
          }
        ]
      };
      
      this.chartInstance.setOption(option);
      window.addEventListener('resize', () => {
        this.chartInstance?.resize();
      });
    },
    // 更新行情图表（保持不变）
    updateQuoteChart() {
      if (!this.chartInstance) return;
      
      // 模拟指数数据
      const dates = [];
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const hour = now.getHours() - 23 + i;
        dates.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      
      // 生成模拟数据
      const shData = dates.map(() => 3200 + Math.random() * 100);
      const szData = dates.map(() => 10500 + Math.random() * 300);
      const cyData = dates.map(() => 2200 + Math.random() * 50);
      
      this.chartInstance.setOption({
        xAxis: { data: dates },
        series: [
          { name: '上证指数', data: shData },
          { name: '深证成指', data: szData },
          { name: '创业板指', data: cyData }
        ]
      });
    },
    // 搜索股票（保持不变）
    searchStock() {
      this.page = 1;
      this.fetchQuoteList();
    },
    // 刷新行情（保持不变）
    refreshQuote() {
      this.fetchQuoteList();
      this.$message.success('行情数据已刷新');
    },
    // 跳转到个股详情（保持不变）
    goStockDetail(row) {
      this.$router.push(`/detail/${row.code}`);
    },
    // 添加到自选股（保持不变）
    addToOptional(row) {
      this.addOptionalStock({
        code: row.code,
        name: row.name,
        price: row.price,
        change: row.change
      });
      this.$message.success(`已将 ${row.name} 添加到自选股`);
    },
    // 跳转到交易页面（保持不变）
    tradeStock(row) {
      this.$router.push({
        path: '/trade',
        query: { code: row.code, name: row.name }
      });
    },
    // 分页大小改变（保持不变）
    handleSizeChange(val) {
      this.size = val;
      this.fetchQuoteList();
    },
    // 当前页改变（保持不变）
    handleCurrentChange(val) {
      this.page = val;
      this.fetchQuoteList();
    }
  }
};
</script>

<style scoped>
.filter-bar {
  margin-bottom: 20px;
  padding: 15px;
}
.quote-table {
  margin-bottom: 20px;
}
.operate-btn {
  padding: 0 5px;
}
.quote-chart {
  margin-top: 20px;
}
.chart-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}
</style>