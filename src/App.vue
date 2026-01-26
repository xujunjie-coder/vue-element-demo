<template>
  <div id="app">
    <!-- 路由多视图渲染：头部 -->
    <router-view name="header"></router-view>
    
    <!-- 中间内容区域 -->
    <el-container style="height: calc(100vh - 60px); display: flex;">
      <!-- 左侧侧边栏 -->
      <router-view name="sidebar"></router-view>
      
      <!-- 主内容区域 -->
      <el-main style="flex: 1; padding: var(--spacing-base); background: var(--color-bg); overflow-y: auto;">
        <router-view></router-view> <!-- 默认视图 -->
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
  --color-up: #e53935;      /* 上涨色（PDF规范） */
  --color-down: #2f9b56;    /* 下跌色（PDF规范） */
  --color-neutral: #999;
  --sidebar-width: 240px;
  --right-aside-width: 300px;
  
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

/* 响应式样式类（补充缺失定义） */
.hide-on-mobile {
  display: block !important;
}
.hide-on-pc {
  display: none !important;
}

/* 涨跌色彩样式类 */
.text-up {
  color: var(--color-up) !important;
}
.text-down {
  color: var(--color-down) !important;
}
.text-neutral {
  color: var(--color-neutral) !important;
}

/* 移动端适配（768px以下） */
@media screen and (max-width: 768px) {
  .hide-on-mobile {
    display: none !important;
  }
  .hide-on-pc {
    display: block !important;
  }
  
  #app {
    --spacing-base: 8px;
  }
}

/* ElementUI 全局样式重置 */
.el-header {
  padding: 0 !important;
  height: 60px !important;
  line-height: 60px !important;
}
.el-aside {
  height: 100% !important;
}
.el-main {
  padding: var(--spacing-base) !important;
  overflow-y: auto !important;
  background: var(--color-bg) !important;
}
.el-footer {
  padding: 0 !important;
  height: auto !important;
}
.el-menu-vertical-demo {
  border-right: none !important;
}
</style>