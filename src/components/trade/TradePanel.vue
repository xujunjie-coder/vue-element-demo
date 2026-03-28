<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <div class="card-container">
      <!-- 资产概览看板 (新增) -->
      <el-row :gutter="20" class="asset-dashboard" style="margin-bottom: 20px;">
        <el-col :xs="24" :sm="24" :md="16" :span="16">
          <div class="asset-chart-card">
            <h3 class="chart-title">账户资产净值走势 (近30日)</h3>
            <div ref="assetChart" class="asset-chart-canvas"></div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :span="8" class="asset-stats-col">
          <div class="asset-stats-card">
            <h3 class="chart-title">交易战绩复盘</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">总交易次数</div>
                <div class="stat-num">{{ orderList.length }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">胜率</div>
                <div class="stat-num text-up">{{ hasWinRateSamples ? `${winRate}%` : '--' }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">累计盈亏</div>
                <div class="stat-num" :class="totalProfit >= 0 ? 'text-up' : 'text-down'">{{ totalProfit }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">最大回撤</div>
                <div class="stat-num text-down">{{ hasReviewSamples ? `${maxDrawdown}%` : '--' }}</div>
              </div>
            </div>
            <div ref="winRateChart" class="winrate-chart-canvas"></div>
            <div v-if="!hasReviewSamples" class="review-empty-hint">暂无有效盈亏样本，至少完成 1 笔卖出后可生成分布</div>
          </div>
        </el-col>
      </el-row>

      <el-tabs v-model="activeTab" type="border-card" class="trade-tabs" style="width: 100%;">
        <el-tab-pane label="买入" name="buy">
          <div class="trade-form">
            <el-form
              class="trade-order-form"
              :model="buyForm"
              :rules="buyRules"
              ref="buyFormRef"
              label-width="100px"
            >
              <el-form-item label="股票代码" prop="code">
                <el-autocomplete
                  v-model="buyForm.code"
                  :fetch-suggestions="queryStock"
                  @select="handleStockSelect"
                  @blur="getStockName('buy')"
                  placeholder="请输入股票代码或名称"
                  clearable
                ></el-autocomplete>
              </el-form-item>
              <el-form-item label="股票名称" prop="name">
                <el-input
                  v-model="buyForm.name"
                  readonly
                  placeholder="自动填充"
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item label="买入价格" prop="price">
                <el-input
                  v-model="buyForm.price"
                  placeholder="默认最新价"
                  @blur="calcTotal('buy')"
                >
                  <template slot="append">元</template>
                </el-input>
              </el-form-item>
              <el-form-item label="买入数量" prop="amount">
                <el-input-number
                  v-model="buyForm.amount"
                  :min="100"
                  :step="100"
                  :step-strictly="true"
                  placeholder="最少100股"
                  controls-position="right"
                  style="width: 100%;"
                  @change="calcTotal('buy')"
                ></el-input-number>
                <div class="form-tip">提示：委托数量需为100股的整数倍</div>
              </el-form-item>
              <el-form-item label="可用资金">
                <el-input
                  :value="userBalance"
                  readonly
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item label="预估手续费">
                <el-input
                  :value="buyFee"
                  readonly
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item label="预估总额">
                <el-input
                  :value="buyTotal"
                  readonly
                  :class="['readonly-input', {'text-up': Number(buyTotal) > Number(userBalance)}]"
                ></el-input>
                <div class="form-tip" v-if="Number(buyTotal) > Number(userBalance)">
                  <i class="el-icon-warning text-up"></i> 资金不足，无法委托
                </div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="submitTrade('buy')"
                  :disabled="Number(buyTotal) > Number(userBalance) || !buyForm.amount || !buyForm.price || !buyForm.code"
                >
                  买入委托
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="卖出" name="sell">
          <div class="trade-form">
            <el-form
              class="trade-order-form"
              :model="sellForm"
              :rules="sellRules"
              ref="sellFormRef"
              label-width="100px"
            >
              <el-form-item label="持仓股票" prop="code">
                <el-select
                  v-model="sellForm.code"
                  placeholder="请选择持仓股票"
                  @change="getStockInfo"
                >
                  <el-option
                    v-for="stock in holdList"
                    :key="stock.code"
                    :label="`${stock.name}(${stock.code})`"
                    :value="stock.code"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="股票名称" prop="name">
                <el-input
                  v-model="sellForm.name"
                  readonly
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item label="持仓数量" prop="holdAmount">
                <el-input
                  v-model="sellForm.holdAmount"
                  readonly
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item label="卖出价格" prop="price">
                <el-input
                  v-model="sellForm.price"
                  placeholder="默认最新价"
                  @blur="calcTotal('sell')"
                >
                  <template slot="append">元</template>
                </el-input>
              </el-form-item>
              <el-form-item label="卖出数量" prop="amount">
                <el-input-number
                  v-model="sellForm.amount"
                  :min="100"
                  :max="Number(sellForm.holdAmount) || Infinity"
                  :step="100"
                  :step-strictly="true"
                  placeholder="最多持仓数量"
                  controls-position="right"
                  style="width: 100%;"
                  @change="calcTotal('sell')"
                ></el-input-number>
                <div class="form-tip">提示：委托数量需为100股的整数倍，不超过持仓数量</div>
              </el-form-item>
              <el-form-item label="预估手续费">
                <el-input
                  :value="sellFee"
                  readonly
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item label="预估净额">
                <el-input
                  :value="sellTotal"
                  readonly
                  class="readonly-input"
                ></el-input>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="submitTrade('sell')"
                  :disabled="!sellForm.amount || !sellForm.price || !sellForm.code || Number(sellForm.amount) > Number(sellForm.holdAmount)"
                >
                  卖出委托
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="持仓查询" name="hold">
          <div class="hold-list">
            <div class="table-scroll">
            <el-table
              :data="holdList"
              border
              style="width: 100%;"
              class="hold-table"
            >
              <el-table-column prop="code" label="代码" min-width="80" />
              <el-table-column prop="name" label="名称" min-width="80" />
              <el-table-column prop="hold" label="持仓" min-width="70" />
              <el-table-column prop="cost" label="成本价" min-width="70">
                <template slot-scope="scope">{{ scope.row.cost }}</template>
              </el-table-column>
              <el-table-column prop="price" label="最新价" min-width="70">
                <template slot-scope="scope">
                  <span :class="getChangeClass(scope.row.profit)">{{ scope.row.price }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="profit" label="浮盈" min-width="70">
                <template slot-scope="scope">
                  <span :class="getChangeClass(scope.row.profit)">{{ scope.row.profit }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="profit_rate" label="盈率" min-width="70">
                <template slot-scope="scope">
                  <span :class="getChangeClass(scope.row.profit)">{{ scope.row.profit_rate }}%</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="60">
                <template slot-scope="scope">
                  <el-button
                    type="text"
                    @click="toSell(scope.row)"
                    class="text-down"
                  >
                    卖出
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            </div>

            <div class="balance-info" v-if="userBalance">
              <div class="balance-item">
                <span class="label">账户总资产：</span>
                <span class="value data-text">{{ totalAsset }}</span>
              </div>
              <div class="balance-item">
                <span class="label">可用资金：</span>
                <span class="value">{{ userBalance }}</span>
              </div>
              <div class="balance-item">
                <span class="label">持仓总市值：</span>
                <span class="value">{{ holdValue }}</span>
              </div>
            </div>

            <div class="no-hold" v-if="holdList.length === 0">
              <el-empty description="暂无持仓，请先买入股票"></el-empty>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="委托单查询" name="order">
          <div class="order-list">
            <div class="table-scroll">
            <el-table
              :data="orderList"
              border
              style="width: 100%;"
              class="order-table"
            >
              <el-table-column prop="order_no" label="委托单号" min-width="120" />
              <el-table-column prop="code" label="代码" min-width="80" />
              <el-table-column prop="name" label="名称" min-width="80" />
              <el-table-column prop="direction" label="类型" min-width="60">
                <template slot-scope="scope">
                  <span class="direction-tag" :class="scope.row.direction === 'buy' ? 'tag-buy' : 'tag-sell'">
                    {{ scope.row.direction === 'buy' ? '买入' : '卖出' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="price" label="价格" min-width="70" />
              <el-table-column prop="amount" label="数量" min-width="70" />
              <el-table-column prop="status" label="状态" min-width="70">
                <template slot-scope="scope">
                  <span class="status-tag" :class="getOrderStatusClass(scope.row.status)">
                    {{ scope.row.status === 'success' ? '已成交' : scope.row.status === 'pending' ? '待成交' : '已撤销' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="create_time" label="委托时间" min-width="120" />
              <el-table-column label="操作" min-width="60" v-if="activeTab === 'order'">
                <template slot-scope="scope">
                  <el-button
                    type="text"
                    @click="viewOrderStock(scope.row)"
                  >
                    详情
                  </el-button>
                  <el-button
                    type="text"
                    @click="cancelOrder(scope.row)"
                    class="text-up"
                    v-if="scope.row.status === 'pending'"
                  >
                    撤销
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            </div>

            <div class="no-order" v-if="orderList.length === 0">
              <el-empty description="暂无委托单记录"></el-empty>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-main>
</template>

<script>
import { mapState } from 'vuex';
import * as echarts from 'echarts';
import request, { stripStockPrefix } from '../../utils/request';
import { getChangeClass, formatPrice } from '../../utils/format';

export default {
  name: 'TradePanel',
  data() {
    return {
      activeTab: 'buy',
      loading: false,
      // 图表实例
      assetChartInstance: null,
      winRateChartInstance: null,
      // 买入表单
      buyForm: {
        code: '',
        name: '',
        price: '',
        amount: undefined
      },
      // 卖出表单
      sellForm: {
        code: '',
        name: '',
        holdAmount: '',
        price: '',
        amount: undefined
      },
      // 买入表单校验规则
      buyRules: {
        code: [{ required: true, message: '请输入股票代码', trigger: 'blur' }, { len: 6, message: '股票代码为6位数字', trigger: 'blur' }],
        name: [{ required: true, message: '股票名称不能为空', trigger: 'blur' }],
        price: [{ required: true, message: '请输入买入价格', trigger: 'blur' },
                { validator: (r, v, cb) => { const n = Number(v); (!v && v !== 0) || isNaN(n) || n < 0.01 ? cb(new Error('价格不能小于0.01')) : cb(); }, trigger: 'blur' }],
        amount: [{ required: true, message: '请输入买入数量', trigger: 'change' },
                 { validator: (r, v, cb) => { const n = Number(v); !n || n < 100 ? cb(new Error('最少买入100股')) : n % 100 !== 0 ? cb(new Error('数量需为100的整数倍')) : cb(); }, trigger: 'change' }]
      },
      // 卖出表单校验规则
      sellRules: {
        code: [{ required: true, message: '请选择持仓股票', trigger: 'change' }],
        price: [{ required: true, message: '请输入卖出价格', trigger: 'blur' },
                { validator: (r, v, cb) => { const n = Number(v); (!v && v !== 0) || isNaN(n) || n < 0.01 ? cb(new Error('价格不能小于0.01')) : cb(); }, trigger: 'blur' }],
        amount: [{ required: true, message: '请输入卖出数量', trigger: 'change' },
                 { validator: (r, v, cb) => { const n = Number(v); !n || n < 100 ? cb(new Error('最少卖出100股')) : n % 100 !== 0 ? cb(new Error('数量需为100的整数倍')) : cb(); }, trigger: 'change' }]
      },
      // 持仓列表
      holdList: [],
      // 委托单列表
      orderList: [],
      // 用户资金
      userBalance: '0.00',
      // 买入相关计算
      buyFee: '0.00',
      buyTotal: '0.00',
      // 卖出相关计算
      sellFee: '0.00',
      sellTotal: '0.00'
    };
  },
  computed: {
    ...mapState(['currentStockCode', 'userInfo', 'theme']),
    // 获取当前用户名，用于 localStorage key 隔离
    _username() {
      return (this.userInfo && this.userInfo.username) || '';
    },
    // 持仓总市值
    holdValue() {
      if (!this.holdList.length) return '0.00';
      const total = this.holdList.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const hold = Number(item.hold) || 0;
        return sum + price * hold;
      }, 0);
      return formatPrice(total);
    },
    // 账户总资产
    totalAsset() {
      return formatPrice(Number(this.userBalance) + Number(this.holdValue));
    },
    successfulOrders() {
      return (this.orderList || []).filter(item => item.status === 'success');
    },
    successfulSellOrders() {
      return (this.orderList || []).filter(item => item.status === 'success' && item.direction === 'sell');
    },
    reviewPnlSeries() {
      // 复盘序列：
      // 1) 卖出单使用已实现盈亏；
      // 2) 买入单仅在仍有持仓时按浮盈估算；
      // 3) 过滤接近 0 的噪声值，避免图表出现“几乎全是 0”的异常观感。
      return [...this.successfulOrders]
        .reverse()
        .map(item => {
          if (item.direction === 'sell') {
            return Number(String(item.profit || 0).replace(/,/g, '')) || 0;
          }

          const hold = this.holdList.find(h => h.code === item.code);
          if (!hold) return null;

          const orderPrice = Number(String(item.price || 0).replace(/,/g, '')) || 0;
          const amount = Number(item.amount) || 0;
          const currentPrice = Number(String(hold.price || 0).replace(/,/g, '')) || orderPrice;
          return (currentPrice - orderPrice) * amount;
        })
        .filter(v => Number.isFinite(v) && Math.abs(v) > 0.005);
    },
    hasReviewSamples() {
      return this.reviewPnlSeries.length > 0;
    },
    hasWinRateSamples() {
      return this.realizedProfitSeries.length > 0;
    },
    realizedProfitSeries() {
      // orderList 是最新在前，回测指标需要按时间正序
      return [...this.successfulSellOrders]
        .reverse()
        .map(item => Number(String(item.profit || 0).replace(/,/g, '')) || 0);
    },
    // 交易统计指标
    winRate() {
      // 胜率仅按“已卖出成交单”的已实现盈亏计算
      const series = this.realizedProfitSeries;
      if (!series.length) return '0.0';
      const winCount = series.filter(v => v > 0).length;
      return ((winCount / series.length) * 100).toFixed(1);
    },
    totalProfit() {
      // 累计盈亏 = 已实现盈亏（卖出） + 当前持仓浮盈
      const realized = this.realizedProfitSeries.reduce((sum, val) => sum + val, 0);
      const unrealized = this.holdList.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
      const profit = realized + unrealized;
      return profit.toFixed(2);
    },
    maxDrawdown() {
      // 基于复盘序列（含买入浮盈估算 + 卖出已实现）估算最大回撤
      const initialCapital = 1000000;
      let equity = initialCapital;
      let peak = initialCapital;
      let maxDd = 0;
      this.reviewPnlSeries.forEach(pnl => {
        equity += pnl;
        if (equity > peak) peak = equity;
        const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
        if (dd > maxDd) maxDd = dd;
      });
      return maxDd.toFixed(2);
    }
  },
  watch: {
    _username() {
      this.loadUserTradingData();
    },
    orderList: {
      handler() {
        this.$nextTick(() => {
          this.initAssetChart();
          this.initWinRateChart();
        });
      },
      deep: true
    },
    holdList: {
      handler() {
        this.$nextTick(() => {
          this.initAssetChart();
        });
      },
      deep: true
    },
    userBalance() {
      this.$nextTick(() => {
        this.initAssetChart();
      });
    },
    theme() {
      // 切换主题时重新初始化图表
      this.$nextTick(() => {
        if (this.assetChartInstance && !this.assetChartInstance.isDisposed()) {
          this.assetChartInstance.dispose();
        }
        if (this.winRateChartInstance && !this.winRateChartInstance.isDisposed()) {
          this.winRateChartInstance.dispose();
        }
        this.assetChartInstance = null;
        this.winRateChartInstance = null;
        this.initAssetChart();
        this.initWinRateChart();
      });
    }
  },
  mounted() {
    // 初始化图表
    this.$nextTick(() => {
      this.initAssetChart();
      this.initWinRateChart();
    });

    // 监听窗口调整
    window.addEventListener('resize', this.handleResize);

    this.loadUserTradingData();

    // 如果从其他页面带了股票代码过来，自动填写
    if (this.$route.query.code) {
      const routeCode = stripStockPrefix(this.$route.query.code);
      this.buyForm.code = routeCode;
      this.buyForm.name = this.$route.query.name || '';
      if (this.$route.query.price) {
        this.buyForm.price = formatPrice(this.$route.query.price);
      }

      // 无论是否带名称，都主动请求一次实时数据，确保名称和价格都自动填充
      if (routeCode && routeCode.length === 6) {
        this.getStockName('buy');
      } else {
        this.getStockNameFromCache('buy');
      }
    }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.assetChartInstance && !this.assetChartInstance.isDisposed()) {
      this.assetChartInstance.dispose();
    }
    if (this.winRateChartInstance && !this.winRateChartInstance.isDisposed()) {
      this.winRateChartInstance.dispose();
    }
    this.assetChartInstance = null;
    this.winRateChartInstance = null;
  },
  methods: {
    getChangeClass,

    isChartAlive(instance) {
      return !!(instance && !(typeof instance.isDisposed === 'function' && instance.isDisposed()));
    },

    migrateLegacyTradingData(username) {
      // 为避免新账号继承历史账号数据，关闭 legacy(sim_*) 自动迁移。
      void username;
    },

    loadUserTradingData() {
      const u = this._username;
      if (!u) {
        this.userBalance = formatPrice(1000000);
        this.holdList = [];
        this.orderList = [];
        return;
      }

      const balanceKey = `sim_balance_${u}`;
      const holdKey = `sim_hold_list_${u}`;
      const orderKey = `sim_order_list_${u}`;

      if (!localStorage.getItem(balanceKey)) {
        localStorage.setItem(balanceKey, '1000000');
      }
      this.userBalance = formatPrice(Number(localStorage.getItem(balanceKey)) || 1000000);

      try {
        const savedHold = JSON.parse(localStorage.getItem(holdKey) || '[]');
        this.holdList = Array.isArray(savedHold) ? savedHold : [];
      } catch (e) { this.holdList = []; }
      try {
        const savedOrders = JSON.parse(localStorage.getItem(orderKey) || '[]');
        this.orderList = Array.isArray(savedOrders) ? savedOrders : [];
      } catch (e) { this.orderList = []; }

      this.refreshHoldPrices();
      this.$nextTick(() => {
        this.initWinRateChart();
      });
    },

    handleResize() {
      if (this.isChartAlive(this.assetChartInstance)) this.assetChartInstance.resize();
      if (this.isChartAlive(this.winRateChartInstance)) this.winRateChartInstance.resize();
    },

    // 初始化资产走势图
    initAssetChart() {
      if (!this.$refs.assetChart) return;
      const existing = echarts.getInstanceByDom(this.$refs.assetChart);
      if (existing) existing.dispose();
      this.assetChartInstance = echarts.init(this.$refs.assetChart);
      
      const isDark = this.theme === 'dark';
      const axisColor = isDark ? '#ccc' : '#666';
      const splitColor = isDark ? '#333' : '#eee';

      const { dates, data } = this.buildLocalAssetSeries(30);

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line' }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: { color: axisColor, fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
          axisLabel: { color: axisColor, fontSize: 10 }
        },
        series: [{
          name: '总资产',
          type: 'line',
          smooth: true,
          symbol: 'none',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ])
          },
          lineStyle: { width: 2, color: '#1890ff' },
          data: data
        }]
      };
      if (!this.isChartAlive(this.assetChartInstance)) return;
      this.assetChartInstance.setOption(option);
    },

    // 基于本地真实交易数据构建近N日资产曲线（不使用随机模拟）
    buildLocalAssetSeries(days = 30) {
      const toNum = (v) => {
        const n = Number(String(v == null ? 0 : v).replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      };
      const parseOrderDate = (order) => {
        const t = order && order.create_time ? String(order.create_time).trim() : '';
        if (!t) return '';
        const normalized = t.replace(/\//g, '-').replace(' ', 'T');
        const d = new Date(normalized);
        if (!Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
        return t.slice(0, 10).replace(/\//g, '-');
      };

      const dayKeys = [];
      const dayLabels = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m2 = String(d.getMonth() + 1).padStart(2, '0');
        const dd2 = String(d.getDate()).padStart(2, '0');
        dayKeys.push(`${y}-${m2}-${dd2}`);
        dayLabels.push(`${d.getMonth() + 1}-${d.getDate()}`);
      }

      const firstDay = dayKeys[0];
      const pnlByDay = {};
      let realizedBeforeWindow = 0;
      let realizedTotal = 0;

      (this.orderList || []).forEach((order) => {
        if (!order || order.status !== 'success' || order.direction !== 'sell') return;
        const pnl = toNum(order.profit);
        realizedTotal += pnl;
        const day = parseOrderDate(order);
        if (!day) return;
        if (day < firstDay) {
          realizedBeforeWindow += pnl;
        } else if (pnlByDay[day] != null) {
          pnlByDay[day] += pnl;
        } else {
          pnlByDay[day] = pnl;
        }
      });

      const cash = toNum(this.userBalance);
      const holdValue = (this.holdList || []).reduce((sum, item) => sum + toNum(item.price) * toNum(item.hold), 0);
      const currentTotalAsset = cash + holdValue;
      const baseWithoutRealized = currentTotalAsset - realizedTotal;

      let cum = realizedBeforeWindow;
      const series = dayKeys.map((day) => {
        cum += toNum(pnlByDay[day]);
        return Number((baseWithoutRealized + cum).toFixed(2));
      });

      return {
        dates: dayLabels,
        data: series
      };
    },

    // 初始化盈亏分布柱状图
    initWinRateChart() {
      if (!this.$refs.winRateChart) return;
      const existing = echarts.getInstanceByDom(this.$refs.winRateChart);
      if (existing) existing.dispose();
      this.winRateChartInstance = echarts.init(this.$refs.winRateChart);
      
      const isDark = this.theme === 'dark';
      const textColor = isDark ? '#ccc' : '#666';
      const profitSeries = this.reviewPnlSeries;
      const lastTen = profitSeries.slice(-10);
      const hasData = lastTen.length > 0;
      const xLabels = lastTen.length
        ? lastTen.map((_, idx) => String(idx + 1))
        : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      const yData = (lastTen.length ? lastTen : new Array(10).fill(0))
        .map(v => Number((Number(v) || 0).toFixed(2)));

      const option = {
        title: { text: '近10笔盈亏分布', left: 'center', textStyle: { fontSize: 12, color: textColor } },
        tooltip: hasData
          ? {
            trigger: 'item',
            formatter: (params) => {
              const val = Number(params.value) || 0;
              return `${params.marker}${params.name}：${val.toFixed(2)}`;
            }
          }
          : { show: false },
        grid: { left: '2%', right: '2%', bottom: '5%', top: '25%', containLabel: true },
        xAxis: { 
          type: 'category', 
          data: xLabels,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: textColor }
        },
        yAxis: { show: false },
        series: [{
          type: 'bar',
          data: yData,
          itemStyle: {
            color: hasData
              ? (params) => (params.value >= 0 ? '#e53935' : '#2f9b56')
              : '#d9dde5',
            borderRadius: 2
          },
          label: { show: false }
        }],
        graphic: !hasData
          ? {
            type: 'text',
            left: 'center',
            top: '56%',
            style: {
              text: '暂无可统计盈亏数据',
              fill: textColor,
              opacity: 0.72,
              fontSize: 12
            }
          }
          : undefined
      };
      if (!this.isChartAlive(this.winRateChartInstance)) return;
      this.winRateChartInstance.setOption(option);
    },

    // ====== 持仓实时价格刷新（调用真实行情接口） ======
    async refreshHoldPrices() {
      if (!this.holdList.length) return;
      try {
        const results = await request.getStockLastBatch(this.holdList.map(s => s.code));
        results.forEach((d, i) => {
          if (!d || !d.last) return;
          const stock = this.holdList[i];
          const currentPrice = Number(d.last);
          const costNum = Number(stock.cost) || currentPrice;
          const holdNum = Number(stock.hold) || 0;
          const profit = (currentPrice - costNum) * holdNum;
          const profitRate = costNum > 0 ? ((currentPrice - costNum) / costNum * 100) : 0;
          this.$set(this.holdList, i, {
            ...stock,
            name: d.name || stock.name,
            price: formatPrice(currentPrice),
            profit: formatPrice(profit),
            profit_rate: profitRate.toFixed(2)
          });
        });
        this._saveHoldList();
      } catch (e) {
        console.warn('refreshHoldPrices error:', e);
      }
    },

    // ====== localStorage 持久化（按用户隔离） ======
    _userKey(base) {
      const u = this._username;
      return u ? `${base}_${u}` : `${base}__guest__`;
    },
    _saveHoldList() {
      localStorage.setItem(this._userKey('sim_hold_list'), JSON.stringify(this.holdList));
    },
    _saveOrderList() {
      localStorage.setItem(this._userKey('sim_order_list'), JSON.stringify(this.orderList));
    },
    _saveBalance() {
      localStorage.setItem(this._userKey('sim_balance'), String(this._rawBalance()));
    },
    _rawBalance() {
      return Number(String(this.userBalance).replace(/,/g, '')) || 0;
    },

    // ====== 股票搜索 ======
    async queryStock(queryString, callback) {
      if (!queryString || queryString.length < 1) { callback([]); return; }
      try {
        // 使用后端 /spot/search 接口搜索
        const res = await request.searchStock(queryString, 10);
        const list = res.data || [];
        callback(list.map(item => ({
          value: item.code,
          label: `${item.code} ${item.name}`
        })));
      } catch (err) {
        callback([]);
      }
    },
    // 选择股票后自动填充名称和价格
    async handleStockSelect(item) {
      this.buyForm.code = item.value;
      try {
        const res = await request.getStockLast(item.value, { _silent: true });
        const d = res.data || {};
        if (d.name) {
          this.buyForm.name = d.name;
          this.buyForm.price = formatPrice(d.last);
          this.calcTotal('buy');
        } else {
          this.getStockNameFromCache('buy');
        }
      } catch (err) {
        // 静默回退到缓存
        this.getStockNameFromCache('buy');
      }
    },
    // 获取用户信息（前端模拟，不调后端）
    fetchUserInfo() {
      this.userBalance = formatPrice(Number(localStorage.getItem(this._userKey('sim_balance'))) || 1000000);
    },
    // 买入时获取股票名称（在线查询）
    async getStockName(type) {
      const code = type === 'buy' ? this.buyForm.code : this.sellForm.code;
      if (!code || code.length !== 6) return;
      try {
        const res = await request.getStockLast(code, { _silent: true });
        const d = res.data || {};
        if (d.name) {
          if (type === 'buy') {
            this.buyForm.name = d.name;
            this.buyForm.price = formatPrice(d.last);
          } else {
            this.sellForm.name = d.name;
            this.sellForm.price = formatPrice(d.last);
          }
          this.calcTotal(type);
        } else {
          // 在线查询没返回有效数据，尝试从缓存补全
          this.getStockNameFromCache(type);
        }
      } catch (err) {
        // 接口失败时静默回退到缓存查询，不弹错误提示
        console.warn('getStockName fallback to cache:', err.message);
        this.getStockNameFromCache(type);
      }
    },
    // 从行情缓存中查找股票名称和价格（使用 /spot/search 接口）
    async getStockNameFromCache(type) {
      const code = type === 'buy' ? this.buyForm.code : this.sellForm.code;
      if (!code) return;
      try {
        const res = await request.searchStock(code, 1);
        const list = res.data || [];
        if (list.length > 0) {
          // 搜索接口只返回 code/name，需要查询价格
          const detail = await request.getStockLast(list[0].code, { _silent: true }).catch(() => ({ data: {} }));
          const d = detail.data || {};
          if (type === 'buy') {
            if (!this.buyForm.name) this.buyForm.name = list[0].name || d.name;
            if (!this.buyForm.price && d.last) this.buyForm.price = formatPrice(d.last);
          } else {
            if (!this.sellForm.name) this.sellForm.name = list[0].name || d.name;
            if (!this.sellForm.price && d.last) this.sellForm.price = formatPrice(d.last);
          }
          this.calcTotal(type);
        }
      } catch (e) {
        console.warn('getStockNameFromCache error:', e.message);
      }
    },
    // 卖出时获取股票信息
    getStockInfo(code) {
      const stock = this.holdList.find(item => item.code === code);
      if (stock) {
        this.sellForm.name = stock.name;
        this.sellForm.holdAmount = stock.hold;
        this.sellForm.price = stock.price;
      }
    },
    // 检查数量是否为100的整数倍
    checkAmount(type) {
      const amount = type === 'buy' ? this.buyForm.amount : this.sellForm.amount;
      if (amount && amount % 100 !== 0) {
        this.$message.warning('委托数量需为100股的整数倍');
      }
    },
    // 计算手续费和总额
    calcTotal(type) {
      const rate = 0.0005; // 手续费率0.05%
      if (type === 'buy') {
        const price = Number(this.buyForm.price) || 0;
        const amount = Number(this.buyForm.amount) || 0;
        this.buyFee = formatPrice(price * amount * rate);
        this.buyTotal = formatPrice(price * amount + Number(this.buyFee));
      } else {
        const price = Number(this.sellForm.price) || 0;
        const amount = Number(this.sellForm.amount) || 0;
        this.sellFee = formatPrice(price * amount * rate);
        this.sellTotal = formatPrice(price * amount - Number(this.sellFee));
      }
    },
    // 提交委托（前端模拟交易）
    async submitTrade(type) {
      const formRef = type === 'buy' ? this.$refs.buyFormRef : this.$refs.sellFormRef;
      formRef.validate(async (valid) => {
        if (valid) {
          const form = type === 'buy' ? this.buyForm : this.sellForm;
          const amount = Number(form.amount);
          const price = Number(form.price);

          if (!amount || amount % 100 !== 0) {
            this.$message.warning('委托数量需为100股的整数倍');
            return;
          }

          const totalCost = price * amount;
          const fee = Math.max(totalCost * 0.0005, 5); // 佣金最低5元
          const balance = this._rawBalance();

          if (type === 'buy') {
            // 资金检查
            if (totalCost + fee > balance) {
              this.$message.warning('资金不足，无法委托');
              return;
            }

            // 扣除资金
            const newBalance = balance - totalCost - fee;
            this.userBalance = formatPrice(newBalance);
            this._saveBalance();

            // 更新持仓（合并同股票）
            const existIdx = this.holdList.findIndex(s => s.code === form.code);
            if (existIdx >= 0) {
              const old = this.holdList[existIdx];
              const oldHold = Number(old.hold) || 0;
              const oldCost = Number(old.cost) || price;
              const newHold = oldHold + amount;
              const newCost = ((oldCost * oldHold) + (price * amount)) / newHold;
              this.$set(this.holdList, existIdx, {
                ...old,
                hold: newHold,
                cost: formatPrice(newCost),
                price: formatPrice(price),
                profit: formatPrice((price - newCost) * newHold),
                profit_rate: (newCost > 0 ? ((price - newCost) / newCost * 100) : 0).toFixed(2)
              });
            } else {
              this.holdList.push({
                code: form.code,
                name: form.name,
                hold: amount,
                cost: formatPrice(price),
                price: formatPrice(price),
                profit: '0.00',
                profit_rate: '0.00'
              });
            }
            this._saveHoldList();

          } else {
            // 卖出：检查持仓
            const existIdx = this.holdList.findIndex(s => s.code === form.code);
            if (existIdx < 0 || Number(this.holdList[existIdx].hold) < amount) {
              this.$message.warning('持仓不足');
              return;
            }

            // 增加资金（扣除卖出费用：佣金+印花税）
            const stampTax = totalCost * 0.001; // 印花税千分之一
            const newBalance = balance + totalCost - fee - stampTax;
            this.userBalance = formatPrice(newBalance);
            this._saveBalance();

            // 减少持仓并计算盈亏
            const old = this.holdList[existIdx];
            const costPrice = Number(String(old.cost).replace(/,/g, '')) || 0;
            const sellProfit = (price - costPrice) * amount; // 卖出盈亏
            const remainHold = Number(old.hold) - amount;
            if (remainHold <= 0) {
              this.holdList.splice(existIdx, 1);
            } else {
              this.$set(this.holdList, existIdx, { ...old, hold: remainHold });
            }
            this._saveHoldList();
            // 保存本次卖出盈亏，供后续使用
            this._lastSellProfit = sellProfit;
          }

          // 生成委托单号
          const now = new Date();
          const orderNo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          // 添加委托单记录（卖出时记录盈亏）
          const orderRecord = {
            order_no: orderNo,
            code: form.code,
            name: form.name,
            direction: type,
            price: formatPrice(price),
            amount: amount,
            status: 'success',
            profit: type === 'sell' ? formatPrice(this._lastSellProfit || 0) : '0.00',
            create_time: timeStr
          };
          this.orderList.unshift(orderRecord);
          this._saveOrderList();

          this.$message.success(`${type === 'buy' ? '买入' : '卖出'}委托成功，委托单号：${orderNo}`);

          // 重置表单
          if (type === 'buy') {
            this.$refs.buyFormRef.resetFields();
          } else {
            this.$refs.sellFormRef.resetFields();
          }
          this.buyFee = '0.00';
          this.buyTotal = '0.00';
          this.sellFee = '0.00';
          this.sellTotal = '0.00';
        }
      });
    },
    // 跳转到卖出页
    toSell(stock) {
      this.activeTab = 'sell';
      this.sellForm.code = stock.code;
      this.sellForm.name = stock.name;
      this.sellForm.holdAmount = stock.hold;
      this.sellForm.price = stock.price;
    },
    // 查看委托对应股票详情
    viewOrderStock(order) {
      if (!order || !order.code) return;
      const code = stripStockPrefix(order.code);
      this.$router.push(`/detail/${code}`);
    },
    // 撤销委托
    cancelOrder(order) {
      this.$confirm('确定要撤销该委托单吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.orderList = this.orderList.map(item => 
          item.order_no === order.order_no ? { ...item, status: 'canceled' } : item
        );
        this._saveOrderList();
        this.$message.success('委托单撤销成功');
      }).catch(() => {
        this.$message.info('已取消撤销');
      });
    },
    // 获取委托状态样式
    getOrderStatusClass(status) {
      if (status === 'success') return 'tag-success';
      if (status === 'pending') return 'tag-pending';
      return 'tag-canceled';
    }
  }
};
</script>

<style scoped>
.trade-form {
  padding: 10px;
}
.el-form-item {
  margin-bottom: 20px;
}
.form-tip {
  font-size: 12px;
  color: var(--color-text-muted, #999);
  margin-top: 5px;
}
/* 数量输入框数字左对齐 */
::v-deep .el-input-number .el-input__inner {
  text-align: left;
}
.hold-list, .order-list {
  padding: 10px;
}
.balance-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 30px;
  margin-top: 20px;
  padding: 15px;
  background: var(--color-card-bg, #f9f9f9);
  border-radius: var(--border-radius-base);
  border: 1px solid var(--color-border, transparent);
}
.balance-item {
  display: flex;
  align-items: center;
  min-width: 0;
}
.label {
  font-size: 14px;
  color: var(--color-text-secondary, #666);
  margin-right: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.value {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-text, #333);
  white-space: nowrap;
}
.no-hold, .no-order {
  margin-top: 50px;
  text-align: center;
}
.direction-tag, .status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
}
.tag-buy {
  background-color: var(--color-up);
}
.tag-sell {
  background-color: var(--color-down);
}
.tag-success {
  background-color: var(--color-down);
}
.tag-pending {
  background-color: #ff9f43;
}
.tag-canceled {
  background-color: #999;
}
.text-up {
  color: var(--color-up);
}

/* 只读输入框样式 */
::v-deep .readonly-input .el-input__inner {
  background-color: var(--color-card-bg, #f9f9f9) !important;
  color: var(--color-text, #333) !important;
  border-color: var(--color-border, #dcdfe6) !important;
  cursor: default;
}
/* 资产看板样式 */
.asset-dashboard {
  margin-bottom: 20px;
}
.asset-chart-card, .asset-stats-card {
  background: var(--color-card-bg);
  border-radius: 8px;
  padding: 16px;
  height: 340px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}
.asset-chart-canvas {
  width: 100%;
  height: 280px;
}
.winrate-chart-canvas {
  width: 100%;
  height: 160px;
  margin-top: 10px;
}
.review-empty-hint {
  margin-top: 6px;
  text-align: center;
  font-size: 12px;
  color: #909399;
}
.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #333; /* Darker color for light mode */
  margin-bottom: 15px;
  text-align: center;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px 10px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.stat-item {
  text-align: center;
}
.stat-label {
  font-size: 12px;
  color: #666; /* Darker color for light mode */
  margin-bottom: 6px;
}
.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #333; /* Darker color for light mode */
  line-height: 1.2;
}
.text-up { color: var(--color-up); }
.text-down { color: var(--color-down); }

/* 深色模式适配 */
[data-theme="dark"] .chart-title {
  color: #e6e6e6;
}
[data-theme="dark"] .stat-label {
  color: #cccccc;
}
[data-theme="dark"] .stat-num {
  color: #ffffff;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

::v-deep .hold-table {
  min-width: 640px;
}

::v-deep .order-table {
  min-width: 820px;
}

@media screen and (max-width: 1024px) {
  .trade-form,
  .hold-list,
  .order-list {
    padding: 8px;
  }

  .asset-chart-card,
  .asset-stats-card {
    height: auto;
    min-height: 300px;
    padding: 12px;
  }

  .asset-chart-canvas {
    height: 240px;
  }

  .winrate-chart-canvas {
    height: 150px;
  }

  .stats-grid {
    gap: 12px 8px;
  }

  .stat-num {
    font-size: 18px;
  }

  .asset-stats-col {
    margin-top: 12px;
  }
}

@media screen and (max-width: 768px) {
  .asset-stats-col {
    margin-top: 14px;
  }

  ::v-deep .trade-tabs .el-tabs__header {
    margin-bottom: 10px;
  }

  ::v-deep .trade-tabs .el-tabs__item {
    padding: 0 12px;
    font-size: 13px;
  }

  ::v-deep .trade-order-form .el-form-item {
    margin-bottom: 14px;
  }

  ::v-deep .trade-order-form .el-form-item__label {
    width: 84px !important;
    font-size: 13px;
    padding-right: 8px;
  }

  ::v-deep .trade-order-form .el-form-item__content {
    margin-left: 84px !important;
  }

  ::v-deep .trade-order-form .el-input__inner,
  ::v-deep .trade-order-form .el-input-number__inner,
  ::v-deep .trade-order-form .el-autocomplete,
  ::v-deep .trade-order-form .el-select {
    font-size: 14px;
  }

  ::v-deep .trade-order-form .el-form-item:last-child .el-button {
    width: 100%;
  }

  .balance-info {
    gap: 8px 14px;
    padding: 10px;
  }

  .label {
    font-size: 13px;
  }

  .value {
    font-size: 15px;
  }

  .chart-title {
    font-size: 15px;
    margin-bottom: 10px;
  }

  .asset-chart-canvas {
    height: 210px;
  }

  .winrate-chart-canvas {
    height: 140px;
  }
}

@media screen and (max-width: 420px) {
  .trade-form,
  .hold-list,
  .order-list {
    padding: 6px;
  }

  ::v-deep .trade-tabs .el-tabs__item {
    padding: 0 8px;
    font-size: 12px;
  }

  ::v-deep .trade-order-form .el-form-item__label {
    width: 76px !important;
    font-size: 12px;
  }

  ::v-deep .trade-order-form .el-form-item__content {
    margin-left: 76px !important;
  }

  .form-tip {
    font-size: 11px;
  }

  .direction-tag,
  .status-tag {
    padding: 1px 6px;
    font-size: 11px;
  }

  .asset-chart-canvas {
    height: 190px;
  }

  .winrate-chart-canvas {
    height: 128px;
  }
}
</style>