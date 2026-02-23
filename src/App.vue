<template>
  <div id="app">
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
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
/* 全局样式变量（遵循PDF色彩规范） */
#app {
  --spacing-base: 16px;
  --color-bg: #f5f7fa;
  --color-border: #e5e6eb;
  --color-up: #e53935;
  --color-down: #2f9b56;
  --color-neutral: #999;
  --sidebar-width: 240px;
  --right-aside-width: 300px;
  
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

/* 响应式样式类 */
.hide-on-mobile { display: block !important; }
.hide-on-pc    { display: none !important; }
.hide-on-tablet { display: block !important; }

/* 涨跌色彩样式类 */
.text-up      { color: var(--color-up) !important; }
.text-down    { color: var(--color-down) !important; }
.text-neutral { color: var(--color-neutral) !important; }

/* 移动端适配（<768px） */
@media screen and (max-width: 767px) {
  .hide-on-mobile { display: none !important; }
  .hide-on-pc    { display: block !important; }
  
  #app {
    --spacing-base: 6px;
  }

  .main-container {
    height: calc(100vh - 48px - 28px); /* header 48 + footer 28 */
  }
}

/* 平板适配（768-1199px） */
@media screen and (min-width: 768px) and (max-width: 1199px) {
  .hide-on-tablet { display: none !important; }
  
  #app {
    --spacing-base: 10px;
  }

  .main-container {
    height: calc(100vh - 54px);
  }
}

/* PC适配（>=1200px） */
@media screen and (min-width: 1200px) {
  .main-container {
    height: calc(100vh - 60px);
  }
}

/* ElementUI 全局样式重置 */
.el-header {
  padding: 0 !important;
  height: 60px !important;
  line-height: 60px !important;
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
</style>