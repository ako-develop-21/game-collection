<script setup lang="ts"></script>
<template>
  <div class="target-container">
    <div class="particle-system">
      <div v-for="n in 12" :key="n" class="particle"></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.target-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
}
.particle-system {
  position: relative;
}
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #60a5fa;
  border-radius: 50%;
  @for $i from 1 through 12 {
    &:nth-child(#{$i}) {
      transform: rotate($i * 30deg) translateY(-40px);
    }
  }
  // 課題：パーティクルが中心に向かって吸い込まれる動きを実装してください
}
</style>
