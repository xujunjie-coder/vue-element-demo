<template>
  <div class="login-container">
    <el-form 
      ref="loginForm" 
      :model="loginForm" 
      :rules="loginRules" 
      class="login-form"
      label-width="80px"
    >
      <h3 class="login-title">同花顺多端行情分析系统</h3>
      
      <el-form-item label="用户名" prop="username">
        <el-input 
          v-model="loginForm.username" 
          placeholder="请输入用户名"
          prefix-icon="el-icon-user"
          autocomplete="off"
          @blur="handleInputBlur" 
        ></el-input>
      </el-form-item>
      
      <el-form-item label="密码" prop="password">
        <el-input 
          v-model="loginForm.password" 
          type="password" 
          placeholder="请输入密码"
          prefix-icon="el-icon-lock"
          @keyup.enter.native="handleLogin"
          autocomplete="off"
          @blur="handleInputBlur" 
        ></el-input>
      </el-form-item>
      
      <el-form-item>
        <el-button 
          type="primary" 
          class="login-btn"
          @click="handleLogin"
          :loading="isLoading"
          :disabled="isLoading" 
        >
          {{ isLoading ? '登录中...' : '登录' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: 'admin', // 测试默认账号
        password: '123456' // 测试默认密码
      },
      loginRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { whitespace: true, message: '用户名不能包含空格', trigger: 'blur' } // 新增：禁止空格
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, max: 32, message: '密码长度需在6-32位之间', trigger: 'blur' },
          { whitespace: true, message: '密码不能包含空格', trigger: 'blur' } // 新增：禁止空格
        ]
      },
      isLoading: false
    };
  },
  mounted() {
    // 新增：已登录时自动跳转到行情首页
    if (localStorage.getItem('stock_token')) {
      this.$router.push(this.$route.query.redirect || '/quote');
      this.$message.success('已登录，自动跳转...');
    }
  },
  methods: {
    // 新增：处理输入框失焦，清除空格
    handleInputBlur(e) {
      const key = e.target.name;
      if (this.loginForm[key]) {
        this.loginForm[key] = this.loginForm[key].trim();
      }
    },
    // 登录逻辑（修复：登录后强制刷新状态）
    handleLogin() {
      this.$refs.loginForm.validate((valid) => {
        if (!valid) return;

        this.isLoading = true;
        // 模拟接口请求延迟
        setTimeout(() => {
          try {
            // 存储登录状态到本地存储
            const token = `fake_token_${Date.now()}`;
            localStorage.setItem('stock_token', token);
            const userInfo = { 
              username: this.loginForm.username.trim(),
              role: 'user'
            };
            localStorage.setItem('user_info', JSON.stringify(userInfo));
            
            // 更新Vuex状态
            this.$store.commit('setLoginStatus', true);
            this.$store.commit('setUserInfo', userInfo);
            // 强制初始化状态，确保同步
            this.$store.dispatch('initLoginState');
            
            // 跳转页面（优先跳回被拦截的页面）
            const redirect = this.$route.query.redirect || '/quote';
            this.$router.push(redirect);
            
            this.$message.success('登录成功！');
          } catch (err) {
            this.$message.error('登录失败，请重试');
            console.error('登录错误：', err);
          } finally {
            this.isLoading = false;
          }
        }, 800);
      });
    }
  }
};
</script>

<style scoped>
/* 登录容器样式 */
.login-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(120deg, #e0f7fa, #f5f5f5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

/* 登录表单样式 */
.login-form {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

/* 登录标题 */
.login-title {
  text-align: center;
  margin-bottom: 30px;
  color: #409eff; /* 匹配Element UI主色调 */
  font-size: 20px;
  font-weight: 600;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 40px;
  font-size: 16px;
}
</style>