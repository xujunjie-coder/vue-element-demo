module.exports = {
  runtimeCompiler: true,
  devServer: {
    port: 8089,
    open: true,
    // 【真实后端模式】代理已启用
    proxy: {
      '/api': {
        target: 'http://117.21.200.212:3000',
        changeOrigin: true,
        // pathRewrite: { '^/api': '' },  // 尝试恢复：不移除 /api 前缀，后端路径可能已经包含 /api
        cookieDomainRewrite: {
          '*': '' // 核心修复：取消 cookie 域名绑定，解决 localhost 无法保存 cookie 的问题
        },
        onProxyRes(proxyRes) {
          const sc = proxyRes.headers['set-cookie'];
          if (Array.isArray(sc)) {
            proxyRes.headers['set-cookie'] = sc.map(s =>
              s.replace(/;\s*Secure/gi, '') // 移除 Secure 属性，允许 HTTP 环境（localhost）使用
               .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax') // 强制设置为 Lax，兼容大多数浏览器
            );
          }
        }
      },
      '/ai-api': {
        target: 'http://117.21.200.212:3000',
        changeOrigin: true,
        // pathRewrite: { '^/ai-api': '' } // AI 接口通常也带前缀或路径一致，尝试不重写
      }
    }
  }
};