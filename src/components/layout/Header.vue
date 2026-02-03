<template>
  <el-header style="background: #fff; border-bottom: 1px solid var(--color-border); padding: 0 20px; height: 60px; line-height: 60px;">
    <div class="header-container">
      <!-- Logo -->
      <div class="logo">
        <span class="logo-text">同花顺多端行情分析系统</span>
      </div>

      <!-- PC端导航菜单 -->
      <el-menu
        mode="horizontal"
        :default-active="activeMenu"
        background-color="transparent"
        text-color="#333"
        active-text-color="var(--color-up)"
        class="pc-menu hide-on-mobile"
        @select="handleMenuSelect" 
      >
        <el-menu-item index="1">
          <i class="el-icon-menu"></i>
          <span slot="title">行情首页</span>
        </el-menu-item>
        <el-menu-item index="2">
          <i class="el-icon-s-data"></i>
          <span slot="title">个股详情</span>
        </el-menu-item>
        <el-menu-item index="3">
          <i class="el-icon-magic-stick"></i>
          <span slot="title">AI智能选股</span>
        </el-menu-item>
        <el-menu-item index="4" :disabled="!isLogin"> <!-- 新增：未登录时禁用交易菜单 -->
          <i class="el-icon-sell"></i>
          <span slot="title">交易模拟</span>
        </el-menu-item>
        <el-menu-item index="5" :disabled="!isLogin"> <!-- 新增：未登录时禁用个人中心菜单 -->
          <i class="el-icon-user"></i>
          <span slot="title">个人中心</span>
        </el-menu-item>
      </el-menu>

      <!-- 移动端菜单按钮 -->
      <el-button
        icon="el-icon-menu"
        type="text"
        class="mobile-menu-btn hide-on-pc"
        @click="openDrawer"
      ></el-button>

      <!-- 用户信息 -->
      <div class="user-info">
        <el-dropdown v-if="isLogin">
          <span class="dropdown-link">
            <el-avatar icon="el-icon-user" size="small"></el-avatar>
            <span class="user-name hide-on-mobile">{{ userInfo.username || '用户名' }}</span>
            <i class="el-icon-arrow-down el-icon--right hide-on-mobile"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item @click.native="toPage('/mine')">个人中心</el-dropdown-item>
            <el-dropdown-item @click.native="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-button
          type="text"
          v-else
          @click="toLogin"
          class="login-btn hide-on-mobile"
        >
          登录
        </el-button>
      </div>
    </div>

    <!-- 移动端抽屉 -->
    <Drawer
      ref="mobileDrawer"
      :visible="drawerVisible"
      @close="drawerVisible = false"
      :is-login="isLogin" 
    />
  </el-header>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import Drawer from '../common/Drawer.vue';

export default {
  name: 'Header',
  components: { Drawer },
  data() {
    return {
      activeMenu: '1',
      drawerVisible: false
    };
  },
  computed: {
    ...mapState(['isLogin', 'userInfo', 'currentStockCode'])
  },
  mounted() {
    // 新增：初始化登录状态，确保刷新后与localStorage同步
    this.$store.dispatch('initLoginState');
    // 初始化菜单激活状态（根据当前路径）
    this.initActiveMenu();
  },
  methods: {
    ...mapActions(['logout', 'initLoginState']),
    // 初始化菜单激活状态（新增：解决刷新后菜单激活状态错误）
    initActiveMenu() {
      const currentPath = this.$route.path;
      if (currentPath === '/quote') this.activeMenu = '1';
      if (currentPath.includes('/detail')) this.activeMenu = '2';
      if (currentPath === '/ai/select') this.activeMenu = '3';
      if (currentPath === '/trade') this.activeMenu = '4';
      if (currentPath === '/mine') this.activeMenu = '5';
    },
    // 菜单选择处理（新增：统一处理菜单跳转，校验登录状态）
    handleMenuSelect(index) {
      let path = '';
      switch (index) {
        case '1':
          path = '/quote';
          break;
        case '2':
          if (!this.currentStockCode) {
            this.$message.warning('请先选择股票');
            return;
          }
          path = `/detail/${this.currentStockCode}`;
          break;
        case '3':
          path = '/ai/select';
          break;
        case '4':
          path = '/trade';
          // 未登录时拦截交易菜单
          if (!this.isLogin) {
            this.$message.warning('请先登录后再操作');
            this.$router.push('/login');
            return;
          }
          break;
        case '5':
          path = '/mine';
          // 未登录时拦截个人中心菜单
          if (!this.isLogin) {
            this.$message.warning('请先登录后再操作');
            this.$router.push('/login');
            return;
          }
          break;
        default:
          path = '/quote';
      }

      // 未登录时跳转登录页时避免重复导航
      if ((path === '/trade' || path === '/mine') && !this.isLogin) {
        if (this.$route.path !== '/login') this.$router.push('/login');
        return;
      }

      // 避免重复导航导致的 NavigationDuplicated 错误
      if (this.$route.path !== path) {
        this.$router.push(path);
      }
      this.activeMenu = index;
    },
    // 跳转页面（保留原逻辑，新增登录校验）
    toPage(path) {
      // 未登录时，访问需权限页面拦截
      if ((path === '/trade' || path === '/mine') && !this.isLogin) {
        this.$message.warning('请先登录后再操作');
        if (this.$route.path !== '/login') this.$router.push('/login');
        return;
      }
      // 避免重复导航
      if (this.$route.path !== path) {
        this.$router.push(path);
      }
      // 更新当前菜单激活状态
      if (path === '/quote') this.activeMenu = '1';
      if (path.includes('/detail')) this.activeMenu = '2';
      if (path === '/ai/select') this.activeMenu = '3';
      if (path === '/trade') this.activeMenu = '4';
      if (path === '/mine') this.activeMenu = '5';
    },

    // 打开移动端抽屉
    openDrawer() {
      this.drawerVisible = true;
    },
    // 跳转登录页
    toLogin() {
      // 新增：如果已在登录页，不重复跳转
      if (this.$route.path === '/login') return;
      this.$router.push('/login');
    }
  },
  watch: {
    // 新增：监听路由变化，同步菜单激活状态
    '$route'(to) {
      this.initActiveMenu();
    }
  }
};
</script>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}
.logo {
  display: flex;
  align-items: center;
}
.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-up);
}
.pc-menu {
  flex: 1;
  margin: 0 50px;
}
.mobile-menu-btn {
  font-size: 20px;
  color: #333;
}
.user-info {
  display: flex;
  align-items: center;
}
.dropdown-link {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.user-name {
  margin: 0 8px;
  color: #333;
}
.login-btn {
  color: var(--color-up);
}
/* 新增：禁用菜单样式 */
.el-menu-item.is-disabled {
  color: #c0c4cc !important;
  cursor: not-allowed !important;
}
</style>