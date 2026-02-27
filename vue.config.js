module.exports = {
  runtimeCompiler: true,

  devServer: {
    port: 8089,
    open: true,

    proxy: {
      '/api': {
        target: 'http://117.21.200.212:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
        // 转发 cookie
        cookieDomainRewrite: 'localhost',
        onProxyRes(proxyRes) {
          // 确保 set-cookie 能正确转发
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