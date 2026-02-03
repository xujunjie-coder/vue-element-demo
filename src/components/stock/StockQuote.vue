<template>
  <el-main style="padding: var(--spacing-xs, 8px); background: var(--color-bg);">
    <!-- 行情筛选栏 - 缩小内边距、间距 -->
    <div class="card-container filter-bar">
      <el-row :gutter="10">
        <el-col :span="6" :xs="24">
          <el-select v-model="marketType" placeholder="市场类型" size="mini">
            <el-option
              v-for="(val, key) in MarketType"
              :key="key"
              :label="key === 'CN_A' ? '沪深A股' : key === 'CHUANGYE' ? '创业板' : '科创板'"
              :value="val"
            ></el-option>
          </el-select>
        </el-col>
        <el-col :span="6" :xs="24">
          <el-select v-model="sortType" placeholder="排序方式" size="mini">
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
            placeholder="代码/名称"
            prefix-icon="el-icon-search"
            @keyup.enter="searchStock"
            size="mini"
          ></el-input>
        </el-col>
        <el-col :span="4" :xs="24">
          <el-button type="primary" @click="refreshQuote" size="mini">
            <i class="el-icon-refresh"></i> 刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 行情数据表格 - 缩小列宽、字体 -->
    <div class="card-container quote-table">
      <el-table
        :data="quoteList"
        border
        size="mini"
        style="width: 100%; font-size: 12px;"
        
        v-loading="loading"
        element-loading-text="加载中..."
      >
        <el-table-column type="index" label="序号" width="50" />
        <el-table-column prop="code" label="代码" width="70" />
        <el-table-column prop="name" label="名称" width="80" />
        <el-table-column prop="price" label="最新价" width="80">
          <template slot-scope="scope">
            <span class="data-text only-price-num">{{ scope.row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="change" label="涨跌额" width="83">
          <template slot-scope="scope">
            <span :class="getChangeClass(scope.row.change)">{{ scope.row.change }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="change_rate" label="涨跌幅(%)" width="80">
          <template slot-scope="scope">
            <span :class="getChangeClass(scope.row.change)">
              {{ scope.row.change_rate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="volume" label="成交量(手)" width="80" />
        <el-table-column prop="high" label="最高价" width="70" />
        <el-table-column prop="low" label="最低价" width="70" />
        <el-table-column label="操作" width="140">
          <template slot-scope="scope">
            <el-button
              type="text"
              @click.stop="goStockDetail(scope.row)"
              class="operate-btn"
              size="mini"
            >
              详情
            </el-button>
            <el-button
              type="text"
              @click.stop="addToOptional(scope.row)"
              class="operate-btn text-up"
              size="mini"
            >
              自选
            </el-button>
            <el-button
              type="text"
              @click.stop="tradeStock(scope.row)"
              class="operate-btn text-down"
              size="mini"
            >
              交易
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页控件 - 缩小尺寸 -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="page"
        :page-sizes="[10, 20, 50]"
        :page-size="size"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        size="mini"
        style="margin-top: 10px; text-align: right; font-size: 12px;"
      >
      </el-pagination>
    </div>

    <!-- 行情概览图表 - 缩小高度 -->
    <div class="card-container quote-chart hide-on-mobile">
      <h3 class="chart-title">市场行情概览</h3>
      <div ref="quoteChart" style="width: 100%; height: 280px;"></div>
    </div>
  </el-main>
</template>

<script>
import { mapActions } from 'vuex';
import * as echarts from 'echarts';
import request from '../../utils/request';
import { MarketType } from '../../utils/constants';
import { getChangeClass, formatPrice, formatChangeRate, formatVolume } from '../../utils/format';
import { throttle, getCache, setCache } from '../../utils/tool';

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
    // 优化首屏：先从缓存读取数据，快速渲染，再并行刷新最新数据
    const cached = getCache('quoteList_cache');
    if (cached && cached.list) {
      this.quoteList = cached.list.map(item => ({
        ...item,
        price: formatPrice(item.price),
        change: formatPrice(item.change),
        change_rate: formatChangeRate(item.change_rate),
        volume: formatVolume(item.volume),
        high: formatPrice(item.high),
        low: formatPrice(item.low)
      }));
      this.total = cached.total || 0;
      // 并行发起网络请求更新缓存但不阻塞首屏渲染
      this.fetchQuoteList({ useCacheFallback: true });
    } else {
      // 无缓存时正常加载并显示 loading
      this.fetchQuoteList({ useCacheFallback: false });
    }

    // 初始化图表
    this.initQuoteChart();
    // 设置自动刷新（修复：节流函数绑定this，避免this指向错误）
    this.refreshTimer = setInterval(throttle(this.fetchQuoteList.bind(this, { useCacheFallback: true })), 3000);
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
    async fetchQuoteList(options = { useCacheFallback: true }) {
      // 防止重复并发请求
      if (this._fetching) return;
      this._fetching = true;

      const params = {
        page: this.page,
        size: this.size,
        market: this.marketType,
        sort: this.sortType,
        keyword: this.searchKeyword
      };

      // 如果使用缓存回退，则不要展示全局loading以免阻塞首屏
      if (!options.useCacheFallback) {
        this.loading = true;
      }

      try {
        const res = await request.getQuoteList(params);
        // 此时res已被request.js解析为{ list: [], total: 100 }
        const formatted = res.list.map(item => ({
          ...item,
          price: formatPrice(item.price),
          change: formatPrice(item.change),
          change_rate: formatChangeRate(item.change_rate),
          volume: formatVolume(item.volume),
          high: formatPrice(item.high),
          low: formatPrice(item.low)
        }));

        this.quoteList = formatted;
        this.total = res.total;
        // 缓存短期数据，10秒过期，供首屏快速渲染
        setCache('quoteList_cache', { list: res.list, total: res.total }, 10);
        // 更新图表数据
        this.updateQuoteChart();
      } catch (err) {
        // 只有在没有缓存的情况下才提示错误
        if (!options.useCacheFallback) {
          this.$message.error('行情数据加载失败，请稍后重试');
        } else {
          console.warn('fetchQuoteList background update failed', err);
        }
      } finally {
        if (!options.useCacheFallback) this.loading = false;
        this._fetching = false;
      }
    },
    // 初始化行情图表（保持不变，仅缩小渲染高度）
    initQuoteChart() {
      if (!this.$refs.quoteChart) return;
      this.chartInstance = echarts.init(this.$refs.quoteChart);
      
      const option = {
        tooltip: {
          trigger: 'axis',
          textStyle: { fontSize: 11 } // 缩小提示文字
        },
        legend: {
          data: ['上证指数', '深证成指', '创业板指'],
          top: 0,
          textStyle: { fontSize: 11 } // 缩小图例文字
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
          data: [],
          axisLabel: { fontSize: 11 } // 缩小X轴文字
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value}',
            fontSize: 11 // 缩小Y轴文字
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
    // 更新行情图表（保持逻辑不变）
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
  margin-bottom: 10px; /* 缩小底部间距 */
  padding: 8px 10px; /* 缩小内边距 */
}
.quote-table {
  margin-bottom: 10px; /* 缩小底部间距 */
}
.operate-btn {
  padding: 0 3px; /* 缩小按钮内边距 */
  font-size: 11px; /* 缩小操作按钮文字 */
}
.quote-chart {
  margin-top: 10px; /* 缩小顶部间距 */
}
.chart-title {
  font-size: 14px; /* 缩小图表标题 */
  font-weight: bold;
  color: #333;
  margin-bottom: 10px; /* 缩小标题底部间距 */
}
/* 全局缩小文本 */
::v-deep .el-table {
  --el-table-text-color: #333;
  color: var(--el-table-text-color); /* 让变量生效 */
  font-size: 12px;
}
::v-deep .el-pagination {
  font-size: 12px;
  /* 统一分页文字颜色 */
  color: #333;
}

/* 仅缩小最新价列的数值字体 */
::v-deep .only-price-num {
  font-size: 12px !important; /* 可按需调10/11/12px，建议12px既小又清晰 */
  line-height: 1; /* 行高统一，避免数字换行/错位 */
}
</style>