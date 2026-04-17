<script setup lang="ts"></script>
<template>
  <div class="target-container">
    <div class="core-node"></div>
  </div>
</template>
<style scoped lang="scss">
.target-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
.core-node {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #60a5fa, #a855f7);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(96, 165, 250, 0.5);
  // 課題：ここに鼓動（Pulsing）アニメーションを実装してください
}
</style>
