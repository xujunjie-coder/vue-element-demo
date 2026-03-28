<template>
  <div class="ai-select-stock">
    <div class="card-container">
      <div class="page-header">
        <h2 class="page-title">AI智能选股 <span class="tag">🤖 大赛创新功能</span></h2>
        <p class="page-desc">利用大模型与量化算法，为您提供多维度的选股参考</p>
      </div>

      <el-tabs v-model="activeTab" class="ai-tabs">
        <!-- 模式一：自动推荐 -->
        <el-tab-pane label="🤖 自动推荐" name="recommend">
          <div class="recommend-header">
            <div class="header-info">
              <h3>智能优选</h3>
              <p>基于多因子模型，每日自动为您推荐 10 只高潜力股票</p>
            </div>
            <el-button type="primary" icon="el-icon-refresh" :loading="loading" @click="getAutoRecommendations">
              重新生成推荐
            </el-button>
          </div>

          <div class="table-scroll recommend-table-scroll">
          <el-table :data="recommendList" :size="recommendTableSize" border style="width: 100%;" class="recommend-table" v-loading="loading">
            <el-table-column prop="code" label="股票代码" :width="recommendWindowWidth < 700 ? 72 : 84" />
            <el-table-column prop="name" label="股票名称" :width="recommendWindowWidth < 700 ? 84 : 98" />
            <el-table-column label="最新价" :width="recommendWindowWidth < 700 ? 68 : 80">
              <template slot-scope="scope">
                <span :class="scope.row.change >= 0 ? 'text-up' : 'text-down'">
                  {{ scope.row.price || '--' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" :width="recommendWindowWidth < 700 ? 98 : 120">
              <template slot-scope="scope">
                <span :class="scope.row.change >= 0 ? 'text-up' : 'text-down'">
                  {{ scope.row.change >= 0 ? '+' : '' }}{{ scope.row.change }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column v-if="!isNarrowRecommend" prop="reason" label="推荐理由" min-width="250">
              <template slot-scope="scope">
                <el-tag size="mini" type="success" effect="dark" style="margin-right: 8px;">AI推荐</el-tag>
                <span class="recommend-reason">{{ scope.row.reason }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" :width="recommendWindowWidth < 700 ? 198 : (isNarrowRecommend ? 230 : 200)">
              <template slot-scope="scope">
                <el-button type="text" @click.stop="goStockDetail(scope.row)">详情</el-button>
                <el-button v-if="isNarrowRecommend" type="text" @click.stop="openReasonDialog(scope.row)">理由</el-button>
                <el-button type="text" class="text-up" @click.stop="handleAddOptionalStock(scope.row)">自选</el-button>
                <el-button type="text" class="text-down" @click.stop="tradeStock(scope.row)">交易</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
        </el-tab-pane>

        <!-- 模式二：指标选股 -->
        <el-tab-pane label="📊 指标选股" name="indicator">
          <div class="indicator-section">
            <el-card shadow="never" class="filter-card">
              <div slot="header"><span>设置筛选指标</span></div>
              <el-form :model="filters" label-width="84px" size="small" class="indicator-form">
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="12" :md="6" :span="6">
                    <el-form-item label="选股策略">
                      <el-select v-model="strategyType" style="width: 100%;">
                        <el-option label="低估值高成长" value="value_growth" />
                        <el-option label="均线多头排列" value="ma_bull" />
                        <el-option label="量价齐升" value="price_volume_up" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6" :span="6">
                    <el-form-item label="价格区间">
                      <div class="range-input">
                        <el-input-number v-model="filters.minPrice" :controls="false" placeholder="最低" class="range-number" />
                        <span class="range-split">-</span>
                        <el-input-number v-model="filters.maxPrice" :controls="false" placeholder="最高" class="range-number" />
                      </div>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6" :span="6">
                    <el-form-item label="涨跌幅(%)">
                      <div class="range-input">
                        <el-input-number v-model="filters.minChange" :controls="false" placeholder="最小" class="range-number" />
                        <span class="range-split">-</span>
                        <el-input-number v-model="filters.maxChange" :controls="false" placeholder="最大" class="range-number" />
                      </div>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6" :span="6">
                    <el-form-item label="成交量(万)">
                      <el-input-number v-model="filters.minVol" :min="0" :controls="false" placeholder="最小成交量" style="width: 100%;" />
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-row :gutter="20" style="margin-top: 10px;">
                  <el-col :xs="24" :sm="12" :md="6" :span="6">
                    <el-form-item label="市值(亿)">
                      <el-input-number v-model="filters.minCap" :min="0" :controls="false" placeholder="最小市值" style="width: 100%;" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6" :span="6" v-if="strategyType === 'value_growth'">
                    <el-form-item label="估值权重">
                      <div class="weight-control">
                        <el-slider
                          class="weight-slider"
                          v-model="strategyValueWeight"
                          :min="0"
                          :max="100"
                          :show-tooltip="false"
                        />
                        <span class="weight-value">{{ strategyValueWeight }}%</span>
                      </div>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6" :span="6" v-if="strategyType === 'value_growth'">
                    <el-form-item label="成长权重">
                      <el-input :value="100 - strategyValueWeight" disabled style="width: 100%;" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20" style="margin-top: 4px;">
                  <el-col :span="24" class="indicator-actions" style="text-align: right;">
                    <el-button type="info" size="small" @click="resetFilters">重置</el-button>
                    <el-button type="primary" size="small" icon="el-icon-cpu" @click="startIndicatorSelection">
                      开始AI选股
                    </el-button>
                  </el-col>
                </el-row>
              </el-form>
            </el-card>

            <div class="selection-results" v-if="selectionResults.length > 0">
              <h4 class="result-subtitle">筛选结果（共 {{ selectionResults.length }} 只）</h4>
              <div class="table-scroll indicator-table-scroll">
              <el-table :data="selectionResults" :size="indicatorTableSize" :style="indicatorTableStyle" border stripe class="indicator-table">
                <el-table-column prop="code" label="代码" width="70" />
                <el-table-column prop="name" label="名称" width="85" show-overflow-tooltip/>
                <el-table-column label="策略" width="105">
                  <template slot-scope="scope">
                    <el-tag size="mini" type="info">{{ scope.row.strategyLabel }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="最新价" width="65">
                  <template slot-scope="scope">
                    <span :class="scope.row.change >= 0 ? 'text-up' : 'text-down'">{{ scope.row.price }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="涨跌幅" width="105">
                  <template slot-scope="scope">
                    <span :class="scope.row.change >= 0 ? 'text-up' : 'text-down'">
                      {{ scope.row.change >= 0 ? '+' : '' }}{{ scope.row.change }}%
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="aiProbability" label="AI看涨" width="65">
                  <template slot-scope="scope">
                    {{ scope.row.aiProbability != null ? scope.row.aiProbability + '%' : '--' }}
                  </template>
                </el-table-column>
                <el-table-column v-if="!isIndicatorCompact" prop="aiAmp" label="7日换手" width="75">
                  <template slot-scope="scope">
                    <span :class="scope.row.aiAmp >= 0 ? 'text-up' : 'text-down'">
                      {{ scope.row.aiAmp >= 0 ? '+' : '' }}{{ Number(scope.row.aiAmp || 0).toFixed(2) }}%
                    </span>
                  </template>
                </el-table-column>
                <el-table-column v-if="!isIndicatorCompact" label="预估量(万)" width="90">
                  <template slot-scope="scope">
                    {{ scope.row.aiVolWan != null ? Number(scope.row.aiVolWan).toFixed(2) : '--' }}
                  </template>
                </el-table-column>
                <el-table-column prop="strategyScore" label="策略分" width="60" />
                <el-table-column v-if="!isIndicatorCompact" prop="starLevel" label="星级" width="50" />
                <el-table-column label="AI评级" width="80">
                  <template slot-scope="scope">
                    <el-tag :type="scope.row.rating === '强烈推荐' ? 'danger' : 'warning'" size="mini">
                      {{ scope.row.rating }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" min-width="120" class-name="indicator-op-cell" label-class-name="indicator-op-cell">
                  <template slot-scope="scope">
                    <el-button type="text" size="mini" @click="goStockDetail(scope.row)">详情</el-button>
                    <el-button type="text" size="mini" class="text-up" @click="handleAddOptionalStock(scope.row)">自选</el-button>
                    <el-button type="text" size="mini" class="text-down" @click="tradeStock(scope.row)">交易</el-button>
                  </template>
                </el-table-column>
              </el-table>
              </div>
            </div>
            <div class="empty-selection" v-else-if="!loading">
              <el-empty description="设定指标后点击“开始AI选股”" />
            </div>
          </div>
        </el-tab-pane>

        <!-- 模式三：单股分析（原功能） -->
        <el-tab-pane label="🔍 单股深度分析" name="single">
          <div class="input-section">
            <el-form :inline="true" @submit.native.prevent="startAnalysis">
              <el-form-item label="股票代码">
                <el-input
                  v-model="inputCode"
                  placeholder="输入代码，如 600519"
                  clearable
                  style="width: 200px;"
                  @keyup.enter.native="startAnalysis"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="loading" @click="startAnalysis">
                  深度分析
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="hot-stocks">
            <span class="hot-label">热门股票：</span>
            <el-tag
              v-for="stock in hotStocks"
              :key="stock.code"
              type="info"
              effect="plain"
              class="hot-tag"
              @click="analyzeStock(stock)"
            >
              {{ stock.name }}
            </el-tag>
          </div>

          <div class="result-section" v-if="resultList.length > 0">
            <h3 class="result-title">分析结果（共 {{ resultList.length }} 只）</h3>
            <div class="table-scroll single-table-scroll">
            <el-table :data="resultList" :size="singleTableSize" :style="singleTableStyle" border class="single-table" @row-click="goStockDetail">
              <el-table-column type="expand" width="46">
                <template slot-scope="scope">
                  <div class="single-analysis-expand">
                    <p><span class="label">AI结论：</span>{{ scope.row.reasonShort || '暂无结论' }}</p>
                    <p><span class="label">信号强度：</span>{{ scope.row.signalLevel || '--' }}，<span class="label">风险等级：</span>{{ scope.row.riskLevel || '--' }}</p>
                    <p><span class="label">操作建议：</span>{{ scope.row.suggestion || '观望为主' }}</p>
                    <p><span class="label">关键依据：</span>{{ scope.row.reasonDetail || '结合趋势概率、波动与成交量综合评估。' }}</p>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="code" label="股票代码" :width="singleColWidth.code" />
              <el-table-column prop="name" label="股票名称" :width="singleColWidth.name" />
              <el-table-column label="AI预测趋势" :width="singleColWidth.trend">
                <template slot-scope="scope">
                  <span :class="scope.row.trend === 'up' ? 'text-up' : 'text-down'">
                    {{ scope.row.trend === 'up' ? (isSingleCompact ? '看涨' : '📈 看涨') : (isSingleCompact ? '看跌' : '📉 看跌') }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="预测概率" :width="singleColWidth.probability">
                <template slot-scope="scope">
                  <el-progress
                    :percentage="scope.row.probability"
                    :color="scope.row.trend === 'up' ? '#f56c6c' : '#67c23a'"
                    :stroke-width="isSingleMini ? 12 : 16"
                    :text-inside="true"
                  />
                </template>
              </el-table-column>
              <el-table-column label="涨跌幅" :width="singleColWidth.change">
                <template slot-scope="scope">
                  <span :class="scope.row.zd >= 0 ? 'text-up' : 'text-down'">
                    {{ scope.row.zd >= 0 ? '+' : '' }}{{ (scope.row.zd * 100).toFixed(2) }}%
                  </span>
                </template>
              </el-table-column>
              <el-table-column v-if="!isSingleMini" label="信号" :width="singleColWidth.signal">
                <template slot-scope="scope">
                  <el-tag size="mini" :type="scope.row.signalLevel === '强' ? 'danger' : (scope.row.signalLevel === '中' ? 'warning' : 'info')">
                    {{ scope.row.signalLevel || '--' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="!isSingleMini" label="风险" :width="singleColWidth.risk">
                <template slot-scope="scope">
                  <el-tag size="mini" :type="scope.row.riskLevel === '高' ? 'danger' : (scope.row.riskLevel === '中' ? 'warning' : 'success')">
                    {{ scope.row.riskLevel || '--' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="!isSingleCompact" prop="suggestion" label="操作建议" :width="singleColWidth.suggestion" show-overflow-tooltip />
              <el-table-column v-if="!isSingleMini" prop="vol" label="成交量" :width="singleColWidth.volume">
                <template slot-scope="scope">
                  {{ formatVolume(scope.row.vol) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" :min-width="singleColWidth.operation">
                <template slot-scope="scope">
                  <el-button type="text" @click.stop="goStockDetail(scope.row)">详情</el-button>
                  <el-button type="text" class="text-up" @click.stop="handleAddOptionalStock(scope.row)">自选</el-button>
                  <el-button type="text" class="text-down" @click.stop="tradeStock(scope.row)">交易</el-button>
                </template>
              </el-table-column>
            </el-table>
            </div>

            <div class="action-bar">
              <el-button type="success" icon="el-icon-download" @click="exportResult">
                导出结果
              </el-button>
              <el-button type="warning" icon="el-icon-delete" @click="clearResults">
                清空结果
              </el-button>
            </div>
          </div>

          <div class="empty-state" v-if="!loading && resultList.length === 0">
            <el-empty description="请输入股票代码或选择热门股票开始深度分析" />
          </div>
        </el-tab-pane>

      </el-tabs>

      <el-dialog
        title="推荐理由"
        :visible.sync="reasonDialogVisible"
        width="90%"
        class="reason-dialog"
        :append-to-body="true"
        :modal-append-to-body="true"
        :before-close="handleReasonDialogBeforeClose"
        @close="handleReasonDialogClose"
      >
        <div class="reason-dialog-content">
          <p class="reason-stock" v-if="reasonDialogStockName">
            {{ reasonDialogStockName }}（{{ reasonDialogCode }}）
          </p>
          <p class="reason-text">{{ reasonDialogText || '暂无推荐理由' }}</p>
        </div>
      </el-dialog>

      <!-- 加载中 -->
      <div class="loading-state" v-if="loading">
        <i class="el-icon-loading"></i>
        <span>AI分析中，请稍候...</span>
      </div>

    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import request, { addStockPrefix, stripStockPrefix } from '../../utils/request';
import { exportExcel } from '../../utils/tool';

export default {
  name: 'AISelectStock',
  data() {
    return {
      activeTab: 'recommend',
      inputCode: '',
      loading: false,
      resultList: [],
      // 自动推荐列表
      recommendList: [],
      // 指标选股过滤器
      filters: {
        minPrice: 0,
        maxPrice: 500,
        minChange: -10, // 初始化就把下限开大点
        maxChange: 10,
        minVol: 0,      // 初始化不限制成交量
        minCap: 0
      },
      strategyType: 'value_growth',
      strategyValueWeight: 50,
      // 指标选股结果
      selectionResults: [],
      recommendWindowWidth: window.innerWidth,
      isNarrowRecommend: false,
      reasonDialogVisible: false,
      reasonDialogText: '',
      reasonDialogStockName: '',
      reasonDialogCode: '',
      // 热门股票列表（仅保留有后端数据的沪市股票）
      hotStocks: [
        { code: '600519', name: '贵州茅台' },
        { code: '601318', name: '中国平安' },
        { code: '600036', name: '招商银行' },
        { code: '600900', name: '长江电力' },
        { code: '601012', name: '隆基绿能' }
      ],
      // 聊天助手功能已移除
    };
  },
  computed: {
    isIndicatorCompact() {
      return this.recommendWindowWidth <= 1056;
    },
    isSingleCompact() {
      return this.recommendWindowWidth <= 768;
    },
    isSingleMini() {
      return this.recommendWindowWidth <= 560;
    },
    singleColWidth() {
      if (this.isSingleMini) {
        return {
          code: 70,
          name: 70,
          trend: 82,
          probability: 100,
          change: 60,
          signal: 0,
          risk: 0,
          suggestion: 0,
          volume: 0,
          operation: 130
        };
      }
      if (this.isSingleCompact) {
        return {
          code: 82,
          name: 90,
          trend: 90,
          probability: 108,
          change: 80,
          signal: 50,
          risk: 50,
          suggestion: 0,
          volume: 80,
          operation: 138
        };
      }
      return {
        code: 88,
        name: 90,
        trend: 98,
        probability: 110,
        change: 80,
        signal: 50,
        risk: 50,
        suggestion: 80,
        volume: 100,
        operation: 140
      };
    },
    singleTableStyle() {
      return {
        width: '100%',
        minWidth: (this.isSingleMini ? 560 : (this.isSingleCompact ? 810 : 900)) + 'px'
      };
    },
    indicatorTableStyle() {
      // 根据当前可见列动态计算最小宽度，避免右侧有空余仍出现横向滚动。
      return {
        width: '100%',
        minWidth: (this.isIndicatorCompact ? 750 : 940) + 'px'
      };
    },
    recommendTableSize() {
      if (this.recommendWindowWidth < 700) return 'mini';
      if (this.recommendWindowWidth < 1100) return 'small';
      return 'medium';
    },
    indicatorTableSize() {
      if (this.recommendWindowWidth < 700) return 'mini';
      if (this.recommendWindowWidth < 1100) return 'small';
      return 'medium';
    },
    singleTableSize() {
      if (this.recommendWindowWidth < 700) return 'mini';
      if (this.recommendWindowWidth < 1100) return 'small';
      return 'medium';
    }
  },
  created() {
    this.updateRecommendLayout();
    this.getAutoRecommendations();
  },
  mounted() {
    window.addEventListener('resize', this.updateRecommendLayout);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateRecommendLayout);
  },
  methods: {
    ...mapActions(['addOptionalStock', 'changeStock']),

    updateRecommendLayout() {
      this.recommendWindowWidth = window.innerWidth;
      this.isNarrowRecommend = this.recommendWindowWidth < 900;
    },

    openReasonDialog(row) {
      this.reasonDialogStockName = row && row.name ? row.name : '';
      this.reasonDialogCode = row && row.code ? row.code : '';
      this.reasonDialogText = row && row.reason ? row.reason : '';
      this.reasonDialogVisible = true;
    },

    handleReasonDialogBeforeClose(done) {
      this.reasonDialogVisible = false;
      done();
    },

    handleReasonDialogClose() {
      this.reasonDialogVisible = false;
    },

    clamp(num, min, max) {
      return Math.max(min, Math.min(max, num));
    },

    normalizePercent(val) {
      const n = Number(val);
      if (!Number.isFinite(n)) return null;
      return Math.abs(n) <= 1 ? n * 100 : n;
    },

    calcRatingByScore(score) {
      if (score >= 75) return '强烈推荐';
      if (score >= 55) return '积极关注';
      return '谨慎观察';
    },

    buildStrategyLabel() {
      const map = {
        value_growth: '低估值高成长',
        ma_bull: '均线多头排列',
        price_volume_up: '量价齐升'
      };
      return map[this.strategyType] || '综合策略';
    },

    calcMA(closes, n, offset = 0) {
      const end = closes.length - offset;
      const start = end - n;
      if (start < 0 || end <= 0) return null;
      const part = closes.slice(start, end);
      if (part.length !== n) return null;
      return part.reduce((s, v) => s + v, 0) / n;
    },

    async getPatternSignals(code) {
      try {
        const res = await request.getDayHistory({
          code,
          period: 'daily',
          adjust: 'qfq'
        });
        const list = Array.isArray(res && res.data) ? res.data : [];
        const recent = list.slice(-40);
        if (recent.length < 32) {
          return { maBull: false, priceVolumeUp: false };
        }

        const closes = recent.map(i => Number(i.close) || 0);
        const vols = recent.map(i => Number(i.vol) || 0);

        const ma5 = this.calcMA(closes, 5, 0);
        const ma10 = this.calcMA(closes, 10, 0);
        const ma20 = this.calcMA(closes, 20, 0);
        const ma30 = this.calcMA(closes, 30, 0);
        const ma5Prev = this.calcMA(closes, 5, 1);
        const ma10Prev = this.calcMA(closes, 10, 1);
        const ma20Prev = this.calcMA(closes, 20, 1);
        const ma30Prev = this.calcMA(closes, 30, 1);

        const maBull = !!(
          ma5 != null && ma10 != null && ma20 != null && ma30 != null &&
          ma5 > ma10 && ma10 > ma20 && ma20 > ma30 &&
          ma5Prev != null && ma10Prev != null && ma20Prev != null && ma30Prev != null &&
          ma5 > ma5Prev && ma10 > ma10Prev && ma20 > ma20Prev && ma30 > ma30Prev
        );

        const len = recent.length;
        const lastClose = closes[len - 1];
        const prevClose = closes[len - 2];
        const lastVol = vols[len - 1];
        const prevVol = vols[len - 2];
        const avg5Vol = vols.slice(-6, -1).reduce((s, v) => s + v, 0) / 5;
        const priceVolumeUp = !!(
          Number.isFinite(lastClose) && Number.isFinite(prevClose) &&
          Number.isFinite(lastVol) && Number.isFinite(prevVol) &&
          lastClose > prevClose && lastVol > prevVol && lastVol > avg5Vol
        );

        return { maBull, priceVolumeUp };
      } catch (e) {
        return { maBull: false, priceVolumeUp: false };
      }
    },

    async enrichBySingleAI(list = []) {
      if (!Array.isArray(list) || list.length === 0) return [];

      const tasks = list.map(async (item) => {
        try {
          const aiRes = await request.getAIAnalysis(item.code);
          const aiData = aiRes && aiRes.status === 'ok' ? aiRes.data : null;
          const prob = Number(aiData && aiData.prob);
          const amp = this.normalizePercent(aiData && (aiData.amp != null ? aiData.amp : aiData.zd));
          const vol = Number(aiData && aiData.vol);
          const aiProbability = Number.isFinite(prob) ? Math.round(prob * 100) : null;
          const aiTrend = Number.isFinite(amp) ? (amp >= 0 ? 'up' : 'down') : null;
          const aiVolWan = Number.isFinite(vol) ? (vol / 10000) : null;

          return {
            ...item,
            aiProbability,
            aiTrend,
            aiAmp: amp,
            aiVolWan
          };
        } catch (e) {
          return {
            ...item,
            aiProbability: null,
            aiTrend: null,
            aiAmp: null,
            aiVolWan: null
          };
        }
      });

      return Promise.all(tasks);
    },

    // 模式一：获取自动推荐
    async getAutoRecommendations() {
      this.loading = true;
      try {
        // 从新浪数据源获取涨幅榜作为基础
        const res = await request.getSpotSina({
          stock_type: 'ShA',
          page: 1,
          size: 30,
          sort: 'amp',
          order: 'desc',
          _silent: true
        });

        if (res && res.data && res.data.list) {
          const normalizeCode = (code) => String(code || '').replace(/^(sh|sz|bj)/i, '').trim();
          const seen = new Set();
          const baseList = [];

          for (const item of res.data.list) {
            const key = normalizeCode(item.code);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            baseList.push({
              code: key,
              name: item.name,
              price: item.last,
              change: (item.zd * 100).toFixed(2),
              reason: this.generateReason(item)
            });
            if (baseList.length >= 10) break;
          }

          // 优先使用单股 AI 接口补充概率与趋势，接口不可用时保持基础推荐可用
          const enrichedList = await this.enrichBySingleAI(baseList);
          this.recommendList = enrichedList.map(item => ({
            ...item,
            reason: item.aiProbability != null
              ? `${item.reason}（AI概率 ${item.aiProbability}%）`
              : item.reason
          }));

          if (this.recommendList.length > 0) {
            this.$message.success(`已为您更新 ${this.recommendList.length} 只潜力推荐股票`);
          } else {
            this.$message.warning('暂无可用推荐，请稍后重试');
          }
        }
      } catch (err) {
        console.warn('获取推荐失败 (Silenced):', err);
      } finally {
        this.loading = false;
      }
    },

    // 模拟 AI 生成推荐理由
    generateReason(stock) {
      // 1. 根据涨跌幅生成技术面分析
      const change = parseFloat(stock.zd || 0) * 100;
      const techTemplates = [
        ['放量突破', '主力资金抢筹明显', '多头排列确立'],
        ['温和放量上涨', '均线系统呈多头散发', '上升通道完好'],
        ['缩量企稳', '底部支撑强劲', '具备反弹潜力'],
        ['逆势抗跌', '筹码锁定良好', '关注超跌反弹机会']
      ];
      
      let techIndex = 3;
      if (change > 5) techIndex = 0;
      else if (change > 2) techIndex = 1;
      else if (change > 0) techIndex = 2;

      // 使用股票代码作为随机种子，确保每只股票选取的描述片段不同
      const seed = stock.code.split('').reduce((a, b) => a + parseInt(b), 0);
      const t1 = techTemplates[techIndex][seed % 3];

      // 2. 随机生成基本面/消息面亮点（模拟）
      const fundamentals = [
        '业绩预增超预期，估值修复空间大。',
        '行业景气度持续上行，龙头效应凸显。',
        '受益于近期政策利好，市场关注度显著提升。',
        '北向资金连续3日净流入，机构评级调高。',
        '产品量价齐升，毛利率有望进一步改善。',
        '核心技术取得突破，市场份额稳步扩大。',
        '股权激励落地，管理层信心彰显。',
        '并购重组预期升温，资产注入潜力巨大。'
      ];
      
      // 3. 随机生成 AI 预测结论
      const predictions = [
        'AI模型预测未来3日上涨概率为 85%。',
        '智能算法提示短线买点已现，建议积极关注。',
        '量化因子评分 9.2/10，属于高胜率标的。',
        '情绪指标转暖，有望开启新一轮主升浪。',
        '波动率收敛，变盘在即，看多信号明确。',
        '资金流向监控显示主力吸筹，后市看高一线。'
      ];

      // 组合生成更智能、多样的文案
      const fundIndex = (seed * 7) % fundamentals.length;
      const predIndex = (seed * 13) % predictions.length;

      return `${t1}，${fundamentals[fundIndex]} ${predictions[predIndex]}`;
    },

    // 模式二：指标选股
    async startIndicatorSelection() {
      this.loading = true;
      this.selectionResults = [];
      try {
        // 1. 优先尝试调用后端 ai/select 接口（仅在显式开启时）
        const enableAISelectApi = process.env.VUE_APP_ENABLE_AI_SELECT_API === 'true';
        if (enableAISelectApi) {
          try {
          const aiParams = {
            strategy: this.strategyType,
            filters: { ...this.filters },
            weights: {
              value: this.strategyValueWeight / 100,
              growth: 1 - (this.strategyValueWeight / 100)
            },
            limit: 10
          };
          
          const payload = {
            type: 'indicator_select',
            size: 10,
            // 将详细参数转为data字符串以兼容旧格式，同时平铺新字段
            data: JSON.stringify(aiParams.filters),
            ...aiParams
          };
          
          // 若设置了跳过弹窗可在后端联调未完成时避免强弱提示
          const backendRes = await request.aiSelectStock(payload, { _silent: true }).catch(() => null);
          
          if (backendRes && (backendRes.status === 'ok' || backendRes.code === 200) && Array.isArray(backendRes.data) && backendRes.data.length > 0) {
            // 解析后端返回的数据
            const mappedData = backendRes.data.map(item => {
              const probScore = Math.round((item.prob || 0) * 100);
              const ampVal = item.amp != null ? item.amp : (item.zd || 0); // amp已统一为小数, 如 0.032
              const strategyScore = probScore * 0.6 + (this.clamp(ampVal * 500, 0, 100)) * 0.4;
              
              return {
                code: item.code || item.test_code,
                name: item.name || item.code,
                price: item.price || '--',
                change: (ampVal * 100).toFixed(2), // 存为字符串百分比
                aiProbability: probScore,
                aiAmp: ampVal * 100, // 乘100用于显示幅度
                aiVolWan: item.vol ? (item.vol / 10000) : null,
                strategyLabel: this.buildStrategyLabel(),
                strategyScore: Number(strategyScore.toFixed(1)),
                starLevel: this.clamp(Math.ceil(strategyScore / 10), 1, 10),
                rating: this.calcRatingByScore(strategyScore)
              };
            });
            this.selectionResults = mappedData.sort((a, b) => b.strategyScore - a.strategyScore);
            this.$message.success(`AI成功筛选出 ${this.selectionResults.length} 只符合策略的股票`);
            return; // 成功则直接返回，不再执行降级逻辑
          }
          } catch (e) {
            console.warn('后端 ai/select 不可用，准备降级使用本地策略', e.message);
          }
        }

        // 2. 降级：走“行情筛选 + 单股AI增强”策略
        const res = await request.getSpotSina({
          stock_type: 'ZhA',
          page: 1,
          size: 120,
          sort: 'amount',
          order: 'desc',
          _silent: true
        });

        if (res && res.data && res.data.list) {
          const filtered = res.data.list.filter(s => {
            const price = s.last || 0;
            const change = (s.zd || 0) * 100;
            const vol = s.vol / 10000; // 转换为万手
            const capRaw = Number(s.tmc || s.ffmcap || 0);
            const capYi = capRaw > 100000000 ? (capRaw / 100000000) : capRaw;
            const passCap = !this.filters.minCap || !capYi || capYi >= this.filters.minCap;
            
            // 确保如果未输入最大值等情况时，不被卡死
            const minPrice = this.filters.minPrice !== undefined ? this.filters.minPrice : -Infinity;
            const maxPrice = this.filters.maxPrice !== undefined ? this.filters.maxPrice : Infinity;
            const minChange = this.filters.minChange !== undefined ? this.filters.minChange : -Infinity;
            const maxChange = this.filters.maxChange !== undefined ? this.filters.maxChange : Infinity;
            const minVol = this.filters.minVol !== undefined ? this.filters.minVol : 0;

            return price >= minPrice && 
                   price <= maxPrice &&
                   change >= minChange &&
                   change <= maxChange &&
                   vol >= minVol &&
                   passCap;
          });

          // 如果过滤完没了，就用没过滤前的当候选，保证一定出数据
          const finalCandidates = filtered.length > 0 ? filtered.slice(0, 15) : res.data.list.slice(0, 8);
          
          const candidates = finalCandidates.map(s => ({
            code: s.code,
            name: s.name,
            price: s.last,
            change: ((s.zd || 0) * 100).toFixed(2),
            vol: (s.vol / 10000).toFixed(2),
            per: Number(s.per),
            pbr: Number(s.pbr)
          }));

          const aiEnriched = await this.enrichBySingleAI(candidates);
          const needPatterns = this.strategyType === 'ma_bull' || this.strategyType === 'price_volume_up';
          const withPatterns = needPatterns
            ? await Promise.all(aiEnriched.map(async (item) => ({
                ...item,
                ...(await this.getPatternSignals(item.code))
              })))
            : aiEnriched;

          const strategyLabel = this.buildStrategyLabel();
          const vw = this.strategyValueWeight / 100;
          const gw = 1 - vw;
          let result = [];

          if (this.strategyType === 'value_growth') {
            result = withPatterns
              // 移除 aiAmp > 0 的限制，允许所有数据进入展示，避免过滤太严导致空数据
              .map(item => {
                const pe = Number(item.per);
                const pb = Number(item.pbr);
                const peScore = Number.isFinite(pe) && pe > 0 ? this.clamp((80 - pe) / 80 * 100, 0, 100) : 50;
                const pbScore = Number.isFinite(pb) && pb > 0 ? this.clamp((10 - pb) / 10 * 100, 0, 100) : 50;
                const valuationScore = peScore * 0.7 + pbScore * 0.3;
                const growthScore = this.clamp((item.aiAmp || 0) * 5, 0, 100);
                const strategyScore = this.clamp(valuationScore * vw + growthScore * gw, 0, 100);
                const starLevel = this.clamp(Math.ceil(strategyScore / 10), 1, 10);
                return {
                  ...item,
                  strategyLabel,
                  strategyScore: Number(strategyScore.toFixed(1)),
                  starLevel,
                  rating: this.calcRatingByScore(strategyScore)
                };
              })
              .sort((a, b) => b.strategyScore - a.strategyScore);
          } else if (this.strategyType === 'ma_bull') {
            result = withPatterns
              // 移除本地强制多头过滤，只要有AI数据就能参与评估
              .map(item => {
                const probScore = this.clamp(item.aiProbability || 0, 0, 100);
                const ampScore = this.clamp((item.aiAmp || 0) * 5, 0, 100);
                const strategyScore = probScore * 0.7 + ampScore * 0.3;
                const starLevel = this.clamp(Math.ceil(strategyScore / 10), 1, 10);
                return {
                  ...item,
                  strategyLabel,
                  strategyScore: Number(strategyScore.toFixed(1)),
                  starLevel,
                  rating: this.calcRatingByScore(strategyScore)
                };
              })
              .sort((a, b) => b.strategyScore - a.strategyScore);
          } else {
            result = withPatterns
              // 移除本地强制量价齐升过滤，保证必定有数据展示
              .map(item => {
                const probScore = this.clamp(item.aiProbability || 0, 0, 100);
                const ampScore = this.clamp((item.aiAmp || 0) * 5, 0, 100);
                const volScore = this.clamp(((item.aiVolWan || 0) / 1000) * 100, 0, 100);
                const strategyScore = probScore * 0.5 + ampScore * 0.3 + volScore * 0.2;
                const starLevel = this.clamp(Math.ceil(strategyScore / 10), 1, 10);
                return {
                  ...item,
                  strategyLabel,
                  strategyScore: Number(strategyScore.toFixed(1)),
                  starLevel,
                  rating: this.calcRatingByScore(strategyScore)
                };
              })
              .sort((a, b) => b.strategyScore - a.strategyScore);
          }

          this.selectionResults = result.slice(0, 10);

          if (this.selectionResults.length === 0) {
            this.$message.info('当前策略下暂无满足条件的股票，请放宽筛选条件或切换策略');
          } else {
            this.$message.success(`AI成功筛选出 ${this.selectionResults.length} 只符合策略的股票`);
          }
        }
      } catch (err) {
        console.error('指标选股失败:', err);
        this.$message.error('AI选股请求失败');
      } finally {
        this.loading = false;
      }
    },

    resetFilters() {
      this.filters = {
        minPrice: 0,
        maxPrice: 500,
        minChange: -10, // 将重置的默认最小值改为 -10，包容所有跌停的股票
        maxChange: 10,
        minVol: 0,      // 将默认最小成交量改为 0 确保不会过滤全市场
        minCap: 0       // 将市值改为0
      };
      this.strategyType = 'value_growth';
      this.strategyValueWeight = 50;
      this.$message.info('指标已重置为宽泛条件，请点击“开始AI选股”试试');
    },

    // 格式化成交量
    formatVolume(vol) {
      if (!vol) return '--';
      if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿';
      if (vol >= 10000) return (vol / 10000).toFixed(2) + '万';
      return vol;
    },

    // 开始分析（手动输入）
    async startAnalysis() {
      if (!this.inputCode.trim()) {
        this.$message.warning('请输入股票代码');
        return;
      }
      const code = this.inputCode.trim().replace(/^(sh|sz|bj)/i, '');
      // 查找股票名称，如果是热门股票则使用已知名称
      const hot = this.hotStocks.find(s => s.code === code);
      const stock = { code, name: hot ? hot.name : code };
      await this.analyzeStock(stock);
    },

    // 分析单只股票
    async analyzeStock(stock) {
      // 检查是否已存在
      const exists = this.resultList.find(r => r.code === stock.code);
      if (exists) {
        this.$message.info(`${stock.name} 已在分析结果中`);
        return;
      }

      this.loading = true;
      try {
        const fullCode = addStockPrefix(stock.code);
        
        // 并行获取 AI 分析和实时行情
        const [aiRes, quoteRes] = await Promise.all([
          request.getAIAnalysis(fullCode),
          request.getStockLast(stock.code).catch(() => null)
        ]);
        
        if (aiRes && aiRes.status === 'ok' && aiRes.data) {
          const { prob, vol, zd, amp } = aiRes.data;
          const ampVal = this.normalizePercent(amp != null ? amp : zd);
          const probability = Math.round((prob || 0.5) * 100);
          const trend = ((ampVal || 0) >= 0) ? 'up' : 'down';
          const analysis = this.buildSingleAnalysis(probability, ampVal, vol);
          
          // 从实时行情获取价格和涨跌幅
          let price = 0, change = 0, stockName = stock.name;
          if (quoteRes && quoteRes.data) {
            price = quoteRes.data.last || 0;
            // 计算涨跌幅: (last - close) / close * 100
            const close = quoteRes.data.close || 0;
            change = close > 0 ? ((price - close) / close * 100).toFixed(2) : 0;
            stockName = quoteRes.data.name || stock.name;
          }
          
          this.resultList.unshift({
            code: stock.code,
            name: stockName,
            trend,
            probability,
            vol: vol || 0,
            zd: (ampVal || 0) / 100,
            price: price,
            change: change,
            signalLevel: analysis.signalLevel,
            riskLevel: analysis.riskLevel,
            suggestion: analysis.suggestion,
            reasonShort: analysis.reasonShort,
            reasonDetail: analysis.reasonDetail
          });
          
          this.$message.success(`${stockName} 分析完成`);
          this.inputCode = '';
        } else {
          this.$message.error('获取AI分析结果失败');
        }
      } catch (err) {
        console.error('AI分析失败:', err);
        this.$message.error('AI分析请求失败，请稍后重试');
      } finally {
        this.loading = false;
      }
    },

    buildSingleAnalysis(probability, ampVal, vol) {
      const p = Number(probability) || 0;
      const a = Number(ampVal) || 0;
      const v = Number(vol) || 0;
      const upTrend = a >= 0;
      const absAmp = Math.abs(a);

      let signalLevel = '弱';
      if (upTrend && p >= 70) signalLevel = '强';
      else if (p >= 55) signalLevel = '中';

      let riskLevel = '低';
      if (absAmp >= 6 || (!upTrend && p < 50)) riskLevel = '高';
      else if (absAmp >= 3 || p < 60) riskLevel = '中';

      let suggestion = '观望为主';
      if (upTrend && p >= 70) suggestion = '可分批关注，回踩支撑再考虑介入';
      else if (upTrend && p >= 55) suggestion = '保持跟踪，等待放量确认';
      else if (!upTrend && p >= 60) suggestion = '反弹时谨慎减仓，控制仓位';
      else if (!upTrend) suggestion = '以防守为主，暂不追入';

      const trendText = upTrend ? '短线偏多' : '短线偏弱';
      const volText = v > 0 ? `成交量约 ${this.formatVolume(v)}` : '成交量信息有限';

      return {
        signalLevel,
        riskLevel,
        suggestion,
        reasonShort: `${trendText}，模型看涨概率 ${p}%`,
        reasonDetail: `${trendText}，波动幅度 ${a.toFixed(2)}%，${volText}，综合判定为${signalLevel}信号、${riskLevel}风险。`
      };
    },

    // 跳转股票详情
    goStockDetail(row) {
      this.changeStock({ code: row.code, name: row.name });
      const target = `/detail/${row.code}`;
      if (this.$route.path !== target) {
        this.$router.push(target);
      }
    },

    // 跳转交易页
    tradeStock(row) {
      this.$router.push({
        path: '/trade',
        query: {
          code: stripStockPrefix(row.code),
          name: row.name,
          price: row.price
        }
      });
    },

    // 加入自选（去重判断 + 闪光提示）
    handleAddOptionalStock(row) {
      const existing = this.$store.state.optionalStocks.find(s => s.code === row.code);
      if (existing) {
        this.$message.warning(`${row.name} 已在自选股中`);
        // 触发侧边栏闪光动画
        this.$root.$emit('flash-optional-stock', row.code);
        return;
      }
      this.addOptionalStock({
        code: row.code,
        name: row.name,
        price: row.price || 0,
        change: row.change || 0
      });
      this.$message.success(`已将 ${row.name} 加入自选股`);
      // 触发侧边栏同步自选股数据（更新实时价格）
      this.$nextTick(() => {
        this.$root.$emit('sync-optional-stocks');
      });
    },

    // 导出结果
    exportResult() {
      const exportData = this.resultList.map(item => ({
        股票代码: item.code,
        股票名称: item.name,
        预测趋势: item.trend === 'up' ? '看涨' : '看跌',
        预测概率: item.probability + '%',
        涨跌幅: (item.zd * 100).toFixed(2) + '%',
        成交量: item.vol
      }));
      exportExcel(exportData, 'AI智能选股结果.xlsx');
      this.$message.success('导出成功');
    },

    // 清空结果
    clearResults() {
      this.resultList = [];
      this.$message.success('已清空分析结果');
    }
  }
};
</script>

<style scoped>
.ai-select-stock {
  padding: 20px;
  background: var(--color-bg, #f5f5f5);
  min-height: calc(100vh - 120px);
}

.card-container {
  background: var(--color-card-bg, #fff);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.page-header {
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border, #eee);
  padding-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  color: var(--color-text, #333);
  margin: 0 0 8px 0;
}

.tag {
  font-size: 12px;
  color: var(--color-up, #f56c6c);
  margin-left: 10px;
}

.page-desc {
  font-size: 14px;
  color: var(--color-text-secondary, #999);
  margin: 0;
}

/* Tab 样式 */
.ai-tabs {
  margin-top: 10px;
}

::v-deep .el-tabs__item {
  font-size: 16px;
  height: 50px;
  line-height: 50px;
}

/* 自动推荐样式 */
.recommend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(100, 181, 246, 0.05);
  border-radius: 8px;
}

.header-info h3 {
  margin: 0 0 5px 0;
  color: var(--color-text);
}

.header-info p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.recommend-reason {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
}

.reason-dialog-content {
  line-height: 1.7;
}

.reason-stock {
  margin: 0 0 8px;
  font-weight: 600;
  color: var(--color-text);
}

.reason-text {
  margin: 0;
  color: var(--color-text-secondary, #666);
}

.single-analysis-expand {
  padding: 8px 10px;
  line-height: 1.7;
  color: var(--color-text, #333);
}

.single-analysis-expand p {
  margin: 0 0 6px;
}

.single-analysis-expand p:last-child {
  margin-bottom: 0;
}

.single-analysis-expand .label {
  font-weight: 600;
  color: var(--color-text-secondary, #666);
}

/* 指标选股样式 */
.indicator-section {
  padding-top: 10px;
}

.filter-card {
  margin-bottom: 20px;
  border: 1px solid var(--color-border);
}

.range-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.range-number {
  flex: 1 1 0;
  min-width: 58px;
}

::v-deep .range-number .el-input-number__inner {
  padding-left: 8px;
  padding-right: 8px;
}

::v-deep .indicator-form .el-form-item__label {
  padding-right: 8px;
  white-space: nowrap;
}

.range-split {
  margin: 0;
  color: #ccc;
}

.weight-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weight-slider {
  flex: 1;
}

.weight-value {
  min-width: 44px;
  text-align: right;
  color: var(--color-text, #333);
  font-weight: 600;
}

.result-subtitle {
  margin: 20px 0 15px 0;
  padding-left: 10px;
  border-left: 4px solid var(--color-primary);
  color: var(--color-text);
}

.empty-selection {
  padding: 40px 0;
}

.input-section {
  margin-bottom: 20px;
  padding-top: 15px;
}

.hot-stocks {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--color-bg, #f9f9f9);
  border-radius: 6px;
}

.hot-label {
  font-size: 14px;
  color: var(--color-text, #666);
  margin-right: 12px;
}

.hot-tag {
  margin: 4px 8px 4px 0;
  cursor: pointer;
  transition: all 0.2s;
}

.hot-tag:hover {
  background: var(--color-primary, #409eff);
  color: #fff;
  border-color: var(--color-primary, #409eff);
}

.result-section {
  margin-top: 20px;
}

/* 深色主题适配 */
.ai-select-stock {
  background: var(--color-bg);
}
.card-container {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
}
::v-deep .el-table {
  color: var(--color-text);
  background-color: var(--color-card-bg);
}
::v-deep .el-table th, 
::v-deep .el-table tr, 
::v-deep .el-table td {
  background-color: var(--color-card-bg);
  border-bottom-color: var(--color-border);
}
::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td {
  background-color: var(--color-bg) !important; /* 强制覆盖 Element UI 默认的 stripe 样式 */
}
/* 统一 Hover 样式 */
::v-deep .el-table--enable-row-hover .el-table__body tr:hover > td {
  background-color: var(--color-menu-hover) !important;
}
/* 筛选卡片深色适配 */
.filter-card {
  background: var(--color-card-bg);
  border-color: var(--color-border);
}
::v-deep .filter-card .el-card__header {
  border-bottom-color: var(--color-border);
  color: var(--color-text);
}
::v-deep .el-form-item__label {
  color: var(--color-text);
}
/* 输入框深色适配 */
::v-deep .el-input__inner,
::v-deep .el-input-number__decrease,
::v-deep .el-input-number__increase {
  background-color: var(--color-input-bg, #fff);
  border-color: var(--color-border);
  color: var(--color-text);
}

::v-deep .indicator-form .el-input__inner,
::v-deep .indicator-form .el-input-number__inner {
  padding-left: 10px;
  padding-right: 10px;
  font-size: 16px;
}
/* 热门标签区域 */
.hot-stocks {
  background: var(--color-menu-hover); /* 使用主题定义的悬停色作为背景 */
}
.recommend-header {
  background: rgba(64, 158, 255, 0.1); /* 统一使用带透明度的主题色 */
}
.recommend-reason {
  color: var(--color-text);
}

.action-bar {
  margin-top: 16px;
  text-align: right;
}

.action-bar .el-button {
  margin-left: 12px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.loading-state {
  padding: 60px 0;
  text-align: center;
  color: var(--color-text-secondary, #999);
}

.loading-state i {
  font-size: 24px;
  margin-right: 8px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.single-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* 单股分析仅保留外层横向滚动，避免出现双滚动条 */
.single-table-scroll ::v-deep .el-table__body-wrapper,
.single-table-scroll ::v-deep .el-table__header-wrapper {
  overflow-x: hidden !important;
}

/* 指标选股仅保留外层横向滚动，避免出现双滚动条 */
.indicator-table-scroll ::v-deep .el-table__body-wrapper,
.indicator-table-scroll ::v-deep .el-table__header-wrapper {
  overflow-x: hidden !important;
}

/* 指标选股操作列：三个按钮始终单行展示 */
.indicator-table-scroll ::v-deep .indicator-op-cell .cell {
  white-space: nowrap !important;
}

.indicator-table-scroll ::v-deep .indicator-op-cell .el-button--text {
  margin-left: 0;
  margin-right: 8px;
  padding: 0;
}

.indicator-table-scroll ::v-deep .indicator-op-cell .el-button--text:last-child {
  margin-right: 0;
}

::v-deep .recommend-table {
  min-width: 860px;
}

@media screen and (max-width: 900px) {
  ::v-deep .recommend-table {
    min-width: 520px;
  }
}

::v-deep .single-table {
  min-width: 820px;
}

::v-deep .single-table .cell {
  padding-left: 8px;
  padding-right: 8px;
}

@media screen and (max-width: 1024px) {
  .ai-select-stock {
    padding: 16px;
  }

  .card-container {
    padding: 16px;
  }

  .page-title {
    font-size: 18px;
  }

  .page-desc {
    font-size: 13px;
  }

  ::v-deep .el-tabs__item {
    font-size: 15px;
    height: 46px;
    line-height: 46px;
  }
}

@media screen and (max-width: 768px) {
  .ai-select-stock {
    padding: 12px;
  }

  .card-container {
    padding: 12px;
    border-radius: 6px;
  }

  .page-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .page-title {
    font-size: 17px;
    line-height: 1.35;
  }

  .tag {
    margin-left: 6px;
    font-size: 11px;
  }

  ::v-deep .el-tabs__nav-wrap {
    overflow-x: auto;
  }

  ::v-deep .el-tabs__item {
    font-size: 14px;
    height: 42px;
    line-height: 42px;
    padding: 0 12px;
  }

  .recommend-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
  }

  .recommend-header .el-button {
    width: 100%;
  }

  ::v-deep .indicator-form .el-form-item {
    margin-bottom: 10px;
  }

  ::v-deep .indicator-form .el-form-item__label {
    width: 84px !important;
    font-size: 13px;
  }

  ::v-deep .indicator-form .el-input__inner,
  ::v-deep .indicator-form .el-input-number__inner {
    font-size: 14px;
  }

  .indicator-actions {
    text-align: left !important;
  }

  .indicator-actions .el-button {
    margin-right: 8px;
    margin-bottom: 8px;
  }

  .input-section {
    padding-top: 8px;
  }

  .input-section ::v-deep .el-form {
    display: block;
  }

  .input-section ::v-deep .el-form-item {
    display: block;
    margin-right: 0;
    margin-bottom: 10px;
  }

  .input-section ::v-deep .el-input,
  .input-section ::v-deep .el-input__inner {
    width: 100% !important;
  }

  .hot-stocks {
    padding: 12px;
  }

  .result-subtitle {
    font-size: 14px;
    margin: 14px 0 10px 0;
  }

  .action-bar {
    text-align: left;
  }

  .action-bar .el-button {
    margin-left: 0;
    margin-right: 8px;
    margin-bottom: 8px;
  }
}

@media screen and (max-width: 700px) {
  .ai-select-stock {
    padding: 10px;
  }

  .card-container {
    padding: 10px;
  }

  .table-scroll {
    border-radius: 6px;
  }

  ::v-deep .recommend-table {
    min-width: 430px;
    font-size: 12px;
  }

  ::v-deep .recommend-table th,
  ::v-deep .recommend-table td {
    padding: 6px 0;
  }

  ::v-deep .recommend-table .cell {
    padding-left: 6px;
    padding-right: 6px;
    line-height: 1.35;
  }

  ::v-deep .recommend-table .el-button--text {
    font-size: 12px;
    margin-right: 6px;
    padding: 0;
  }

  .recommend-reason {
    font-size: 12px;
    line-height: 1.4;
  }

  ::v-deep .single-table {
    font-size: 12px;
  }

  ::v-deep .single-table th,
  ::v-deep .single-table td {
    padding: 6px 0;
  }

  ::v-deep .single-table .cell {
    padding-left: 6px;
    padding-right: 6px;
    line-height: 1.35;
  }

  ::v-deep .single-table .el-button--text {
    font-size: 12px;
    margin-right: 6px;
    padding: 0;
  }
}

@media screen and (max-width: 560px) {
  ::v-deep .recommend-table {
    min-width: 400px;
  }


  ::v-deep .recommend-table .cell {
    padding-left: 4px;
    padding-right: 4px;
  }

  ::v-deep .single-table .cell {
    padding-left: 4px;
    padding-right: 4px;
  }
}

@media screen and (max-width: 420px) {
  .page-title {
    font-size: 16px;
  }

  .tag {
    display: inline-block;
    margin-left: 0;
    margin-top: 6px;
  }

  .range-number {
    min-width: 52px;
  }

  .weight-value {
    min-width: 38px;
    font-size: 12px;
  }

  .empty-selection,
  .empty-state,
  .loading-state {
    padding: 36px 0;
  }
}

</style>