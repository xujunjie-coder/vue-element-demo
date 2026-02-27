<template>
  <el-main style="padding: var(--spacing-xs, 8px); background: var(--color-bg);">
    <!-- 行情筛选栏 - 缩小内边距、间距 -->
    <div class="card-container filter-bar">
      <el-row :gutter="10">
        <el-col :span="6">
          <el-select v-model="marketType" placeholder="市场类型" size="mini" @change="handleMarketChange">
            <el-option
              v-for="(val, key) in MarketType"
              :key="key"
              :label="MarketTypeLabel[key] || key"
              :value="val"
            ></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="sortType" placeholder="排序方式" size="mini" clearable @change="handleSortChange">
            <el-option label="涨跌幅 ↑" value="zd_desc"></el-option>
            <el-option label="涨跌幅 ↓" value="zd_asc"></el-option>
            <el-option label="价格 ↑" value="last_desc"></el-option>
            <el-option label="价格 ↓" value="last_asc"></el-option>
            <el-option label="成交量 ↑" value="vol_desc"></el-option>
            <el-option label="成交量 ↓" value="vol_asc"></el-option>
            <el-option label="成交额 ↑" value="amount_desc"></el-option>
            <el-option label="成交额 ↓" value="amount_asc"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="代码/名称"
            prefix-icon="el-icon-search"
            @keyup.enter.native="searchStock"
            size="mini"
          ></el-input>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="searchStock" size="mini" style="width: 100%;">
            <i class="el-icon-search"></i> 搜索
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
        <el-table-column type="index" label="序号" width="56" align="center" header-align="center" />
        <el-table-column prop="code" label="代码" min-width="60" />
        <el-table-column prop="name" label="名称" min-width="60">
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
        <el-table-column prop="high" label="最高" min-width="58" />
        <el-table-column prop="low" label="最低" min-width="58" />
        <el-table-column label="操作" min-width="100">
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
        :pager-count="pagerCount"
        size="mini"
        class="stock-pagination"
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
import { throttle } from '../../utils/tool';

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
      // 分页参数（服务端分页，/spot/sina 支持 page/size）
      page: 1,
      size: 20,
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
      // 窗口宽度（用于响应式分页）
      windowWidth: window.innerWidth
    };
  },
  computed: {
    /** 根据屏幕宽度动态调整显示的页码数量，避免分页溢出 */
    pagerCount() {
      if (this.windowWidth < 500) return 3;
      if (this.windowWidth < 700) return 5;
      return 7;
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
      // 获取指数真实数据（延迟500ms，让行情表格先渲染）
      setTimeout(() => { this.fetchIndexData(); }, 500);
    });
    // 设置自动刷新
    this.refreshTimer = setInterval(throttle(this.fetchQuoteList.bind(this, { useCacheFallback: true, silent: true })), 120000);
    // 指数图表每2分钟刷新
    this.chartRefreshTimer = setInterval(() => { this.fetchIndexData(); }, 120000);
  },
  beforeDestroy() {
    clearInterval(this.refreshTimer);
    clearInterval(this.chartRefreshTimer);
    this.chartInstance?.dispose();
    window.removeEventListener('resize', this._handlePagerResize);
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
          // 仅首次搜索或关键词变化时请求后端，翻页直接复用缓存
          if (!this._searchAllData || this._searchAllData.length === 0 || this._lastSearchKeyword !== this.searchKeyword) {
            this._lastSearchKeyword = this.searchKeyword;
            const searchRes = await request.searchStock(this.searchKeyword, 50);
            const searchList = searchRes.data || [];
            if (searchList.length > 0) {
              // 搜索接口只返回 { code, name, type }，需要批量查价格
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
              // 映射 + 缓存全量数据
              this._searchAllData = rawList.map(item => this.mapSpotItem(item));
            } else {
              this._searchAllData = [];
            }
          }
          // 从缓存中按 page/size 切片
          total = this._searchAllData.length;
          totalPages = Math.ceil(total / this.size);
          const start = (this.page - 1) * this.size;
          rawList = []; // 搜索路径不走后面的 rawList 映射
          // 直接赋值分页切片（已映射+排序）
          let slicedData = this._searchAllData;
          // 客户端排序（排序整个搜索结果集，再切片）
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
          this.loading = false;
          this._fetching = false;
          return; // 搜索路径到此结束
        } else {
          // 切换到非搜索模式时清空缓存
          this._searchAllData = [];
          // 正常分页查询：使用 /spot/sina 接口
          const params = {
            stock_type: this.marketType,
            page: this.page,
            size: this.size
          };

          // 将前端 sortType（如 "zd_desc"）拆分为后端 sort + order 参数
          if (this.sortType) {
            const parts = this.sortType.split('_');
            const dir = parts.pop();          // "desc" 或 "asc"
            const field = parts.join('_');     // "zd" / "last" / "vol" / "amount"
            params.sort = field;
            params.order = dir;
          }

          const res = await request.getSpotSina(params);
          // 后端返回：{ status: "ok", data: { list: [...], pages, total } }
          const resData = res.data || {};
          rawList = resData.list || [];
          total = resData.total || 0;
          totalPages = resData.pages || 0;
        }

        // 映射字段
        let mapped = rawList.map(item => this.mapSpotItem(item));

        // 客户端排序兜底（搜索结果或后端未排序时在当前页内排序）
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
            mapped.sort(sortMap[this.sortType]);
          }
        }

        this.quoteList = mapped;
        this.total = total;
        this.totalPages = totalPages;
      } catch (err) {
        if (!options.silent) {
          this.$message.error('行情数据加载失败，请稍后重试');
        } else {
          console.warn('fetchQuoteList background update failed', err);
        }
      } finally {
        this.loading = false;
        this._fetching = false;
      }
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
        query: { code: row.code, name: row.name }
      });
    },
    // 分页大小改变
    handleSizeChange(val) {
      this.size = val;
      this.page = 1;
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
    },
    // 当前页改变
    handleCurrentChange(val) {
      this.page = val;
      this.fetchQuoteList({ useCacheFallback: false, silent: false });
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

/* 分页响应式：窄屏隐藏次要元素 */
@media screen and (max-width: 900px) {
  ::v-deep .stock-pagination .el-pagination__jump {
    display: none !important;
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
    gap: 4px;
  }
  .filter-bar .el-select,
  .filter-bar .el-input {
    width: 100% !important;
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