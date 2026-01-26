<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <div class="card-container">
      <!-- 个人信息卡片 -->
      <div class="info-card">
        <div class="info-header">
          <el-avatar size="large" icon="el-icon-user"></el-avatar>
          <div class="info-name">
            <h3>{{ userInfo.username || '未登录用户' }}</h3>
            <el-button
              type="text"
              @click="handleLogin"
              v-if="!isLogin"
              class="login-btn"
            >
              点击登录
            </el-button>
          </div>
        </div>
        <div class="info-data">
          <div class="data-item">
            <div class="data-label">模拟资金</div>
            <div class="data-value data-text">{{ userInfo.balance || '0.00' }} 元</div>
          </div>
          <div class="data-item">
            <div class="data-label">今日盈亏</div>
            <div class="data-value" :class="getChangeClass(userInfo.today_profit || 0)">
              {{ userInfo.today_profit ? (userInfo.today_profit > 0 ? '+' : '') + userInfo.today_profit : '0.00' }} 元
            </div>
          </div>
          <div class="data-item">
            <div class="data-label">自选股数量</div>
            <div class="data-value">{{ optionalStockCount }} 只</div>
          </div>
        </div>
      </div>

      <!-- 功能入口卡片 -->
      <div class="function-card">
        <h3 class="card-title">功能入口</h3>
        <div class="function-list">
          <div class="function-item" @click="toPage('/mine/optional')">
            <i class="el-icon-star-on"></i>
            <span>自选股管理</span>
          </div>
          <div class="function-item" @click="toPage('/mine/trade-record')">
            <i class="el-icon-s-order"></i>
            <span>交易记录</span>
          </div>
          <div class="function-item" @click="exportAllQuote">
            <i class="el-icon-download"></i>
            <span>行情导出</span>
          </div>
          <div class="function-item" @click="toSetting">
            <i class="el-icon-setting"></i>
            <span>系统设置</span>
          </div>
        </div>
      </div>

      <!-- 我的收藏卡片 -->
      <div class="collect-card">
        <div class="card-header">
          <h3 class="card-title">我的收藏</h3>
          <el-button
            type="text"
            @click="toPage('/mine/collect')"
            class="more-btn"
          >
            查看更多
          </el-button>
        </div>
        <div class="collect-list">
          <div class="collect-item" v-for="code in collectList" :key="code">
            <span class="collect-code">{{ code }}</span>
            <span class="collect-name">{{ getStockName(code) }}</span>
          </div>
          <div class="no-collect" v-if="collectList.length === 0">
            暂无收藏股票
          </div>
        </div>
      </div>

      <!-- 系统信息卡片 -->
      <div class="system-card">
        <h3 class="card-title">系统信息</h3>
        <div class="system-info">
          <div class="info-item">
            <span class="info-label">版本号：</span>
            <span class="info-value">V1.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">刷新频率：</span>
            <span class="info-value">{{ refreshFrequency }} 秒</span>
          </div>
          <div class="info-item">
            <span class="info-label">性能数据：</span>
            <span class="info-value">K线渲染耗时 280ms</span>
          </div>
          <div class="info-item">
            <span class="info-label">关于我们：</span>
            <span class="info-value">计算机设计大赛参赛作品</span>
          </div>
        </div>
      </div>
    </div>
  </el-main>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import request from '../../utils/request';
import { getChangeClass } from '../../utils/format';
import { exportExcel } from '../../utils/tool';

export default {
  name: 'Mine',
  data() {
    return {
      refreshFrequency: 3, // 默认刷新频率3秒
      collectList: []
    };
  },
  computed: {
    ...mapState(['userInfo', 'isLogin', 'optionalStocks']),
    ...mapGetters(['optionalStockCount'])
  },
  mounted() {
    this.fetchUserInfo();
  },
  methods: {
    ...mapActions(['login', 'logout']),
    getChangeClass,
    // 获取用户信息
    async fetchUserInfo() {
      if (this.isLogin) {
        try {
          const res = await request.getUserInfo();
          this.userInfo = res;
          this.collectList = res.collect || [];
        } catch (err) {
          this.$message.error('用户信息加载失败');
        }
      }
    },
    // 登录/退出
    handleLogin() {
      if (!this.isLogin) {
        this.$router.push('/login');
      } else {
        this.logout();
        this.$message.success('退出登录成功');
        this.$router.push('/quote');
      }
    },
    // 跳转页面
    toPage(path) {
      this.$router.push(path);
    },
    // 系统设置
    toSetting() {
      this.$prompt('请设置行情刷新频率（3-10秒）', '系统设置', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: this.refreshFrequency,
        inputPattern: /^[3-9]|10$/,
        inputErrorMessage: '请输入3-10之间的整数'
      }).then(({ value }) => {
        this.refreshFrequency = value;
        this.$message.success(`刷新频率已设置为 ${value} 秒`);
        // 实际项目中可将设置存储到localStorage
        localStorage.setItem('refreshFrequency', value);
      }).catch(() => {
        this.$message.info('已取消设置');
      });
    },
    // 导出全部行情
    exportAllQuote() {
      this.$confirm('确定要导出全部行情数据吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(async () => {
        try {
          const res = await request.getQuoteList({ page: 1, size: 100 });
          const exportData = res.list.map(item => ({
            股票代码: item.code,
            股票名称: item.name,
            最新价: item.price,
            涨跌幅: `${item.change_rate}%`,
            涨跌额: item.change,
            成交量: item.volume,
            最高价: item.high,
            最低价: item.low
          }));
          exportExcel(exportData, '全部行情数据');
          this.$message.success('导出成功');
        } catch (err) {
          this.$message.error('导出失败，请稍后重试');
        }
      }).catch(() => {
        this.$message.info('已取消导出');
      });
    },
    // 根据代码获取股票名称
    getStockName(code) {
      const stock = this.optionalStocks.find(item => item.code === code);
      return stock ? stock.name : '未知股票';
    }
  }
};
</script>

<style scoped>
.info-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fef7fb 0%, #fcf1f7 100%);
  border-radius: var(--border-radius-base);
}
.info-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.el-avatar {
  width: 60px;
  height: 60px;
  font-size: 24px;
  background-color: var(--color-up);
  margin-right: 15px;
}
.info-name h3 {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}
.login-btn {
  color: var(--color-up);
  padding: 0;
}
.info-data {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 20px;
}
.data-item {
  text-align: center;
}
.data-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}
.data-value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.function-card, .collect-card, .system-card {
  margin-bottom: 20px;
  padding: 20px;
  border-radius: var(--border-radius-base);
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}
.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}
.function-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(25% - 15px);
  padding: 15px;
  border: 1px solid #f5f5f5;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  transition: all 0.3s;
}
.function-item:hover {
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.1);
  border-color: var(--color-up);
}
.function-item i {
  font-size: 24px;
  color: var(--color-up);
  margin-bottom: 10px;
}
.function-item span {
  font-size: 14px;
  color: #333;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.more-btn {
  color: var(--color-up);
  padding: 0;
}
.collect-list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}
.collect-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(16.666% - 12px);
  padding: 10px;
  border: 1px solid #f5f5f5;
  border-radius: var(--border-radius-base);
}
.collect-code {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}
.collect-name {
  font-size: 12px;
  color: #666;
}
.no-collect {
  font-size: 14px;
  color: #999;
  padding: 20px;
  text-align: center;
  width: 100%;
}

.system-info {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.info-item {
  display: flex;
  align-items: center;
  width: calc(50% - 10px);
}
.info-label {
  font-size: 14px;
  color: #666;
  margin-right: 10px;
  min-width: 80px;
}
.info-value {
  font-size: 14px;
  color: #333;
}

@media screen and (max-width: 767px) {
  .function-item {
    width: calc(50% - 10px);
  }
  .collect-item {
    width: calc(33.333% - 10px);
  }
  .info-item {
    width: 100%;
  }
}
</style>