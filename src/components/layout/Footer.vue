<template>
  <el-footer class="app-footer">
    <div class="footer-container">
      <!-- 左侧版权信息 -->
      <div class="copyright">
        <span>© 2026 同花顺多端行情分析系统 - 计算机设计大赛参赛作品</span>
        <span class="separator">|</span>
        <span>沪ICP备12345678号-1</span>
      </div>
      
      <!-- 中间联系方式 -->
      <div class="contact">
        <el-icon class="contact-icon"><el-icon-phone /></el-icon>
        <span>客服热线：400-123-4567</span>
        <span class="separator">|</span>
        <el-icon class="contact-icon"><el-icon-message /></el-icon>
        <span>官方邮箱：support@10jqka.com.cn</span>
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

.contact-icon {
  color: var(--color-up);
  font-size: 14px;
}

.compliance {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .footer-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .separator {
    display: none;
  }
  
  .copyright, .contact, .compliance {
    width: 100%;
    justify-content: center;
  }
}
</style>