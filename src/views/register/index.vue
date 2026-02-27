<template>
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
        <el-button type="primary" @click="handleRegister" :loading="isLoading">注册</el-button>
        <el-button type="primary" @click="goLogin">返回登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import request from '@/utils/request';
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
  methods: {
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
.register-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}
.register-form {
  width: 100%;
  max-width: 420px;
  padding: 30px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.register-title {
  text-align: center;
  margin-bottom: 20px;
  color: #409eff;
}
</style>