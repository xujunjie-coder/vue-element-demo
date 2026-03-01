<template>
  <div class="login-wrapper">
    <div id="particles-js" class="particles-bg"></div>
    <div class="login-container">
      <el-form 
        ref="loginForm" 
        :model="loginForm" 
        :rules="loginRules" 
        class="login-form"
        label-width="80px"
      >
        <div class="login-title-wrapper">
          <img src="/logo2.png" alt="Financiai" class="login-logo" />
          <p class="login-subtitle">—— 智能行情分析系统</p>
        </div>
        
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
          <!-- 核心修改：添加密码显示/隐藏切换 -->
          <el-input 
            v-model="loginForm.password" 
            :type="showPassword ? 'text' : 'password'" 
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
            suffix-icon="el-icon"
            @keyup.enter.native="handleLogin"
            autocomplete="off"
            @blur="handleInputBlur" 
          >
            <!-- 自定义后缀图标（小眼睛） -->
            <template #suffix>
              <i 
                class="el-icon-view" 
                style="cursor: pointer;"
                @click="showPassword = !showPassword"
                :class="{ 'icon-active': showPassword }"
              ></i>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <div class="button-row">
            <button 
              type="button"
              class="primary-btn"
              @click="handleLogin"
              :disabled="isLoading" 
            >
              {{ isLoading ? '登录中...' : '登录' }}
            </button>
            <button
              type="button"
              class="secondary-btn"
              @click="$router.push('/register')"
            >
              注册
            </button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request';
import 'particles.js';
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
      isLoading: false,
      // 新增：控制密码显示/隐藏的状态
      showPassword: false
    };
  },
  mounted() {
    // 进入登录页时，只清除登录凭证（不删除用户自选股数据，按用户名隔离存储不会串号）
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiration');
    localStorage.removeItem('user_info');
    this.$store.commit('setLoginStatus', false);
    this.$store.commit('setUserInfo', {});
    this.$store.state.optionalStocks = [];
    // 初始化粒子背景
    this.initParticles();
  },
  beforeDestroy() {
    const canvas = document.querySelector('#particles-js canvas');
    if (canvas) {
      canvas.remove();
    }
  },
  methods: {
    initParticles() {
      window.particlesJS('particles-js', {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: '#ffffff' },
          shape: { type: 'circle' },
          opacity: { value: 0.5, random: true },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.2, width: 1 },
          move: { enable: true, speed: 1, direction: 'none', random: true, straight: false, out_mode: 'out', bounce: false }
        },
        interactivity: {
          detect_on: 'canvas',
          events: {
            onhover: { enable: true, mode: 'grab' },
            onclick: { enable: true, mode: 'push' },
            resize: true
          },
          modes: {
            grab: { distance: 140, line_linked: { opacity: 0.5 } },
            push: { particles_nb: 4 }
          }
        },
        retina_detect: true
      });
    },
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
/* 登录页面包装器 */
.login-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 粒子背景 */
.particles-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  z-index: 0;
}

/* 登录容器样式 */
.login-container {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  width: 100%;
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
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-sizing: border-box;
}

/* 登录标题区域 */
.login-title-wrapper {
  text-align: center;
  margin-bottom: 30px;
}

.login-logo {
  height: 70px;
  width: auto;
  margin-bottom: 0px;
}

.login-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 400;
  padding-left: 45px;
}

/* 表单标签样式 */
.login-form :deep(.el-form-item__label) {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 输入框样式 */
.login-form :deep(.el-input__inner) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
}

.login-form :deep(.el-input__inner:focus) {
  border-color: #64b5f6;
}

/* 按钮并排 */
.button-row {
  display: flex;
  gap: 15px;
}

/* 主按钮样式 */
.primary-btn {
  flex: 1;
  padding: 14px 30px;
  background: linear-gradient(90deg, #64b5f6 0%, #2196f3 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(33, 150, 243, 0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.primary-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}

.primary-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(33, 150, 243, 0.4);
  background: linear-gradient(90deg, #2196f3 0%, #64b5f6 100%);
}

.primary-btn:hover::after {
  left: 100%;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* 次要按钮样式 */
.secondary-btn {
  flex: 1;
  padding: 14px 30px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.secondary-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.25);
}

/* 新增：小眼睛图标激活态样式 */
.icon-active {
  color: #2196f3;
}

/* 响应式：窄屏下按钮保持并排 */
@media (max-width: 480px) {
  .login-form {
    padding: 25px;
  }
  .button-row {
    gap: 10px;
  }
  .primary-btn,
  .secondary-btn {
    flex: 1;
    padding: 12px 15px;
    font-size: 14px;
  }
}
</style>