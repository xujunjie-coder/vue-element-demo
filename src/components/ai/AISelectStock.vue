<template>
  <div class="ai-select-stock">
    <div class="card-container">
      <div class="page-header">
        <h2 class="page-title">AI智能选股 <span class="tag">🤖 大赛创新功能</span></h2>
        <p class="page-desc">输入股票代码，获取AI预测分析结果</p>
      </div>

      <!-- 股票代码输入 -->
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
              开始分析
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 热门股票快捷选择 -->
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

      <!-- 分析结果展示 -->
      <div class="result-section" v-if="resultList.length > 0">
        <h3 class="result-title">分析结果（共 {{ resultList.length }} 只）</h3>
        <el-table :data="resultList" border style="width: 100%;" @row-click="goStockDetail">
          <el-table-column prop="code" label="股票代码" width="100" />
          <el-table-column prop="name" label="股票名称" width="120" />
          <el-table-column label="AI预测趋势" width="120">
            <template slot-scope="scope">
              <span :class="scope.row.trend === 'up' ? 'text-up' : 'text-down'">
                {{ scope.row.trend === 'up' ? '📈 看涨' : '📉 看跌' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="预测概率" width="140">
            <template slot-scope="scope">
              <el-progress
                :percentage="scope.row.probability"
                :color="scope.row.trend === 'up' ? '#f56c6c' : '#67c23a'"
                :stroke-width="16"
                :text-inside="true"
              />
            </template>
          </el-table-column>
          <el-table-column label="涨跌幅" width="100">
            <template slot-scope="scope">
              <span :class="scope.row.zd >= 0 ? 'text-up' : 'text-down'">
                {{ scope.row.zd >= 0 ? '+' : '' }}{{ (scope.row.zd * 100).toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="vol" label="成交量" width="120">
            <template slot-scope="scope">
              {{ formatVolume(scope.row.vol) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="140">
            <template slot-scope="scope">
              <el-button type="text" @click.stop="goStockDetail(scope.row)">
                查看详情
              </el-button>
              <el-button type="text" class="text-up" @click.stop="handleAddOptionalStock(scope.row)">
                加入自选
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="action-bar">
          <el-button type="success" icon="el-icon-download" @click="exportResult">
            导出分析结果
          </el-button>
          <el-button type="warning" icon="el-icon-delete" @click="clearResults">
            清空结果
          </el-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-if="!loading && resultList.length === 0">
        <el-empty description="暂无分析结果，请输入股票代码或选择热门股票">
          <template #image>
            <div class="empty-icon">🤖</div>
          </template>
        </el-empty>
      </div>

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
import request, { addStockPrefix } from '../../utils/request';
import { exportExcel } from '../../utils/tool';

export default {
  name: 'AISelectStock',
  data() {
    return {
      inputCode: '',
      loading: false,
      resultList: [],
      // 热门股票列表（仅保留有后端数据的沪市股票）
      hotStocks: [
        { code: '600519', name: '贵州茅台' },
        { code: '601318', name: '中国平安' },
        { code: '600036', name: '招商银行' },
        { code: '600900', name: '长江电力' },
        { code: '601012', name: '隆基绿能' }
      ]
    };
  },
  methods: {
    ...mapActions(['addOptionalStock', 'changeStock']),

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
          const { prob, vol, zd } = aiRes.data;
          const probability = Math.round((prob || 0.5) * 100);
          const trend = (zd >= 0) ? 'up' : 'down';
          
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
            zd: zd || 0,
            price: price,
            change: change
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

    // 跳转股票详情
    goStockDetail(row) {
      this.changeStock({ code: row.code, name: row.name });
      const target = `/detail/${row.code}`;
      if (this.$route.path !== target) {
        this.$router.push(target);
      }
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

.input-section {
  margin-bottom: 20px;
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

.result-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-text, #333);
  margin-bottom: 16px;
}

.text-up {
  color: var(--color-up, #f56c6c);
}

.text-down {
  color: var(--color-down, #67c23a);
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
</style>