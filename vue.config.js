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
        // pathRewrite: { '^/api': '' },  // 不移除 /api 前缀，后端路径已包含 /api
        cookieDomainRewrite: 'localhost',
        onProxyRes(proxyRes) {
          const sc = proxyRes.headers['set-cookie'];
          if (Array.isArray(sc)) {
            proxyRes.headers['set-cookie'] = sc.map(s =>
              s.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
            );
          }
        }
      },
      '/ai-api': {
        target: 'http://117.21.200.212:3000',
        changeOrigin: true,
        pathRewrite: { '^/ai-api': '' }
      }
    }
  }
};