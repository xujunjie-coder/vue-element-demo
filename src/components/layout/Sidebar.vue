<template>
  <!-- 左侧侧边栏容器：固定宽度+垂直滚动，确保在左侧显示 -->
  <el-aside 
    :width="`var(--sidebar-width)`" 
    class="sidebar" 
    style="background: #fff; border-right: 1px solid var(--color-border); height: calc(100vh - 60px); overflow-y: auto; float: left;"
  >
    <!-- 1. 自选股模块（核心功能：列表+批量操作） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">自选股</h3>
        <div class="btn-group">
          <el-button
            type="text"
            icon="el-icon-plus"
            class="add-btn"
            @click="openAddOptionalPrompt"
          ></el-button>
          <el-button
            type="text"
            icon="el-icon-delete"
            class="batch-delete-btn"
            @click="batchDeleteOptionalStock"
            :disabled="selectedStockCodes?.length === 0"
          >
            批量删除
          </el-button>
        </div>
      </div>
      <div class="stock-list">
        <!-- 全选框：加 optionalStocks 空值判断 -->
        <div class="stock-item-header" v-if="optionalStocks?.length > 0">
          <el-checkbox v-model="selectAll" @change="handleSelectAll">全选</el-checkbox>
        </div>
        <!-- 自选股列表：v-for 遍历前加空值兜底 -->
        <div
          v-for="stock in optionalStocks || []"
          :key="stock?.code"  
          class="stock-item"
          :class="{ 'active': stock?.code === currentStockCode }"
          @click="goStockDetail(stock)"
        >
          <el-checkbox
            v-model="selectedStockCodes"
            :label="stock?.code"
            @change.stop="handleSingleSelect(stock?.code)"
          ></el-checkbox>
          <div class="stock-info">
            <span class="stock-code">{{ stock?.code }}</span>
            <span class="stock-name">{{ stock?.name }}</span>
          </div>
          <div class="stock-price" :class="getChangeClass(stock?.change)">
            {{ stock?.price }}
            <span class="stock-change">
              {{ stock?.change > 0 ? '↑' : stock?.change < 0 ? '↓' : '' }}{{ Math.abs(stock?.change || 0) }}
            </span>
          </div>
          <el-button
            type="text"
            icon="el-icon-delete"
            class="delete-btn"
            @click.stop="deleteOptionalStock(stock?.code)"
          ></el-button>
        </div>
        <!-- 空状态提示：加可选链操作符 -->
        <div class="no-stock" v-if="optionalStocks?.length === 0">
          <el-empty description="暂无自选股，请添加"></el-empty>
          <el-button type="text" class="quick-add-btn" @click="openAddOptionalPrompt">快速添加</el-button>
        </div>
      </div>
    </div>

    <!-- 2. 市场分类模块（树形结构：沪深A股/板块/概念） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">市场分类</h3>
      </div>
      <el-tree
        :data="marketTreeData"
        :props="treeProps"
        @node-click="handleMarketClick"
        class="market-tree"
        highlight-current
        style="margin-top: 10px;"
      ></el-tree>
    </div>

    <!-- 3. 实用工具模块（替换原功能导航） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">实用工具</h3>
      </div>
      <!-- 工具分类标签 -->
      <el-tabs v-model="activeToolTab" size="mini" class="tool-tabs">
        <el-tab-pane label="数据分析" name="analysis"></el-tab-pane>
        <el-tab-pane label="交易辅助" name="trade"></el-tab-pane>
        <el-tab-pane label="风险控制" name="risk"></el-tab-pane>
      </el-tabs>
      <!-- 分类工具列表：一行一个 -->
      <div class="tool-list tool-list-single-row">
        <el-card class="tool-card tool-card-single-row" shadow="hover" v-for="tool in filteredToolList" :key="tool.id">
          <div class="tool-item" @click="openTool(tool)">
            <el-icon v-if="tool.id === 1" class="el-icon-s-tools" style="font-size: 18px; color: #333;"></el-icon>
            <!-- 风险测评工具：换100%兼容的锁形图标（替代盾牌） -->
            <el-icon v-else-if="tool.id === 5" class="el-icon-lock" style="font-size: 18px; color: #333;"></el-icon>
            <el-icon v-else :class="tool.iconClass" style="font-size: 18px;"></el-icon>
            <div class="tool-meta">
              <span class="tool-name">{{ tool.name }}</span>
              <span class="tool-count" v-if="tool.useCount">使用{{ tool.useCount }}次</span>
            </div>
          </div>
        </el-card>
      </div>
    </div> 

    <!-- 4. 行情统计模块（辅助信息：涨跌停/平盘数据） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">行情统计</h3>
      </div>
      <div class="statistic-list">
        <div class="statistic-item" @click="jumpToStockList('up')">
          <div class="stat-inner">
            <div class="stat-value text-up">{{ upCount }}</div>
            <div class="stat-label">上涨家数</div>
          </div>
        </div>
        <div class="statistic-item" @click="jumpToStockList('down')">
          <div class="stat-inner">
            <div class="stat-value text-down">{{ downCount }}</div>
            <div class="stat-label">下跌家数</div>
          </div>
        </div>
        <div class="statistic-item" @click="jumpToStockList('flat')">
          <div class="stat-inner">
            <div class="stat-value text-neutral">{{ flatCount }}</div>
            <div class="stat-label">平盘家数</div>
          </div>
        </div>
        <div class="statistic-item" @click="jumpToStockList('limitUp')">
          <div class="stat-inner">
            <div class="stat-value text-up">{{ limitUpCount }}</div>
            <div class="stat-label">涨停家数</div>
          </div>
        </div>
        <div class="statistic-item" @click="jumpToStockList('limitDown')">
          <div class="stat-inner">
            <div class="stat-value text-down">{{ limitDownCount }}</div>
            <div class="stat-label">跌停家数</div>
          </div>
        </div>
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-neutral">{{ limitRatio }}%</div>
            <div class="stat-label">涨跌停比例</div>
          </div>
        </div>
      </div>
    </div>
  </el-aside>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { getChangeClass } from '../../utils/format';
import request from '../../utils/request';

export default {
  name: 'Sidebar',
  data() {
    return {
      // 市场分类树形数据（沪深A股/板块/概念）
      marketTreeData: [
        {
          label: '沪深A股',
          children: [
            { label: '上证指数', code: '000001' },
            { label: '深证成指', code: '399001' },
            { label: '创业板指', code: '399006' },
            { label: '科创50', code: '000688' }
          ]
        },
        {
          label: '板块分类',
          children: [
            { label: '金融板块' },
            { label: '科技板块' },
            { label: '消费板块' },
            { label: '新能源板块' }
          ]
        },
        {
          label: '概念分类',
          children: [
            { label: '人工智能' },
            { label: '数字经济' },
            { label: '碳中和' },
            { label: '生物医药' }
          ]
        }
      ],
      // 树形控件配置
      treeProps: {
        children: 'children',
        label: 'label'
      },
      // 行情统计默认数据
      upCount: 1256,
      downCount: 2148,
      flatCount: 325,
      limitUpCount: 86,
      limitDownCount: 23,
      // 自选股批量操作相关：初始化确保是数组
      selectAll: false,
      selectedStockCodes: [],
      // 实用工具相关
      toolList: [
        { id: 1, name: '市盈率计算器', iconClass: 'el-icon-calculator', category: 'analysis', useCount: 128 },
        { id: 2, name: '交易税费计算', iconClass: 'el-icon-money', category: 'trade', useCount: 96 },
        { id: 3, name: '均线分析工具', iconClass: 'el-icon-pie-chart', category: 'analysis', useCount: 85 },
        { id: 4, name: '财报对比分析', iconClass: 'el-icon-s-data', category: 'analysis', useCount: 63 },
        { id: 5, name: '风险测评工具', iconClass: 'el-icon-lock', category: 'risk', useCount: 47 },
        { id: 6, name: '投资组合管理', iconClass: 'el-icon-menu', category: 'trade', useCount: 32 },
        { id: 7, name: '止损止盈计算器', iconClass: 'el-icon-bell', category: 'risk', useCount: 29 },
        { id: 8, name: '委托单模拟', iconClass: 'el-icon-sell', category: 'trade', useCount: 21 }
      ],
      activeToolTab: 'analysis', // 默认选中数据分析分类
      syncTimer: null // 新增：存储定时器ID，用于销毁时清除
    };
  },
  // 这里是mounted生命周期，组件加载完成后执行
  mounted() {
    // 1. 组件刚加载时，先同步一次自选股的实时数据
    this.syncOptionalStockData();
    // 2. 设置定时器，每隔3秒（和行情页刷新频率一致）自动同步
    this.syncTimer = setInterval(() => {
      this.syncOptionalStockData();
    }, 3000); // 3000是3秒，和行情页的refreshTimer保持一致
  },
  // 组件销毁前，清除定时器（避免内存泄漏）
  beforeDestroy() {
    clearInterval(this.syncTimer);
  },
  computed: {
    // 从Vuex获取数据时加空值兜底，核心修复点！
    ...mapState({
      optionalStocks: state => state.optionalStocks || [],
      currentStockCode: state => state.currentStockCode || ''
    }),
    ...mapGetters(['optionalStockCount']),
    // 计算涨跌停比例：加空值判断避免 NaN
    limitRatio() {
      const total = this.upCount + this.downCount + this.flatCount;
      return total > 0 ? ((this.limitUpCount + this.limitDownCount) / total * 100).toFixed(1) : '0.0';
    },
    // 筛选后的工具列表
    filteredToolList() {
      return this.toolList.filter(tool => tool.category === this.activeToolTab);
    }
  },
  watch: {
    // 监听自选股变化，同步全选状态：加可选链操作符
    optionalStocks: {
      handler() {
        this.selectAll = this.optionalStocks?.length > 0 && this.selectedStockCodes?.length === this.optionalStocks?.length;
      },
      deep: true
    },
    // 监听工具分类标签变化
    activeToolTab() {
      this.filteredToolList = this.toolList.filter(tool => tool.category === this.activeToolTab);
    }
  },
  methods: {
    // 从Vuex映射操作方法
    ...mapActions(['addOptionalStock', 'deleteOptionalStock', 'changeStock','batchDeleteOptionalStock']),
    getChangeClass,

    // 跳转到个股详情页：加空值判断
    goStockDetail(stock) {
      if (!stock) return;
      // 判断当前路由是否已在目标页面，避免重复跳转
      const targetPath = `/detail/${stock.code}`;
      if (this.$route.path === targetPath) {
        return; // 已经在当前页面，不执行跳转
      }
      this.changeStock(stock);
      this.$router.push(targetPath);
    },

    // 批量添加自选股（支持多代码逗号分隔）
    openAddOptionalPrompt() {
    this.$prompt('请输入6位股票代码（多只股票用逗号分隔）', '添加自选股', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^(\d{6},)*\d{6}$/,
      inputErrorMessage: '请输入有效的6位股票代码（多只股票用逗号分隔）'
    }).then(async ({ value }) => {
      const codes = value.split(',').filter(code => code.trim()); // 过滤空值，避免无效代码
      for (const code of codes) {
        try {
          const res = await request.getStockDetail(code);
          // 关键：这里调用的是 Vuex 映射的全局方法 addOptionalStock（正确！）
          this.addOptionalStock({
            code,
            name: res.name,
            price: res.price.toFixed(2),
            change: res.change.toFixed(2)
          });
          this.$message.success(`已添加 ${res.name} 到自选股`);
        } catch (err) {
          // 异常时也调用全局方法（兜底逻辑）
          this.addOptionalStock({
            code,
            name: '未知股票',
            price: '0.00',
            change: '0.00'
          });
          this.$message.warning(`未查询到股票${code}信息，已手动添加到自选股`);
        }
      }
    }).catch(() => {
      this.$message.info('已取消添加');
    });
  },
    // 自选股全选/取消全选：加空值判断
    handleSelectAll(val) {
      this.selectedStockCodes = val ? (this.optionalStocks || []).map(stock => stock.code) : [];
    },

    // 自选股单个选择：加可选链
    handleSingleSelect(code) {
      this.selectAll = this.selectedStockCodes?.length === this.optionalStocks?.length;
    },

    // 批量删除自选股：加空值判断
    batchDeleteOptionalStock() {
      if (this.selectedStockCodes?.length === 0) return;
      this.$confirm(`确定删除选中的${this.selectedStockCodes.length}只股票？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        (this.selectedStockCodes || []).forEach(code => {
          this.deleteOptionalStock(code);
        });
        this.selectedStockCodes = [];
        this.selectAll = false;
        this.$message.success('批量删除成功');
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },

    // 点击行情统计项，跳转对应股票列表
    jumpToStockList(type) {
      let path = '/quote';
      switch (type) {
        case 'up': path += '?type=up'; break;
        case 'down': path += '?type=down'; break;
        case 'flat': path += '?type=flat'; break;
        case 'limitUp': path += '?type=limitUp'; break;
        case 'limitDown': path += '?type=limitDown'; break;
      }
      this.$router.push(path);
    },

    // 点击市场分类，跳转对应指数/板块详情
    handleMarketClick(data) {
      if (data?.code) {
        this.changeStock({ code: data.code, name: data.label });
        this.$router.push(`/detail/${data.code}`);
      } else {
        this.$message.info(`已选择${data.label}板块，行情数据加载中...`);
      }
    },

    // 打开工具（更新使用次数）
    openTool(tool) {
      this.$message.info(`打开${tool.name}工具`);
      // 更新使用次数（实际项目中应同步到后端）
      const index = this.toolList.findIndex(item => item.id === tool.id);
      if (index !== -1) {
        this.$set(this.toolList[index], 'useCount', tool.useCount + 1);
      }
      // 实际项目中跳转到对应工具页面
      // this.$router.push(`/tools/${tool.id}`);
    },
    // 3. 关键：将 syncOptionalStockData 移到 methods 里
    async syncOptionalStockData() {
      if (this.optionalStocks.length === 0) return;
      // 拼接自选股代码（逗号分隔，用于批量查询）
      const codes = this.optionalStocks.map(stock => stock.code).join(',');
      try {
        // 调用行情接口批量获取实时数据（和 StockQuote.vue 的行情接口一致）
        const res = await request.getQuoteList({ keyword: codes });
        // 遍历更新自选股的实时名称、价格、涨跌
        this.optionalStocks.forEach((stock, index) => {
          // 找到当前股票的实时数据
          const realTimeData = res.list.find(item => item.code === stock.code);
          if (realTimeData) {
            // 用 this.$set 确保响应式更新（Vue 数组索引更新需手动触发响应式）
            this.$set(this.optionalStocks, index, {
              ...stock, // 保留原有数据（如是否选中）
              name: realTimeData.name || stock.name, // 同步最新名称
              price: realTimeData.price.toFixed(2) || stock.price, // 同步最新价格
              change: realTimeData.change.toFixed(2) || stock.change // 同步最新涨跌
            });
            // 同步到 localStorage，确保刷新页面后数据仍最新
            localStorage.setItem('optional_stocks', JSON.stringify(this.optionalStocks));
          }
        });
      } catch (err) {
        console.warn('自选股实时数据同步失败：', err);
        // 失败时可提示用户（可选）
        // this.$message.warning('自选股数据同步失败，请稍后重试');
      }
    }
  },
  
  
};
</script>

<style scoped>
/* 侧边栏基础样式：固定宽度240px，确保在左侧 */
.sidebar {
  --sidebar-width: 240px;
  float: left; /* 强制左侧浮动，避免被挤到右侧 */
}

/* 模块通用样式：上下分隔+内边距 */
.sidebar-module {
  padding: 15px;
  border-bottom: 1px solid var(--color-border);
}

/* 模块标题栏：左右布局 */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.module-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

/* 按钮组：横向排列+间距 */
.btn-group {
  display: flex;
  gap: 10px;
}

.add-btn {
  color: var(--color-up);
  padding: 0;
}

.batch-delete-btn {
  color: #e53935;
  padding: 0;
  font-size: 12px;
}

/* 自选股列表样式：固定高度+滚动 */
.stock-list {
  max-height: 280px;
  overflow-y: auto;
}

.stock-item-header {
  padding: 0 0 8px 0;
}

/* 自选股列表项：横向布局+hover效果 */
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.stock-item >>> .el-checkbox {
  margin-right: 8px;
}

.stock-item:hover {
  background-color: #f9f9f9;
}

/* 选中股票高亮样式 */
.stock-item.active {
  background-color: #f0f8fb;
  border-left: 3px solid var(--color-up);
  padding-left: 10px;
  margin-left: -10px;
}

/* 股票代码/名称：纵向排列 */
.stock-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stock-code {
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.stock-name {
  font-size: 12px;
  color: #666;
}

/* 股票价格：右对齐 */
.stock-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin: 0 10px;
  min-width: 80px;
}

.stock-change {
  font-size: 12px;
}

/* 删除按钮：hover显示 */
.delete-btn {
  color: #999;
  padding: 0;
  display: none;
}

.stock-item:hover .delete-btn {
  display: block;
}

/* 空自选股提示：居中 */
.no-stock {
  padding: 20px 0;
  text-align: center;
}

.quick-add-btn {
  margin-top: 10px;
  color: var(--color-up);
}

/* 市场分类树形样式：自定义颜色 */
.market-tree {
  --el-tree-text-color: #333;
  --el-tree-node-hover-bg-color: #f9f9f9;
  --el-tree-node-active-bg-color: #f0f8fb;
  --el-tree-node-text-hover-color: var(--color-up);
}

/* 行情统计：卡片式 3 列布局 */
.statistic-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 4px 0;
}

.statistic-item {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
}

.statistic-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.06);
}

.stat-inner {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 6px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

/* 保持涨跌色彩 */
.text-up { color: var(--color-up, #e53935); }
.text-down { color: var(--color-down, #43a047); }
.text-neutral { color: #999; }

/* 涨跌颜色定义（与全局样式保持一致） */
.text-up {
  color: var(--color-up, #e53935);
}

.text-down {
  color: var(--color-down, #43a047);
}

.text-neutral {
  color: #666;
}

/* 实用工具样式 */
/* 一行一个的工具列表布局 */
.tool-list-single-row {
  display: flex;
  flex-direction: column; /* 纵向排列，一行一个 */
  gap: 2px; /* 更紧凑的行间距 */
}
/* 一行一个的工具卡片样式 */
.tool-card-single-row {
  width: 100%; /* 横向铺满 */
  margin-bottom: 0;
}
.tool-card-single-row .tool-item {
  display: flex;
  align-items: center;
  padding: 6px 10px; /* 上下内边距进一步缩小 */
  gap: 10px;
}
.tool-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1; /* 占满剩余空间 */
}
.tool-name {
  font-size: 13px;
  color: #333;
  white-space: normal; /* 允许换行，避免截断 */
}
.tool-count {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
</style>