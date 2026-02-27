<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <div class="card-container">
      <div class="page-header">
        <h2 class="page-title">AI智能选股 <span class="tag">🤖 大赛创新功能</span></h2>
      </div>

      <!-- 选股条件配置 -->
      <div class="select-condition">
        <el-row :gutter="20" class="condition-row">
          <el-col :span="8" :xs="24">
            <el-form-item label="选股策略" label-width="80px">
              <el-select
                v-model="selectForm.strategy"
                placeholder="请选择选股策略"
                style="width: 100%;"
              >
                <el-option
                  v-for="(val, key) in SelectStrategy"
                  :key="key"
                  :label="key === 'VALUE_GROWTH' ? '低估值高成长' : key === 'MA_UP' ? '均线多头排列' : '量价齐升'"
                  :value="val"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8" :xs="24">
            <el-form-item label="选股数量" label-width="80px">
              <el-input-number
                v-model="selectForm.count"
                :min="5"
                :max="20"
                :step="1"
                :default-value="10"
                style="width: 100%;"
              ></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8" :xs="24">
            <el-form-item label="市场类型" label-width="80px">
              <el-select
                v-model="selectForm.market"
                placeholder="请选择市场类型"
                style="width: 100%;"
              >
                <el-option
                  v-for="(val, key) in MarketType"
                  :key="key"
                  :label="MarketTypeLabel[key] || key"
                  :value="val"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="select-btn">
          <el-button
            type="primary"
            size="large"
            :disabled="!selectForm.strategy || !selectForm.market"
            @click="startSelect"
          >
            <i class="el-icon-loading" v-if="loading"></i>
            {{ loading ? '选股中...' : '开始选股' }}
          </el-button>
        </div>
      </div>

      <!-- 选股结果 -->
      <div class="select-result" v-if="resultList.length > 0">
        <h3 class="result-title">选股结果（共 {{ resultList.length }} 只）</h3>
        <el-table
          :data="resultList"
          border
          style="width: 100%;"
          @row-click="goStockDetail"
        >
          <el-table-column prop="code" label="股票代码" min-width="80" />
          <el-table-column prop="name" label="股票名称" min-width="90" />
          <el-table-column prop="score" label="匹配分数" min-width="120">
            <template slot-scope="scope">
              <div class="score-container">
                <span class="score-text">{{ scope.row.score }}</span>
                <div class="star-container" v-html="generateStar(scope.row.score)"></div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="140">
            <template slot-scope="scope">
              <el-button
                type="text"
                @click.stop="goStockDetail(scope.row)"
                class="operate-btn"
              >
                查看详情
              </el-button>
              <el-button
                type="text"
                @click.stop="handleAddOptionalStock(scope.row)"
                class="operate-btn text-up"
              >
                加入自选
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="export-result">
          <el-button
            type="success"
            icon="el-icon-download"
            @click="exportResult"
          >
            导出选股结果
          </el-button>
        </div>
      </div>

      <!-- 无结果提示 -->
      <div class="no-result" v-if="!loading && resultList.length === 0 && hasSelected">
        <el-empty description="暂无符合条件的股票，请调整选股条件重试"></el-empty>
      </div>
    </div>
  </el-main>
</template>

<script>
import { mapActions } from 'vuex';
import request from '../../utils/request';
import { SelectStrategy, MarketType, MarketTypeLabel } from '../../utils/constants';
import { generateStar } from '../../utils/tool';
import { exportExcel } from '../../utils/tool';

export default {
  name: 'AISelectStock',
  data() {
    return {
      SelectStrategy,
      MarketType,
      MarketTypeLabel,
      selectForm: {
        strategy: '',
        count: 10,
        market: ''
      },
      resultList: [],
      loading: false,
      hasSelected: false
    };
  },
  methods: {
    ...mapActions(['addOptionalStock', 'changeStock']),
    generateStar,
    // 开始选股
    async startSelect() {
      this.loading = true;
      this.hasSelected = true;
      try {
        const res = await request.aiSelectStock(this.selectForm);
        this.resultList = res.list.map(item => ({
          ...item,
          score: item.score.toFixed(1)
        }));
      } catch (err) {
        this.$message.error('AI选股失败，请稍后重试');
      } finally {
        this.loading = false;
      }
    },
    // 跳转个股详情
    goStockDetail(row) {
      this.changeStock({ code: row.code, name: row.name });
      const target = `/detail/${row.code}`;
      if (this.$route.path !== target) {
        this.$router.push(target);
      }
    },
    // 修复：避免方法名覆盖 mapActions 的情况
    handleAddOptionalStock(row) {
      // 调用 Vuex action
      this.addOptionalStock({
        code: row.code,
        name: row.name,
        price: '0.00',
        change: '0.00'
      });
      this.$message.success(`已将 ${row.name} 加入自选股`);
    },
    // 导出结果，不包含理由列
    exportResult() {
      const exportData = this.resultList.map(item => ({
        股票代码: item.code,
        股票名称: item.name,
        匹配分数: item.score
      }));
      exportExcel(exportData, 'AI智能选股结果.xlsx');
      this.$message.success('导出成功');
    }

  }
};
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  display: inline-block;
}
.tag {
  font-size: 12px;
  color: var(--color-up);
  margin-left: 10px;
}
.select-condition {
  margin-bottom: 30px;
}
.condition-row {
  margin-bottom: 20px;
}
.select-btn {
  text-align: center;
}
.select-btn .el-button {
  padding: 10px 40px;
  font-size: 16px;
}
.select-result {
  margin-top: 30px;
}
.result-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}
.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-text {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-up);
  margin-bottom: 4px;
}
.star-container {
  font-size: 12px;
}
.reason-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}
.operate-btn {
  padding: 0 5px;
}
.export-result {
  margin-top: 15px;
  text-align: right;
}
.no-result {
  margin-top: 50px;
}
</style>