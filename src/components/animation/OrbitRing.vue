<script setup lang="ts"></script>
<template>
  <div class="target-container">
    <div class="orbit-ring">
      <div class="satellite"></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.target-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
.orbit-ring {
  width: 80px;
  height: 80px;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  position: relative;
  // 課題：このリングを回転させてください
}
.satellite {
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  background: #f1c40f;
  border-radius: 50%;
  box-shadow: 0 0 10px #f1c40f;
}
</style>
