<template>
  <div class="register-wrapper">
    <div id="particles-js" class="particles-bg"></div>
    <div class="register-container">
      <el-form
        ref="registerForm"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        label-width="90px"
      >
        <h3 class="register-title">用户注册</h3>

        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            autocomplete="off"
          ></el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <!-- 密码框添加小眼睛 -->
          <el-input
            v-model="registerForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码（至少6位）"
            autocomplete="off"
            @keyup.enter.native="handleRegister"
          >
            <template #suffix>
              <i 
                class="el-icon-view" 
                style="cursor: pointer;"
                @click="showPassword = !showPassword"
              ></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirm">
          <!-- 确认密码框添加小眼睛 -->
          <el-input
            v-model="registerForm.confirm"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="请再次输入密码"
            autocomplete="off"
            @keyup.enter.native="handleRegister"
          >
            <template #suffix>
              <i 
                class="el-icon-view" 
                style="cursor: pointer;"
                @click="showConfirmPassword = !showConfirmPassword"
              ></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <div class="button-row">
            <button type="button" class="primary-btn" @click="handleRegister" :disabled="isLoading">
              {{ isLoading ? '注册中...' : '注册' }}
            </button>
            <button type="button" class="secondary-btn" @click="goLogin">返回登录</button>
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
  name: 'Register',
  data() {
    return {
      registerForm: {
        username: '',
        password: '',
        confirm: ''
      },
      isLoading: false,
      // 新增：控制密码显示/隐藏的状态
      showPassword: false,
      showConfirmPassword: false,
      registerRules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码最少6位', trigger: 'blur' }
        ],
        confirm: [
          { required: true, message: '请确认密码', trigger: 'blur' },
          { validator: (rule, value, callback) => {
            if (value !== this.registerForm.password) return callback(new Error('两次输入密码不一致'));
            callback();
          }, trigger: 'blur' }
        ]
      }
    };
  },
  mounted() {
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
    goLogin() {
      this.$router.push('/login');
    },
    handleRegister() {
      this.$refs.registerForm.validate(async (valid) => {
        if (!valid) return;
        this.isLoading = true;
        try {
          const res = await request.register({
            username: this.registerForm.username.trim(),
            password: this.registerForm.password
          });
          this.$message.success(res.msg || '注册成功，请登录');
          this.$router.push('/login');
        } catch (err) {
          // 响应拦截器已处理错误提示
        } finally {
          this.isLoading = false;
        }
      });
    }
  }
};
</script>

<style scoped>
/* 注册页面包装器 */
.register-wrapper {
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

/* 注册容器样式 */
.register-container {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

/* 注册表单样式 */
.register-form {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 注册标题 */
.register-title {
  text-align: center;
  margin-bottom: 30px;
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 表单标签样式 */
.register-form :deep(.el-form-item__label) {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 输入框样式 */
.register-form :deep(.el-input__inner) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
}

.register-form :deep(.el-input__inner:focus) {
  border-color: #64b5f6;
}

/* 按钮并排 */
.button-row {
  display: flex;
  gap: 15px;
  flex-wrap: nowrap;
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
  white-space: nowrap;
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
  white-space: nowrap;
}

.secondary-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.25);
}

/* 响应式：窄屏下按钮保持并排 */
@media (max-width: 480px) {
  .register-form {
    padding: 25px;
  }
  .button-row {
    gap: 10px;
  }
  .primary-btn,
  .secondary-btn {
    flex: 1;
    padding: 12px 10px;
    font-size: 13px;
    white-space: nowrap;
  }
}
</style>