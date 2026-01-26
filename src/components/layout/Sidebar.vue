<template>
  <el-aside :width="`var(--sidebar-width)`" class="sidebar hide-on-mobile" style="background: #fff; border-right: 1px solid var(--color-border); height: calc(100vh - 60px); overflow-y: auto;">
    <!-- 自选股模块 -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">自选股</h3>
        <el-button
          type="text"
          icon="el-icon-plus"
          class="add-btn"
          @click="addOptionalStock"
        ></el-button>
      </div>
      <div class="stock-list">
        <div
          v-for="stock in optionalStocks"
          :key="stock.code"
          class="stock-item"
          :class="{ 'active': stock.code === currentStockCode }"
          @click="goStockDetail(stock)"
        >
          <div class="stock-info">
            <span class="stock-code">{{ stock.code }}</span>
            <span class="stock-name">{{ stock.name }}</span>
          </div>
          <div class="stock-price" :class="getChangeClass(stock.change)">
            {{ stock.price }}
            <span class="stock-change">
              {{ stock.change > 0 ? '↑' : stock.change < 0 ? '↓' : '' }}{{ Math.abs(stock.change) }}
            </span>
          </div>
          <el-button
            type="text"
            icon="el-icon-delete"
            class="delete-btn"
            @click.stop="deleteOptionalStock(stock.code)"
          ></el-button>
        </div>
        <div class="no-stock" v-if="optionalStocks.length === 0">
          <el-empty description="暂无自选股，请添加"></el-empty>
        </div>
      </div>
    </div>

    <!-- 市场分类模块 -->
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
      ></el-tree>
    </div>

    <!-- 功能导航模块 -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">功能导航</h3>
      </div>
      <el-menu
        default-active="1"
        class="function-menu"
        background-color="transparent"
        text-color="#333"
        active-text-color="var(--color-up)"
        @select="handleMenuSelect"
      >
        <el-menu-item index="1">
          <i class="el-icon-menu"></i>
          <span slot="title">行情首页</span>
        </el-menu-item>
        <el-menu-item index="2">
          <i class="el-icon-magic-stick"></i>
          <span slot="title">AI智能选股</span>
        </el-menu-item>
        <el-menu-item index="3">
          <i class="el-icon-sell"></i>
          <span slot="title">交易模拟</span>
        </el-menu-item>
        <el-menu-item index="4">
          <i class="el-icon-user"></i>
          <span slot="title">个人中心</span>
        </el-menu-item>
        <el-menu-item index="5">
          <i class="el-icon-setting"></i>
          <span slot="title">系统设置</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 数据统计模块 -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">行情统计</h3>
      </div>
      <div class="statistic-list">
        <div class="statistic-item">
          <span class="stat-label">上涨家数</span>
          <span class="stat-value text-up">{{ upCount }}</span>
        </div>
        <div class="statistic-item">
          <span class="stat-label">下跌家数</span>
          <span class="stat-value text-down">{{ downCount }}</span>
        </div>
        <div class="statistic-item">
          <span class="stat-label">平盘家数</span>
          <span class="stat-value text-neutral">{{ flatCount }}</span>
        </div>
        <div class="statistic-item">
          <span class="stat-label">涨停家数</span>
          <span class="stat-value text-up">{{ limitUpCount }}</span>
        </div>
        <div class="statistic-item">
          <span class="stat-label">跌停家数</span>
          <span class="stat-value text-down">{{ limitDownCount }}</span>
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
      // 市场分类树形数据
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
      // 行情统计数据
      upCount: 1256,
      downCount: 2148,
      flatCount: 325,
      limitUpCount: 86,
      limitDownCount: 23
    };
  },
  computed: {
    ...mapState(['optionalStocks', 'currentStockCode']),
    ...mapGetters(['optionalStockCount'])
  },
  methods: {
    ...mapActions(['addOptionalStock', 'deleteOptionalStock', 'changeStock']),
    getChangeClass,
    // 跳转到个股详情
    goStockDetail(stock) {
      this.changeStock(stock);
      this.$router.push(`/detail/${stock.code}`);
    },
    // 添加自选股
    addOptionalStock() {
      this.$prompt('请输入6位股票代码', '添加自选股', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{6}$/,
        inputErrorMessage: '请输入有效的6位股票代码'
      }).then(async ({ value }) => {
        try {
          // 查询股票信息
          const res = await request.getStockDetail(value);
          this.addOptionalStock({
            code: value,
            name: res.name,
            price: res.price.toFixed(2),
            change: res.change.toFixed(2)
          });
          this.$message.success(`已添加 ${res.name} 到自选股`);
        } catch (err) {
          // 如果查询失败，仍允许添加（名称显示未知）
          this.addOptionalStock({
            code: value,
            name: '未知股票',
            price: '0.00',
            change: '0.00'
          });
          this.$message.warning('未查询到股票信息，已手动添加到自选股');
        }
      }).catch(() => {
        this.$message.info('已取消添加');
      });
    },
    // 处理市场分类点击
    handleMarketClick(data) {
      if (data.code) {
        // 如果有代码，跳转到对应指数详情
        this.changeStock({ code: data.code, name: data.label });
        this.$router.push(`/detail/${data.code}`);
      } else {
        // 否则提示（模拟板块筛选）
        this.$message.info(`已选择${data.label}板块，行情数据加载中...`);
      }
    },
    // 处理功能菜单选择
    handleMenuSelect(index) {
      const pathMap = {
        '1': '/quote',
        '2': '/ai/select',
        '3': '/trade',
        '4': '/mine',
        '5': '/mine/setting'
      };
      this.$router.push(pathMap[index]);
    }
  }
};
</script>

<style scoped>
.sidebar {
  --sidebar-width: 240px;
}
.sidebar-module {
  padding: 15px;
  border-bottom: 1px solid var(--color-border);
}
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
.add-btn {
  color: var(--color-up);
  padding: 0;
}

/* 自选股列表样式 */
.stock-list {
  max-height: 400px;
  overflow-y: auto;
}
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}
.stock-item:hover {
  background-color: #f9f9f9;
}
.stock-item.active {
  background-color: #f0f8fb;
  border-left: 3px solid var(--color-up);
  padding-left: 10px;
  margin-left: -10px;
}
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
.delete-btn {
  color: #999;
  padding: 0;
  display: none;
}
.stock-item:hover .delete-btn {
  display: block;
}
.no-stock {
  padding: 20px 0;
  text-align: center;
}

/* 市场分类树形样式 */
.market-tree {
  --el-tree-text-color: #333;
  --el-tree-node-hover-bg-color: #f9f9f9;
  --el-tree-node-active-bg-color: #f0f8fb;
  --el-tree-node-text-hover-color: var(--color-up);
}

/* 功能菜单样式 */
.function-menu {
  border-right: none;
}
.function-menu .el-menu-item {
  height: 48px;
  line-height: 48px;
}

/* 行情统计样式 */
.statistic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.statistic-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: calc(50% - 5px);
  padding: 8px 5px;
  border-bottom: 1px solid #f5f5f5;
}
.stat-label {
  font-size: 14px;
  color: #666;
}
.stat-value {
  font-size: 14px;
  font-weight: bold;
}
</style>