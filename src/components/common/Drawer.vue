<template>
  <el-drawer
    title="功能导航"
    v-model="visible"  
    direction="ltr"   
    :with-header="true"
    @close="handleClose"
    width="80%"        
    :before-close="beforeClose"  
  >
    <!-- 自选股列表 -->
    <div class="drawer-section">
      <h3 class="drawer-title">自选股列表</h3>
      <!-- 空状态提示：避免无数据时空白 -->
      <div class="empty-tip" v-if="!optionalStocks || optionalStocks.length === 0">
        <el-empty description="暂无自选股，请添加"></el-empty>
      </div>
      <div 
        v-for="stock in optionalStocks" 
        :key="stock?.code"  
        @click="handleStockClick(stock)"
      >
        <div class="stock-info">
          <span class="stock-code">{{ stock?.code }}</span>
          <span class="stock-name">{{ stock?.name }}</span>
        </div>
        <div class="stock-price" :class="getChangeClass(stock?.change)">
          {{ stock?.price }}
          <span class="stock-change">
            {{ stock?.change > 0 ? '↑' : stock?.change < 0 ? '↓' : '' }}{{ Math.abs(Number(stock?.change) || 0) }}
          </span>
        </div>
      </div>
      <div class="add-stock" @click="addStock">
        <i class="el-icon-plus"></i> 添加自选股
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
          <i class="el-icon-menu"></i>
          <span slot="title">行情首页</span>
        </el-menu-item>
        <el-menu-item index="2" @click="toPage('/ai/select')">
          <i class="el-icon-magic-stick"></i>
          <span slot="title">AI智能选股</span>
        </el-menu-item>
        <el-menu-item index="3" @click="toPage('/trade')">
          <i class="el-icon-sell"></i>  <!-- 调整图标位置：和其他入口统一 -->
          <span slot="title">交易模拟</span>
        </el-menu-item>
        <el-menu-item index="4" @click="toPage('/mine')">
          <i class="el-icon-user"></i>
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
    // 给 optionalStocks 加空值兜底，避免 undefined
    ...mapState({
      optionalStocks: state => state.optionalStocks || []
    })
  },
  methods: {
    ...mapActions(['changeStock', 'addOptionalStock']),
    getChangeClass,
    // 关闭抽屉：触发父组件更新
    handleClose() {
      this.$emit('update:model-value', false);
    },
    // 关闭前确认（可选：防止误触关闭）
    beforeClose(done) {
      done(); // 直接关闭，如需确认可加 this.$confirm
    },
    // 点击自选股：加空值判断
    handleStockClick(stock) {
      if (!stock?.code) return;
      this.changeStock(stock);
      this.$router.push(`/detail/${stock.code}`);
      this.handleClose();
    },
    // 跳转页面：加空值判断
    toPage(path) {
      if (!path) return;
      this.$router.push(path);
      this.handleClose();
    },
    // 添加自选股：优化输入校验
    addStock() {
      this.$prompt('请输入6位股票代码：', '添加自选股', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{6}$/, // 正则校验6位数字
        inputErrorMessage: '请输入有效的6位数字股票代码'
      }).then(({ value }) => {
        this.addOptionalStock({
          code: value,
          name: '未知股票',
          price: '0.00',
          change: '0.00'
        });
        this.$message.success(`已添加股票 ${value} 到自选股`);
      }).catch(() => {
        this.$message.info('已取消添加');
      });
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
/* 空状态样式 */
.empty-tip {
  padding: 20px 0;
  text-align: center;
}
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}
/* 鼠标悬浮高亮 */
.stock-item:hover {
  background-color: #f9f9f9;
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
  transition: all 0.2s;
}
/* 添加按钮悬浮效果 */
.add-stock:hover {
  background-color: #fef0f0;
}
.drawer-menu {
  border-right: none;
}
.drawer-menu .el-menu-item {
  height: 48px;
  line-height: 48px;
  margin: 4px 0;
  border-radius: 4px;
  transition: background-color 0.2s;
}
/* 菜单选项悬浮高亮 */
.drawer-menu .el-menu-item:hover {
  background-color: #f5f5f5;
}
</style>