<template>
  <el-footer class="app-footer">
    <div class="footer-container">
      <!-- 左侧版权信息 -->
      <div class="copyright">
        <span class="footer-item">© 2026 Financiai · 智能行情分析系统</span>
      </div>
      
      <!-- 中间联系方式 -->
      <div class="contact">
        <span class="footer-item"><i class="el-icon-message"></i> 官方邮箱：lkhsss1019@gmail.com</span>
      </div>
      
      <!-- 右侧合规提示 -->
      <div class="compliance">
        <el-tag size="mini" type="warning">风险提示</el-tag>
        <span>股市有风险，投资需谨慎</span>
      </div>
    </div>
  </el-footer>
</template>

<script>
export default {
  name: 'Footer' // 修正：统一组件名称为Footer
};
</script>

<style scoped>
.app-footer {
  background: #fff;
  border-top: 1px solid var(--color-border);
  padding: 0;
  height: auto !important;
}

.footer-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  font-size: 12px;
  color: #666;
  flex-wrap: wrap;
  gap: 10px;
}

.separator {
  margin: 0 8px;
  color: #e5e5e5;
}

.contact {
  display: flex;
  align-items: center;
  gap: 5px;
}

.contact i,
.footer-item i {
  color: var(--color-up);
  font-size: 14px;
  margin-right: 4px;
}

.compliance {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 移动端适配 */
@media screen and (max-width: 767px) {
  .footer-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
  }
  
  .separator {
    display: none;
  }
  
  .copyright, .contact {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  
  .footer-item {
    display: block;
    width: 100%;
  }
  
  .compliance {
    width: 100%;
    justify-content: center;
  }
}
</style>