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
        <div class="button-row">
          <el-button 
            type="primary" 
            class="login-btn"
            @click="handleLogin"
            :loading="isLoading"
            :disabled="isLoading" 
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </el-button>
          <el-button
            type="primary"
            class="register-btn"
            @click="$router.push('/register')"
          >
            注册
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import request from '@/utils/request';
export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      loginRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { whitespace: true, message: '用户名不能包含空格', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { whitespace: true, message: '密码不能包含空格', trigger: 'blur' }
        ]
      },
      isLoading: false
    };
  },
  mounted() {
    // 已登录时自动跳转到行情首页
    if (localStorage.getItem('access_token')) {
      this.$router.push(this.$route.query.redirect || '/quote');
      this.$message.success('已登录，自动跳转...');
    }
  },
  methods: {
    // 处理输入框失焦，清除空格
    handleInputBlur(e) {
      const key = e.target.name;
      if (this.loginForm[key]) {
        this.loginForm[key] = this.loginForm[key].trim();
      }
    },
    /**
     * 登录逻辑（适配新后端API）
     * 后端返回：{ status: "ok", access_token, refresh_token, token_type, expiration }
     * 后端同时通过 set-cookie 写入 cookie，实现无感刷新
     */
    handleLogin() {
      this.$refs.loginForm.validate(async (valid) => {
        if (!valid) return;
        this.isLoading = true;
        try {
          const res = await request.login({
            username: this.loginForm.username.trim(),
            password: this.loginForm.password
          });

          // 后端返回格式：{ status: "ok", access_token, refresh_token, token_type, expiration }
          if (res.status === 'ok' && res.access_token) {
            // 存储 token 到 localStorage（cookie 由后端 set-cookie 自动管理）
            localStorage.setItem('access_token', res.access_token);
            if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token);
            if (res.expiration) localStorage.setItem('token_expiration', res.expiration);

            const userInfo = { username: this.loginForm.username.trim() };
            localStorage.setItem('user_info', JSON.stringify(userInfo));

            this.$store.commit('setLoginStatus', true);
            this.$store.commit('setUserInfo', userInfo);
            this.$store.dispatch('initLoginState');

            const redirect = this.$route.query.redirect || '/quote';
            this.$router.push(redirect);
            this.$message.success('登录成功！');
          } else {
            this.$message.error('登录失败：未返回有效凭证');
          }
        } catch (err) {
          // 响应拦截器已经弹出了 Message，这里只做兜底
          const msg = (err && err.data) || (err && err.msg) || (err && err.message) || '登录失败';
          if (typeof msg === 'string' && !msg.includes('接口请求失败')) {
            // 避免重复弹窗（拦截器已弹过）
          }
        } finally {
          this.isLoading = false;
        }
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
  height: 40px;
  font-size: 16px;
}

/* 按钮并排 */
.button-row {
  display: flex;
  gap: 10px;
}
.button-row .login-btn,
.button-row .register-btn {
  flex: 1;
  height: 40px;
  font-size: 16px;
}

/* 响应式：窄屏下按钮纵向排列 */
@media (max-width: 480px) {
  .login-form {
    padding: 20px;
  }
  .button-row {
    flex-direction: column;
    gap: 8px;
  }
  .button-row .login-btn,
  .button-row .register-btn {
    width: 100%;
  }
}
</style>