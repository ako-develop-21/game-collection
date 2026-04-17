<script setup lang="ts"></script>
<template>
  <div class="target-container">
    <div class="portal">
      <div class="inner-glow"></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.target-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
.portal {
  width: 60px;
  height: 60px;
  background: #000;
  border: 4px solid #a855f7;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.5s;
  
  // 課題：マウスホバー時にポータルが開き、色が変化する演出を実装してください
}
.inner-glow {
  position: absolute;
  inset: 5px;
  background: radial-gradient(circle, #a855f7, transparent);
  opacity: 0.5;
}
</style>
