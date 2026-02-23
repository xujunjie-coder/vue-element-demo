<template>
  <el-main style="padding: var(--spacing-xs, 8px); background: var(--color-bg);">
    <!-- 行情筛选栏 - 缩小内边距、间距 -->
    <div class="card-container filter-bar">
      <el-row :gutter="10">
        <el-col :span="6" :xs="24">
          <el-select v-model="marketType" placeholder="市场类型" size="mini" @change="handleMarketChange">
            <el-option
              v-for="(val, key) in MarketType"
              :key="key"
              :label="MarketTypeLabel[key] || key"
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
        element-loading-text="正在加载行情数据，首次加载可能需要30~90秒，请耐心等待..."
      >
        <el-table-column type="index" label="序号" width="50" />
        <el-table-column prop="code" label="代码" width="70">
          <template slot-scope="scope">
            <span class="stock-link" @click="goStockDetail(scope.row)">{{ scope.row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" width="80">
          <template slot-scope="scope">
            <span class="stock-link" @click="goStockDetail(scope.row)">{{ scope.row.name }}</span>
          </template>
        </el-table-column>
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
import { stripStockPrefix } from '../../utils/request';
import { MarketType, MarketTypeLabel } from '../../utils/constants';
import { getChangeClass, formatPrice, formatChangeRate, formatVolume } from '../../utils/format';
import { throttle, getCache, setCache } from '../../utils/tool';

export default {
  name: 'StockQuote',
  data() {
    return {
      MarketType,
      MarketTypeLabel,
      // 筛选条件
      marketType: 'ShA', // 默认沪市A股（加载更快）
      sortType: '',
      searchKeyword: '',
      sectorFilter: '',
      conceptFilter: '',
      indexCode: '',
      // 分页参数（前端分页，后端 /spot 返回全量数据）
      page: 1,
      size: 20,
      total: 0,
      // 行情数据（全量 + 当前页）
      allQuoteList: [], // 后端返回的全量数据
      quoteList: [],    // 当前页展示数据
      loading: false,
      // 图表实例
      chartInstance: null,
      // 自动刷新定时器
      refreshTimer: null
    };
  },
  mounted() {
    const q = this.$route && this.$route.query ? this.$route.query : {};
    const hasRouteFilter = !!(q.market || q.sector || q.concept || q.name);

    if (hasRouteFilter) {
      // 有路由筛选参数时，由 applyRouteFilter 统一处理，避免双重请求
      this.applyRouteFilter();
    } else {
      // 无筛选参数时，优化首屏：先从缓存读取数据，快速渲染
      const cached = getCache('quoteList_cache');
      if (cached && cached.length) {
        this.allQuoteList = cached;
        this.total = cached.length;
        this.applyPageData();
        this.fetchQuoteList({ useCacheFallback: true });
      } else {
        this.fetchQuoteList({ useCacheFallback: false });
      }
    }

    // 初始化图表（延迟加载，优先表格数据）
    this.$nextTick(() => {
      this.initQuoteChart();
      // 获取指数真实数据（延迟500ms，让行情表格先渲染）
      setTimeout(() => { this.fetchIndexData(); }, 500);
    });
    // 设置自动刷新
    this.refreshTimer = setInterval(throttle(this.fetchQuoteList.bind(this, { useCacheFallback: true })), 120000);
    // 指数图表每2分钟刷新
    this.chartRefreshTimer = setInterval(() => { this.fetchIndexData(); }, 120000);
  },
  beforeDestroy() {
    clearInterval(this.refreshTimer);
    clearInterval(this.chartRefreshTimer);
    this.chartInstance?.dispose();
  },
  watch: {
    '$route.query': {
      handler() {
        this.applyRouteFilter();
      },
      deep: true
    }
  },
  methods: {
    ...mapActions(['addOptionalStock']),
    getChangeClass,

    /**
     * 后端字段 → 前端字段映射
     * 后端 /spot 返回: { id, code, name, last, zd, ud, vol, amount, hod, lod, open, close, vr, hsr, per, pbr, tmc, ffmcap, pv, 5mc, 3mpm, zf }
     * 前端显示需要: code, name, price, change, change_rate, volume, high, low
     */
    mapSpotItem(item) {
      return {
        ...item,
        // 保留原始代码（后端返回的 code 不带市场前缀如 "300449"）
        code: item.code || '',
        name: item.name || '',
        // 映射核心字段
        price: formatPrice(item.last),
        change: formatPrice(item.ud),
        change_rate: formatChangeRate(item.zd),
        volume: formatVolume(item.vol),
        high: formatPrice(item.hod),
        low: formatPrice(item.lod),
        // 保留原始数值用于排序
        _last: Number(item.last) || 0,
        _ud: Number(item.ud) || 0,
        _zd: Number(item.zd) || 0,
        _vol: Number(item.vol) || 0
      };
    },

    /**
     * 获取行情列表（调用后端 /spot 接口）
     */
    async fetchQuoteList(options = { useCacheFallback: true }) {
      if (this._fetching) return;
      this._fetching = true;

      if (!options.useCacheFallback) {
        this.loading = true;
      }

      try {
        const res = await request.getSpot(this.marketType);
        // 后端返回：{ status: "ok", data: [...] }
        const rawList = res.data || [];

        // 映射字段
        const mapped = rawList.map(item => this.mapSpotItem(item));

        this.allQuoteList = mapped;
        this.total = mapped.length;

        // 缓存短期数据
        setCache('quoteList_cache', rawList, 10);

        // 应用搜索过滤 + 排序 + 分页
        this.applyPageData();
      } catch (err) {
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

    /**
     * 对全量数据进行搜索、排序、分页
     */
    applyPageData() {
      let filtered = [...this.allQuoteList];

      // 关键词过滤（代码或名称）
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase();
        filtered = filtered.filter(
          item => (item.code && item.code.toLowerCase().includes(kw)) ||
                  (item.name && item.name.includes(kw))
        );
      }

      // 排序
      if (this.sortType) {
        const sortMap = {
          change_rate_desc: (a, b) => b._zd - a._zd,
          change_rate_asc: (a, b) => a._zd - b._zd,
          price_desc: (a, b) => b._last - a._last,
          price_asc: (a, b) => a._last - b._last,
          volume_desc: (a, b) => b._vol - a._vol
        };
        if (sortMap[this.sortType]) {
          filtered.sort(sortMap[this.sortType]);
        }
      }

      this.total = filtered.length;

      // 分页
      const start = (this.page - 1) * this.size;
      this.quoteList = filtered.slice(start, start + this.size);
    },
    // 初始化行情图表
    initQuoteChart() {
      if (!this.$refs.quoteChart) return;
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
          textStyle: { fontSize: 11, color: '#666' },
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
          axisLine: { lineStyle: { color: '#e8e8e8' } },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 10, color: '#999',
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
            axisLabel: { fontSize: 10, color: '#999' },
            splitLine: { lineStyle: { color: '#f5f5f5', type: 'dashed' } },
            splitNumber: 4
          },
          {
            type: 'value', position: 'right', scale: true,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { fontSize: 10, color: '#999' },
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
      this._chartResizeHandler = () => this.chartInstance?.resize();
      window.addEventListener('resize', this._chartResizeHandler);
    },
    /**
     * 获取三大指数的真实分钟级数据并更新图表
     * 上证指数 sh000001 / 深证成指 sz399001 / 创业板指 sz399006
     */
    async fetchIndexData() {
      if (!this.chartInstance) return;

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
    // 搜索股票
    searchStock() {
      this.page = 1;
      this.applyPageData();
    },
    // 切换市场类型
    handleMarketChange() {
      this.page = 1;
      this.searchKeyword = '';
      this.fetchQuoteList({ useCacheFallback: false });
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
        this.sectorFilter = '';
        this.conceptFilter = '';
        this.page = 1;
        this.fetchQuoteList({ useCacheFallback: false });
        if (q.name) this.$message.info(`已切换到：${q.name}`);
        return;
      }

      // 2. 板块分类筛选（前端关键词过滤）
      if (q.sector) {
        // 板块关键词映射：后端无板块接口，用名称关键词在全量数据中查找
        const sectorKeywords = {
          finance: '银行|保险|证券|金融|信托',
          technology: '科技|电子|计算机|软件|信息|半导体|芯片',
          consumption: '食品|饮料|白酒|家电|医药|零售|服装|消费',
          new_energy: '新能源|太阳能|光伏|风电|电池|储能|充电'
        };
        this.sectorFilter = q.sector;
        this.conceptFilter = '';
        this.searchKeyword = '';
        this.marketType = 'ZhA'; // 板块默认在沪深京全量数据中筛选
        this.page = 1;
        // 先拉取全量数据，然后用关键词过滤
        this.fetchQuoteList({ useCacheFallback: false }).then(() => {
          const keywords = sectorKeywords[q.sector];
          if (keywords) {
            const regex = new RegExp(keywords, 'i');
            const filtered = this.allQuoteList.filter(item => regex.test(item.name));
            this.allQuoteList = filtered;
            this.total = filtered.length;
            this.applyPageData();
          }
        });
        if (q.name) this.$message.info(`已筛选：${q.name}`);
        return;
      }

      // 3. 概念分类筛选（前端关键词过滤）
      if (q.concept) {
        const conceptKeywords = {
          ai: '人工智能|AI|机器人|算力|模型',
          digital_economy: '数字|数据|云计算|物联网|区块链',
          carbon_neutral: '碳|环保|节能|绿色|新能源',
          biomed: '医药|生物|医疗|制药|疑苗|基因'
        };
        this.conceptFilter = q.concept;
        this.sectorFilter = '';
        this.searchKeyword = '';
        this.marketType = 'ZhA';
        this.page = 1;
        this.fetchQuoteList({ useCacheFallback: false }).then(() => {
          const keywords = conceptKeywords[q.concept];
          if (keywords) {
            const regex = new RegExp(keywords, 'i');
            const filtered = this.allQuoteList.filter(item => regex.test(item.name));
            this.allQuoteList = filtered;
            this.total = filtered.length;
            this.applyPageData();
          }
        });
        if (q.name) this.$message.info(`已筛选：${q.name}`);
        return;
      }

      // 4. 纯名称搜索
      if (q.name) {
        this.searchKeyword = q.name;
        this.page = 1;
        this.applyPageData();
        this.$message.info(`已按【${q.name}】筛选`);
      }
    },
    // 刷新行情
    refreshQuote() {
      this.fetchQuoteList({ useCacheFallback: false });
      this.$message.success('行情数据已刷新');
    },
    // 跳转到个股详情
    goStockDetail(row) {
      this.$router.push(`/detail/${row.code}`);
    },
    // 添加到自选股
    addToOptional(row) {
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
        query: { code: row.code, name: row.name }
      });
    },
    // 分页大小改变
    handleSizeChange(val) {
      this.size = val;
      this.page = 1;
      this.applyPageData();
    },
    // 当前页改变
    handleCurrentChange(val) {
      this.page = val;
      this.applyPageData();
    }
  }
};
</script>

<style scoped>
.filter-bar {
  margin-bottom: 10px;
  padding: 8px 10px;
}
.quote-table {
  margin-bottom: 10px;
}
.operate-btn {
  padding: 0 3px;
  font-size: 11px;
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
  margin-top: 10px;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  padding-left: 4px;
  border-left: 3px solid #1890ff;
}
/* 全局缩小文本 */
::v-deep .el-table {
  --el-table-text-color: #333;
  color: var(--el-table-text-color);
  font-size: 12px;
}
::v-deep .el-pagination {
  font-size: 12px;
  color: #333;
}
::v-deep .only-price-num {
  font-size: 12px !important;
  line-height: 1;
}

/* 响应式：移动端 */
@media screen and (max-width: 767px) {
  .filter-bar {
    padding: 6px 8px;
  }
  .filter-bar .el-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chart-title {
    font-size: 13px;
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
</style>