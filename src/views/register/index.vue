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
        <el-input
          v-model="registerForm.password"
          type="password"
          placeholder="请输入密码（至少6位）"
          autocomplete="off"
          @keyup.enter.native="handleRegister"
        ></el-input>
      </el-form-item>

      <el-form-item label="确认密码" prop="confirm">
        <el-input
          v-model="registerForm.confirm"
          type="password"
          placeholder="请再次输入密码"
          autocomplete="off"
          @keyup.enter.native="handleRegister"
        ></el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleRegister" :loading="isLoading">注册</el-button>
        <el-button type="text" @click="goLogin">已有账号，返回登录</el-button>
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
          const res = await request.register({ username: this.registerForm.username.trim(), password: this.registerForm.password });
          // 兼容 Mock 返回格式（登录接口返回 token + userInfo）
          const token = res.token || (res.data && res.data.token) || '';
          const userInfo = res.userInfo || (res.data && res.data.userInfo) || res;
          if (token) {
            localStorage.setItem('stock_token', token);
            localStorage.setItem('user_info', JSON.stringify(userInfo || { username: this.registerForm.username.trim() }));
            this.$store.commit('setLoginStatus', true);
            this.$store.commit('setUserInfo', userInfo || { username: this.registerForm.username.trim() });
            this.$store.dispatch('initLoginState');
            this.$message.success('注册成功，已登录');
            this.$router.push('/quote');
          } else {
            this.$message.success('注册成功，请登录');
            this.$router.push('/login');
          }
        } catch (err) {
          this.$message.error(err.msg || err.message || '注册失败');
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