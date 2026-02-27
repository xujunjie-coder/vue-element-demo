<template>
  <div id="app" :class="{ 'right-drawer-open': rightDrawerOpen, 'left-drawer-open': leftDrawerOpen }">
    <!-- 路由多视图渲染：头部 -->
    <router-view name="header"></router-view>
    
    <!-- 中间内容区域 -->
    <el-container class="main-container">
      <!-- 左侧侧边栏 -->
      <router-view name="sidebar"></router-view>
      
      <!-- 主内容区域 -->
      <el-main class="main-content">
        <router-view></router-view>
      </el-main>
      
      <!-- 右侧信息栏 -->
      <router-view name="rightAside"></router-view>
    </el-container>
    
    <!-- 底部版权栏 -->
    <router-view name="footer"></router-view>

    <!-- 右侧边栏抽屉触发按钮（≤1460px 时显示） -->
    <div
      class="drawer-trigger right-trigger"
      @click="rightDrawerOpen = true"
      v-show="showRightTrigger && !rightDrawerOpen"
    >
      <i class="el-icon-d-arrow-left"></i>
    </div>

    <!-- 左侧边栏抽屉触发按钮（≤1090px 时显示） -->
    <div
      class="drawer-trigger left-trigger"
      @click="leftDrawerOpen = true"
      v-show="showLeftTrigger && !leftDrawerOpen"
    >
      <i class="el-icon-d-arrow-right"></i>
    </div>

    <!-- 抽屉遮罩层 -->
    <transition name="fade">
      <div
        class="drawer-overlay"
        v-if="rightDrawerOpen || leftDrawerOpen"
        @click="closeAllDrawers"
      ></div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      windowWidth: window.innerWidth,
      rightDrawerOpen: false,
      leftDrawerOpen: false
    };
  },
  computed: {
    /** 当前路由是否包含侧边栏布局 */
    hasLayout() {
      const name = this.$route.name;
      return ['StockQuote', 'StockDetail', 'AISelectStock', 'TradePanel'].includes(name);
    },
    /** 是否显示右侧抽屉触发按钮 */
    showRightTrigger() {
      return this.hasLayout && this.windowWidth <= 1460;
    },
    /** 是否显示左侧抽屉触发按钮 */
    showLeftTrigger() {
      return this.hasLayout && this.windowWidth <= 1090;
    }
  },
  mounted() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    // 监听 Header 组件触发的侧边栏抽屉切换
    this.$root.$on('toggle-left-drawer', () => {
      this.leftDrawerOpen = !this.leftDrawerOpen;
    });
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    this.$root.$off('toggle-left-drawer');
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
      // 屏幕变宽时自动关闭不再需要的抽屉
      if (this.windowWidth > 1460) this.rightDrawerOpen = false;
      if (this.windowWidth > 1090) this.leftDrawerOpen = false;
    },
    closeAllDrawers() {
      this.rightDrawerOpen = false;
      this.leftDrawerOpen = false;
    }
  },
  watch: {
    // 路由切换时关闭所有抽屉
    '$route'() {
      this.closeAllDrawers();
    }
  }
};
</script>

<style>
/* ============================================================
   App 根组件布局样式
   - CSS 变量定义在 global.css（唯一来源）
   - 媒体查询定义在 media.css（唯一来源）
   ============================================================ */

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* 主容器布局 */
.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-width: 0; /* 防止 flex 子元素溢出 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ElementUI 全局样式重置 */
.el-header {
  padding: 0 !important;
  height: var(--header-height, 60px) !important;
  line-height: var(--header-height, 60px) !important;
  flex-shrink: 0;
}
.el-aside {
  height: 100% !important;
  overflow-y: auto !important;
  transition: width 0.3s ease;
}
.el-main {
  padding: var(--spacing-base) !important;
  overflow-y: auto !important;
  background: var(--color-bg) !important;
}
.el-footer {
  padding: 0 !important;
  height: auto !important;
  flex-shrink: 0;
}
.el-menu-vertical-demo {
  border-right: none !important;
}

/* 全局平滑滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.25);
}
::-webkit-scrollbar-track {
  background: transparent;
}

/* 全局过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

/* ====== 抽屉触发按钮 ====== */
.drawer-trigger {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1999;
  width: 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.25s;
  font-size: 14px;
  color: #999;
}
.drawer-trigger:hover {
  background: #fff;
  color: var(--color-up);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  width: 24px;
}
.right-trigger {
  right: 0;
  border-radius: 4px 0 0 4px;
  border-right: none;
}
.left-trigger {
  left: 0;
  border-radius: 0 4px 4px 0;
  border-left: none;
}

/* ====== 抽屉遮罩层 ====== */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1998;
}
</style>