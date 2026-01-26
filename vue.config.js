module.exports = {
  runtimeCompiler: true,

  devServer: {
    port: 8089,
    open: true 
    
    // proxy: {
    //   '/api': {
    //     target: process.env.VUE_APP_API_BASE_URL,
    //     changeOrigin: true,
    //     pathRewrite: { '^/api': '' }
    //   },
    //   '/ai-api': {
    //     target: process.env.VUE_APP_AI_API_BASE_URL,
    //     changeOrigin: true,
    //     pathRewrite: { '^/ai-api': '' }
    //   }
    // }
  },
  // css: {
  //   loaderOptions: {
  //     sass: {
  //       additionalData: `@import "@/assets/css/global.css"; @import "@/assets/css/media.css";`
  //     }
  //   }
  // }
};