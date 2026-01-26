<template>
  <el-drawer
    title="功能导航"
    :visible.sync="visible"
    direction="left"
    :with-header="true"
    @close="handleClose"
    size="80%"
  >
    <!-- 自选股列表 -->
    <div class="drawer-section">
      <h3 class="drawer-title">自选股列表</h3>
      <div 
        v-for="stock in optionalStocks" 
        :key="stock.code"
        class="stock-item"
        @click="handleStockClick(stock)"
      >
        <div class="stock-info">
          <span class="stock-code">{{ stock.code }}</span>
          <span class="stock-name">{{ stock.name }}</span>
        </div>
        <div class="stock-price" :class="getChangeClass(stock.change)">
          {{ stock.price }}
          <span class="stock-change">{{ stock.change > 0 ? '↑' : stock.change < 0 ? '↓' : '' }}{{ Math.abs(stock.change) }}</span>
        </div>
      </div>
      <div class="add-stock" @click="addStock">
        <<i class="el-icon-plus"></</i> 添加自选股
      </div>
    </div>

    <!-- 快速入口 -->
    <div class="drawer-section">
      <h3 class="drawer-title">快速入口</h3>
      <el-menu
        class="drawer-menu"
        background-color="transparent"
        text-color="#333"
        active-text-color="var(--color-up)"
      >
        <el-menu-item index="1" @click="toPage('/quote')">
          <<i class="el-icon-menu"></</i>
          <span slot="title">行情首页</span>
        </el-menu-item>
        <el-menu-item index="2" @click="toPage('/ai/select')">
          <<i class="el-icon-magic-stick"></</i>
          <span slot="title">AI智能选股</span>
        </el-menu-item>
        <el-menu-item index="3" @click="toPage('/trade')">
          <<i class="el-icon-sell"></</i>
          <span slot="title">交易模拟</span>
        </el-menu-item>
        <el-menu-item index="4" @click="toPage('/mine')">
          <<i class="el-icon-user"></</i>
          <span slot="title">个人中心</span>
        </el-menu-item>
      </el-menu>
    </div>
  </el-drawer>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { getChangeClass } from '../../utils/format';

export default {
  name: 'Drawer',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(['optionalStocks'])
  },
  methods: {
    ...mapActions(['changeStock', 'addOptionalStock']),
    getChangeClass,
    handleClose() {
      this.$emit('close');
    },
    handleStockClick(stock) {
      this.changeStock(stock);
      this.$router.push(`/detail/${stock.code}`);
      this.$emit('close');
    },
    toPage(path) {
      this.$router.push(path);
      this.$emit('close');
    },
    addStock() {
      const code = prompt('请输入股票代码：');
      if (code && code.length === 6 && /^\d+$/.test(code)) {
        this.addOptionalStock({
          code,
          name: '未知股票',
          price: '0.00',
          change: '0.00'
        });
        this.$message.success(`已添加股票 ${code} 到自选股`);
      } else {
        this.$message.warning('请输入有效的6位股票代码');
      }
    }
  }
};
</script>

<style scoped>
.drawer-section {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}
.drawer-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}
.stock-info {
  display: flex;
  flex-direction: column;
}
.stock-code {
  font-size: 14px;
  color: #333;
}
.stock-name {
  font-size: 12px;
  color: #666;
}
.stock-price {
  font-size: 16px;
  font-weight: bold;
}
.stock-change {
  font-size: 12px;
  margin-left: 4px;
}
.add-stock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin-top: 10px;
  color: var(--color-up);
  border: 1px dashed var(--color-up);
  border-radius: var(--border-radius-mobile);
  cursor: pointer;
}
.drawer-menu {
  border-right: none;
}
.drawer-menu .el-menu-item {
  height: 48px;
  line-height: 48px;
}
</style>