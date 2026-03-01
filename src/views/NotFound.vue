<template>
  <div class="not-found-wrapper">
    <div id="particles-js" class="particles-bg"></div>
    <div class="not-found-container">
      <div class="error-code-wrapper">
        <div class="error-code">404</div>
      </div>
      <p class="error-desc">
        哎呀，你访问的页面好像去星际旅行了<br>
        可能是地址输入错误、页面已迁移，或者它只是想独自待一会儿
      </p>
      <div class="btn-group">
        <router-link to="/quote" class="primary-btn">返回首页</router-link>
        <button class="secondary-btn" @click="goBack">返回上一页</button>
      </div>
    </div>
  </div>
</template>


<script>
import 'particles.js'
export default {
  name: 'NotFound',
  mounted() {
    this.initParticles()
  },
  beforeDestroy() {
    const canvas = document.querySelector('#particles-js canvas')
    if (canvas) {
      canvas.remove()
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
      })
    },
    goBack() {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        this.$router.push('/quote')
      }
    }
  }
}
</script>

p {


<style scoped>
.not-found-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.particles-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  z-index: 0;
}
.not-found-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
  color: #fff;
}
.error-code-wrapper {
  position: relative;
  margin-bottom: 1.5rem;
}
.error-code {
  font-size: clamp(7rem, 20vw, 12rem);
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(120deg, #64b5f6, #bbdefb, #ffffff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 
    0 2px 10px rgba(0,0,0,0.1),
    0 8px 20px rgba(0,0,0,0.05),
    0 0 40px rgba(100, 181, 246, 0.3);
  transform: perspective(500px) rotateX(10deg);
  animation: float 4s ease-in-out infinite;
}
.error-desc {
  font-size: clamp(1rem, 3vw, 1.5rem);
  margin-bottom: 3rem;
  max-width: 700px;
  line-height: 1.8;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.btn-group {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
.primary-btn {
  padding: 14px 40px;
  background: linear-gradient(90deg, #64b5f6 0%, #2196f3 100%);
  color: #fff;
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  font-weight: 600;
  border-radius: 50px;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(33, 150, 243, 0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: inline-block;
}
.primary-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
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
.secondary-btn {
  padding: 14px 40px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  font-weight: 600;
  border-radius: 50px;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
}
.secondary-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.15);
  background: rgba(255, 255, 255, 0.25);
}
@keyframes float {
  0% { transform: perspective(500px) rotateX(10deg) translateY(0px); }
  50% { transform: perspective(500px) rotateX(10deg) translateY(-20px); }
  100% { transform: perspective(500px) rotateX(10deg) translateY(0px); }
}
@media (max-width: 768px) {
  .btn-group { gap: 1rem; }
  .primary-btn, .secondary-btn { padding: 12px 32px; }
  .error-desc { margin-bottom: 2rem; }
}
@media (max-width: 480px) {
  .btn-group { gap: 10px; width: 100%; }
  .primary-btn, .secondary-btn { flex: 1; padding: 12px 15px; font-size: 14px; }
}
</style>
